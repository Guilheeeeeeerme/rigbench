# GR-55 Patch Generator (MVP)

> **Status:** Live. SoT for the musician-oriented **patch generator** (not a fine-tuning editor).
> **Precedence:** code (`PatchWorkspace.tsx`, `presets/`, `instrumentProfiles.ts`, `sessionAuthority.ts`) → this file → [AGENTS.md](../../AGENTS.md).
> Rhythm catalog: [brazilian-rhythm-catalog.md](./brazilian-rhythm-catalog.md).
> Parameter scopes: [gr55-config-scope.md](./gr55-config-scope.md).
> Connect/resume: [connection-resume.md](./connection-resume.md).

## Intent

Connect → generate a **complete starting patch** → play → refine on the physical GR-55 → **Save to USER**.

This app is responsible for the best possible **starting architecture** for every supported instrument × rhythm × role × sound. Final polish (SENS, feel, EQ taste) happens on the pedal.

| Job | What it does | Scope |
| --- | --- | --- |
| **Setup instrument** | Physical instrument / GK seed / output — **explicit confirm** | SYSTEM / GK |
| **Choose a sound** | Full **replace** of the temporary patch (not a blend) | Temporary patch (+ optional SYSTEM CTL/EXP → PATCH SETTING gate) |
| **Shape this sound** | Pitch policy, CTL readout, light trouble; Advanced collapsed | Temporary patch (+ SYSTEM only for trouble fixes) |

**Minimal Choose flow:** **Rhythm → Role → Sound → Apply to GR-55 → Save.**  
Family is a browse aid. Instrument profile (from Setup) **filters / labels** compatibility — it does **not** silently rewrite GK when you Apply sound.

**Never ship name-only clones.** Every catalog entry must have a justified architecture and parameter values (levels, voices, FX, CTL/EXP). Same-rhythm duplicates of identical arch+voices+levels fail integrity checks.

## Apply sound (patch-only)

`applyPresetToTemp`:

- Wipes sources, amp/FX switches, routes, and **ASSIGN 1–8 switches** (off) so leftovers cannot hijack pedals.
- Installs PCM1/PCM2/modeling/normal, levels, articulation, FX chain, patch CTL/EXP/EXP SW functions.
- Pitch shift + chromatic override follow **session policy** (never forced non-zero by catalog).
- **Never** writes GK SENS, PU TYPE, or other SYSTEM instrument fields.

`applyCtlExpForPreset`:

- May set SYSTEM CTL / EXP / EXP SW to **PATCH SETTING** when the preset needs patch-owned pedals.
- Does **not** write GK. Documented impact when the gate changes.

**Remaining gap:** full ASSIGN target/source programming (beyond switch-off wipe) is not shipped.

## Pitch

| Setting | Default | Notes |
| --- | --- | --- |
| Pitch shift (−24…+24) | `0` | Session-owned; Replace does not reset |
| Pitch correction (Chromatic) | Follows articulation profile until the musician overrides | Override survives Replace |
| Profile Chromatic (A–H) | May recommend ON for keys/winds/plucked | Separate from pitch shift |

No AI. No separate Global/Bank pages. Hardware is the source of truth for final feel.

## Routes

| Route | Role |
| --- | --- |
| `#/` | Home |
| `#/gr55/conectar` | Connect |
| `#/gr55/patch` | **Patch workspace** (only resumable app route) |

Legacy `bank`, `global`, `maestro`, … redirect to `patch`.

## Edit model

- Musician actions write the **temporary patch** (audition) and/or **SYSTEM/GK** (with confirm).
- **Save** = `writeToUserSlotVerified` (PATCH WRITE + USER RQ1 compare).
- SYSTEM/GK changes persist on the pedal immediately; UI always shows scope + confirm.
- Connection prefs may persist; patch bytes never do.

## Honesty limits

- Live string meters are **not** available over SysEx — calibration is guided against the pedal LCD.
- Panel patch change auto-detect needs **PC TX ON** (or Sync / focus re-read).
- Preset `validationStatus`: `documented` | `implemented` | `hardware-tested` | `approximation`. Curated starting points are labeled honestly; never claim hardware-tested without testing.

## Caimbé Nylon (GK assistant)

Setup → **Caimbé Nylon** is a thin **SYSTEM/GK helper**, not a musical patch. Optional Natural / Equilibrado / Anti-Ghost seeds + Apply instrument. It suggests GK set name `CAIMBE` on the **active** set only.

| Sub-profile | Velocity Dynamics | Play Feel | Low Velocity Cut |
| --- | --- | --- | --- |
| Natural | 4 | 3 | 3 |
| Equilibrado | 5 | 3 | 5 |
| Anti-Ghost | 5 | 4 | 8 |

Anti-Ghost matches a community report (Cifra Club / Pamplona Jr.) — **not Roland official**. PU TYPE stays confirmable (PIEZO / F / G / L / R). Per-string SENS seeds ~25–30; fine-tune on the pedal meter.

**Ghost-note diagnostic** (Shape → Troubleshooting): isolates Pop Piano 1 on the temporary patch, seeds LVC to 5, and guides a ~5-minute per-string SENS + LVC 5–8 check. No live MIDI meters.

## Modules

| Path | Role |
| --- | --- |
| `PatchWorkspace.tsx` | Minimal three-job UI (generator, not deep editor) |
| `instrumentProfiles.ts` | Godin/Caimbé/GK/piezo/bass → GK SET writes + calibration sub-profiles |
| `presets/` | Taxonomy, tone library, profiles, architectures, slots, apply, validate |
| `troubleshooting.ts` | Rule-based diagnostic flows (incl. ghost-note isolate) |
| `src/craft/` | Non-AI macros / fieldRegistry / toneMatch |

Maestro Gemini chat is out of the product shell for this MVP.
