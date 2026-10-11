# Current product & agent specs

Living documents. If these disagree with code, **fix the docs** (or the code if the code is wrong) — do not invent a third story in chat.

After any IA, connect, route, or surface change: **audit this folder + [AGENTS.md](../../AGENTS.md) + root [README.md](../../README.md) + `.cursor/rules/`** — dedupe, fix drift, prefer one SoT with pointers elsewhere. See [AGENTS.md § Documentation](../../AGENTS.md#documentation).

| File | Topic | Authority |
| --- | --- | --- |
| [ui-guidelines.md](./ui-guidelines.md) | Linear dark UI: tokens, Inter, spacing, focus | **SoT** for visual design |
| [connection-resume.md](./connection-resume.md) | MIDI connect, silent resume, Exit purge | **SoT** for connect/resume |
| [gr55-config-scope.md](./gr55-config-scope.md) | Global vs current-patch parameter inventory (OM) | Discovery / taxonomy SoT |
| [glossary.md](./glossary.md) | Scope chips, personas, surface names | **SoT** for UI terminology |
| [recipes.md](./recipes.md) | How to change fields, macros, copy, tests | How-to |
| [maestro-architecture.md](./maestro-architecture.md) | Maestro registry, policy, Gemini BYOK | **SoT** for Maestro internals |
| [studio-sessions.md](./studio-sessions.md) | Session taxonomy + macros (System/Patch) | Craft/macros — page scope = Patch\|Global |
| [mobile-live-control.md](./mobile-live-control.md) | Mobile vision | Vision only; does not redefine Patch/Global |

App navigation and home surface: **[AGENTS.md](../../AGENTS.md)** (Home → Connect → Patch \| Global).

Roland manuals (PDFs): [../manuals/](../manuals/).
