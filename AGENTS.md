# AGENTS.md — Rigbench

Coding-agent rules for this repository. User product docs: [README.md](./README.md).
Active design: [docs/current/](./docs/current/). Historical material: [docs/archive/](./docs/archive/) — never overrides code or this file.

## Precedence (highest wins)

1. **Code** — especially `src/devices/gr55/routes.ts`, `policy.ts`, `systemMap.ts`, `pages.ts`, `macros/registry.ts`
2. **This file** + [docs/current/](./docs/current/)
3. **README.md** (user-facing; keep in sync when IA changes)
4. **docs/archive/** — research and shipped redesign plans only

Do **not** follow `docs/archive/prompt-v2-rigbench-palco.md` as a live briefing.

## Product (current — WIP)

Static React 19 + Vite + TypeScript app. Web MIDI SysEx to a Roland GR-55. No backend.
Connection prefs may persist; **pedal configuration does not** (immediate write + snapshot).
EN + PT-BR via `src/copy/`.

```
Home (GR-55 + placeholders)
  → Connect (silent resume if ports still valid; else prompt)
  → App: Bank | Global
       Maestro chat (left) · bank / global UI (right)
       Exit (top-left) purges connection prefs → Home
```

Connect / resume: [docs/current/connection-resume.md](./docs/current/connection-resume.md).  
Config scope (global vs patch memory): [docs/current/gr55-config-scope.md](./docs/current/gr55-config-scope.md).

| Route | Role |
| --- | --- |
| `#/` | **Home** — pick GR-55 or a placeholder device |
| `#/gr55/conectar` | **Connect** — MIDI ports / simulated pedal |
| `#/gr55/bank` | **Bank** — here (USER xx-y), three keys with instrument icons, CTL/expression, mixer + chain; Maestro scopes the whole bank set |
| `#/gr55/global` | **Global** — SYSTEM / GK + Maestro (system scope only) |

Legacy hashes (`patch`, `palco`, `maestro`, `estudio`, `configuracao`, `dispositivo`, …) redirect into Bank or Global.

### Authority model

- **App write** (UI or Maestro) → DT1 immediately → **full snapshot** (system + temp patch + location). No pending/staged local state.
- While a write/snapshot is in flight → **trust the app** (`sessionAuthority`: ignore pedal churn).
- When idle → **mirror the pedal** (remote DT1 / program change).
- Explicit **Request snapshot** control.
- Slot WRITE (save to USER) is out of this WIP cut.
- localStorage / redux-persist: **connection only** (`rememberedPorts`, `preferSimulated`, `lastRoute` Bank|Global). Never pedal field values.

## Hard rules

- **Do not rewrite** `src/protocol/**` or `src/midi/**` unless the task explicitly requires a protocol/MIDI fix. Prefer `systemMap.ts` and device-layer types for system extensions.
- **No GPL FloorBoard** material (text, XML, skins) in the repo. Address facts only; MIT fork CASouthEast is the system-map reference (see README credits).
- **Scope chips**: 🟠 temporary working copy · 🔵 pedal-wide system. Every control must make scope obvious.
- **Writes**: patch and system parameters DT1 immediately; then full snapshot. No ApplyBar / staging.
- **Maestro**: BYOK Gemini only; never commit API keys or put them in `.env`/fixtures/logs. Model never sees raw SysEx addresses. Policy SoT: `src/maestro/policy.ts`. Scoped by page (bank vs system). On Bank, chat may edit the sounding working copy and ask to switch any key in the bank set.
- **i18n**: all UI strings through `t()` / `useT()`; add keys to **both** `en.ts` (source of truth) and `pt-BR.ts`. Device tone/amp enum names stay as on the pedal (English). `npm run check:copy` must pass.
- Prefer targeted reads and the smallest sufficient change. Do not run broad refactors or the full test matrix unless asked.

## Where to work

| Area | Path |
| --- | --- |
| App Redux store (connection resume) | `src/app/store/**` |
| Visual UI (Linear dark) | `src/app/styles.css`, `index.html`, `docs/current/ui-guidelines.md` |
| GR-55 shell / pages | `Gr55Screen.tsx`, `AppShell.tsx`, `BankPage.tsx`, `GlobalPage.tsx`, `ConnectScreen.tsx` |
| Icons / voices | `Icons.tsx`, `voices.ts` |
| Authority + snapshot | `sessionAuthority.ts`, `snapshotHost.ts` |
| Connect / live MIDI | `connectionThunks.ts`, `connectionRuntime.ts` |
| System map / immediate system writes | `systemMap.ts`, `systemState.ts` |
| Field-key SoT (Maestro) | `pages.ts` |
| Maestro | `src/maestro/**` |
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
