# Glossary & product truths

Keep UI copy aligned with this language. Surfaces match [AGENTS.md](../../AGENTS.md).

## Scope chips (required)

| Chip | Meaning | Persistence |
| --- | --- | --- |
| 🟠 **Working copy** | Temporary patch buffer on the pedal — sounds now | Cleared when the patch changes or power cycles |
| 🟢 **Slot** | User memory U01:1 … U99:3 | Permanent until overwritten |
| 🔵 **System** | Pedal-wide (GK sets, OUTPUT SELECT, MIDI/USB, GUITAR/BASS, …) | Permanent; staged in-app until Apply |

Every control must show scope. Prefer words + color (accessibility).

## UI wording

| Prefer | Avoid in user-facing copy |
| --- | --- |
| working copy | buffer |
| slot / save to slot | write / dump |
| apply (system) | commit / flush |
| system | global / SysEx |
| temporary patch | temp buffer |

## Instrument personas

| Persona | Connection | Notes |
| --- | --- | --- |
| A — Electric + GK-3 | 13-pin | PCM + modeling + normal PU; assigns matter |
| B — Acoustic / piezo | P-10 and/or 13-pin (e.g. Godin SA) | Often one patch per song |
| C — Bass + GK-3B | 13-pin, pedal in **BASS** mode | Different preset bank; mode is 🔵 system |

GUITAR ⇄ BASS is system-wide: confirm and warn that it affects all 297 user slots.

## Hardware truths the UI must respect

- Changing **patches** mutes the pedal ~1 s — warn on Stage before cross-slot moves.
- **Saving a slot** locks the pedal several seconds; queue must wait for the reply.
- The pedal does **not** push memory; sync is RQ1 poll only and must never write during sync.
- Temporary-patch edits disappear when another patch is selected — that is why slot save exists.
- On connect, the app reads the sounding temporary patch **and** which user slot is selected
  (setup BS MSB + PC). See [connection-resume.md](./connection-resume.md).

## Surfaces (current IA)

| Surface | Route | Role |
| --- | --- | --- |
| **Stage** | `#/gr55/palco` | **The app** after first-run setup — where you are on the pedal, bank keys, sounding instruments; no slot save |
| **Maestro** | `#/gr55/maestro` | AI craft by conversation (patch ± system); write-denied while Stage is the live perform surface per policy |
| **Setup** | `#/gr55/configuracao` | Rare global cards: Device, GK, recalibrate |
| **Wizard** | `#/gr55/configurar` | First-run gate + recalibrate (no app bar) |
| **Connect** | prompt until linked | Silent resume when remembered ports still valid; otherwise pick ports |

`#/gr55/estudio` is a **legacy redirect to Stage**. Advanced editor routes redirect to Stage; `pages.ts` remains field-key SoT for Maestro.

Macro / session taxonomy (System · Patch · Library) for Maestro craft: [studio-sessions.md](./studio-sessions.md).
