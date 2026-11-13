# Glossary & product truths

Keep UI copy aligned with this language. Surfaces match [AGENTS.md](../../AGENTS.md).

## Scope chips (required)

| Chip | Meaning | Persistence |
| --- | --- | --- |
| 🟠 **Working copy** | Temporary patch buffer on the pedal — sounds now | Cleared when the patch changes or power cycles |
| 🟢 **Slot** | User memory U01:1 … U99:3 | Permanent until overwritten |
| 🔵 **System** | Pedal-wide (GK sets, OUTPUT SELECT, MIDI/USB, GUITAR/BASS, …) | Permanent; pedal changes are immediate (confirm in UI gates the write) |

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

- Changing patches on the pedal can mute while it reloads. The duration is unmeasured ([capability-matrix.md](./capability-matrix.md)). The screen loads the next USER slot without a warning; the title updates from the readback.
- **Saving a slot** locks the pedal several seconds; queue must wait for the reply.
- The pedal does **not** push memory; sync is RQ1 poll only and must never write during sync.
- Temporary-patch edits disappear when another patch is selected — that is why slot save exists.
- On connect, the app reads the sounding temporary patch **and** which user slot is selected
  (setup BS MSB + PC). See [connection-resume.md](./connection-resume.md).
- Pedal-wide system writes are **immediate** (DT1, no staging layer) and need an impact confirm
  in the UI — see [gr55-config-scope.md](./gr55-config-scope.md) and `systemState.ts`.

## Surfaces (current IA)

| Surface | Route | Role |
| --- | --- | --- |
| **Home** | `#/` | Pick GR-55 or a placeholder |
| **Connect** | `#/gr55/conectar` | MIDI ports after a gesture; no remembered ports |
| **Intention workspace** | `#/gr55/patch` | Current patch board. Anatomy: [intention-workbench.md](./intention-workbench.md) |

These are legacy first segments that **redirect** to `patch`: `bank`, `global`, `palco`,
`estudio`, `maestro`, `configuracao`, `dispositivo`, `editor`, `setup`. Source of truth:
`src/devices/gr55/routes.ts` (so do not advertise them in user-facing copy).
