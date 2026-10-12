/**
 * Deterministic GR-55 facts for Maestro, grounded in:
 * - docs/manuals/GR-55_OM.pdf (EN Owner’s Manual)
 * - docs/manuals/GR-55_PCM_Tone_List.pdf
 * - src/maestro/fieldRegistry.ts keys (working-copy only)
 *
 * The model must follow this contract; it must not invent pedal menu paths or
 * enum values that are not listed here.
 */
export const MANUAL_CANON = `
## AUTHORITY
Sources: Roland GR-55 Owner’s Manual EN (PATCH WRITE / PATCH INITIALIZE p.60;
PEDAL/GK CTL / TONE SW p.55–56; PCM TONE switches p.23–25) and GR-55 PCM Tone List.
App field keys are Rigbench dotted keys from FIELDS — never SysEx addresses.

## DATA CONTRACT (JSON only)
{
  "kind": "edit" | "explain" | "search",
  "intent": string,
  "reply": string,          // user language
  "changes": [ { "key": string, "value": number|boolean|string, "why": string } ],
  "search": string,         // English word if a FIELDS key is missing
  "loadSlot": string        // optional "01-1" / "USER 01-1" — load ask; app may WRITE after
}

## WHAT YOU EDIT
Bank session: sounding temporary patch (working copy). Named USER recipes are
selected + applied + PATCH WRITTEN by the app compiler — you still emit changes[] only.
Global session: only SYSTEM / active GK SET (pedal-wide). Never mix scopes.
You cannot: emit a writeSlot field, PATCH INITIALIZE command, factory reset.
Global GK nylon/piezo recipes are applied by the app compiler (PU TYPE PIEZO R, scale, SEN).

## PATCH INITIALIZE (OM p.60) — approximate in changes[]
Pedal INIT is WRITE → INITIALIZE tab (user patches only). There is no SysEx INIT here.
To “init from scratch”, set in ONE edit plan:
- amp/amp/ampSwitch, mod/mod/modSwitch, mfx/mfx/mfxSwitch,
  delay/delay/delaySwitch, chorus/chorus/chorusSwitch,
  reverb/reverb/reverbSwitch, eq/eq/eqSwitch → false
- Unused tones muted (see MUTE below)

## TONE SWITCHES / MUTE (OM p.23; Rigbench mute fields)
Keys:
- pcm1/tone/muteSwitch, pcm2/tone/muteSwitch, modeling/tone/muteSwitch
- normal-pickup/level/normalPuMute
Boolean encoding in this app: true = MUTE (silent), false = UNMUTE (sounding).
Musician “ligar/ON” → false. “desligar/OFF” → true.

## LEVELS
- pcm1/tone/partLevel, pcm2/tone/partLevel → 0..100
- modeling/tone/level → per field range in FIELDS
- normal-pickup/level/normalPuLevel → 0..100
50/50 guitar+solo from scratch → both levels 100 unless user says otherwise.

## PCM TONE SELECT (PCM Tone List)
Keys: pcm1/tone/toneSelect, pcm2/tone/toneSelect
Value = exact pedal tone name from FIELDS / TONE CANDIDATES (e.g. "Harmonica 1",
"Brass 1", "Accordion Fr"). Categories like "Solo Brass" are NOT values.
Synonyms: gaita→Harmonica *; metais/brass→Brass *; acordeão→Accordion *;
cumbia/teclado→Accordion * or Organ/Lead candidates.

## CTL PEDAL (OM PEDAL/GK CTL p.55–56)
There is NO function named "PCM1 SW".
For “CTL turns synth on/off / TOGGLE”:
- pedal-gk/ctl/status → true
- pedal-gk/ctl/function → "TONE SW"
- pedal-gk/ctl/holdSwitchMode → "LATCH"  (OM: on/off each press; MOMENT = hold)
TONE SW matrices (OM SW OFF / SW ON):
- CTL OFF / guitar only: offPcmTone1Switch false, offNormalPuSwitch true,
  offPcmTone2Switch false, offModelingToneSwitch false
- CTL ON / guitar+PCM1: onPcmTone1Switch true, onNormalPuSwitch true,
  onPcmTone2Switch false, onModelingToneSwitch false
Keys:
pedal-gk/ctl/offPcmTone1Switch, offPcmTone2Switch, offModelingToneSwitch, offNormalPuSwitch,
pedal-gk/ctl/onPcmTone1Switch, onPcmTone2Switch, onModelingToneSwitch, onNormalPuSwitch

Other CTL function enums (exact): OFF | HOLD | TAP TEMPO | TONE SW | AMP SW | MOD SW |
MFX SW | DELAY SW | REVERB SW | CHORUS SW | AUDIO PLAYER PLAY/STOP |
AUDIO PLAYER SONG INC | AUDIO PLAYER SONG DEC | AUDIO PLAYER SW | V-LINK SW |
LED MOMENT | LED TOGGLE

## NAME + WRITE (OM p.60)
- patch/common/patchName → up to 16 ASCII chars
- Local bank recipes WRITE the USER slot after applying. For free-chat edits without a
  named USER target, tell the user the app wrote the temporary copy only.
- loadSlot only if they asked to switch the sounding key first; still include changes[] for after load.

## RECIPE SHAPE (solo + violão 50/50)
When user asks INIT + PCM1 solo + Normal PU + CTL toggle + optional WRITE:
emit kind "edit" with ALL of: effect switches off, mute matrix, toneSelect, levels,
CTL TONE SW + LATCH + off/on tone switches, patchName. One plan. No drip-feed.
`.trim();
