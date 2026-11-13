# Advanced editor — legacy design notes

> **Status: SUPERSEDED as IA.** Bank \| Global navigation is gone (and its page code was removed);
> legacy hashes redirect to the intention workspace ([intention-workbench.md](./intention-workbench.md)).
> **AdvancedPatchEditor** opens from the Guitar sheet, on the verified write queue.
> Scope taxonomy (SYSTEM vs patch): [gr55-config-scope.md](./gr55-config-scope.md).
> Session-scoped design story: [../archive/studio-sessions.md](../archive/studio-sessions.md).

## What is still true

| Fact | Where |
| --- | --- |
| **AdvancedPatchEditor** — tabs from `PAGE_IDS`, essentials first, "Show all" for remaining keys | `AdvancedPatchEditor.tsx` via `verifiedFieldHost`, mapped by `pages.ts` |

## What is dead (do not re-implement)

- Bank \| Global pages as routes — `BankPage.tsx` / `GlobalPage.tsx` / `SimpleProfiles.tsx` /
  `setupState.ts` were **deleted** in the dead-code sweep; the whole `src/craft/**` macro layer
  (profile pills, sessions, policy) went with them.
- Tone Deck, TonePicker, ScopeConfirm, voices/Icons, and the bank `sync/` + IndexedDB tree.
- Keys 1/2/3 as "which USER slot is sounding" switches — previous and next on the current patch load the slot.
- The craft macro "Simple" profile-pill surface (historical design in the archive).

## Writes (unchanged law)

Verified DT1, then the readback updates the mirror. USER slot WRITE stays explicit
(`writeToUserSlotVerified`). See [intention-workbench.md](./intention-workbench.md).
