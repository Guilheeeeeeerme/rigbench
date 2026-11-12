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

One workspace replaces Setup / Choose by rhythm / Shape.

- **Connect.** Web MIDI and the USB link are explained first. SysEx starts after the gesture. Family `0x5302` is required. Discovery does not write. **Ready** only after identity, the relevant system area, the temporary patch, and the patch position have been read. The app does not change patches while connecting.
- **My instrument.** Nylon, steel, guitar, or another profile. Choosing it sends nothing. **Activate** lists the groups that will be replaced, then writes the active GK set: pickup, touch (`playFeel`), unwanted notes (`lowVelocityCut`, a velocity gate), dynamics, and the six string sensitivities. Scale is written only when the musician types millimetres. Brand, playing style, and recipe name stay in the session and the screen says they disappear on reload. The GK set name may use the native 8-character field.
- **How you want to play.** Original signal, accompaniment, or both. Up to two PCM layers from tones already in the library. Modeling is not offered as a pure acoustic guitar. Shared effects (dry, small room, soft ambience, solo delay) warn that both layers use the same processor.
- **Pedals.** The screen reads the current expression and CTL roles. A recipe continues only when that control is free or already doing the requested job. A busy control is refused before any write.
- **Destination.** Factory presets are not overwritten. The first save to a USER slot asks once; the next save to that same slot does not ask again. Reordering the bank is unavailable.
- **Advanced.** The parameter editor stays, on the same queue. A value the map cannot label is read-only. A patch that is not one of the recipes is labeled a custom configuration.

Guided tests (silence, string, articulation, groove, validation) record only the musician’s own ok / issue. There is no string meter, accuracy percentage, or acoustic latency.

## Confirmed writes

One operation at a time. The mirror updates from the readback, not from the send. `MIDIOutput.send` succeeding does not finish the operation. A timeout or a mismatch blocks further edits until the next reading. Cancel does not undo a command already sent. **Restore previous values** is another verified write, and only while this session still has those bytes.

Slider and text fields send the latest value when the control is released, then verify once. They do not send a USER write on every step.

Automatic saving after each gesture stays off until [capability-matrix.md](./capability-matrix.md) records a hardware pass. The musician picks a USER slot and uses **Save and verify**. “Saved and verified” appears only after that slot is read back. The screen does not promise the sound survives power-off.

## Reference recipes

Grade `implemented` until the matrix says `hardware-tested`. Each recipe writes only its declared fields. If expression or CTL is already doing something else, the whole intention is refused.

| Id | Sound |
| --- | --- |
| `nylon-harmonica-exp` | Normal signal on, PCM harmonica, expression on that PCM’s level |
| `nylon-piano-strings-ctl` | Normal signal on, piano and strings, CTL toggles only the strings |
| `solo-without-guitar` | Normal signal out of the mix, one solo layer |

Moving CTL/EXP from system to patch setting, when a recipe needs it, stays a pedal-wide warning.

## What left the experience

The rhythm → role → sound generator and its full-patch replace are not the product. The rhythm catalog modules were removed. Tone names remain in `presets/toneLibrary.ts`. GK starting points remain in `instrumentProfiles.ts`.
