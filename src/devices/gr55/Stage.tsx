import { useState, useSyncExternalStore } from 'react';
import { useT } from '../../copy';
import type {
  BooleanField,
  FieldReference,
  FieldType,
  NumericField,
} from '../../protocol/RolandAddressMap';
import { InstrumentIcon } from './Icons';
import { confirmDiscard } from './dirtyGuard';
import type { Gr55Editor } from './editor';
import { TEMPORARY_PATCH } from './patchLayout';
import { loadSetup } from './setupState';
import { slotsOfMode } from './slots';
import type { Slot } from './slots';
import { iconsOf, POWER_SWITCHES, voiceTitle, voicesOf } from './voices';
import type { VoiceState } from './voices';
import { useSlotNames, useSync } from './sync/SyncBadge';

const patch = TEMPORARY_PATCH;

interface VoiceFields {
  level: FieldReference<NumericField>;
  mute: FieldReference<BooleanField>;
}

/** Where each instrument's mute and level live in the patch. */
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

/** One instrument: icon, name, a mute switch, and how loud it sits in the mix. */
function VoiceRow({ editor, voice }: { editor: Gr55Editor; voice: VoiceState }) {
  const t = useT();
  const fields = VOICE_FIELDS[voice.id];
  const { type } = fields.level.definition;
  return (
    <li className={voice.muted ? 'voice-row muted' : 'voice-row'}>
      <span className="voice-icon">
        <InstrumentIcon kind={voice.icon} title={voiceTitle(voice.icon, t)} />
      </span>
      <span className="voice-name">{t(`voices.${voice.id}`)}</span>
      <MuteSwitch
        voice={voice}
        onToggle={() => editor.write(fields.mute!, !voice.muted as never)}
      />
      <input
        type="range"
        min={type.min}
        max={type.max}
        step={type.step}
        value={voice.level ?? 0}
        disabled={voice.muted}
        onChange={(event) => editor.write(fields.level, Number(event.target.value) as never)}
        aria-label={t(`voices.${voice.id}`)}
      />
      <output className="voice-level">{voice.level ?? '—'}</output>
    </li>
  );
}

/** Whether one instrument plays at all: the pedal's inverted mute switch. */
function MuteSwitch({ voice, onToggle }: { voice: VoiceState; onToggle: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      className={voice.muted ? 'simple-switch' : 'simple-switch on'}
      aria-pressed={voice.muted ? 'false' : 'true'}
      title={voice.muted ? t('voices.mute') : t('stage.on')}
      onClick={onToggle}
    >
      <span className="simple-switch-track" aria-hidden="true">
        <span className="simple-switch-knob" />
      </span>
      <span className="voice-screen">{t(`voices.${voice.id}`)}</span>
    </button>
  );
}

/** One of the three patches of a bank, drawn like a key on the pedal's face. */
function FootPatch({
  editor,
  onError,
  slot,
  name,
  bytes,
  active,
  busy,
  onMoved,
}: {
  editor: Gr55Editor;
  onError: (error: unknown) => void;
  slot: Slot;
  name: string | undefined;
  bytes: Uint8Array | undefined;
  active: boolean;
  busy: boolean;
  onMoved: () => void;
}) {
  const t = useT();
  const pick = () => {
    if (busy || !confirmDiscard(editor)) {
      return;
    }
    editor.selectPatch(slot.bankMsb, slot.programChange).catch(onError).finally(onMoved);
  };
  return (
    <button
      type="button"
      className={active ? 'foot-patch active' : 'foot-patch'}
      aria-pressed={active}
      disabled={busy}
      onClick={pick}
    >
      <span className="foot-number">{slot.label}</span>
      <span className="foot-name">{name ?? t('stage.notSynced')}</span>
      <span className="foot-voices">
        {iconsOf(bytes).map((kind) => (
          <InstrumentIcon key={kind} kind={kind} title={voiceTitle(kind, t)} />
        ))}
      </span>
    </button>
  );
}

/**
 * The stage: now. The patch sounding this instant — style, bank-patch and name,
 * the three keys of its bank and the bank itself, as if you held the pedal —
 * and the sound of the patch as instruments.
 */
