import type { BooleanField, FieldReference, FieldType } from '../../protocol/RolandAddressMap';
import type { CopyKey, Translate } from '../../copy';
import type { IconKind } from './Icons';
import { TEMPORARY_PATCH, TEMPORARY_PATCH_ADDRESS } from './patchLayout';

const patch = TEMPORARY_PATCH;

/** The four sounding sources of the pedal, the way a player sees them. */
export type VoiceId = 'pcm1' | 'pcm2' | 'modeling' | 'normalPickup';

export interface VoiceState {
  id: VoiceId;
  /** The icon that says which instrument this is ("what is sounding"). */
  icon: IconKind;
  /** The pedal's mute fields are inverted: `true` = muted. */
  muted: boolean;
  /** The level the voice is at right now, when the pedal answers. */
  level: number | undefined;
}

/** The icon of each voice: the drawing says the instrument without words. */
const VOICE_ICONS: Record<VoiceId, IconKind> = {
  pcm1: 'pcm1',
  pcm2: 'pcm2',
  modeling: 'modeled',
  normalPickup: 'guitar',
};

/** A voice as mix data: reads decoded values over any patch, working copy or slot image. */
export function voicesOf(read: (field: never) => unknown): VoiceState[] {
  const voices = [
    {
      id: 'pcm1' as const,
      level: patch.patchPCMTone1.partLevel,
      mute: patch.patchPCMTone1.muteSwitch,
    },
    {
      id: 'pcm2' as const,
      level: patch.patchPCMTone2.partLevel,
      mute: patch.patchPCMTone2.muteSwitch,
    },
    {
      id: 'modeling' as const,
      level: patch.modelingTone.level,
      mute: patch.modelingTone.muteSwitch,
    },
    {
      id: 'normalPickup' as const,
      level: patch.common.normalPuLevel,
      mute: patch.common.normalPuMute,
    },
  ];
  return voices.map((voice) => {
    const level = read(voice.level as never);
    return {
      id: voice.id,
      icon: VOICE_ICONS[voice.id],
      muted: read(voice.mute as never) === true,
      level: typeof level === 'number' ? level : undefined,
    };
  });
}

/** The chain power switches, in the order the sound runs through it: "is it on". */
export interface PowerSwitch {
  id: 'amp' | 'chorus' | 'delay' | 'reverb' | 'eq';
  field: FieldReference<BooleanField>;
}

export const POWER_SWITCHES: readonly PowerSwitch[] = [
  { id: 'amp', field: patch.ampModNs.ampSwitch },
  { id: 'chorus', field: patch.sendsAndEq.chorusSwitch },
  { id: 'delay', field: patch.sendsAndEq.delaySwitch },
  { id: 'reverb', field: patch.sendsAndEq.reverbSwitch },
  { id: 'eq', field: patch.sendsAndEq.eqSwitch },
];


/** A reader over any patch image, the working copy or an encoded slot: decode by field. */
export function readerOf(
  bytes: Uint8Array,
): (field: FieldReference<FieldType<never>>) => unknown {
  return (field) => {
    const offset = field.address - TEMPORARY_PATCH_ADDRESS;
    const { type, size } = field.definition;
    try {
      return type.decode(bytes, offset, size);
    } catch {
      return undefined;
    }
  };
}

/** The tiny icons that say which instruments a stored patch sounds. */
export function iconsOf(bytes: Uint8Array | undefined): IconKind[] {
  if (!bytes) {
    return [];
  }
  const read = readerOf(bytes) as (field: never) => unknown;
  return voicesOf(read)
    .filter((voice) => !voice.muted && (voice.level ?? 0) > 0)
    .map((voice) => voice.icon);
}

/** Copy key of each instrument icon, so a drawing always has a spoken name. */
export function voiceTitle(kind: IconKind, t: Translate): string {
  const keys: Partial<Record<IconKind, CopyKey>> = {
    guitar: 'voices.normalPickup',
    modeled: 'voices.modeling',
    pcm1: 'voices.pcm1',
    pcm2: 'voices.pcm2',
  };
  return t((keys[kind] ?? kind) as CopyKey as never);
}
