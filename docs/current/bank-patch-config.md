# Bank patch config — Tone Deck + Simple / Advanced

> **Status: SUPERSEDED.** Product IA is the single Patch workspace —
> [simple-patch-editor.md](./simple-patch-editor.md). Tone Deck / Advanced remain as the
> Advanced escape hatch inside that workspace. Do not treat Bank \| Global as live navigation.
> Scope taxonomy (SYSTEM vs patch): [gr55-config-scope.md](./gr55-config-scope.md).

## Intent

Edit the **sounding temporary patch** (🟠) on Bank with:

1. **Tone Deck** — always visible; four sources + master; searchable tone pickers.
2. **Simple** — Bose-style profile pills that write multi-field bundles.
3. **Advanced** — full OM-grouped parameters from `buildPages`.

Keys 1/2/3 only switch which USER slot is sounding/edited. Bank-wide multi-slot Simple
recipes are out of scope.

## Layout (mobile-first)

```
Header · Simple | Advanced (sessionStorage: rigbench.bankMode)
Feet (bank ← → · keys 1/2/3)
Tone Deck (never collapsed)
  Simple body: profile groups
  Advanced body: page tabs + essentials / show-all
```

On viewports ≤900px, AppShell defaults chat collapsed and stacks **main above** Maestro when
chat is open.

## Tone Deck

| Source | Mute / level | Tone browser |
| --- | --- | --- |
| PCM1 / PCM2 | yes | `TonePicker` over `toneSelect` labels; `matchPcmTones` + substring |
| Modeling | yes | Flattened category · tone list; writes category + number fields |
| Normal PU | yes | No catalog (label only) |

Recent picks: `localStorage` key `rigbench.recentTones` (last 8 labels).

## Simple groups

Implemented patch macros surfaced on Bank (not Maestro-only): `amp-grit`, `atmosphere`,
`tone-shape`, `loudness`, `front-effect`, `color-box`, `guitar-body`, `synth-voice`,
`chain-path`, `tuning`, `patch-feet`. `layers` is omitted — Tone Deck is SoT for what’s on.

Apply via `applyMacroOption` under `runAppMutation` with policy session `bank`.
Match highlighting via `matchGroup`.

## Advanced

`AdvancedPatchEditor`: tabs from `PAGE_IDS`, essentials first, “Show all” for remaining keys,
`effectOfFields` type gating, `FieldControl` + `snapshotFieldHost`. Tone pages remain
reachable; Tone Deck stays mounted above.

## Writes

Immediate DT1 + full snapshot. USER slot WRITE stays explicit (Maestro WRITE control).
