# UI guidelines — Linear dark system

> **Status:** Live. SoT for visual design of the Rigbench web UI.
> **Precedence:** code (`src/app/styles.css`, `index.html`) → this file → [AGENTS.md](../../AGENTS.md).
> Agents **must** follow this when changing any user-visible layout or chrome.
> Product IA (Stage · Maestro · Setup) is unchanged — see [AGENTS.md](../../AGENTS.md).

## Intent

A dense, calm, **Linear-inspired dark** interface: Inter, 4px grid, few colors, high
contrast text, no decorative motion. The musician reads Stage at arm’s length; craft
surfaces stay quiet.

## Tokens (CSS)

Defined on `:root` in [`src/app/styles.css`](../../src/app/styles.css):

| Token | Value | Use |
| --- | --- | --- |
| `--surface-base` | `#080A0A` | Page background |
| `--surface-raised` | `#141516` | Panels, inputs, cards that hold interaction |
| `--surface-overlay` | `#1C1D1F` | Hover / elevated chrome |
| `--text-primary` | `#E2E4E3` | Headings, primary body |
| `--text-secondary` | `#B2B3B3` | Supporting copy |
| `--text-tertiary` | `#8A8B8D` | Labels, uppercase section titles |
| `--border-default` | `#2D2E30` | 1px borders / dividers |
| `--accent` / `--focus` | `#5E6AD2` | Primary actions, focus rings, active nav |
| `--accent-hover` | `#6B76DB` | Primary button hover |
| `--danger` | `#E5484D` | Errors / destructive affordances |

Legacy aliases `--bg`, `--surface`, `--border`, `--text`, `--muted` map to the tokens above.

### Scope chips (product — required)

Keep distinct from chrome accent:

| Chip | Token | Color |
| --- | --- | --- |
| 🟠 Working copy | `--scope-working` | `#F08A24` |
| 🟢 Slot | `--scope-slot` | `#3DD68C` |
| 🔵 System | `--scope-system` | `#5B9CFF` |

## Typography

- **Font:** Inter only (loaded in `index.html`).
- **Body:** 17px / 400; secondary 15–16px; captions 12–14px.
- **Headings:** weight 700; home/gate brand uses large display (`clamp` up to ~60px).
- `text-wrap: balance` on headings; `pretty` on body.
- `tabular-nums` via `font-feature-settings: 'tnum' 1`.
- Do **not** invent letter-spacing unless a label row already uses a tight uppercase style.

## Spacing & shape

- **4px grid:** `--space-1`…`--space-5` (4 / 8 / 12 / 16 / 20). Prefer these over arbitrary rem.
- **Radius:** `--radius` 6px default; `--radius-lg` 8px for nav chips and notices.
- **Borders:** 1px `--border-default`. No multi-layer shadows; no glow.
- **Full height:** `100dvh` (not `100vh`). Respect `safe-area-inset` on sticky chrome.
- **No pill clusters** (`border-radius: 999px`) for nav — use `--radius-lg`.

## Interaction

- Focus: `2px` outline `--focus`, `2px` offset. Never remove `:focus-visible`.
- Disabled: `opacity: 0.5`, `cursor: not-allowed`.
- Primary hover: `--accent-hover`. Secondary hover: `--surface-overlay`.
- Destructive / irreversible: confirm UI (existing Apply / discard patterns) — do not silent-write.
- Errors next to the action (Connect problems, Apply bar, Maestro).
- **No new animation** unless explicitly requested. Respect `prefers-reduced-motion`.
- Never block paste on inputs.

## Dark only

`color-scheme: only dark`. Do not reintroduce a light theme without a product decision and
docs update.

## What not to do

- No Inter alternatives (Roboto, system stack as primary).
- No warm cream / terracotta / purple-gradient marketing skins.
- No flat single-purpose “dashboard card grids” that fight Stage’s one-job layout.
- No inventing a second accent that competes with `#5E6AD2` for chrome (scope chips excepted).

## Checklist before shipping UI

1. Tokens only — no new hex for chrome colors.
2. Inter still loaded; body still ~17px.
3. Focus ring visible on keyboard path.
4. Stage / Connect / AppNav still readable on a phone-width viewport.
5. Update this file if you add a token; point from [docs/current/README.md](./README.md).
