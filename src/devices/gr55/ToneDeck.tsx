import { useMemo, useState, useSyncExternalStore } from 'react';
import { useT } from '../../copy';
import { isEnumField } from '../../protocol/RolandAddressMap';
import type {
  BooleanField,
  EnumField,
  FieldReference,
  FieldType,
  NumericField,
} from '../../protocol/RolandAddressMap';
import type { FieldHost } from './FieldControl';
import { InstrumentIcon } from './Icons';
import type { GkMode } from './editor';
import {
  modelingToneCatalog,
  modelingToneFields,
  readModelingToneLabel,
  type ModelingTonePick,
} from './modelingTones';
import { TEMPORARY_PATCH } from './patchLayout';
import { TonePicker } from './TonePicker';
import { POWER_SWITCHES, voiceTitle, voicesOf, type VoiceId } from './voices';

const patch = TEMPORARY_PATCH;

const MASTER = patch.common.patchLevel as FieldReference<NumericField>;

interface VoiceFields {
  level: FieldReference<NumericField>;
  mute: FieldReference<BooleanField>;
  tone?: FieldReference<EnumField>;
}

const VOICE_FIELDS: Record<VoiceId, VoiceFields> = {
  pcm1: {
    level: patch.patchPCMTone1.partLevel as FieldReference<NumericField>,
    mute: patch.patchPCMTone1.muteSwitch as FieldReference<BooleanField>,
    tone: patch.patchPCMTone1.toneSelect as FieldReference<EnumField>,
  },
  pcm2: {
    level: patch.patchPCMTone2.partLevel as FieldReference<NumericField>,
    mute: patch.patchPCMTone2.muteSwitch as FieldReference<BooleanField>,
    tone: patch.patchPCMTone2.toneSelect as FieldReference<EnumField>,
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

function enumLabels(field: FieldReference<EnumField>): string[] {
  const type = field.definition.type;
  if (!isEnumField(type)) return [];
  return Object.keys(type.labels)
    .map(Number)
    .sort((a, b) => a - b)
    .map((encoded) => String(type.labels[encoded]));
}

type PickerTarget =
  | { kind: 'pcm'; voice: 'pcm1' | 'pcm2' }
  | { kind: 'modeling' };

/**
 * Always-visible source mix: mute, level, tone name, and searchable tone pickers.
 * Never collapse this — tones and combinations stay first-class on Bank.
 */
export function ToneDeck({
  host,
  gkMode,
  showPowerChips = true,
}: {
  host: FieldHost;
  gkMode: GkMode;
  showPowerChips?: boolean;
}) {
  const t = useT();
  useSyncExternalStore(host.subscribe, () =>
    [
      VOICE_FIELDS.pcm1.mute.address,
      VOICE_FIELDS.pcm1.level.address,
      VOICE_FIELDS.pcm1.tone!.address,
      VOICE_FIELDS.pcm2.mute.address,
      VOICE_FIELDS.pcm2.level.address,
      VOICE_FIELDS.pcm2.tone!.address,
      VOICE_FIELDS.modeling.mute.address,
      VOICE_FIELDS.modeling.level.address,
      VOICE_FIELDS.normalPickup.mute.address,
      VOICE_FIELDS.normalPickup.level.address,
      MASTER.address,
      ...POWER_SWITCHES.map((item) => item.field.address),
    ].join('|'),
  );

  const [picker, setPicker] = useState<PickerTarget | null>(null);

  const read = (field: never) => {
    const result = host.read(field as FieldReference<FieldType<never>>);
    return result.ok ? result.value : undefined;
  };
  const voices = voicesOf(read);
  const masterResult = host.read(MASTER);
  const patchLevel = masterResult.ok ? masterResult.value : 0;

  const modelingCatalog = useMemo(() => modelingToneCatalog(gkMode), [gkMode]);
  const modelingLabel = readModelingToneLabel(gkMode, (field) => {
    const result = host.read(field as FieldReference<FieldType<never>>);
    return result.ok ? result.value : undefined;
  });

  const toneLabelOf = (voice: VoiceId): string => {
    if (voice === 'normalPickup') return t('voices.normalPickup');
    if (voice === 'modeling') return modelingLabel ?? t('gr55.toneDeck.noTone');
    const field = VOICE_FIELDS[voice].tone;
    if (!field) return t('gr55.toneDeck.noTone');
    const result = host.read(field);
    return result.ok && typeof result.value === 'string'
      ? result.value
      : t('gr55.toneDeck.noTone');
  };

  const openPicker = (voice: VoiceId) => {
    if (voice === 'pcm1' || voice === 'pcm2') setPicker({ kind: 'pcm', voice });
    else if (voice === 'modeling') setPicker({ kind: 'modeling' });
  };

  const pickerLabels =
    picker?.kind === 'pcm'
      ? enumLabels(VOICE_FIELDS[picker.voice].tone!)
      : picker?.kind === 'modeling'
        ? modelingCatalog.map((pick) => pick.label)
        : [];

  const pickerCurrent =
    picker?.kind === 'pcm'
      ? toneLabelOf(picker.voice)
      : picker?.kind === 'modeling'
        ? modelingLabel
        : undefined;

  const onPick = (label: string) => {
    if (!picker) return;
    if (picker.kind === 'pcm') {
      const field = VOICE_FIELDS[picker.voice].tone!;
      host.write(field, label as never);
      return;
    }
    const pick = modelingCatalog.find((item: ModelingTonePick) => item.label === label);
    if (!pick) return;
    const slot = modelingToneFields(gkMode, pick.category);
    if (!slot) return;
    host.write(slot.categoryField, pick.category as never);
    host.write(slot.numberField, pick.tone as never);
  };

  return (
    <section className="tone-deck" aria-label={t('gr55.toneDeck.title')}>
      <h2>{t('gr55.toneDeck.title')}</h2>
      <ul className="tone-deck-list">
        {voices.map((voice) => {
          const fields = VOICE_FIELDS[voice.id];
          const { type } = fields.level.definition;
          const canPick = voice.id !== 'normalPickup';
          return (
            <li key={voice.id} className={voice.muted ? 'tone-deck-row muted' : 'tone-deck-row'}>
              <span className="voice-icon">
                <InstrumentIcon kind={voice.icon} title={voiceTitle(voice.icon, t)} />
              </span>
              <div className="tone-deck-meta">
                <span className="voice-name">{t(`voices.${voice.id}`)}</span>
                {canPick ? (
                  <button
                    type="button"
                    className="tone-deck-tone"
                    onClick={() => openPicker(voice.id)}
                  >
                    <span>{toneLabelOf(voice.id)}</span>
                    <span aria-hidden="true">›</span>
                  </button>
                ) : (
                  <span className="tone-deck-tone static">{toneLabelOf(voice.id)}</span>
                )}
              </div>
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
                onChange={(event) =>
                  host.write(fields.level, Number(event.target.value) as never)
                }
                aria-label={t(`voices.${voice.id}`)}
              />
              <output className="voice-level">{voice.level ?? '—'}</output>
            </li>
          );
        })}
      </ul>

      <div className="stage-master tone-deck-master">
        <span className="voice-icon">
          <InstrumentIcon kind="master" title={t('voices.master')} />
        </span>
        <label className="stage-master-label" htmlFor="tone-deck-master">
          {t('voices.master')}
        </label>
        <input
          id="tone-deck-master"
          type="range"
          min={MASTER.definition.type.min}
          max={MASTER.definition.type.max}
          step={MASTER.definition.type.step}
          value={patchLevel}
          onChange={(event) => host.write(MASTER, Number(event.target.value) as never)}
        />
      </div>

      {showPowerChips && (
        <div className="stage-chain" role="group" aria-label={t('stage.onOff')}>
          {POWER_SWITCHES.map((item) => {
            const state = host.read(item.field);
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
      )}

      <TonePicker
        open={picker !== null}
        title={
          picker?.kind === 'modeling'
            ? t('gr55.tonePicker.modelingTitle')
            : picker?.kind === 'pcm' && picker.voice === 'pcm2'
              ? t('gr55.tonePicker.pcm2Title')
              : t('gr55.tonePicker.pcm1Title')
        }
        labels={pickerLabels}
        current={pickerCurrent}
        onPick={onPick}
        onClose={() => setPicker(null)}
      />
    </section>
  );
}
