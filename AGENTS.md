# AGENTS.md — Rigbench

Coding-agent rules for this repository. User product docs: [README.md](./README.md).
Active design: [docs/current/](./docs/current/). Historical material: [docs/archive/](./docs/archive/) — never overrides code or this file.

## Precedence (highest wins)

1. **Code** — especially `src/devices/gr55/routes.ts`, `policy.ts`, `systemMap.ts`, `pages.ts`, `macros/registry.ts`
2. **This file** + [docs/current/](./docs/current/)
3. **README.md** (user-facing; keep in sync when IA changes)
4. **docs/archive/** — research and shipped redesign plans only

Do **not** follow `docs/archive/prompt-v2-rigbench-palco.md` as a live briefing.

## Product (current)

Static React 19 + Vite + TypeScript app. Web MIDI SysEx to a Roland GR-55. No backend.
Nothing edited leaves the machine (IndexedDB / localStorage). EN + PT-BR via `src/copy/`.

```
Pick device → Connect (silent resume if ports still valid; else prompt)
            → Setup wizard (first run) → Stage (now — mirrors the pedal)
                                          ├─ Maestro: any configuration with AI
                                          └─ Setup: Device · GK · recalibrate
```

Connect / resume / patch location: [docs/current/connection-resume.md](./docs/current/connection-resume.md).

| Route | Role |
| --- | --- |
| `#/gr55/palco` | **Stage — the app.** Like holding the pedal in hand: where you are (`USER 04-2 <name>`), the 3 keys of the current bank, previous/next bank (the pedal moves along); its instruments (icons, mute, level), master, chain switches |
| `#/gr55/maestro` | **Maestro — the AI.** Does any configuration by conversation (patch ± system craft, BYOK Gemini) |
| `#/gr55/configuracao` | **Setup.** Global only: cards to Device / GK sets / recalibrate |
| `#/gr55/configurar` | First-run wizard + recalibrate (no app bar while it runs) |
| `#/gr55/patches` | Slots & files — save, import, whole-pedal backup (reached from Setup) |
| `#/gr55/maestro` | Maestro AI sessions (writes follow policy) |
| `#/gr55/dispositivo` · `…/gk` | Device / GK — global configuration, set once |
| `#/gr55/estudio` | Legacy address → redirects to Stage |

Navigation: `AppNav` rendered once in `Gr55Screen` — three sticky items (Stage · Maestro · Setup). No per-screen nav.

Advanced editor (`#/gr55/editor/**`) was **removed**. `pages.ts` survives only as the
locale-free SoT for field keys (Maestro fieldRegistry / macros). Old editor deep links
redirect to Stage. Built in the address map; shows device / connection.



[docs/current/mobile-live-control.md](./docs/current/mobile-live-control.md) is a **vision** for Stage Live Simplify and mobile platforms. It does **not** redefine Maestro (AI), Studio, or Stage, and it does not authorize a second app or iOS Web MIDI support.

## Hard rules

- **Do not rewrite** `src/protocol/**` or `src/midi/**` unless the task explicitly requires a protocol/MIDI fix. Prefer `systemMap.ts` and device-layer types for system extensions.
- **No GPL FloorBoard** material (text, XML, skins) in the repo. Address facts only; MIT fork CASouthEast is the system-map reference (see README credits).
- **Scope chips**: 🟠 temporary working copy · 🟢 saved slot · 🔵 pedal-wide system. Every control must make scope obvious.
- **Writes**: patch parameters go immediately to the temporary buffer via `Gr55Editor.write`. System changes **stage → named confirm → Apply**. Never silent slot overwrite; show diff first.
- **Stage**: no destructive writes while Stage is live. Maestro `decide()` denies writes when `stageLive`.
- **Maestro**: BYOK Gemini only; never commit API keys or put them in `.env`/fixtures/logs. Model never sees raw SysEx addresses. Policy SoT: `src/maestro/policy.ts`.
- **i18n**: all UI strings through `t()` / `useT()`; add keys to **both** `en.ts` (source of truth) and `pt-BR.ts`. Device tone/amp enum names stay as on the pedal (English). `npm run check:copy` must pass.
- **UI glossary**: prefer working copy · slot · save · apply · system — not buffer / SysEx / write / global in user-facing copy.
- Prefer targeted reads and the smallest sufficient change. Do not run broad refactors or the full test matrix unless asked.

## Where to work

| Area | Path |
| --- | --- |
| App Redux store (connection resume) | `src/app/store/**` |
| Visual UI (Linear dark) | `src/app/styles.css`, `index.html`, `docs/current/ui-guidelines.md` |
| GR-55 screens / state | `src/devices/gr55/**` |
| GR-55 connect / live MIDI holder | `connectionThunks.ts`, `connectionRuntime.ts`, `ConnectScreen.tsx` |
| Stage / Setup / Wizard / Maestro | `Stage.tsx`, `Setup.tsx`, `Wizard.tsx`, `Studio.tsx` |
| Icons / voices | `Icons.tsx`, `voices.ts` |
| App bar (only nav) | `AppNav.tsx` |
| Sync + IndexedDB | `src/devices/gr55/sync/` |
| System map / staging | `systemMap.ts`, `systemState.ts` |
| Field-key SoT (Maestro) | `pages.ts` |
| Maestro | `src/maestro/**` (macros under `macros/`) |
| Copy | `src/copy/` |
| Frozen protocol / MIDI | `src/protocol/**`, `src/midi/**` |

Recipes: [docs/current/recipes.md](./docs/current/recipes.md). Glossary: [docs/current/glossary.md](./docs/current/glossary.md).

## Verification

```bash
npm run check:copy
npm run typecheck
npm test                 # or a focused Vitest path for the files you touched
npm run check:secrets    # if Maestro / keys / storage touched
npm run lint             # before a broad handoff
```

Dev: Node 22 (`.nvmrc`), `npm run dev` → `http://localhost:5173`. Use **simulated pedal** when hardware is unavailable. Chrome/Edge for real Web MIDI + SysEx.

## UI

Visual SoT: [docs/current/ui-guidelines.md](./docs/current/ui-guidelines.md)
(Linear-inspired dark: Inter, `#080A0A` base, accent `#5E6AD2`, 4px grid, 6/8px radius).
Implement in `src/app/styles.css` + `index.html`. Do not reintroduce light theme or
orange chrome accent. Scope chips 🟠🟢🔵 keep `--scope-*` tokens.

## Documentation

After **every** change that affects IA, routes, connect/resume, surfaces, **UI chrome**,
or user-facing behavior:

1. Audit [docs/current/](./docs/current/), this file, [README.md](./README.md), and
   `.cursor/rules/` for drift.
2. **Deduplicate** — one SoT per topic; other docs get a one-line pointer, not a
   second story.
3. **Consolidate** — prefer updating the existing SoT over adding a parallel file.
4. Mark superseded claims in older specs (status banner), never leave two homes.
5. UI changes must match [ui-guidelines.md](./docs/current/ui-guidelines.md).

Index: [docs/current/README.md](./docs/current/README.md).

## Communication

- Match the user’s language in chat.
- Code, commits, and comments: **English**.
- User-visible UI strings: English + PT-BR dictionaries only.
