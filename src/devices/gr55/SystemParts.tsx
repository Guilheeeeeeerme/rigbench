import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { useEnumLabel, useT } from '../../copy';
import type { CopyKey, EnumGroup, Translate } from '../../copy';
import type { FieldReference } from '../../protocol/RolandAddressMap';
import type { GkMode, Gr55Editor } from './editor';
import { FieldControl } from './FieldControl';
import { useSync } from './sync/SyncBadge';
import { SCALE_BASE_MM, SCALE_MAX_MM, SYSTEM } from './systemMap';
import type { Gr55System, SystemChange } from './systemState';

const SystemContext = createContext<Gr55System | undefined>(undefined);

export const SystemProvider = SystemContext.Provider;

/** The pedal-wide settings of the connected pedal. */
export function useSystem(): Gr55System {
  const system = useContext(SystemContext);
  if (!system) {
    throw new Error('useSystem needs a connected pedal above it');
  }
  return system;
}

/** Re-renders whenever a pedal-wide setting is staged, applied or read. */
export function useSystemVersion(system: Gr55System): number {
  return useSyncExternalStore(system.subscribe, system.snapshot);
}

type FieldKey = keyof typeof FIELD_LABELS;

const FIELD_LABELS = {
  activeGkSet: SYSTEM.common.gkSetSelect,
  outputSelect: SYSTEM.common.outputSelect,
  guitarOut: SYSTEM.common.guitarOutSource,
  rxSwitch: SYSTEM.common.rxSwitch,
  txSwitch: SYSTEM.common.txSwitch,
  channel: SYSTEM.common.patchControlChannel,
  guitarToMidi: SYSTEM.common.guitarToMidiSwitch,
  guitarToMidiMode: SYSTEM.common.guitarToMidiMode,
  stringChannels: SYSTEM.common.guitarToMidiStringChannel,
  usbMonitor: SYSTEM.common.usbDirectMonitor,
  ctl: SYSTEM.pedals.ctlFunction,
  expOff: SYSTEM.pedals.expOffFunction,
  expOn: SYSTEM.pedals.expOnFunction,
  expSw: SYSTEM.pedals.expSwFunction,
  gkVol: SYSTEM.pedals.gkVolFunction,
  gkS1: SYSTEM.pedals.gkS1Function,
  gkS2: SYSTEM.pedals.gkS2Function,
} satisfies Record<string, FieldReference>;

const LABEL_BY_ADDRESS = new Map<number, FieldKey>(
  (Object.keys(FIELD_LABELS) as FieldKey[]).map((key) => [FIELD_LABELS[key].address, key]),
);

const ENUM_GROUPS: Partial<Record<FieldKey, EnumGroup>> = {
  outputSelect: 'outputSelect',
  guitarOut: 'guitarOut',
  guitarToMidiMode: 'midiMode',
  ctl: 'pedalFunction',
  expOff: 'pedalFunction',
  expOn: 'pedalFunction',
  expSw: 'pedalFunction',
  gkVol: 'pedalFunction',
  gkS1: 'pedalFunction',
  gkS2: 'pedalFunction',
};

// GK set fields are labelled by the parameter, whichever of the ten sets they sit in.
const GK_LABELS: Record<string, CopyKey> = {
  Name: 'gk.name',
  'PU Type': 'gk.puType',
  Scale: 'gk.scale',
  'PU Phase': 'gk.puPhase',
  'PU Direction': 'gk.puDirection',
  'S1/S2 Position': 'gk.s1s2',
  'Normal PU Gain': 'gk.normalGain',
};

const GK_ENUM_GROUPS: Record<string, EnumGroup> = {
  'PU Type': 'puType',
  'PU Phase': 'polarity',
  'PU Direction': 'polarity',
  'S1/S2 Position': 'polarity',
};

