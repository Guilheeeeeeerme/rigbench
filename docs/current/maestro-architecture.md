# Maestro — architecture reference

> **Status: SUPERSEDED for product shell.** MVP has **no AI**. Live product SoT:
> [simple-patch-editor.md](./simple-patch-editor.md). Non-AI craft helpers moved to
> `src/craft/` (macros, fieldRegistry, toneMatch, policy). `src/maestro/**` may still
> exist as legacy code; do not mount Gemini chat in the app shell.
> Read-with: [glossary.md](./glossary.md), [connection-resume.md](./connection-resume.md).

---

## 1. Locked decisions (from the user, recorded so no one re-litigates)

| # | Decision | Value |
|---|---|---|
| D1 | Shape | Originally global right drawer + `Ctrl/⌘+M` (still on non-Studio screens). On Studio, Maestro is first-class panel — see studio-sessions.md |
| D2 | Provider v1 | **Gemini only** (`gemini-3.6-flash`, REST, BYOK). An `AskProvider` interface exists so Ollama/OpenAI-compatible is a drop-in later — but only Gemini is implemented |
| D3 | Capability | **Edit + explain.** No manual citations in v1 (RAG is gated F3) |
| D4 | Tools | propose `ChangePlan` + `loadSlot` (with human confirm). **Never** writes a slot; system only via staged plan + Apply |
| D5 | Writability *(historical)* | Originally 🟠 only. **Now:** also `stageSystemPlan` → ask — see status banner |
| D6 | Voice | **Web Speech API**, transcript lands as editable draft — never auto-sends |
| D7 | History | Persisted **per patch** in `localStorage`, capped; cleared per conversation |
| D8 | Key storage | `sessionStorage` default; opt-in "Remember on this device" → `localStorage`; visible "Forget"; test button. **Never** in repo, `.env`, logs, or git |
| D9 | Languages | EN + PT-BR via existing typed `copy` system; model replies in the UI language |
| D10 | Apply model | **Propose → diff card → human applies.** No auto-apply in v1 |

## 2. Key handling (incident already caught once — treat as law)

1. The API key exists in exactly two places: the user's browser storage
   (sessionStorage/localStorage) and the `Authorization`/query of one `fetch`
   at request time. Nowhere else: not in code, not in fixtures, not in docs,
   not in test snapshots, not in `console.log`.
2. Provider tests use an injected fake `fetch`; no test ever references a real
   key-shaped string (regex guard in tests: reject anything matching
   `AIza[\w-]{20,}` or `AQ\.` in the repo — a `check:secrets` npm script).
3. On first run with no key: the drawer shows a "needs key" state that links to
   the settings modal; nothing else changes.
4. Guidance shipped in the settings modal (EN/PT): restrict the key by HTTP
   referrer to the app origin, set a budget cap, rotate if exposed.

## 3. Touchpoints in existing code (verified by reading the sources, not assumed)

