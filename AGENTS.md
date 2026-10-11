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
Pick device → Connect → Setup wizard (first time) → Sync → Studio (craft home)
                                                              ├─ sessions: System | Patch | Library
                                                              └─ Stage (perform) · Advanced under ⋯
```

| Route | Role |
| --- | --- |
| `#/gr55/estudio` | **Craft home** after setup — Maestro + session macros |
| `#/gr55/palco` | Stage / setlist (live; Maestro writes denied) |
| `#/gr55/configurar` | First-run wizard + recalibrate |
| `#/gr55/agenda` | Setlist editor |
| `#/gr55/patches` | Library (also a Studio session) |
| `#/gr55/editor/:page/:section` | Dense Advanced editor |
| `#/gr55/dispositivo` · `…/gk` | Device / GK (Advanced; absorbing into Studio System) |

Top chrome: **Studio · Stage · ⋯**. Canonical IA: [docs/current/studio-sessions.md](./docs/current/studio-sessions.md).

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
| GR-55 screens / state | `src/devices/gr55/**` |
| Studio / Stage / Wizard | `Studio.tsx`, `Stage.tsx`, `Wizard.tsx` |
| Sync + IndexedDB | `src/devices/gr55/sync/` |
| System map / staging | `systemMap.ts`, `systemState.ts` |
| Editor pages | `pages.ts`, `Canvas.tsx`, `Workspace.tsx` |
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

## Communication

- Match the user’s language in chat.
- Code, commits, and comments: **English**.
- User-visible UI strings: English + PT-BR dictionaries only.
