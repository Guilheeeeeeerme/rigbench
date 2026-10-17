import { pcmToneSelectField } from '../../../protocol/RolandGR55ToneMap';

/** All PCM tone labels documented in RolandGR55ToneMap (910+). */
export function pcmToneLabels(): readonly string[] {
  return Object.keys(pcmToneSelectField.labels)
    .map(Number)
    .sort((a, b) => a - b)
    .map((encoded) => String(pcmToneSelectField.labels[encoded]));
}

const labelSet = new Set(pcmToneLabels());

export function isValidPcmTone(label: string): boolean {
  return labelSet.has(label);
}
