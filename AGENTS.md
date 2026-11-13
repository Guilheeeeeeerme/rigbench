# AGENTS.md — Rigbench

Coding-agent rules for this repository. User product docs: [README.md](./README.md).
Active design: [docs/current/](./docs/current/). Historical material: [docs/archive/](./docs/archive/) — never overrides code or this file.

## Precedence (highest wins)

1. **Code** — especially `src/devices/gr55/routes.ts`, `systemMap.ts`, `pages.ts`, `src/devices/gr55/intentions/`
2. **This file** + [docs/current/](./docs/current/)
3. **README.md** (user-facing; keep in sync when IA changes)
4. **docs/archive/** — research and shipped redesign plans only

Do **not** follow `docs/archive/prompt-v2-rigbench-palco.md` as a live briefing.

## Product (current — WIP)

Static React 19 + Vite + TypeScript app. Web MIDI SysEx to a Roland GR-55. No backend.
The pedal is the only confirmed state. The browser stores the interface language (`rigbench.locale`) and nothing about the setup.
The app opens in Brazilian Portuguese. Language policy: [docs/current/intention-workbench.md](./docs/current/intention-workbench.md) (Language).
**No AI** in the MVP shell.

The GR-55 surface is an **intention workspace**: the sounding patch fills the screen. What each card shows is the product SoT below.

```
Home (GR-55 + placeholders)
  → Connect (gesture, then a confirmed read; no silent resume)
  → Patch board (no main-screen scroll)
       previous / next stay with the pedal
       Save sheet · Guitar sheet (Play Feel, then Advanced)
       Read again · Exit → Home
```

Product SoT: [docs/current/intention-workbench.md](./docs/current/intention-workbench.md).
Hardware claims: [docs/current/capability-matrix.md](./docs/current/capability-matrix.md).
Connect: [docs/current/connection-resume.md](./docs/current/connection-resume.md).
Config scope (SYSTEM vs patch): [docs/current/gr55-config-scope.md](./docs/current/gr55-config-scope.md).

| Route | Role |
| --- | --- |
| `#/` | **Home** — pick GR-55 or a placeholder device |
| `#/gr55/conectar` | **Connect** — MIDI ports / simulated pedal in development |
| `#/gr55/patch` | **Intention workspace** (only app route after connect) |

Legacy hashes (`bank`, `global`, `maestro`, `palco`, `estudio`, `configuracao`, `dispositivo`, …) redirect to Patch.

### Authority model

Writes, the queue, and save: [intention-workbench.md](./docs/current/intention-workbench.md) (Confirmed writes). Connect, Exit, Sync, and storage: [connection-resume.md](./docs/current/connection-resume.md).

- One operation at a time (`src/session/operationQueue.ts`). The mirror updates from the readback.
- While that batch is on the wire, ignore pedal churn (`holdRemoteMirror`).
- A timeout or a mismatch blocks the next edit until a new reading.
- Save is explicit. Never factory banks. Not automatic.

## Hard rules

- **Do not rewrite** `src/protocol/**` or `src/midi/**` unless the task explicitly requires a protocol/MIDI fix. Prefer `systemMap.ts` and device-layer types for system extensions.
- **No GPL FloorBoard** material (text, XML, skins) in the repo. Address facts only; MIT fork CASouthEast is the system-map reference (see README credits).
- **Scope chips**: 🟠 temporary working copy · 🔵 pedal-wide system. Every control must make scope obvious.
- **Writes**: patch and system parameters go out as verified DT1, then the readback updates the mirror. No ApplyBar / staging. No automatic USER write.
- **No AI in the product shell.** There is no chat/copilot code (`src/maestro` was removed). Never commit API keys. Never invent SysEx addresses or live calibration meters.
- **i18n**: UI strings through `t()` / `useT()` in both dictionaries. The app opens in pt-BR. Policy: [intention-workbench.md](./docs/current/intention-workbench.md) (Language). `npm run check:copy` must pass.
- **Data library is not code:** `docs/gr55-collection/` is a gitignored binary library. Never `git add` it, never let the app read its binaries, never rename a `.g5l`/`.mid` without its name-paired partner (see `docs/gr55-collection/AGENTS.md`).
- Prefer targeted reads and the smallest sufficient change. Do not run broad refactors or the full test matrix unless asked.

## Where to work

| Area | Path |
| --- | --- |
| App Redux store (connection phase only) | `src/app/store/**` |
| Visual UI (Linear dark) | `src/app/styles.css`, `index.html`, `docs/current/ui-guidelines.md` |
| Experience (no device imports) | `src/experience/IntentionWorkspace.tsx` |
| Intentions and the GR-55 translator | `src/intentions/`, `src/devices/gr55/intentions/` |
| GR-55 shell | `Gr55Screen.tsx`, `AppShell.tsx`, `Gr55Workspace.tsx`, `ConnectScreen.tsx` |
| Tone names / GK starting points | `presets/toneLibrary.ts`, `presets/profiles.ts`, `instrumentProfiles.ts`, `toneMatch.ts` |
| Advanced escape hatch | `AdvancedPatchEditor.tsx`, `verifiedFieldHost.ts`, `pages.ts` |
| Icons / voices | `Icons.tsx`, `voices.ts` |
| Queue, tab lock, storage audit, save | `src/session/`, `sessionAuthority.ts`, `saveUserSlot.ts` |
| Connect / live MIDI | `connectionThunks.ts`, `connectionRuntime.ts` |
| System map / immediate system writes | `systemMap.ts`, `systemState.ts` |
| Copy | `src/copy/` |
| Frozen protocol / MIDI | `src/protocol/**`, `src/midi/**` |
| Data library (patches/manuals, gitignored) | `docs/gr55-collection/**` — its own AGENTS.md governs the subtree |

Recipes: [docs/current/recipes.md](./docs/current/recipes.md). Glossary: [docs/current/glossary.md](./docs/current/glossary.md).

## Verification

```bash
npm run check:copy
npm run typecheck
npm test # or a focused Vitest path for the files you touched
npm run check:secrets # if keys / storage / downloads touched
npm run lint # before a broad handoff
```

Dev: Node 22 (`.nvmrc`), `npm run dev` → `http://localhost:5173`. Use **simulated pedal** when hardware is unavailable. Chrome/Edge for real Web MIDI + SysEx.
Production builds from `main` publish to [GitHub Pages](https://guilheeeeeeerme.github.io/rigbench/). That workflow sets `VITE_BASE=/rigbench/`; local dev and preview stay at `/`.

## Documentation

After **every** change that affects IA, routes, connect/resume, surfaces, or
user-facing behavior:

1. Audit [docs/current/](./docs/current/), this file, [README.md](./README.md), and
   `.cursor/rules/` for drift.
2. **Deduplicate** — one SoT per topic; other docs get a one-line pointer, not a
   second story.
3. **Consolidate** — prefer updating the existing SoT over adding a parallel file.
4. Mark superseded claims in older specs (status banner), never leave two homes.

Index: [docs/current/README.md](./docs/current/README.md) (app specs) ·
[docs/README.md](./docs/README.md) (whole tree) · [docs/gr55-collection/AGENTS.md](./docs/gr55-collection/AGENTS.md) (data library).

## Communication

- Match the user’s language in chat.
- Code, commits, comments, and docs: **English**.
- The app opens in Brazilian Portuguese; English is the switch. Policy: [intention-workbench.md](./docs/current/intention-workbench.md) (Language).
