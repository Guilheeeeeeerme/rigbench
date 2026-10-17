# Rigbench docs index

Two independent things live under `docs/`. Read the one your task is about:

| Folder | What it is | Entry point |
| --- | --- | --- |
| [current/](./current/) | **App specs** — live product/agent docs for the Rigbench web app | [current/README.md](./current/README.md) |
| [gr55-collection/](./gr55-collection/) | **Data library** — patches (.g5l), manuals, MIDI tracks; gitignored, ~100 MB binaries | [gr55-collection/AGENTS.md](./gr55-collection/AGENTS.md) |
| [archive/](./archive/) | Historical design (superseded; never a live briefing) | [archive/README.md](./archive/README.md) |

Rules that govern this tree live in the root [AGENTS.md](../AGENTS.md) (§ Precedence,
§ Documentation): one SoT per topic, superseded docs get a status banner, drift is fixed
immediately after any IA/behavior change.

Quick task → doc lookup:

| Task | Go to |
| --- | --- |
| Change product IA, routes, surfaces | `current/simple-patch-editor.md` |
| Add a rhythm / preset / tone | `current/brazilian-rhythm-catalog.md` |
| Touch connect / resume / Exit / Sync | `current/connection-resume.md` |
| Change SYSTEM (🔵) vs patch (🟠) fields | `current/gr55-config-scope.md` |
| Change UI chrome / tokens | `current/ui-guidelines.md` |
| Name a UI string | `current/glossary.md` |
| Make a code change safely | `current/recipes.md` |
| Inspect a .g5l patch | `gr55-collection/AGENTS.md` |
