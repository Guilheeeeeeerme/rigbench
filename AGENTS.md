# AGENTS.md — Rigbench

Coding-agent rules for this repository. User product docs: [README.md](./README.md).
Active design: [docs/current/](./docs/current/). Historical material: [docs/archive/](./docs/archive/) — never overrides code or this file.

## Precedence (highest wins)

1. **Code** — especially `src/devices/gr55/routes.ts`, `systemMap.ts`, `pages.ts`, `presets/`, `src/craft/`
2. **This file** + [docs/current/](./docs/current/)
3. **README.md** (user-facing; keep in sync when IA changes)
4. **docs/archive/** — research and shipped redesign plans only

Do **not** follow `docs/archive/prompt-v2-rigbench-palco.md` as a live briefing.

## Product (current — WIP)

Static React 19 + Vite + TypeScript app. Web MIDI SysEx to a Roland GR-55. No backend.
Connection prefs may persist; **pedal configuration does not** (immediate write + snapshot).
EN + PT-BR via `src/copy/`.
**No AI** in the MVP shell.

The GR-55 surface is a **complete, musician-oriented patch generator** — not a fine-tuning editor. Final refinement happens on the physical pedal.

```
Home (GR-55 + placeholders)
  → Connect (silent resume if ports still valid; else prompt)
  → App: Patch workspace (generator)
       Setup instrument (SYSTEM/GK, confirm) · Choose (rhythm → role → sound → apply)
       Shape (pitch / CTL readout / light trouble; Advanced collapsed)
       Save to USER (verified) · Sync · Exit → Home
```

Product SoT: [docs/current/simple-patch-editor.md](./docs/current/simple-patch-editor.md). 
Rhythm catalog: [docs/current/brazilian-rhythm-catalog.md](./docs/current/brazilian-rhythm-catalog.md). 
Connect / resume: [docs/current/connection-resume.md](./docs/current/connection-resume.md). 
Config scope (SYSTEM vs patch): [docs/current/gr55-config-scope.md](./docs/current/gr55-config-scope.md).

| Route | Role |
| --- | --- |
| `#/` | **Home** — pick GR-55 or a placeholder device |
| `#/gr55/conectar` | **Connect** — MIDI ports / simulated pedal |
| `#/gr55/patch` | **Patch workspace** — patch generator (only resumable app route) |

Legacy hashes (`bank`, `global`, `maestro`, `palco`, `estudio`, `configuracao`, `dispositivo`, …) redirect to Patch.

### Authority model

- **App write** → DT1 immediately → **full snapshot** (system + temp patch + location). Mutations enqueue serially.
- While a write/snapshot is in flight → **trust the app** (`sessionAuthority`: ignore pedal churn).
- When idle → **mirror the pedal** (remote DT1 / program change when PC TX is on).
- Explicit **Sync** reloads system + working copy (USER → temp on a USER slot).
- **Save** = PATCH WRITE + USER readback verify (`saveUserSlotVerified`). Never factory banks.
- SYSTEM/GK changes use impact confirm (pedal-wide / GK set).
- localStorage / redux-persist: **connection only** (`rememberedPorts`, `preferSimulated`, `lastRoute` = `patch`). Never pedal field values.

## Hard rules

- **Do not rewrite** `src/protocol/**` or `src/midi/**` unless the task explicitly requires a protocol/MIDI fix. Prefer `systemMap.ts` and device-layer types for system extensions.
- **No GPL FloorBoard** material (text, XML, skins) in the repo. Address facts only; MIT fork CASouthEast is the system-map reference (see README credits).
- **Scope chips**: 🟠 temporary working copy · 🔵 pedal-wide system. Every control must make scope obvious.
- **Writes**: patch and system parameters DT1 immediately; then full snapshot. No ApplyBar / staging.
- **No AI / Maestro in the product shell.** Craft helpers live under `src/craft/`. Never commit API keys. Never invent SysEx addresses or live calibration meters.
- **i18n**: all UI strings through `t()` / `useT()`; add keys to **both** `en.ts` (source of truth) and `pt-BR.ts`. Device tone/amp enum names stay as on the pedal (English). `npm run check:copy` must pass.
- Prefer targeted reads and the smallest sufficient change. Do not run broad refactors or the full test matrix unless asked.

## Where to work

| Area | Path |
| --- | --- |
| App Redux store (connection resume) | `src/app/store/**` |
| Visual UI (Linear dark) | `src/app/styles.css`, `index.html`, `docs/current/ui-guidelines.md` |
| GR-55 shell / workspace | `Gr55Screen.tsx`, `AppShell.tsx`, `PatchWorkspace.tsx`, `ConnectScreen.tsx` |
| Presets / instruments / CTL | `presets/**` (taxonomy, toneLibrary, profiles, architectures, catalogSlots, validate), `instrumentProfiles.ts`, `troubleshooting.ts` |
| Advanced escape hatch | `ToneDeck.tsx`, `TonePicker.tsx`, `AdvancedPatchEditor.tsx`, `pages.ts` |
| Craft (non-AI macros) | `src/craft/**` |
| Icons / voices | `Icons.tsx`, `voices.ts` |
| Authority + snapshot + save | `sessionAuthority.ts`, `snapshotHost.ts`, `saveUserSlot.ts`, `patchGuard.ts` |
| Connect / live MIDI | `connectionThunks.ts`, `connectionRuntime.ts` |
| System map / immediate system writes | `systemMap.ts`, `systemState.ts` |
| Copy | `src/copy/` |
| Frozen protocol / MIDI | `src/protocol/**`, `src/midi/**` |

Recipes: [docs/current/recipes.md](./docs/current/recipes.md). Glossary: [docs/current/glossary.md](./docs/current/glossary.md).

## Verification

```bash
npm run check:copy
npm run typecheck
npm test # or a focused Vitest path for the files you touched
npm run check:secrets # if Maestro / keys / storage touched
npm run lint # before a broad handoff
```

Dev: Node 22 (`.nvmrc`), `npm run dev` → `http://localhost:5173`. Use **simulated pedal** when hardware is unavailable. Chrome/Edge for real Web MIDI + SysEx.

## Documentation

After **every** change that affects IA, routes, connect/resume, surfaces, or
user-facing behavior:

1. Audit [docs/current/](./docs/current/), this file, [README.md](./README.md), and
   `.cursor/rules/` for drift.
2. **Deduplicate** — one SoT per topic; other docs get a one-line pointer, not a
   second story.
3. **Consolidate** — prefer updating the existing SoT over adding a parallel file.
4. Mark superseded claims in older specs (status banner), never leave two homes.

Index: [docs/current/README.md](./docs/current/README.md).

## Communication

- Match the user’s language in chat.
- Code, commits, and comments: **English**.
- User-visible UI strings: English + PT-BR dictionaries only.