/** A value of a pedal-wide setting as the screens show it, not as the pedal stores it. */
function systemValue(
  t: Translate,
  enumLabel: (group: EnumGroup, raw: string) => string,
  change: Pick<SystemChange, 'field' | 'gkSet'>,
  value: string,
): string {
  const { description } = change.field.definition;
  if (change.gkSet !== undefined) {
    if (description === 'Scale') {
      const stored = Number(value);
      return stored <= SCALE_MAX_MM - SCALE_BASE_MM
        ? t('gk.scaleMm', stored + SCALE_BASE_MM)
        : t('gk.scalePresetOnPedal');
    }
    const group = GK_ENUM_GROUPS[description];
    return group ? enumLabel(group, value) : value.trim() || t('gk.unnamed');
  }
  const key = LABEL_BY_ADDRESS.get(change.field.address);
  const group = key ? ENUM_GROUPS[key] : undefined;
  return group ? enumLabel(group, value) : value;
}

/** The name of a pedal-wide setting in the chosen language. */
export function systemLabel(t: Translate, change: Pick<SystemChange, 'field' | 'gkSet'>): string {
  const { description } = change.field.definition;
  if (change.gkSet !== undefined) {
    const string = /^String (\d) Sens$/.exec(description);
    const label = string
      ? t('gk.string', Number(string[1]))
      : GK_LABELS[description]
        ? (t as (key: CopyKey) => string)(GK_LABELS[description])
        : description;
    return t('system.inGkSet', change.gkSet, label);
  }
  const key = LABEL_BY_ADDRESS.get(change.field.address);
  return key ? t(`system.fields.${key}`) : description;
}

/** One pedal-wide setting, as a control that stages its change. */
export function SystemField({ name }: { name: FieldKey }) {
  const t = useT();
  const system = useSystem();
  return (
    <FieldControl
      editor={system}
      field={FIELD_LABELS[name]}
      label={t(`system.fields.${name}`)}
      enumGroup={ENUM_GROUPS[name]}
      picker={name === 'activeGkSet' || name === 'channel'}
    />
  );
}

/** Reads the pedal-wide settings the first time a screen needs them. */
export function SystemGate({ children }: { children: ReactNode }) {
  const t = useT();
  const system = useSystem();
  useSystemVersion(system);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (system.loaded) {
      return;
    }
    let current = true;
    system.load().catch(() => {
      if (current) {
        setFailed(true);
      }
    });
    return () => {
      current = false;
    };
  }, [system, attempt]);

  if (system.loaded) {
    return <>{children}</>;
  }
  return failed ? (
    <div className="section">
      <p className="error" role="alert">
        {t('system.readFailed')}
      </p>
      <button
        type="button"
        onClick={() => {
          setFailed(false);
          setAttempt((count) => count + 1);
        }}
      >
        {t('system.retry')}
      </button>
    </div>
  ) : (
    <p className="status" role="status">
      {t('system.reading')}
    </p>
  );
}

/** Applies the staged pedal-wide changes after a confirmation that names each one. */
export function useApplySystem(onError: (error: unknown) => void) {
  const t = useT();
  const enumLabel = useEnumLabel();
  const system = useSystem();
  const sync = useSync();
  const describe = (change: SystemChange) =>
    t(
      'system.change',
      systemLabel(t, change),
      systemValue(t, enumLabel, change, change.from),
      systemValue(t, enumLabel, change, change.to),
    );
  /** Resolves true when the changes are on the pedal, false when the musician backed out. */
  const apply = async (): Promise<boolean> => {
    const changes = system.changes;
    if (changes.length === 0) {
      return true;
    }
    const list = changes.map((change) => `• ${describe(change)}`).join('\n');
    if (!window.confirm(t('system.confirmApply', changes.length, list))) {
      return false;
    }
    try {
      // Sync reads would collide with the writes: hold it while they go out.
      await sync.exclusive(() => system.apply());
      return true;
    } catch (error) {
      onError(error);
      return false;
    }
  };
  return { apply, describe };
}

