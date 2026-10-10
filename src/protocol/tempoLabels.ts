// Labels for the tempo-synced tail of GR-55 rate and time parameters.
// The numeric encoding is unchanged; only the text shown for those values is.

// Longest note first, matching the order already used for MFX rate notes in the address map.
// A higher rate value is a faster note.
const RATE_NOTES = [
  'WHL',
  '2THd',
  'WHL3',
  '2TH',
  '4THd',
  '2TH3',
  '4TH',
  '8THd',
  '4TH3',
  '8TH',
  '16THd',
  '8TH3',
  '16TH',
] as const;

// Shortest note first, matching the order already used for MFX delay notes.
// A higher time value is a longer note.
const TIME_NOTES = [
  '16TH',
  '8TH3',
  '16THd',
  '8TH',
  '4TH3',
  '8THd',
  '4TH',
  '2TH3',
  '4THd',
  '2TH',
  'WHL3',
  '2THd',
  'WHL',
] as const;

// PCM LFO rate: the same longest-to-shortest run as RATE_NOTES, extended to the 22
// divisions the address map describes, then the literal TONE at the top value.
const TONE_LFO_NOTES = [
  '2WHL',
  'WHLd',
  '2WHL3',
  ...RATE_NOTES,
  '32THd',
  '16TH3',
  '32TH',
  '32TH3',
  '64TH',
  '64TH3',
] as const;

function noteAt(notes: readonly string[], first: number, value: number): string | undefined {
  const index = value - first;
  if (index >= 0 && index < notes.length) {
    return notes[index];
  }
  return undefined;
}

/** 0–100 is a speed. 101–113 are the 13 tempo divisions. */
export function formatRate113(value: number): string {
  return noteAt(RATE_NOTES, 101, value) ?? String(value);
}

/** 0–3400 is milliseconds. 3401–3413 are the 13 tempo divisions. */
export function formatTime3413(value: number): string {
  return noteAt(TIME_NOTES, 3401, value) ?? `${value} ms`;
}

/** Assign delay time stops at 3400 and has no tempo divisions. */
export function formatTime3400(value: number): string {
  return `${value} ms`;
}

/** 0–127 is a speed. 128–149 are 22 tempo divisions. 150 is TONE. */
export function formatToneRate150(value: number): string {
  if (value === 150) {
    return 'TONE';
  }
  return noteAt(TONE_LFO_NOTES, 128, value) ?? String(value);
}
