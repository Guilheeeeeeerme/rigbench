import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useT } from '../../copy';
import { InstrumentIcon } from './Icons';
import type { Gr55Editor } from './editor';
import { AdvancedPatchEditor } from './AdvancedPatchEditor';
import { SimpleProfiles } from './SimpleProfiles';
import { ToneDeck } from './ToneDeck';
import { asSnapshotSource, snapshotFieldHost } from './snapshotHost';
import { runAppMutation } from './sessionAuthority';
import { slotsOfMode } from './slots';
import type { Slot } from './slots';
import { useSystem } from './SystemParts';
import { iconsOf, voiceTitle, voicesOf } from './voices';
import type { PageId } from './pages';
import type { FieldReference, FieldType } from '../../protocol/RolandAddressMap';

const MODE_KEY = 'rigbench.bankMode';

type BankMode = 'simple' | 'advanced';

function loadMode(): BankMode {
  try {
    const raw = sessionStorage.getItem(MODE_KEY);
    return raw === 'advanced' ? 'advanced' : 'simple';
  } catch {
    return 'simple';
  }
}

function bankOf(slot: Slot): number {
  return Number(slot.label.slice(0, slot.label.indexOf('-')));
}

function indexInBank(slot: Slot): number {
  return Number(slot.label.slice(slot.label.indexOf('-') + 1));
}

function FootPatch({
  slot,
  name,
  bytes,
  icons,
  active,
  busy,
  onPick,
}: {
  slot: Slot;
  name: string | undefined;
  bytes: Uint8Array | undefined;
  icons?: ReturnType<typeof iconsOf>;
  active: boolean;
  busy: boolean;
  onPick: () => void;
}) {
  const t = useT();
  const shown = icons ?? iconsOf(bytes);
  return (
    <button
      type="button"
      className={active ? 'foot-patch active' : 'foot-patch'}
      aria-pressed={active}
      disabled={busy}
      onClick={onPick}
    >
      <span className="foot-number">{slot.label}</span>
      <span className="foot-name">{name ?? t('stage.notSynced')}</span>
      <span className="foot-voices">
        {shown.map((kind) => (
          <InstrumentIcon key={kind} kind={kind} title={voiceTitle(kind, t)} />
        ))}
      </span>
    </button>
  );
}

/**
 * Bank: here (USER xx-y), the three keys, Tone Deck, Simple profiles / Advanced editor.
 * Maestro on this page may configure the whole bank set (switch keys + edit sounding patch).
 */
