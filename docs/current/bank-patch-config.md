# Tone Deck / Advanced — legacy design, live components

> **Status: SUPERSEDED as IA.** Bank \| Global navigation is gone (and its page code was removed);
> legacy hashes redirect to the Patch workspace ([simple-patch-editor.md](./simple-patch-editor.md)).
> The components described here **remain live** inside the workspace's **Advanced** section
> (`PatchWorkspace.tsx`). Scope taxonomy (SYSTEM vs patch): [gr55-config-scope.md](./gr55-config-scope.md).
> Session-scoped design story: [../archive/studio-sessions.md](../archive/studio-sessions.md).

## What is still true

| Fact | Where |
| --- | --- |
| **Tone Deck** — always-above deck with PCM1/PCM2 (mute + level + searchable `TonePicker`), modeling category picker, Normal PU label | `ToneDeck.tsx` + `TonePicker.tsx` (search via `toneMatch.ts`), mounted in `PatchWorkspace.tsx` Advanced section |
| **AdvancedPatchEditor** — tabs from `PAGE_IDS`, essentials first, "Show all" for remaining keys, `typeKey` effect gating, `FieldControl` + `snapshotFieldHost` | `AdvancedPatchEditor.tsx`, mapped by `pages.ts` |
| Recent tone picks persist in `localStorage` key `rigbench.recentTones` (last **8** labels) — UI history only, never pedal values | `TonePicker.tsx` (`RECENT_KEY`) |
| Viewport ≤900px: main stacks above secondary panes, collapsed by default | `AppShell.tsx` + [ui-guidelines.md](./ui-guidelines.md) |

## What is dead (do not re-implement)

- Bank \| Global pages as routes — `BankPage.tsx` / `GlobalPage.tsx` / `SimpleProfiles.tsx` /
  `setupState.ts` were **deleted** in the dead-code sweep; the whole `src/craft/**` macro layer
  (profile pills, sessions, policy) went with them.
- Keys 1/2/3 as "which USER slot is sounding" switches — slot changes happen through Save / Sync.
- The craft macro "Simple" profile-pill surface (historical design in the archive).

## Writes (unchanged law)

Immediate DT1 + full snapshot for temp and system changes; USER slot WRITE stays explicit
(`saveUserSlotVerified`). See [simple-patch-editor.md](./simple-patch-editor.md) → Edit model.
