# GR-55 intention workspace

> **Status:** Live. Source of truth for the musician experience on the GR-55.
> **Precedence:** code (`src/experience/`, `src/intentions/`, `src/devices/gr55/intentions/`, `src/session/`) → this file → [AGENTS.md](../../AGENTS.md).
> Connect: [connection-resume.md](./connection-resume.md).
> What hardware has not confirmed: [capability-matrix.md](./capability-matrix.md).
> Parameter scopes: [gr55-config-scope.md](./gr55-config-scope.md).

The screen turns a musical intention into a short list of fields that already exist on the address map. It does not import SysEx addresses. A second in-memory adapter (`src/devices/testboard/`) runs the same intention types.

```
Experience (src/experience)
  → intentions (src/intentions)
  → serial queue and confirmed mirror (src/session)
  → GR-55 adapter (src/devices/gr55/intentions)
  → Web MIDI (src/midi)
```

The pedal is the authority. RAM holds the last confirmed reading, the operation in flight, and the previous bytes of this session. The only browser key is `rigbench.locale`.

## What the musician sees

The workspace is the sound that is playing. The title is the patch name and the USER slot. One word shows the phase: Confirmed, Checking, Applying, Saved, Uncertain.

- **Connect.** [connection-resume.md](./connection-resume.md).
- **Sound.** The screen is the current patch and fills the window without scrolling. The name and the USER slot are the title, with previous and next. Choosing one loads that USER patch on the pedal, and the title changes when the reading comes back. A program change from the pedal updates the same title. One board holds the rest. Each card names the resource and the last confirmed reading: the mode and what it leaves in the mix, each PCM with its tone and level, EXP and CTL with the role they already have, Reverb shared by both PCMs, and the three recipes with the pedal they use. Save names the USER slot. Guitar names Play Feel. A dot on Save means that sounding patch differs from the slot. Read again stays in the top bar.
- **Sheets.** One at a time, over the current patch. A PCM chip opens the nine tones, a level, Use, and Remove. A recipe card opens the scope chip and the groups, then Apply. Save confirms the current USER slot and says a verified save does not promise the sound survives switching the pedal off. Guitar opens the instrument, PU TYPE when that profile asks, Play Feel, Low Velocity Cut, Velocity Dynamics, SENS, and scale. Activate lists the groups in that sheet before the write. Advanced stays at the bottom of the Guitar sheet.
- A tile shows the last confirmed reading while a write is in flight, then the readback. A patch that matches no recipe has no recipe card selected. There is no string meter.

## Language

Code, comments, and these docs are English. The app opens in Brazilian Portuguese. With no `rigbench.locale` stored, the screen is `pt-BR`. A stored `en` or `pt-BR` wins. The EN | PT-BR switch changes it without a reload.

`src/copy/en.ts` is the key schema (`Copy = typeof en`). `src/copy/pt-BR.ts` mirrors every key. A missing Portuguese string falls back to English, so both files stay complete. `npm run check:copy`.

These stay English in both dictionaries: patch names and USER slots as read; PCM tone names; PCM 1, PCM 2, EXP, CTL, GK, USER, PU TYPE, SENS; Play Feel, Low Velocity Cut, Velocity Dynamics; Natural, Anti-Ghost; instrument product names; Reverb, Delay, Chorus, Pad.

## Confirmed writes

One operation at a time. The mirror updates from the readback, not from the send. `MIDIOutput.send` succeeding does not finish the operation. A timeout or a mismatch blocks further edits until the next reading. Cancel does not undo a command already sent. **Restore previous values** is another verified write, and only while this session still has those bytes.

Slider and text fields send the latest value when the control is released, then verify once. They do not send a USER write on every step.

Automatic saving after each gesture stays off until [capability-matrix.md](./capability-matrix.md) records a hardware pass. Save opens the USER slot and Apply writes it. “Saved” appears only after that slot is read back. The save sheet says the sound is not promised after the pedal is switched off.

## Reference recipes

Grade `implemented` until the matrix says `hardware-tested`. Each recipe writes only its declared fields. If expression or CTL is already doing something else, the whole intention is refused.

| Id | Sound |
| --- | --- |
| `nylon-harmonica-exp` | Normal signal on, PCM harmonica, expression on that PCM’s level |
| `nylon-piano-strings-ctl` | Normal signal on, piano and strings, CTL toggles only the strings |
| `solo-without-guitar` | Normal signal out of the mix, one solo layer |

Moving CTL/EXP from system to patch setting, when a recipe needs it, stays a pedal-wide warning.

## What left the experience

The rhythm → role → sound generator and its full-patch replace are not the product. The rhythm catalog modules were removed. Recipe PCM names live in `intentions/translate.ts` (`LAYER_PCM`). GK starting points remain in `instrumentProfiles.ts`.