| Existing piece | Fact used by Maestro |
| --- | --- |
| `changeTracking.temporaryPatchFields()` | `PatchFieldSpan[]` with `reference: FieldReference`, `offset`, `size`, `address`; ReservedFields excluded already |
| `changeTracking.scopeOf(address)` | `working-copy` vs `system` — used as second gate in validator |
| `pages.buildPages(mode, t)` | curated pages `PAGE_IDS` (15), sections with `slug`, `keys`, `essentialKeys`, `readOnlyKeys`, `typeKey`; `memberOf`, `isField` exported |
| `Gr55Editor.write(field, value)` | updates image, reconciles dirty set, sends coalesced DT1 — the only write path Maestro uses |
| `Gr55Editor.read(field)` | `FieldValue<T>` — current value bytes |
| `Gr55Editor.selectPatch(bankMsB, pc)` | slot load (same path Library's Testar uses) — sets `patchSource`, re-reads |
| `Gr55Editor.patchName`, `.gkMode`, `.patchSource`, `.changeCount`, `.subscribe`, `.dirtySnapshot` | header truth for the drawer |
| `formatFieldBytes(field, bytes)` (editor.ts) | human words for values — reused for "current value" in diff cards |
| `RolandAddressMap` | `NumericField {min,max,format}`, `EnumField {labels}`, `BooleanField {trueLabel,falseLabel}`, `AsciiStringField`, guards `isNumericField/isEnumField/isBooleanField` |
| `copy` module | `t(key)` typed dotted keys; `copy.test.ts` keeps `en`/`pt-BR` same shape |
| `Gr55Screen.tsx` / `Workspace.tsx` | mount points: drawer sibling of `<Workspace>`; floating button inside Workspace chrome |

## 4. Architecture (front-only, deterministic core)

```
UI drawer ──► orchestrator ──► provider (Gemini REST)
                │   ▲
                │   └ search/repair rounds ≤3
                ▼
 fieldRegistry ─ contextLadder ─► serialized context (≤4k tokens)
                │
                ▼
        contracts (parse reply) ─► policy ─► validator ─► ValidatedPlan
                                                             │
                                    human clicks Apply ──────┤
                                                             ▼
                                            Gr55Editor.write() → DT1 (🟠)
```

Hard rule: **the model never sees addresses, bytes, slots-to-write, or the
system domain.** Everything it can name is a dotted key built by the registry
from the curated pages, and everything it proposes is re-checked against that
same registry.

## 5. Module-by-module spec (files under `src/maestro/`)

### 5.1 `fieldRegistry.ts`
- `buildFieldRegistry(mode: GkMode): RegistryEntry[]` — iterate
  `buildPages(mode, currentT)`; for every section key whose atom `isField`,
  emit `RegistryEntry`.
- `RegistryEntry` fields (contract for all other modules):
  `key` = `${pageId}/${sectionSlug}/${fieldKey}` (dotted, stable, locale-free),
  `pageId`, `sectionSlug`, `fieldKey`, `label` = pedal's English
  `definition.description`, `ref: FieldReference`, `kind:
  'numeric'|'boolean'|'enum'|'string'|'other'`, `labels?: string[]` (enum,
  encoded order), `min?/max?` (numeric), `essential` (from `essentialKeys`),
  `readOnly` (from `readOnlyKeys`), `complex` (assigns page: read allowed, write
  refused — v1 does not model reinterpreted assign-target encoding).
- Invariants asserted in tests:
  - every `ref.address >= TEMPORARY_PATCH_ADDRESS` (🟠 by construction);
  - keys unique (first-wins if a field appears in two sections — dedupe by
    address, so the model can't have two names for one byte);
  - count ≈ the page sum (hundreds), all of `buildPages` minus Reserved.
- `registryIndex(entries)` → `Map<key, RegistryEntry>`.
- Rebuild trigger: `gkMode` change (subscription in the drawer).

### 5.2 `contextLadder.ts` (query-aware context, ≤ ~4k tokens)
- `assembleContext(entries, readValue, request) → ContextField[]`, where
  `readValue(entry): string` injected (production: editor bytes via
  `formatFieldBytes`; tests: stub) — module stays MIDI/React-free.
- Request: `query`, `patchName`, `sourceNote`, `modeNote`, `visiblePageId?`,
  `charBudget` default 14_000 chars.
- Scoring per entry (skips `readOnly` entirely):
  - 3 → `full`: any query token (len>3, stopword-filtered) appears in the
    lowercase label, **or** the field is `essential`;
  - 1 → `brief`: on the page currently visible to the user;
  - 0 → hidden.
- Budget enforcement: demote `full`→`brief` from the bottom until serialized
  fits; never grow past budget by promoting.
- `serializeContext(fields)` two sections:
  - `key | label | value | constraints` lines (`number min..max` /
    `one of: A | B | C` / `true or false` / `text`), complex marked
    `[read-only for you: use the editor]`;
  - `key (label)` list under "reply kind `search` to see any of these".
- **PT-bridge**: Portuguese words won't match English labels; that's handled by
  the `search` round (§5.6), not by translation tables.

### 5.3 `contracts.ts`
Plain guards (no new deps). Types:
- `MaestroReply`: `{ kind: 'edit'|'explain'|'search', intent: string,
  reply: string, changes: ChangeItem[], search: string }` — optional
  properties per kind, validated at runtime.
- `ChangeItem`: `{ key: string, value: string|number|boolean, why: string }`.
- `ValidatedItem`: `{ change, entry, action: 'accept'|'clamp'|'reject',
  current: string, proposed: string, reason? }`.
- `ValidatedPlan`: `{ accepted[], clamped[], rejected[] }`.
- `isMaestroReply(unknown): asserts` — malformed JSON gets ONE repair round
  (§5.6), then degrades to an explain-only turn.

### 5.4 `policy.ts`
- `decide(entry | null, action, ctx {route, stageLive, session}): 'allow'|'ask'|'deny'`
  - `allow`: action `changePlan` on entry with scope `working-copy` (Bank);
  - `allow`: action `writeSlot` on Bank (recipe PATCH WRITE after temp edits);
  - `ask`: action `loadSlot` on Bank (drawer may confirm; recipes auto-select);
  - `deny`: anything whose scope resolves to `system` outside Global;
  - `deny`: actions `factoryReset`; `writeSlot` outside Bank;
  - `deny`: while Stage full-screen is open (`stageLive`).
- Exported as a pure function + unit-tested table; the UI renders denied paths
  as unavailable, and the orchestrator treats policy as the single source of
  truth (no "are you sure" on deny — a plain explanation instead).

### 5.5 `validator.ts`
Algorithm per `ChangeItem`:
1. Key not in registry → **reject** (`unknown-parameter`). The model cannot
   address bytes it was never shown.
2. Entry `readOnly` or `complex` → **reject** (`not-writable-v1`, message
   points to the editor page link `editorHref(pageId, slug)`).
3. Coerce by kind:
   - numeric: accept integer; `min ≤ v ≤ max` else **reject** (`out-of-range`,
     report the range) — **no silent clamping** (a guitar parameter that lands
     wrong on purpose is worse than a refusal);
   - boolean: accept `true/false` and pedal words (`ON/OFF`, `on/off`) →
     mapped to BooleanField semantics;
   - enum: case-insensitive match against `labels`; near-miss (edit distance ≤2
     among labels) **suggests** — reject with `did you mean: X?`, model never
     gets a second free round for the same item; exact match → value = label;
   - string (patchName etc.): trim, ASCII-printable, truncate at field size →
     accept, reason `truncated`.
4. Re-check `scopeOf(entry.ref.address) === 'working-copy'` (paranoia).
5. `current` = `formatFieldBytes` on editor bytes → diff card truth.
Output `ValidatedPlan` in model order; the drawer shows all three buckets.

Worked examples (become test cases):
- `amp/amp-page/ampGain: 70` → accept.
- `reverb/reverb-page/magicTail: 3` → reject unknown-parameter.
- `chorus/chorus-page/switch: "LIGAR"` (PT from user speech → model may echo)
  → reject with `did you mean: ON?` (not applied, but explained kindly).
- `assigns/...` anything → not-writable-v1 + editor link.
- `patch/patch-page/patchName: "Blues com Sustain Épico!!"` → truncated to 16
  chars, accept with note.

### 5.6 `orchestrator.ts`
Turn state machine: `idle → thinking → (proposal | answer | confirmLoad |
error | needsKey)`.
- `runTurn(text, editor, deps)`:
  1. build context (`assembleContext` with `visiblePageId` from router);
  2. call provider with system prompt (§6) + history window (§7);
  3. parse reply; on parse failure → 1 repair round ("reply JSON matching the
     schema only"); on second failure → surface `reply` text, zero changes;
  4. kind `search`: resolve `search` string against the FULL registry (same
     matcher as FieldSearch), append matched fields as `full`, call again —
     counts toward the ≤3-round cap;
  5. kind `edit`: validate all items; if ≥1 accepted/clamped → proposal card;
     `loadSlot` detection: `key == 'system-load-slot'`-style intent is NOT
     model-invented — instead the reply schema carries `loadSlot: "U14:2"`,
     orchestrator resolves slot label via `slots.ts`/patch map, policy → ask;
  6. kind `explain`: answer text only.
- Abort: user sends a new message mid-round → previous controller `AbortController`
  cancelled; UI shows "stopped".
- Round budget and token growth logged to console.debug (counts only, no key,
  no patch contents).

### 5.7 `provider.ts`
- `interface AskProvider { reply(req: ProviderRequest, signal): Promise<unknown> }`
- `GeminiProvider implements AskProvider` — `fetch` REST:
  `POST …/v1beta/models/gemini-3.6-flash:generateContent`, key from
  `settings.ts`, `generationConfig: { responseMimeType: 'application/json',
  responseSchema }` (§6.2), contents = system (text) + history + user.
- Error mapping: 400 invalid-key-shape → `needsKey`; 401/403 → `badKey`;
  429 → `rateLimited` (retry-after surfaced, no auto-retry); 5xx/network →
  `unreachable`; timeout 30 s. All user-facing messages via `t('maestro.err.*')`.
- No streaming in v1 (skeleton shimmer instead); interface leaves room.

### 5.8 `history.ts`
- Key: `maestro.history.${locale}?no — ${sourceKey}`, `sourceKey` =
  `slot:${userPatchNumber}` when `patchSource.kind==='slot'`, else
  `patch:${patchName}` or `anon:${epoch}`.
- Cap: 30 messages, trimmed oldest; store user text, assistant intent+reply
  (raw JSON kept out), timestamps, applied/rejected outcome per proposal.
- Invalidation: on `selectPatch` or mode change, the stored thread is marked
  stale on reload: a divider "this talk was about Blues Riff (U14:2)" — user
  can continue; context is rebuilt from the NEW patch, so old accepted keys may
  resolve differently (normal, cheap to show).
- "Clear conversation" per patch; export thread as JSON button lives in F4,
  not v1.

### 5.9 `voice.ts`
- Thin wrapper: `createVoiceInput(locale)` → `{ start, stop, onDraft, onError }`
  over `window.SpeechRecognition || webkitSpeechRecognition`, `lang`
  `pt-BR`/`en-US`, `interimResults: true`, continuous off.
- Transcript replaces/continues the input draft — send stays manual.
- Capability check: absent API (Firefox/Safari) → mic button hidden with title
  `t('maestro.voice.unsupported')`; Web MIDI gate already tells users Chrome is
  the assumed browser, so no extra docs churn.

### 5.10 `settings.ts`
- `getApiKey(): string | undefined` (session first, then remembered),
  `setApiKey(v, remember)`, `forgetApiKey()`, `isRemembered()`.
- `testApiKey()` → provider ping (tiny generateContent "ping" with schema
  `{"ok":true}`) used by the modal's Test button.
- Storage guarded (`try/catch`) like the locale module already does.

### 5.11 `MaestroDrawer.tsx`
States (rendered explicitly): `needsKey · idle · thinking · answer ·
proposal · confirmLoad · error`.
Layout (right drawer ~24rem, non-modal, page stays interactive behind):

```
🎼 Mestre                        [⚙] [×]
copy of U14:2 · GUITAR · 🟠 3
──────────────────────────────────────
 user: deixa mais seco no verso
 ┌ proposal ────────────────────────┐
 │ Gate threshold  64 → 82   🟠  ✓  │
 │   why: palcos com monitor barulhento
 │ Chorus send (PCM1) 20 → 12  ✓    │
 │ rejected: reverb/magicTail — não existe
 │ [Aplicar tudo] [por item ↺] [×]  │
 └──────────────────────────────────┘
──────────────────────────────────────
 [ digite ou 🎤 ……… ] [→]
```

- Open button: floating right edge (all areas), `Ctrl/⌘+M`, `Esc` closes,
  `role="complementary"` + `aria-live="polite"` on the message list.
- Focus returns to the opener on close; drawer traps no focus (non-modal).
- Apply → `editor.write` per item; card flips to "applied ✓ (3 unsaved)" and
  the global header 🟠 count (already live via `dirtySnapshot`) visibly
  increments — this cross-talk is the trust loop.
- confirmLoad card: target slot name from cache/Library data, current unsaved
  count, `[Load] [Cancel]` → `selectPatch`; chat notes the switch.
- Denied topics (system/slot-write) render as one-line explanations + link to
  the right area (`deviceHref`), never as dead buttons.
- Stage full-screen: no button, hotkey disabled while open (policy deny also
  enforced server-side of the UI: orchestrator checks `stageLive`).

### 5.12 `styles.css` additions
`.maestro-fab`, `.maestro-drawer` (slide, reduced-motion respected),
`.maestro-card` (proposal rows), `.maestro-row-applied/.rejected/.stale`.
Same type scale as the app; dark Stage theme inherits.

## 6. Model contract

### 6.1 System prompt (shipped as two constants, EN + PT-BR, in `src/maestro/prompts.ts`)

EN (authoritative; PT mirrors 1:1 — both live in prompts.ts, tests assert both
exist and carry the placeholder list):

```
You are "Maestro", the sound engineer copilot inside Rigbench, a web editor for
the Roland GR-55 guitar synthesizer. You are speaking about ONE patch: the
working copy (temporary patch) the user is editing. You are not able to save to
pedal slots, change system settings, or touch other patches.
Answer ONLY with JSON matching the given schema. Rules:
- You may propose changes ONLY using keys shown to you in FIELDS. Never invent
  a key. If you need a field that is missing, reply kind "search" with the one
  English word that names it.
- "edit" = you propose changes; a human always confirms before anything is
  applied. Keep each change small, reversible, and explain WHY in one line,
  in the user's language.
- "explain" = answer questions about the patch or the GR-55, in the user's
  language. If unsure, say so.
- Values: numbers as plain integers within the shown range; booleans as true/
  false; enums exactly as shown in "one of:".
- Never mention SysEx, addresses, or MIDI bytes. You are a musician's copilot.
- Current context is below. Reply JSON only.
CONTEXT: {serialized patch context}
```

PT-BR mirror: same rules in natural PT ("cópia de trabalho", "slot", "não
invente chave…"), same placeholders.

### 6.2 `responseSchema` (Gemini structured output)

```json
{ "type": "object",
  "properties": {
    "kind":       { "type": "string", "enum": ["edit","explain","search"] },
    "intent":     { "type": "string" },
    "reply":      { "type": "string" },
    "changes":    { "type": "array", "items": { "type": "object",
                  "properties": { "key": {"type":"string"},
                                  "value": {},
                                  "why": {"type":"string"} },
                  "required": ["key","value"] } },
    "search":     { "type": "string" },
    "loadSlot":   { "type": "string",
                    "description": "U##:# the user asked to load, else empty" } },
  "required": ["kind","reply"] }
```

## 7. Copy (i18n) — new `maestro.*` section in `en.ts` + `pt-BR.ts`
Keys (grouped; both dicts complete, `copy.test.ts` enforces shape parity):
`maestro.open, maestro.title, maestro.placeholder, maestro.thinking,
maestro.applyAll, maestro.applied (count fn), maestro.discard, maestro.revert
(item), maestro.proposal (intent fn), maestro.current/proposed labels,
maestro.rejected (reason fn), maestro.clampedNote, maestro.staleDivider,
maestro.needsKey.title/body, maestro.settings.title, maestro.settings.key,
maestro.settings.remember, maestro.settings.test, maestro.settings.forget,
maestro.settings.privacy, maestro.err.badKey/rateLimited/unreachable/timeout,
maestro.voice.label/unsupported/listening, maestro.loadSlot.confirm
(slot fn, unsaved fn), maestro.policy.systemDenied/slotDenied/stageLive,
maestro.hint.searchRound, maestro.cleared` — final list is frozen when F1-f
starts; UI text never hardcoded.

## 8. Test plan (all offline; no real network in CI)

Unit (vitest, fake deps):
1. **registry**: >400 entries; uniqueness; 🟠-address invariant; numeric min/
   max present; enum labels ordered; assigns=complex; patchName=string;
   rebuild on mode.
2. **ladder**: query token→full promotion; essential→full; visiblePage→brief;
   budget demotion fits; readOnly never shown; serialization contains search
   vocabulary.
3. **policy**: the allow/ask/deny table as `it.each`; denies system, slot,
   stageLive.
4. **validator**: worked examples §5.5; boolean synonyms; enum did-you-mean;
   string truncation; unknown key; complex/assigns rejection.
5. **provider**: fake fetch — happy schema parse; 400/401/429/5xx mapping;
   timeout abort; key never appears in any request log object (assert).
6. **orchestrator**: repair round on malformed JSON (asserts exactly 1 retry);
   search round appends fields and respects 3-round cap; loadSlot→confirm
   flow emits `ask`; stale context on patch switch (deps injected).
7. **history**: per-patch keying; cap 30; clear.
8. **secrets guard**: repo-wide regex test for key patterns.
Manual acceptance (user runs, both locales): the 8-item list kept from §6 of
the earlier draft: "more dry on the amp" / "deixa mais seco no amp"; hallucinated
key rejected with visible reason; system key refused; Apply → 🟠 increments;
Discard → zero MIDI traffic (fakeDevice assert); reload keeps conversation;
drawer everywhere; key semantics (session vs remember).

## 9. Delivery sequence (each commit green: `npm run lint && npm test && npm run build`)

| Commit | Content | Deps |
|---|---|---|
| F1-a | this spec (docs) | — |
| F1-b | `fieldRegistry.ts` + `contextLadder.ts` + tests | pages, changeTracking |
| F1-c | `contracts.ts` + `policy.ts` + `validator.ts` + tests | F1-b |
| F1-d | `provider.ts` + `settings.ts` + `history.ts` + tests | F1-c |
| F1-e | `orchestrator.ts` + `prompts.ts` + tests | F1-d |
| F1-f | `MaestroDrawer.tsx` + mount + styles + copy keys EN/PT | F1-e |
| F2-a | voice (`voice.ts`) | F1-f |
| F2-b | loadSlot confirm flow | F1-f |
| F2-c | README Maestro section + privacy + rotation guide | F2-b |
| F3 (gated) | manuals RAG — **blocked on EULA decision** (public repo vs private index) | — |
| F4 (later) | multi-patch, Ollama/OpenAI adapter, serverless proxy | — |

Rollback surface: the whole feature is `src/maestro/**` + one mount + copy keys;
revert = two reverts, no schema migration anywhere.

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Hallucinated/PT keys | ladder + `search` round + validator rejection with reasons shown; nothing reaches MIDI |
| Model talks it into system edits | vocabulary-free: registry has no system fields; policy denies; UI renders refusal as guidance |
| Key leak | §2 policy + secrets-guard test; incident (this file, 2026-10-10) shows detection works |
| Long-context cost | 14k-char ladder + 3-round cap + ≤30-message history window; debug counts only |
| Voice in loud room | editable draft always; send is manual |
| Patch switched by pedal mid-chat | stale divider + context rebuild; accepted items from old patch shown as history only |
| Gemini schema drift | responseSchema pinned in code, model constant pinned (`gemini-3.6-flash`), parse repair + graceful degrade |
| Stage write hazard | policy `stageLive` deny is enforced in orchestrator, not just UI |

## 11. Open questions for the user (answerable without code, each blocks a leaf)

1. **Enum near-miss**: reject-with-suggestion (proposed, conservative) or auto-
   apply the suggested label behind confirm-checkbox?
2. **patchName edits**: keep truncation-accept or reject non-ASCII entirely?
3. **Drawer memory budget per patch** (30 msgs proposed) — fine?
4. **Round cap** 3 vs 2 (cheaper vs more PT-fluent search chains)?
5. **F3 gate**: is the repo staying public? Decides whether manual text (RAG
   index) is shipped at all — answer by the time F2-c lands.

## 12. Explicit non-goals v1
Slot writes · system/GK-set edits via chat · multi-patch batch · auto-apply ·
Ollama/OpenAI implementations · manual citations · streaming · conversation
export/share · pedal-side control from chat (no remote footswitch emulation).
