import { useEffect, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../copy';
import type { MidiSession } from '../../midi/session';
import { LocaleSwitch } from '../../shell/LocaleSwitch';
import { downloadBytes } from './download';
import type { Gr55Editor } from './editor';
import { GkSetList } from './GkSets';
import { stageHref } from './routes';
import { TopNav } from './TopNav';
import { SETUP_STEPS, loadSetup, saveSetup } from './setupState';
import type { SetupState, SetupStep, StepOutcome } from './setupState';
import { slotsOfMode } from './slots';
import { useSync, useSyncState } from './sync/SyncBadge';
import type { SyncEngine } from './sync/engine';
import { encodePedalBackupSyx, encodeSystemBlocksSyx } from './syx';
import type { SlotImage } from './syx';
import {
  MidiFields,
  ModeSwitch,
  OutputFields,
  PedalFields,
  SystemGate,
  useApplySystem,
  useSystem,
  useSystemVersion,
} from './SystemParts';
import { SYSTEM, SYSTEM_ADDRESS, SYSTEM_BLOCKS, gkSet } from './systemMap';
import type { Gr55System } from './systemState';

// A guess at a first full read, for before the sync has timed any slot: about a second
// each. The sync's own estimate replaces it as soon as there is one.
const FIRST_SYNC_SECONDS_PER_SLOT = 1;

function synced(phase: string): boolean {
  return phase === 'ready' || phase === 'changed';
}

function pedalBackup(system: Gr55System, sync: SyncEngine, editor: Gr55Editor): Uint8Array {
  const slots: SlotImage[] = slotsOfMode(editor.gkMode).flatMap((slot) => {
    const record = sync.slot(slot.userPatchNumber);
    return record ? [{ userPatchNumber: slot.userPatchNumber, bytes: record.bytes }] : [];
  });
  return encodePedalBackupSyx(
    encodeSystemBlocksSyx(SYSTEM_ADDRESS, system.appliedBytes(), SYSTEM_BLOCKS),
    slots,
  );
}

function SyncProgress() {
  const t = useT();
  const sync = useSync();
  const state = useSyncState(sync);
  const percent = state.total > 0 ? Math.floor((state.done / state.total) * 100) : 0;
  if (synced(state.phase)) {
    return (
      <p className="status" role="status">
        {t('sync.badge.ready', state.total)} — {t('wizard.syncReady')}
      </p>
    );
  }
  return (
    <>
      <progress max={state.total || 1} value={state.done} />
      <p className="status" role="status">
        {t('sync.percent', percent)}
        {state.phase === 'syncing' && state.etaMs !== undefined && (
          <> · {t('sync.eta', Math.round(state.etaMs / 60_000))}</>
        )}
      </p>
      {state.phase === 'failed' && (
        <p className="error" role="alert">
          {t('sync.failed')}
        </p>
      )}
      {state.phase !== 'syncing' && (
        <div className="actions">
          <button type="button" className="primary" onClick={() => void sync.start()}>
            {state.phase === 'paused'
              ? t('sync.resume')
              : state.done > 0
                ? t('sync.continue')
                : t('sync.start')}
          </button>
        </div>
      )}
    </>
  );
}

function BackupStep({ editor, onSaved }: { editor: Gr55Editor; onSaved: () => void }) {
  const t = useT();
  const sync = useSync();
  const system = useSystem();
  const state = useSyncState(sync);
  const [waiting, setWaiting] = useState(false);
  const [saved, setSaved] = useState<string>();
  const ready = synced(state.phase);
  const minutes = Math.ceil(((state.total - state.done) * FIRST_SYNC_SECONDS_PER_SLOT) / 60);

  // The file is written the moment the last slot is in.
  useEffect(() => {
    if (!waiting || !ready) {
      return;
    }
    const file = `${new Date().toISOString().slice(0, 10)}_gr55-pedal.syx`;
    downloadBytes(pedalBackup(system, sync, editor), file);
    setWaiting(false);
    setSaved(file);
    onSaved();
  }, [waiting, ready, system, sync, editor, onSaved]);

  return (
    <>
      <p className="hint">{t('wizard.backupIntro')}</p>
      {!ready && (
        <p className="hint">
          {state.etaMs !== undefined
            ? t('wizard.backupMinutes', Math.max(1, Math.round(state.etaMs / 60_000)))
            : t('wizard.backupMinutes', minutes)}
        </p>
      )}
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={waiting}
          onClick={() => {
            setWaiting(true);
            if (!ready) {
              void sync.start();
            }
          }}
        >
          {ready ? t('wizard.backupSave') : t('wizard.backupStart')}
        </button>
      </div>
      {waiting && !ready && (
        <>
          <p className="status" role="status">
            {t('wizard.backupWaiting')}
          </p>
          <SyncProgress />
        </>
      )}
      {saved && (
        <p className="status" role="status">
          {t('wizard.backupSaved', saved)}
        </p>
      )}
    </>
  );
}

/**
 * The stage setup: eight steps, walked in order, each left done or knowingly skipped.
 * Pedal-wide changes made along the way are staged and applied step by step.
 */
export function Wizard({
  editor,
  session,
  onError,
}: {
  editor: Gr55Editor;
  session: MidiSession;
  onError: (error: unknown) => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const sync = useSync();
  const system = useSystem();
  useSystemVersion(system);
  const syncState = useSyncState(sync);
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  const { apply } = useApplySystem(onError);
  const [setup, setSetup] = useState<SetupState>(() => loadSetup());
  const [index, setIndex] = useState(() => {
    const first = SETUP_STEPS.findIndex((step) => loadSetup().steps[step] === undefined);
    return first < 0 ? 0 : first;
  });
  const [backupSaved, setBackupSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const step = SETUP_STEPS[index];
  const last = index === SETUP_STEPS.length - 1;

  const keep = (next: SetupState) => {
    setSetup(next);
    saveSetup(next);
  };

  const activeName = () => {
    const active = system.read(SYSTEM.common.gkSetSelect);
    const name = system.read(gkSet(active.ok ? active.value + 1 : 1).name);
    return name.ok ? name.value.trim() : '';
  };

  // Whether a step can be left as done, or only as knowingly skipped.
  const satisfied: Record<SetupStep, boolean> = {
    rig: setup.rigName.trim() !== '',
    mode: true,
    instruments: system.loaded && activeName() !== '',
    output: true,
    pedals: true,
    midi: true,
    backup: backupSaved || setup.steps.backup === 'ok',
    sync: synced(syncState.phase),
  };

  const leave = async (outcome: StepOutcome) => {
    setBusy(true);
    try {
      // Whatever this step staged goes to the pedal before the next one opens.
      if (!(await apply())) {
        return;
      }
      const steps = { ...setup.steps, [step]: outcome };
      if (last) {
        keep({ ...setup, steps, complete: true });
        void navigate(stageHref);
      } else {
        keep({ ...setup, steps });
        setIndex(index + 1);
      }
    } finally {
      setBusy(false);
    }
  };

  const mark = (candidate: SetupStep) =>
    setup.steps[candidate] === 'ok' ? '✅' : setup.steps[candidate] === 'warn' ? '⚠️' : '○';

  return (
    <div className="wizard">
      <header>
        {/* A first setup is walked in order; once done, it is a screen like the others. */}
        {setup.complete && <TopNav current="device" />}
        <h1>{t('wizard.title')}</h1>
        <p className="hint">{t('wizard.intro')}</p>
      </header>

      <ol className="wizard-steps">
        {SETUP_STEPS.map((candidate, position) => (
          <li key={candidate}>
            <button
              type="button"
              aria-current={position === index ? 'step' : undefined}
              disabled={busy}
              onClick={() => setIndex(position)}
            >
              <span
                aria-label={t(`wizard.status.${setup.steps[candidate] ?? 'todo'}`)}
                title={t(`wizard.status.${setup.steps[candidate] ?? 'todo'}`)}
              >
                {mark(candidate)}
              </span>{' '}
              {t(`wizard.steps.${candidate}`)}
            </button>
          </li>
        ))}
      </ol>

      <section className="section wizard-step">
        <p className="wizard-count">{t('wizard.step', index + 1, SETUP_STEPS.length)}</p>
        <h2>{t(`wizard.steps.${step}`)}</h2>

        {step === 'rig' && (
          <>
            <p className="hint">{t('wizard.rigIntro')}</p>
            <LocaleSwitch inline />
            <label className="wizard-field">
              {t('wizard.rigName')}
              <input
                type="text"
                value={setup.rigName}
                placeholder={t('wizard.rigNamePlaceholder')}
                onChange={(event) => keep({ ...setup, rigName: event.target.value })}
              />
            </label>
          </>
        )}

        {step === 'mode' && (
          <>
            <p className="hint">{t('wizard.modeIntro')}</p>
            <p>
              <span className="scope chip-blue">
                <span className="dot" aria-hidden="true" />
                {t('gr55.workspace.pedal')}
              </span>{' '}
              {t('wizard.modeNow', t(`gr55.mode.${gkMode}`))}
            </p>
            <SystemGate>
              <ModeSwitch editor={editor} onError={onError} />
            </SystemGate>
          </>
        )}

        {step === 'instruments' && (
          <>
            <p className="hint">{t('wizard.instrumentsIntro')}</p>
            <SystemGate>
              <GkSetList editor={editor} session={session} />
            </SystemGate>
          </>
        )}

        {step === 'output' && (
          <>
            <p className="hint">{t('wizard.outputIntro')}</p>
            <p className="hint">{t('system.outputIntro')}</p>
            <SystemGate>
              <OutputFields />
            </SystemGate>
          </>
        )}

        {step === 'pedals' && (
          <>
            <p className="hint">{t('wizard.pedalsIntro')}</p>
            <p className="hint">{t('system.pedalsIntro')}</p>
            <SystemGate>
              <PedalFields />
            </SystemGate>
          </>
        )}

        {step === 'midi' && (
          <>
            <p className="hint">{t('wizard.midiIntro')}</p>
            <SystemGate>
              <MidiFields />
            </SystemGate>
          </>
        )}

        {step === 'backup' && (
          <SystemGate>
            <BackupStep editor={editor} onSaved={() => setBackupSaved(true)} />
          </SystemGate>
        )}

        {step === 'sync' && (
          <>
            <p className="hint">{t('wizard.syncIntro')}</p>
            <SyncProgress />
          </>
        )}

        <div className="actions wizard-actions">
          <button type="button" disabled={busy || index === 0} onClick={() => setIndex(index - 1)}>
            {t('wizard.back')}
          </button>
          {satisfied[step] ? (
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() => void leave('ok')}
            >
              {last
                ? t('wizard.finish')
                : system.changeCount > 0
                  ? t('wizard.applyAndNext')
                  : t('wizard.next')}
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => void leave('warn')}>
              ⚠️ {last ? t('wizard.finish') : t('wizard.skip')}
            </button>
          )}
        </div>
        {system.changeCount > 0 && (
          <p className="hint">
            <span className="scope chip-blue">
              <span className="dot" aria-hidden="true" />
              {t('gr55.workspace.pedal')}
            </span>{' '}
            {t('system.pending', system.changeCount)} — {t('system.pendingHint')}{' '}
            <button type="button" disabled={busy} onClick={() => system.discard()}>
              {t('system.discard')}
            </button>
          </p>
        )}
      </section>
    </div>
  );
}
