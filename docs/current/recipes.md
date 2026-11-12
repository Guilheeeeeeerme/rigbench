# Recipes for common changes

Run the verification commands in [AGENTS.md](../../AGENTS.md) after each recipe.
Product IA SoT: [intention-workbench.md](./intention-workbench.md).

## Add or move a patch editor field

1. Prefer reusing an existing map field in `src/protocol/` — do **not** invent addresses.
2. Place the field on exactly one section in `src/devices/gr55/pages.ts` (`keys` list).
3. Mark essentials with `essentialKeys`; effect-type gating with `typeKey`; use `readOnlyKeys` when needed.
4. `PAGE_IDS` and URL slugs are frozen — do not rename casually; use `editorHref(pageId, sectionSlug)`.
5. If the UI needs a curated label (not the raw map name), add copy keys in `en.ts` + `pt-BR.ts`.
6. Extend coverage tests in `gr55.test.ts` / page membership tests so every field still lands on one page.

## Add a system (🔵) field

1. Extend `systemMap.ts` following existing address/size/enum patterns (MIT CASouthEast facts; no GPL paste).
2. Do **not** invent addresses; verify against the owner's manual parameter list
   ([gr55-config-scope.md](./gr55-config-scope.md)) or a captured dump.
3. `systemState.ts` writes are **immediate DT1** — there is no staging layer; controls gate on
   impact confirm (ScopeConfirm) instead. Never queue a hidden write.
4. Surface new fields through UI reads (`system.read(...)`) wired into the workspace or Setup section.
5. Confirm dialogs must name what changes. Guitar/Bass mode needs the high-impact warning.
6. Tests: `system.test.ts`. Hardware caveats stay listed in the root README until verified on a real pedal.

## Add UI copy

1. Add the key under the right namespace in `src/copy/en.ts`.
2. Mirror the same key and `{param}` placeholders in `pt-BR.ts`.
3. Consume with `t('namespace.key', { param })` or `useT()`.
4. `npm run check:copy`.

## Change visual chrome

1. Follow [ui-guidelines.md](./ui-guidelines.md) — tokens in `src/app/styles.css` only.
2. Do not introduce a light theme, Inter alternatives, or a second chrome accent.
3. Keep scope-chip colors on `--scope-*`.
4. After visual changes, run the docs audit in [AGENTS.md](../../AGENTS.md#documentation).

## No AI, ever

`src/maestro` was removed; do not reintroduce chat/copilot code. Run `npm run check:secrets`
whenever storage, keys, or downloaded data could be touched. Historical architecture:
[../archive/maestro-architecture.md](../archive/maestro-architecture.md).

## Sync behavior

The workspace **Sync** control reads the sounding patch again. It does not open the slot cache.
`sync/engine.ts` and IndexedDB remain in the tree for their own tests; do not mount them on connect.

## Connect

Do not store ports or resume a previous session. Connect goes through `connectWithPorts` in
`connectionThunks.ts`. Live MIDI stays in `connectionRuntime`. Full SoT:
[connection-resume.md](./connection-resume.md).

After changing connect or silent-resume behavior, run the docs audit in
[AGENTS.md](../../AGENTS.md#documentation).