export function Stage({
  editor,
  onError,
}: {
  editor: Gr55Editor;
  onError: (error: unknown) => void;
}) {
  const t = useT();
  const sync = useSync();
  const cachedName = useSlotNames(sync);
  // Follows the pedal: a patch change or a parameter touched on the pedal re-renders.
  useSyncExternalStore(editor.subscribe, editor.patchSnapshot);
  useSyncExternalStore(sync.subscribe, sync.slotsSnapshot);
  const [rigName] = useState(() => loadSetup().rigName);
  const [busy, setBusy] = useState(false);

  const sounding =
    editor.patchSource?.kind === 'slot' ? editor.patchSource.userPatchNumber : undefined;
  const slots = slotsOfMode(editor.gkMode);
  const where =
    sounding !== undefined ? slots.find((s) => s.userPatchNumber === sounding) : undefined;

  /** The UI bank number of a patch, from its pedal label ("04-2" → 4). */
  const bankOf = (slot: Slot) => Number(slot.label.slice(0, slot.label.indexOf('-')));
  /** Which key of its bank a patch is ("04-2" → 2). */
  const indexInBank = (slot: Slot) => Number(slot.label.slice(slot.label.indexOf('-') + 1));

  const bank = where ? bankOf(where) : undefined;
  const bankSlots = bank === undefined ? [] : slots.filter((s) => bankOf(s) === bank);
  /** The patch at the same key of the neighbouring bank; the pedal keeps the same place. */
  const neighbour = (targetBank: number) =>
    slots.find(
      (s) => bankOf(s) === targetBank && indexInBank(s) === (where ? indexInBank(where) : 0),
    ) ?? slots.find((s) => bankOf(s) === targetBank);
  const previous = bank === undefined ? undefined : neighbour(bank - 1);
  const next = bank === undefined ? undefined : neighbour(bank + 1);

  const move = (slot: Slot) => {
    if (busy || !confirmDiscard(editor)) {
      return;
    }
    setBusy(true);
    editor
      .selectPatch(slot.bankMsb, slot.programChange)
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

  return (
    <main className="stage">
      {rigName && <p className="stage-rig">{rigName}</p>}
      {editor.changeCount > 0 && (
        <p className="notice stage-notice" role="alert">
          {t('stage.playingCopy')}
        </p>
      )}

      <section className="stage-now">
        <h2>{t('stage.now')}</h2>
        <p className="stage-where">
          <strong>
            {t('stage.userMark')} {where ? where.label : '—'}
          </strong>{' '}
          {editor.patchName || t('gr55.unnamed')}
        </p>
      </section>

      <section className="stage-feet" aria-label={t('stage.feet')}>
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
                    editor={editor}
                    onError={onError}
                    slot={slot}
                    name={cachedName(slot.userPatchNumber)}
                    bytes={sync.slot(slot.userPatchNumber)?.bytes}
                    active={sounding === slot.userPatchNumber}
                    busy={busy}
                    onMoved={() => undefined}
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
          </>
        ) : (
          <p className="hint">{t('stage.unknownSlot')}</p>
        )}
      </section>

      <section className="stage-mixer">
        <h2>{t('stage.sound')}</h2>
        <ul className="voice-list">
          {voices.map((voice) => (
            <VoiceRow key={voice.id} editor={editor} voice={voice} />
          ))}
        </ul>
        <div className="stage-master">
          <span className="voice-icon">
            <InstrumentIcon kind="master" title={t('voices.master')} />
          </span>
          <label className="stage-master-label" htmlFor="stage-master-level">
            {t('voices.master')}
          </label>
          <input
            id="stage-master-level"
            type="range"
            min={MASTER.definition.type.min}
            max={MASTER.definition.type.max}
            step={MASTER.definition.type.step}
            value={patchLevel}
            onChange={(event) => editor.write(MASTER, Number(event.target.value) as never)}
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
                onClick={() => editor.write(item.field, !on)}
              >
                <InstrumentIcon kind={item.id} title={t(`voices.${item.id}`)} />
                {t(`voices.${item.id}`)}
              </button>
            );
          })}
        </div>
        <p className="hint stage-mixer-hint">{t('stage.mixerHint')}</p>
      </section>
    </main>
  );
}
