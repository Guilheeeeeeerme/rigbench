# Recipes for common changes

Run the verification commands in [AGENTS.md](../../AGENTS.md) after each recipe.

## Add or move a patch editor field

1. Prefer reusing an existing map field in `src/protocol/` — do **not** invent addresses.
2. Place the field on exactly one section in `src/devices/gr55/pages.ts` (`keys` list).
3. Mark essentials with `essentialKeys`; effect-type gating with `typeKey`; use `readOnlyKeys` when needed.
4. `PAGE_IDS` and URL slugs are frozen — do not rename casually; use `editorHref(pageId, sectionSlug)`.
5. If the UI needs a curated label (not the raw map name), add copy keys in `en.ts` + `pt-BR.ts`.
6. Extend coverage tests in `gr55.test.ts` / page membership tests so every field still lands on one page.
7. If Maestro should edit it, ensure `fieldRegistry` picks it up (rebuilds with `gkMode`).

## Add a system (🔵) field

1. Extend `systemMap.ts` following existing address/size/enum patterns (MIT CASouthEast facts; no GPL paste).
2. Wire read/write staging through `systemState.ts` — never DT1 straight from a control without Apply.
3. Surface in Device and/or Studio System macros (`macros/registry.ts` + `systemRefs.ts`).
4. Confirm dialogs must name what changes. Guitar/Bass mode needs the high-impact warning.
5. Tests: `system.test.ts`. Hardware caveats stay listed in the README until verified on a real pedal.

## Add a Studio macro group

1. Define the group in `src/maestro/macros/registry.ts` with `pills(...)`.
2. Patch writes use dotted registry keys (`p('pcm1/tone/muteSwitch', …)`). System writes use refs (`s('…', …)`).
3. Keep **3–4 mutually exclusive options** per group; musician language in `labelEn` / `labelPt`.
4. Set `implemented: true` only when apply path works; stubs stay `false`.
5. Match logic in `macros/match.ts`; apply path in `macros/apply.ts`.
6. Session must match ownership: system macros in `system`, patch in `patch`, library browse-only.
7. Cover with `macros/macros.test.ts`. Spec: [studio-sessions.md](./studio-sessions.md).

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

## Touch Maestro safely

1. Policy changes go only through `decide()` in `policy.ts` (+ `policy.test.ts`).
2. Do not expose addresses to the model; use registry entries / human labels.
3. Never auto-apply slot or system writes; Stage remains deny.
4. `npm run check:secrets` if storage or key handling changes.
5. Background: [maestro-architecture.md](./maestro-architecture.md).

## Sync behavior

- Read-only toward the pedal. Adaptive RQ1 pacing lives in `sync/engine.ts`.
- Cache in IndexedDB; resume after reload; quick sync probes then full-reads diffs.
- UI progress: `SyncBadge` on all connected screens — do not add a blocking modal except first-run setup.

## Connect / silent resume

Do not re-implement port memory in components. Use Redux `sessionPrefs` +
`resumeIfPossible` / `connectWithPorts` in `connectionThunks.ts`. Live MIDI stays
in `connectionRuntime`. Full SoT: [connection-resume.md](./connection-resume.md).

After changing connect or Stage “where am I” behavior, run the docs audit in
[AGENTS.md](../../AGENTS.md#documentation).
