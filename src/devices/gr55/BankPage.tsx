import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useT } from '../../copy';
import type {
  BooleanField,
  FieldReference,
  FieldType,
  NumericField,
} from '../../protocol/RolandAddressMap';
import { InstrumentIcon } from './Icons';
import type { Gr55Editor } from './editor';
import { FieldControl } from './FieldControl';
import { TEMPORARY_PATCH } from './patchLayout';
import { asSnapshotSource, snapshotFieldHost } from './snapshotHost';
import { runAppMutation } from './sessionAuthority';
import { slotsOfMode } from './slots';
import type { Slot } from './slots';
import { useSystem } from './SystemParts';
import { iconsOf, POWER_SWITCHES, voiceTitle, voicesOf } from './voices';
import type { VoiceState } from './voices';

const patch = TEMPORARY_PATCH;

interface VoiceFields {
  level: FieldReference<NumericField>;
  mute: FieldReference<BooleanField>;
}

const VOICE_FIELDS: Record<VoiceState['id'], VoiceFields> = {
  pcm1: {
    level: patch.patchPCMTone1.partLevel as FieldReference<NumericField>,
    mute: patch.patchPCMTone1.muteSwitch as FieldReference<BooleanField>,
  },
  pcm2: {
    level: patch.patchPCMTone2.partLevel as FieldReference<NumericField>,
    mute: patch.patchPCMTone2.muteSwitch as FieldReference<BooleanField>,
  },
  modeling: {
    level: patch.modelingTone.level as FieldReference<NumericField>,
    mute: patch.modelingTone.muteSwitch as FieldReference<BooleanField>,
  },
  normalPickup: {
    level: patch.common.normalPuLevel as FieldReference<NumericField>,
    mute: patch.common.normalPuMute as FieldReference<BooleanField>,
  },
};

const MASTER: FieldReference<NumericField> = patch.common
  .patchLevel as FieldReference<NumericField>;

function bankOf(slot: Slot): number {
  return Number(slot.label.slice(0, slot.label.indexOf('-')));
}

function indexInBank(slot: Slot): number {
  return Number(slot.label.slice(slot.label.indexOf('-') + 1));
}

function VoiceRow({
  host,
  voice,
}: {
  host: ReturnType<typeof snapshotFieldHost>;
  voice: VoiceState;
}) {
  const t = useT();
  const fields = VOICE_FIELDS[voice.id];
  const { type } = fields.level.definition;
  return (
    <li className={voice.muted ? 'voice-row muted' : 'voice-row'}>
      <span className="voice-icon">
        <InstrumentIcon kind={voice.icon} title={voiceTitle(voice.icon, t)} />
      </span>
      <span className="voice-name">{t(`voices.${voice.id}`)}</span>
      <button
        type="button"
        className={voice.muted ? 'simple-switch' : 'simple-switch on'}
        aria-pressed={voice.muted ? 'false' : 'true'}
        title={voice.muted ? t('voices.mute') : t('stage.on')}
        onClick={() => host.write(fields.mute, !voice.muted as never)}
      >
        <span className="simple-switch-track" aria-hidden="true">
          <span className="simple-switch-knob" />
        </span>
      </button>
      <input
        type="range"
        min={type.min}
        max={type.max}
        step={type.step}
        value={voice.level ?? 0}
        disabled={voice.muted}
        onChange={(event) => host.write(fields.level, Number(event.target.value) as never)}
        aria-label={t(`voices.${voice.id}`)}
      />
      <output className="voice-level">{voice.level ?? '—'}</output>
    </li>
  );
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
  /** Live working-copy icons when this key is sounding. */
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
 * Bank: here (USER xx-y), the three keys, CTL / expression, instruments and effects.
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
  useSyncExternalStore(editor.subscribe, editor.patchSnapshot);
  const source = useMemo(() => asSnapshotSource({ editor, system }), [editor, system]);
  const host = useMemo(
    () => snapshotFieldHost(editor, source, onError),
    [editor, source, onError],
  );
  const [busy, setBusy] = useState(false);
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
  const masterLevel = editor.read(MASTER);
  const patchLevel = masterLevel.ok ? masterLevel.value : 0;
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
                    icons={
                      sounding === slot.userPatchNumber ? liveIcons : undefined
                    }
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

      <section className="patch-section bank-pedals">
        <h2>{t('gr55.bankPedals')}</h2>
        <div className="fields">
          <FieldControl
            editor={host}
            field={patch.common.ctl.function}
            label={t('system.fields.ctl')}
            enumGroup="pedalFunction"
          />
          <FieldControl
            editor={host}
            field={patch.common.expPdlOff.function}
            label={t('system.fields.expOff')}
            enumGroup="pedalFunction"
          />
          <FieldControl
            editor={host}
            field={patch.common.expPdlOn.function}
            label={t('system.fields.expOn')}
            enumGroup="pedalFunction"
          />
          <FieldControl
            editor={host}
            field={patch.common.expSw.function}
            label={t('system.fields.expSw')}
            enumGroup="pedalFunction"
          />
        </div>
      </section>

      <section className="stage-mixer">
        <h2>{t('stage.sound')}</h2>
        <ul className="voice-list">
          {voices.map((voice) => (
            <VoiceRow key={voice.id} host={host} voice={voice} />
          ))}
        </ul>
        <div className="stage-master">
          <span className="voice-icon">
            <InstrumentIcon kind="master" title={t('voices.master')} />
          </span>
          <label className="stage-master-label" htmlFor="bank-master-level">
            {t('voices.master')}
          </label>
          <input
            id="bank-master-level"
            type="range"
            min={MASTER.definition.type.min}
            max={MASTER.definition.type.max}
            step={MASTER.definition.type.step}
            value={patchLevel}
            onChange={(event) => host.write(MASTER, Number(event.target.value) as never)}
          />
        </div>
        <div className="stage-chain" role="group" aria-label={t('stage.onOff')}>
          {POWER_SWITCHES.map((item) => {
            const state = editor.read(item.field);
            const on = state.ok && state.value;
            return (
              <button
                key={item.id}
                type="button"
                className={on ? 'stage-switch on' : 'stage-switch'}
                aria-pressed={on ? 'true' : 'false'}
                onClick={() => host.write(item.field, !on)}
              >
                <InstrumentIcon kind={item.id} title={t(`voices.${item.id}`)} />
                {t(`voices.${item.id}`)}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
