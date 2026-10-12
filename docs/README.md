# Rigbench documentation

## Precedence

1. **Code** (`src/…`)
2. **[AGENTS.md](../AGENTS.md)** + **[current/](./current/)**
3. **[README.md](../README.md)** (users)
4. **[archive/](./archive/)** (historical only)

## Layout

| Path | Audience | Contents |
| --- | --- | --- |
| [current/](./current/) | Agents + contributors | Live specs (connect, glossary, Maestro, recipes, vision); optional Ringbench SaaS discovery |
| [manuals/](./manuals/) | Anyone | Official GR-55 PDFs (read-only reference) |
| [archive/](./archive/) | Research | Superseded briefings and redesign plans |
| `Jev-Engineering-for-Coding-Agents.pdf` | Meta | Notes on conditional agent instructions (not product IA) |

## Start here

- New to the app → root [README.md](../README.md)
- Coding agent session → [AGENTS.md](../AGENTS.md)
- Connect / silent resume / Exit → [current/connection-resume.md](./current/connection-resume.md)
- Patch vs Global parameter taxonomy → [current/gr55-config-scope.md](./current/gr55-config-scope.md)
- Surfaces / wording → [current/glossary.md](./current/glossary.md)
- Visual UI (Linear dark) → [current/ui-guidelines.md](./current/ui-guidelines.md)
- Maestro internals → [current/maestro-architecture.md](./current/maestro-architecture.md)
- Session macros (craft) → [current/studio-sessions.md](./current/studio-sessions.md)
- Mobile / Stage Live Simplify vision → [current/mobile-live-control.md](./current/mobile-live-control.md)
- How to change fields safely → [current/recipes.md](./current/recipes.md)
- Ringbench SaaS / GCP sandbox research → [current/ringbench-saas-discovery.md](./current/ringbench-saas-discovery.md), [current/gcp-sandbox-bootstrap.md](./current/gcp-sandbox-bootstrap.md) (non-authoritative for MIDI product IA)

## Docs audit (required after IA/behavior changes)

One SoT per topic; fix drift; demote conflicts with a status banner. Checklist:
[AGENTS.md § Documentation](../AGENTS.md#documentation).
