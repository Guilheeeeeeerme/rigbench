// The GR-55 system area beyond GUITAR/BASS: the ten GK sets, output, the pedal-wide
// pedal assignments, MIDI and USB.
//
// Offsets and value lists follow the system map of gr55-remote as extended in the
// CASouthEast/gr55-remote-main fork (MIT, Copyright 2022 Moti Zilberman and fork
// contributors; commits "System SysEx parsing rewrite" and "System GK Finally done").
// Only the facts of the layout are taken — addresses, sizes, value order — written
// against this project's own address-map types.
//
// Not mapped, because that source does not settle them: the bass-mode layout of a GK
// set past PU TYPE, the SCALE presets above 660 mm, LCD contrast and auto power off.

import {
  AsciiStringField,
  FieldDefinition,
  StructDefinition,
  UByteField,
  USplit8Field,
  booleanField,
  enumField,
  getAddresses,
} from '../../protocol/RolandAddressMap';
import type { AbsoluteAddressMap } from '../../protocol/RolandAddressMap';
import { pack7 } from '../../protocol/RolandSysExProtocol';

export const GK_SET_COUNT = 10;

// SCALE is stored as millimetres above 500. Values past 660 mm are the pedal's named
// presets (ST, LP); the app shows them but only ever writes a plain length.
export const SCALE_BASE_MM = 500;
export const SCALE_MAX_MM = 660;

const channel = { format: (value: number) => `${value + 1}` };

const pedalFunctions = [
  'OFF',
  'PATCH SETTING',
  'PATCH VOLUME',
  'TONE VOLUME',
  'PITCH BEND',
  'MODULATION',
  'CROSS FADER',
  'DELAY LEVEL',
  'REVERB LEVEL',
  'CHORUS LEVEL',
  'MOD CONTROL',
] as const;

const switchFunctions = [
  'OFF',
  'PATCH SETTING',
  'TAP TEMPO',
  'TONE SW',
  'AMP SW',
  'MOD SW',
  'MFX SW',
  'DELAY SW',
  'REVERB SW',
  'CHORUS SW',
  'SOUND STYLE INC',
  'SOUND STYLE DEC',
  'BANK NUMBER INC',
  'BANK NUMBER DEC',
  'PATCH NUMBER INC',
  'PATCH NUMBER DEC',
  'AUDIO PLAYER PLAY/STOP',
  'AUDIO PLAYER SONG INC',
  'AUDIO PLAYER SONG DEC',
  'AUDIO PLAYER SW',
  'V-LINK SW',
] as const;

// The CTL pedal has HOLD between PATCH SETTING and TAP TEMPO; the other switches do not.
const ctlFunctions = [
  ...switchFunctions.slice(0, 2),
  'HOLD',
  ...switchFunctions.slice(2),
] as readonly string[];

const SystemCommon = {
  gkSetSelect: new FieldDefinition(
    pack7(0x00),
    'GK SET Select',
    new UByteField(0, GK_SET_COUNT - 1, { format: (value) => `${value + 1}` }),
  ),
  outputSelect: new FieldDefinition(
    pack7(0x01),
    'OUTPUT Select',
    enumField([
      'LINE/PHONES',
      'JC-120',
      'SMALL',
      'COMBO',
      'STACK',
      'JC-120 RETURN',
      'COMBO RETURN',
      'STACK RETURN',
      'B-AMP WITH TWEETER',
      'B-AMP NO TWEETER',
    ] as const),
  ),
  patchControlChannel: new FieldDefinition(
    pack7(0x03),
    'Patch Control Channel',
    new UByteField(0, 15, channel),
  ),
  rxSwitch: new FieldDefinition(pack7(0x04), 'Bank/Program Change RX Switch', booleanField),
  txSwitch: new FieldDefinition(pack7(0x05), 'Bank/Program Change TX Switch', booleanField),
  guitarToMidiSwitch: new FieldDefinition(pack7(0x07), 'Guitar to MIDI Switch', booleanField),
  guitarToMidiMode: new FieldDefinition(
    pack7(0x08),
    'Guitar to MIDI Mode',
    enumField(['MONO', 'POLY'] as const),
  ),
  guitarToMidiStringChannel: new FieldDefinition(
    pack7(0x0a),
    'Guitar to MIDI String Channel',
    enumField([
      '1-6',
      '2-7',
      '3-8',
      '4-9',
      '5-10',
      '6-11',
      '7-12',
      '8-13',
      '9-14',
      '10-15',
      '11-16',
    ] as const),
  ),
  usbDirectMonitor: new FieldDefinition(pack7(0x15), 'USB Direct Monitor', booleanField),
  guitarOutSource: new FieldDefinition(
    pack7(0x16),
    'GUITAR OUT Source Select',
    enumField(['PATCH', 'OFF', 'NORMAL PU', 'MODELING', 'BOTH'] as const),
  ),
  guitarBassSelect: new FieldDefinition(
    pack7(0x1a),
    'GUITAR/BASS Select',
    enumField(['GUITAR', 'BASS'] as const),
  ),
};