/** The staged pedal-wide changes, listed, with the two ways out: apply or discard. */
export function ApplyBar({ onError }: { onError: (error: unknown) => void }) {
  const t = useT();
  const system = useSystem();
  useSystemVersion(system);
  const { apply, describe } = useApplySystem(onError);
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState<number>();
  const changes = system.changes;

  if (changes.length === 0) {
    return applied === undefined ? null : (
      <p className="status" role="status">
        {t('system.applied', applied)}
      </p>
    );
  }
  return (
    <section className="apply-bar" aria-live="polite">
      <strong>
        <span className="scope chip-blue">
          <span className="dot" aria-hidden="true" />
          {t('gr55.workspace.pedal')}
        </span>{' '}
        {t('system.pending', changes.length)}
      </strong>
      <ul>
        {changes.map((change) => (
          <li key={change.field.address}>{describe(change)}</li>
        ))}
      </ul>
      <p className="hint">{t('system.pendingHint')}</p>
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => {
            const count = changes.length;
            setBusy(true);
            void apply()
              .then((done) => setApplied(done ? count : undefined))
              .finally(() => setBusy(false));
          }}
        >
          {t('system.apply')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setApplied(undefined);
            system.discard();
          }}
        >
          {t('system.discard')}
        </button>
      </div>
    </section>
  );
}

export function OutputFields() {
  return (
    <div className="fields">
      <SystemField name="outputSelect" />
      <SystemField name="guitarOut" />
    </div>
  );
}

export function PedalFields() {
  return (
    <div className="fields">
      <SystemField name="ctl" />
      <SystemField name="expOff" />
      <SystemField name="expOn" />
      <SystemField name="expSw" />
      <SystemField name="gkVol" />
      <SystemField name="gkS1" />
      <SystemField name="gkS2" />
    </div>
  );
}

export function MidiFields() {
  return (
    <div className="fields">
      <SystemField name="rxSwitch" />
      <SystemField name="txSwitch" />
      <SystemField name="channel" />
      <SystemField name="guitarToMidi" />
      <SystemField name="guitarToMidiMode" />
      <SystemField name="stringChannels" />
      <SystemField name="usbMonitor" />
    </div>
  );
}

/**
 * GUITAR ⇄ BASS. Not staged like the other pedal-wide settings: it remakes all 297 slots,
 * so it asks on its own, refuses over unsaved changes, and reads the pedal again after.
 */
export function ModeSwitch({
  editor,
  onError,
}: {
  editor: Gr55Editor;
  onError: (error: unknown) => void;
}) {
  const t = useT();
  const sync = useSync();
  const system = useSystem();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  // Keeps the warning in step with the unsaved-change count.
  useSyncExternalStore(editor.subscribe, () => editor.dirtySnapshot());

  const switchMode = (mode: GkMode) => {
    if (mode === gkMode) {
      return;
    }
    // A dirty working copy dies in the switch; refuse before the modal, not after.
    if (editor.isDirty) {
      window.alert(t('device.modeSwitchBlocked'));
      return;
    }
    if (!window.confirm(t('device.confirmMode', 0))) {
      return;
    }
    setBusy(true);
    // The other mode has its own 297 slots: hold the sync for the switch, then read them.
    void sync
      .exclusive(() => editor.setGuitarBassMode(mode))
      .then(() => system.load())
      .then(() => void sync.start())
      .then(() => setNotice(t('device.modeSwitchedTo', t(`gr55.mode.${mode}`))))
      .catch((reason: unknown) => onError(reason))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <div className="actions">
        {(['GUITAR', 'BASS'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={busy}
            aria-pressed={gkMode === mode}
            className={gkMode === mode ? 'primary' : undefined}
            onClick={() => switchMode(mode)}
          >
            {t(`gr55.mode.${mode}`)}
          </button>
        ))}
      </div>
      {notice && (
        <p className="status" role="status">
          {notice}
        </p>
      )}
      {editor.changeCount > 0 && (
        <p className="notice">{t('gr55.workspace.unsavedChanges', editor.changeCount)}</p>
      )}
    </>
  );
}
