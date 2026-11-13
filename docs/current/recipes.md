# Recipes for common changes

Run the verification commands in [AGENTS.md](../../AGENTS.md) after each recipe.
Product IA SoT: [intention-workbench.md](./intention-workbench.md).

## Add or move a patch editor field

1. Prefer reusing an existing map field in `src/protocol/` — do **not** invent addresses.
2. Place the field on exactly one section in `src/devices/gr55/pages.ts` (`keys` list).
3. Mark essentials with `essentialKeys`; effect-type gating with `typeKey`; use `readOnlyKeys` when needed.
4. `PAGE_IDS` and URL slugs are frozen — do not rename casually; use `editorHref(pageId, sectionSlug)`.
5. If the UI needs a curated label (not the raw map name), follow [intention-workbench.md](./intention-workbench.md) (Language).
6. Extend coverage tests in `gr55.test.ts` / page membership tests so every field still lands on one page.

## Add a system (🔵) field

1. Extend `systemMap.ts` following existing address/size/enum patterns (MIT CASouthEast facts; no GPL paste).
2. Do **not** invent addresses; verify against the owner's manual parameter list
   ([gr55-config-scope.md](./gr55-config-scope.md)) or a captured dump.
3. `systemState.ts` writes are **immediate DT1** — there is no staging layer; controls gate on
   an impact confirm dialog instead. Never queue a hidden write.
4. Surface a system field from `systemMap.ts` on the Guitar sheet, or in Advanced when it is a patch field. There is no Setup section.
5. Confirm dialogs must name what changes. Guitar/Bass mode needs the high-impact warning.
6. Tests: `system.test.ts`. Unmeasured hardware claims stay in [capability-matrix.md](./capability-matrix.md).

## Add UI copy

[intention-workbench.md](./intention-workbench.md) (Language). Add the key to `en.ts` and the same key to `pt-BR.ts`, then `npm run check:copy`.

## Change visual chrome

1. Follow [ui-guidelines.md](./ui-guidelines.md) — tokens in `src/app/styles.css` only.
2. Do not introduce a light theme, Inter alternatives, or a second chrome accent.
3. Keep scope-chip colors on `--scope-*`.
4. After visual changes, run the docs audit in [AGENTS.md](../../AGENTS.md#documentation).

## No AI, ever

No chat or copilot in the product shell. History: [../archive/maestro-architecture.md](../archive/maestro-architecture.md).

## Sync and connect

[connection-resume.md](./connection-resume.md). Do not mount a bank sync engine or IndexedDB on connect. The old `sync/` tree was removed.

After changing connect or silent-resume behavior, run the docs audit in
[AGENTS.md](../../AGENTS.md#documentation).
