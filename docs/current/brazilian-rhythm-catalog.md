# Brazilian rhythm catalog (GR-55)

> **Status:** Live. SoT for the 40 Brazilian rhythms + expanded cumbia catalog.
> **Precedence:** code (`presets/rhythms` via `taxonomy.ts`, `catalogSlots.ts`, `compose.ts`, `validate.ts`) → this file → [simple-patch-editor.md](./simple-patch-editor.md).

## Intent

Musicians pick **Rhythm → Role → Sound**. The app is a **patch generator**: it composes a full temporary-patch takeover from reusable pieces — not a parameter editor and not 160 independent one-offs that only rename the same architecture.

| Layer | Module | Role |
| --- | --- | --- |
| Rhythms (40 BR + 5 cumbia) | `taxonomy.ts` | Selectable musical contexts |
| Roles | `base` · `solo` · `fills` · `layer` | Function in the arrangement |
| Tone library | `toneLibrary.ts` | Exact PCM / modeling labels (+ approximation flags) |
| Profiles A–H | `profiles.ts` | Chromatic / legato / portamento recommendations |
| Architectures | `architectures.ts` | Multi-source levels + FX chain + CTL/EXP defaults |
| Slots | `catalogSlots.ts` | ≥4 composed presets per rhythm (musically distinct) |
| Apply | `applyPreset.ts` | Full replace; session pitch policy; patch CTL/EXP; ASSIGN wipe |
| CTL gate | `applyCtlExp.ts` | SYSTEM → PATCH SETTING only (no GK) |
| Validate | `validate.ts` | Tone Map, ranges, counts, honesty, same-rhythm duplicate-arch |

Acceptance: **≥160** shipped presets, every Brazilian rhythm and every cumbia subgenre has all four roles, every PCM/modeling id exists in `RolandGR55ToneMap` / modeling enums. Same-rhythm slots must not share identical architecture + voices + levels + CTL (integrity `duplicate-arch`).

## Pitch policy

| Setting | Default | Owner |
| --- | --- | --- |
| Pitch shift (−24…+24) | `0` | Session (Choose / Shape). Replace **keeps** it. Catalog never forces non-zero. |
| Pitch correction (user) | Follow profile until touched | Session override (`null` = profile). Explicit override **survives** Replace. |
| PCM Chromatic | Profiles A–H when appropriate | Preset recommendation when override is `null`. |

Do not conflate pitch shift with Chromatic.

## Honesty

- `validationStatus`: `documented` · `implemented` · `approximation` · `hardware-tested`
- Approximations (cavaquinho, viola caipira, rabeca, …) are **fully wired** and labeled
- Curated presets are professionally intended starting points — **never** mark `hardware-tested` without a hardware listening pass (enforced in tests)

## Priority pagode + sertanejo

Curated `priority: true` slots (Tone Map–verified PCM labels) surface first in Choose with a Recommended badge. They add to — do not replace — the ≥4 roles per rhythm. Priority entries must remain musically distinct from the non-priority slot in the same role (not rename-only clones).

| Family | Highlights (exact PCM / modeling) |
| --- | --- |
| Pagode | Pop Piano 1 + Slow Strings · Stage EP 1 + Mood Strings · Tenor Sax 1 · BreathyTenor · Brass 1 + Trombone 1 · Flute 1 · Harmonica 1 · Stage Piano + Brass 2 |
| Sertanejo | AccordionIt2 · AccordionIt2 + Accordion It · Harmonica 1 · Pop Piano 1 + Slow Strings · Stage EP 1 + Mood Strings · Violin 1 · Strings 1 + Slow Strings · CLA-ST modeling (profile F) |

## Cumbia

Not a single generic rhythm. Selectable rhythms: colombian, norteña, mexicana, chicha, tecnocumbia — each with ≥4 presets and musically distinct role slots.

## Related

- Product shell: [simple-patch-editor.md](./simple-patch-editor.md) (patch generator + Caimbé GK calibration)
- Parameter ranges: [gr55-config-scope.md](./gr55-config-scope.md)