export function BankPage({
  editor,
  onError,
}: {
  editor: Gr55Editor;
  onError: (error: unknown) => void;
}) {
  const t = useT();
  const system = useSystem();
  const patchVersion = useSyncExternalStore(editor.subscribe, editor.patchSnapshot);
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  const source = useMemo(() => asSnapshotSource({ editor, system }), [editor, system]);
  const host = useMemo(
    () => snapshotFieldHost(editor, source, onError),
    [editor, source, onError],
  );
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<BankMode>(loadMode);
  const [advancedPage, setAdvancedPage] = useState<PageId | undefined>();
  const [slotMeta, setSlotMeta] = useState<
    Record<number, { name: string; bytes: Uint8Array | undefined }>
  >({});

  const sounding =
    editor.patchSource?.kind === 'slot' ? editor.patchSource.userPatchNumber : undefined;
  const slots = slotsOfMode(editor.gkMode);
  const where =
    sounding !== undefined ? slots.find((slot) => slot.userPatchNumber === sounding) : undefined;
  const bank = where ? bankOf(where) : undefined;
  const bankSlots = bank === undefined ? [] : slots.filter((slot) => bankOf(slot) === bank);

  const neighbour = (targetBank: number) =>
    slots.find(
      (slot) =>
        bankOf(slot) === targetBank && indexInBank(slot) === (where ? indexInBank(where) : 0),
    ) ?? slots.find((slot) => bankOf(slot) === targetBank);
  const previous = bank === undefined ? undefined : neighbour(bank - 1);
  const next = bank === undefined ? undefined : neighbour(bank + 1);

  useEffect(() => {
    if (bankSlots.length === 0) {
      return;
    }
    let cancelled = false;
    void Promise.all(
      bankSlots.map(async (slot) => {
        const [name, bytes] = await Promise.all([
          editor.readUserPatchName(slot.userPatchNumber),
          editor.readUserPatchProbe(slot.userPatchNumber).catch(() => undefined),
        ]);
        return [slot.userPatchNumber, { name, bytes }] as const;
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }
      setSlotMeta(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [editor, bank, bankSlots.map((slot) => slot.userPatchNumber).join(',')]);

  const setBankMode = (nextMode: BankMode, pageId?: PageId) => {
    if (nextMode === 'advanced') {
      setAdvancedPage(pageId);
    } else {
      setAdvancedPage(undefined);
    }
    setMode(nextMode);
    try {
      sessionStorage.setItem(MODE_KEY, nextMode);
    } catch {
      /* ignore */
    }
  };

  const move = (slot: Slot) => {
    if (busy) {
      return;
    }
    setBusy(true);
    void runAppMutation(
      () => editor.selectPatch(slot.bankMsb, slot.programChange),
      source,
    )
      .catch(onError)
      .finally(() => setBusy(false));
  };

  const read = (field: never) => {
    const result = editor.read(field as FieldReference<FieldType<never>>);
    return result.ok ? result.value : undefined;
  };
  const voices = voicesOf(read);
  const liveIcons = voices
    .filter((voice) => !voice.muted && (voice.level ?? 0) > 0)
    .map((voice) => voice.icon);

  return (
    <div className="app-page bank-page stage">
      <header className="app-page-header">
        <div>
          <h1>{t('gr55.navBank')}</h1>
          <p className="stage-where">
            <strong>
              {t('stage.userMark')} {where ? where.label : '—'}
            </strong>{' '}
            {editor.patchName || t('gr55.unnamed')}
          </p>
        </div>
        <div
          className="bank-mode-toggle"
          role="group"
          aria-label={t('gr55.bankMode.label')}
        >
          <button
            type="button"
            className={mode === 'simple' ? 'active' : undefined}
            aria-pressed={mode === 'simple'}
            onClick={() => setBankMode('simple')}
          >
            {t('gr55.bankMode.simple')}
          </button>
          <button
            type="button"
            className={mode === 'advanced' ? 'active' : undefined}
            aria-pressed={mode === 'advanced'}
            onClick={() => setBankMode('advanced')}
          >
            {t('gr55.bankMode.advanced')}
          </button>
        </div>
      </header>

      <section className="stage-feet" aria-label={t('stage.feet')}>
        <h2>{t('gr55.bankHere')}</h2>
        {where ? (
          <>
            <div className="stage-bank">
              <button
                type="button"
                className="foot-bank"
                disabled={busy || !previous}
                onClick={() => previous && move(previous)}
              >
                ←{' '}
                <strong>
                  {t('stage.bankMark')}{' '}
                  {previous ? previous.label.slice(0, previous.label.indexOf('-')) : ''}
                </strong>
              </button>
              <div className="stage-bank-keys">
                {bankSlots.map((slot) => (
                  <FootPatch
                    key={slot.userPatchNumber}
                    slot={slot}
                    name={
                      sounding === slot.userPatchNumber
                        ? editor.patchName || slotMeta[slot.userPatchNumber]?.name
                        : slotMeta[slot.userPatchNumber]?.name
                    }
                    bytes={slotMeta[slot.userPatchNumber]?.bytes}
                    icons={sounding === slot.userPatchNumber ? liveIcons : undefined}
                    active={sounding === slot.userPatchNumber}
                    busy={busy}
                    onPick={() => move(slot)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="foot-bank"
                disabled={busy || !next}
                onClick={() => next && move(next)}
              >
                <strong>
                  {t('stage.bankMark')} {next ? next.label.slice(0, next.label.indexOf('-')) : ''}
                </strong>{' '}
                →
              </button>
            </div>
            <p className="hint">{t('stage.gapWarn')}</p>
            <p className="hint">{t('gr55.bankChatHint')}</p>
          </>
        ) : (
          <p className="hint">{t('stage.unknownSlot')}</p>
        )}
      </section>

      <ToneDeck host={host} gkMode={gkMode} showPowerChips={mode === 'simple'} />

      {mode === 'simple' ? (
        <SimpleProfiles
          editor={editor}
          source={source}
          onError={onError}
          onOpenAdvanced={(pageId) => setBankMode('advanced', pageId)}
        />
      ) : (
        <AdvancedPatchEditor
          host={host}
          gkMode={gkMode}
          patchVersion={patchVersion}
          initialPageId={advancedPage}
        />
      )}
    </div>
  );
}
