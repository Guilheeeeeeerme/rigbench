# Current specs — live product & agent docs

One SoT per topic. If an entry here disagrees with code, **fix the docs** (or the code if the
code is wrong) — never invent a third story in chat, never leave two homes for one topic.

After any IA, connect, route, or surface change: audit this folder + root [AGENTS.md](../../AGENTS.md)
+ root [README.md](../../README.md) + `.cursor/rules/` — dedupe, fix drift, point rather than restate.

| File | Topic | Authority |
| --- | --- | --- |
| [intention-workbench.md](./intention-workbench.md) | Intention workspace: instrument, modes, layers, pedals, verified save | **SoT** — product IA |
| [capability-matrix.md](./capability-matrix.md) | What is still unmeasured on a real GR-55 | **SoT** — hardware claims |
| [simple-patch-editor.md](./simple-patch-editor.md) | Former rhythm → role → sound generator | **Superseded** — pointer only |
| [brazilian-rhythm-catalog.md](./brazilian-rhythm-catalog.md) | Former rhythm catalog | **Superseded** — pointer only |
| [connection-resume.md](./connection-resume.md) | MIDI connect, confirmed read, Exit, read-again Sync | **SoT** — connect |
| [gr55-config-scope.md](./gr55-config-scope.md) | SYSTEM 🔵 vs patch 🟠 parameter inventory (owner's manual) | **SoT** — parameter taxonomy |
| [ui-guidelines.md](./ui-guidelines.md) | Linear dark UI: tokens, Inter, spacing, focus | **SoT** — visual design |
| [glossary.md](./glossary.md) | Scope chips, personas, hardware truths, UI wording | **SoT** — UI terminology |
| [recipes.md](./recipes.md) | How to change fields, system maps, copy, chrome | How-to (points to SoTs) |

Retired from this folder, kept in [archive/](../archive/) with banners:

- `maestro-architecture.md` — Gemini copilot stack; **no AI in the MVP shell**, and `src/maestro` was removed outright
- `studio-sessions.md` — Stage-era Studio sessions; the craft/macro layer (`src/craft/**`) was removed with the dead-code sweep

Both retired designs keep their full story in the archive only.

| File | Topic | Authority |
| --- | --- | --- |
| [bank-patch-config.md](./bank-patch-config.md) | Tone Deck / Advanced / recent tones | **Superseded stub** — facts only |
| [mobile-live-control.md](./mobile-live-control.md) | Mobile platform truth + live-simplify vision | **Vision only** (not shipped IA) |

Roland manuals (PDFs): [../gr55-collection/manuals/](../gr55-collection/manuals/) —
an owner's-manual parameter guide lives inline in [gr55-config-scope.md](./gr55-config-scope.md).

App navigation summary: root [AGENTS.md](../../AGENTS.md) (Home → Connect → intention workspace).