/** The pedal-wide layer of pedal assignments: the same for every patch. */
const SystemPedals = {
  ctlFunction: new FieldDefinition(pack7(0x00), 'CTL Function', enumField(ctlFunctions)),
  expOffFunction: new FieldDefinition(
    pack7(0x0d),
    'EXP Function (EXP SW off)',
    enumField(pedalFunctions),
  ),
  expOnFunction: new FieldDefinition(
    pack7(0x24),
    'EXP Function (EXP SW on)',
    enumField(pedalFunctions),
  ),
  expSwFunction: new FieldDefinition(pack7(0x3b), 'EXP SW Function', enumField(switchFunctions)),
  gkVolFunction: new FieldDefinition(pack7(0x48), 'GK VOL Function', enumField(pedalFunctions)),
  gkS1Function: new FieldDefinition(pack7(0x5f), 'GK S1 Function', enumField(switchFunctions)),
  gkS2Function: new FieldDefinition(pack7(0x6c), 'GK S2 Function', enumField(switchFunctions)),
};

const sens = (offset: number, string: number) =>
  new FieldDefinition(pack7(offset), `String ${string} Sens`, new UByteField(0, 100));

/** One GK set in guitar mode. Name and PU TYPE sit at the same place in bass mode. */
const GkSet = {
  name: new FieldDefinition(pack7(0x00), 'Name', new AsciiStringField(8)),
  puType: new FieldDefinition(
    pack7(0x08),
    'PU Type',
    enumField([
      'GK-3',
      'GK-2A',
      'PIEZO',
      'PIEZO R',
      'PIEZO F',
      'PIEZO G',
      'PIEZO L',
      'PIEZO M',
    ] as const),
  ),
  scale: new FieldDefinition(pack7(0x09), 'Scale', new USplit8Field(0, 0xff)),
  puPhase: new FieldDefinition(pack7(0x0b), 'PU Phase', enumField(['NORMAL', 'INVERSE'] as const)),
  puDirection: new FieldDefinition(
    pack7(0x0c),
    'PU Direction',
    enumField(['NORMAL', 'REVERSE'] as const),
  ),
  s1s2Position: new FieldDefinition(
    pack7(0x0d),
    'S1/S2 Position',
    enumField(['NORMAL', 'REVERSE'] as const),
  ),
  normalPuGain: new FieldDefinition(
    pack7(0x0e),
    'Normal PU Gain',
    new UByteField(-20, 20, { encodedOffset: 20, format: (value) => `${value} dB` }),
  ),
  string1Sens: sens(0x17, 1),
  string2Sens: sens(0x18, 2),
  string3Sens: sens(0x19, 3),
  string4Sens: sens(0x1a, 4),
  string5Sens: sens(0x1b, 5),
  string6Sens: sens(0x1c, 6),
};

/** Bytes of a GK set the app reads: up to the last guitar-mode parameter. */
export const GK_SET_SPAN = pack7(0x23);
export const SYSTEM_COMMON_SPAN = pack7(0x21);
export const SYSTEM_PEDALS_SPAN = pack7(0x7d);

const gkSets = Object.fromEntries(
  Array.from({ length: GK_SET_COUNT }, (_, index) => [
    `gkSet${index + 1}`,
    new StructDefinition(pack7(0x000400 + index * 0x100), `GK Set ${index + 1}`, GkSet),
  ]),
) as Record<string, StructDefinition<typeof GkSet>>;

const System = {
  common: new StructDefinition(pack7(0x000000), 'Common', SystemCommon),
  pedals: new StructDefinition(pack7(0x000200), 'Pedal/GK CTL', SystemPedals),
  ...gkSets,
};

const absolute = getAddresses(
  new StructDefinition(pack7(0x02000000), 'System', System),
  pack7(0x02000000),
);

export const SYSTEM_ADDRESS = pack7(0x02000000);
/** The stretch of the system area the app mirrors, from its start through GK set 10. */
export const SYSTEM_SPAN = pack7(0x000d00) + GK_SET_SPAN;

export const SYSTEM = {
  common: absolute.common,
  pedals: absolute.pedals,
};

export type GkSetFields = AbsoluteAddressMap<StructDefinition<typeof GkSet>>;

/** The fields of GK set 1–10. */
export function gkSet(number: number): GkSetFields {
  return (absolute as unknown as Record<string, GkSetFields>)[`gkSet${number}`];
}

export const GK_STRING_SENS = [
  'string1Sens',
  'string2Sens',
  'string3Sens',
  'string4Sens',
  'string5Sens',
  'string6Sens',
] as const;

/** The runs of the system area read from the pedal, as offsets from its start. */
export const SYSTEM_BLOCKS: readonly { offset: number; length: number }[] = [
  { offset: 0, length: SYSTEM_COMMON_SPAN },
  { offset: pack7(0x000200), length: SYSTEM_PEDALS_SPAN },
  ...Array.from({ length: GK_SET_COUNT }, (_, index) => ({
    offset: pack7(0x000400 + index * 0x100),
    length: GK_SET_SPAN,
  })),
];
