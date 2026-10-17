# Current product & agent specs

Living documents. If these disagree with code, **fix the docs** (or the code if the code is wrong) — do not invent a third story in chat.

After any IA, connect, route, or surface change: **audit this folder + [AGENTS.md](../../AGENTS.md) + root [README.md](../../README.md) + `.cursor/rules/`** — dedupe, fix drift, prefer one SoT with pointers elsewhere. See [AGENTS.md § Documentation](../../AGENTS.md#documentation).

| File | Topic | Authority |
| --- | --- | --- |
| [simple-patch-editor.md](./simple-patch-editor.md) | Patch generator MVP (minimal flow; Caimbé GK helper) | **SoT** for product IA |
| [brazilian-rhythm-catalog.md](./brazilian-rhythm-catalog.md) | 40 BR rhythms + cumbia; priority pagode/sertanejo; profiles A–H; pitch policy | **SoT** for musical catalog |
| [ui-guidelines.md](./ui-guidelines.md) | Linear dark UI: tokens, Inter, spacing, focus | **SoT** for visual design |
| [connection-resume.md](./connection-resume.md) | MIDI connect, silent resume, Exit purge | **SoT** for connect/resume |
| [gr55-config-scope.md](./gr55-config-scope.md) | SYSTEM vs current-patch parameter inventory (OM) | Discovery / taxonomy SoT |
| [glossary.md](./glossary.md) | Scope chips, personas, surface names | **SoT** for UI terminology |
| [recipes.md](./recipes.md) | How to change fields, macros, copy, tests | How-to |
| [bank-patch-config.md](./bank-patch-config.md) | Former Bank Tone Deck / Simple | **Superseded** → [simple-patch-editor.md](./simple-patch-editor.md) |
| [maestro-architecture.md](./maestro-architecture.md) | Former Maestro Gemini stack | **Superseded** (AI out of MVP shell); craft in `src/craft/` |
| [studio-sessions.md](./studio-sessions.md) | Former Bank\|Global session macros | Historical; craft macros under `src/craft/` |
| [mobile-live-control.md](./mobile-live-control.md) | Mobile vision (Stage-era) | Vision only |

App navigation: **[AGENTS.md](../../AGENTS.md)** (Home → Connect → Patch).

Roland manuals (PDFs): [../manuals/](../manuals/).
