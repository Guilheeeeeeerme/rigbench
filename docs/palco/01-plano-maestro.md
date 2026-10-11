# Plano Mestre — implementation plan for the Maestro (Mestre) drawer

> Approved brief: stage-first app gets a right-side copilot that proposes
> validated patch edits from text/voice in EN + PT-BR. This file is the
> executable plan, written against the code as it exists on `main` after
> Phase E (commit 2e44af8). Decisions locked by the user:
> global right drawer · Gemini only (interface allows more later) · edit +
> explain · tools: propose + loadSlot (never write slots) · history saved per
> patch · BYOK in sessionStorage with opt-in remember · Web Speech voice ·
> 🟠 patch fields only, policy denies system and slot writes.

**Security note:** the Gemini API key is NEVER stored in this repo, in
`.env`, in code, or in git. The user pastes it into the app's settings modal;
it lives in `sessionStorage` (or `localStorage` only via explicit opt-in with a
visible "Forget key" control). The key shared in chat should be rotated.

---

## 0. Ground rules from existing code (verified, not assumed)

| Need | Existing piece | How Maestro uses it |
| --- | --- | --- |
| Field index | `changeTracking.temporaryPatchFields()` → `PatchFieldSpan[]` with `reference: FieldReference`, `offset`, `size`, `address` | base of the resolver registry |
| Page/section for a field | `pages.buildPages(mode, t)` → pages → sections → `keys` + `slug`; `memberOf(struct, key)`; `isField` | registry stores `pageId/sectionSlug/key` for deep links + context |
| Write a value | `Gr55Editor.write(field, value)` — updates image, marks dirty, sends coalesced DT1 | the ONLY write path Maestro applies through |
| Load a slot | `Gr55Editor.selectPatch(bankMsb, programChange)` (already used by Library "Testar") | Maestro `loadSlot` action, human-confirmed |
| Patch identity | `editor.patchName`, `editor.patchSource`, `editor.gkMode` | conversation keyed by source slot or name |
| Dirty badge sync | `subscribe`, `dirtySnapshot`, `changeCount` | drawer shows applied counts live |
| i18n | `copy/{en,pt-BR}.ts` + typed `useT()`; `copy.test.ts` asserts same shape | all UI strings via new `maestro.*` keys |
| Value typing | `RolandAddressMap`: `FieldDefinition{size,type}`, `isNumericField`, `isBooleanField`, `isEnumField`, `type.decode/encode`, enum labels | validator coerces label→value, range-checks numerics |

Open technical points to resolve when coding (read `RolandAddressMap.ts` first):
1. Exact enum API (label list property name) for accepting `"ON"` / `"on"` / PT label.
2. Numeric bounds (min/max) availability per type; if absent, accept the integer
   and rely on `type.encode` throwing → treated as rejection (no clamp beyond
   documented ranges).
3. Assign-target fields (`RolandGR55Assigns` reinterpreted fields): v1 treats them
   as opaque — resolver marks them `complex: true`, model may read but not write
   (rejection reason: "use the editor for assigns in v1").

---

## 1. Module map (all new files under `src/maestro/`, isolated by design)

```
src/maestro/
├── fieldRegistry.ts    build: dotted key → {ref, pageId, slug, description,
│                       kind: 'numeric'|'boolean'|'enum'|'string'|'complex',
│                       labels?, min?, max?, essential} (from pages + spans)
├── contextLadder.ts    query → serialized context ≤ ~4k tokens:
│                       always: patch name/mode/source + visible page's fields
│                       scored: description matches query tokens (hide|brief|full)
├── contracts.ts        Zod-free plain guards: MaestroRequest, MaestroReply
│                       (kind: 'edit'|'explain'|'search'), ChangeItem,
│                       ValidatedPlan {accepted, clamped, rejected[]}
├── policy.ts           decideWrite(scope, action, route, stageLive) → 'allow'|'ask'|'deny'
│                       denies system scope, slot writes, edits while stage full-screen
├── validator.ts        resolveChange(item): registry lookup → coerce →
│                       policy → editor.read current bytes → {accepted|clamped|rejected}
├── provider.ts         AskProvider interface; GeminiProvider via fetch REST
│                       (generateContent + generationConfig.responseSchema)
├── orchestrator.ts     runTurn(userText, editor, ctx): ≤3 rounds
│                       [context → gemini → validate → if 'search': append registry
│                       hits and resend] → final reply object
├── history.ts          per-patch conversation in localStorage (cap 30 msgs)
│                       key: maestro.history.${sourceKey}
├── voice.ts            Web Speech wrapper (lang follows locale), editable draft
├── settings.ts         key storage: sessionStorage default; remember → localStorage;
│                       forget; test connection (models list ping)
├── MaestroDrawer.tsx   UI: messages, proposal cards (accept all / per item),
│                       loadSlot confirm step, settings modal, mic button
└── maestro.test.ts     registry/validator/policy/orchestrator (fake fetch) tests
```

Touched files (minimal): `Gr55Screen.tsx` (mount drawer), `Workspace.tsx`
(floating open button + shortcut), `copy/en.ts`, `copy/pt-BR.ts` (new section),
`styles.css` (drawer + cards).

---

## 2. The wire contract (Gemini, v1)

Single model call, structured output. Request system prompt (generated in EN,
with a PT mirror for the "explain" voice):

- Role: "You are the sound engineer of a Roland GR-55. You NEVER invent
  parameters. Available fields are those listed with keys like `amp/ampGain`.
  Reply JSON matching the schema."
- Context block from `contextLadder`: working copy name, source slot, GK mode,
  fields as `key | label | value | kind | range/labels`.
- Response schema (`generationConfig.responseSchema`, `responseMimeType:
  application/json`):

```json
{
  "kind": "edit | explain | search",
  "intent": "short human sentence",
  "reply": "markdown for the user (PT or EN per locale)",
  "changes": [{ "key": "amp/ampGain", "value": 62, "why": "…" }],
  "search": "word the ladder missed"
}
```

Rules the orchestrator enforces regardless of what the model says:
`edit` items pass `validator`; `search` triggers ONE extra round with hits
appended; total rounds ≤ 3; any malformed JSON → single repair round; else
surface the model's plain reply with zero changes offered.

Provider details: `gemini-2.5-flash` via
`POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=...`
(key from settings.ts; never logged). Model name constant, no free-text config.

## 3. Policy (as-code, unit-tested)

```
allow  scope=patch, action=changePlan            (UI still confirms per item)
ask    action=loadSlot                            (modal: unsaved-count shown)
deny   scope=system (any 🔵 field)                "not available in Maestro v1"
deny   action in {writeSlot, writeSystem, factoryReset}
deny   while Stage is full-screen                 "Stage is live; no writes"
```

`validator` stamps every change item with the resolver's scope; system-range
addresses (below `TEMPORARY_PATCH_ADDRESS`, see `changeTracking.scopeOf`) are
unresolvable by construction (registry only contains patch spans) — defense in
depth: policy double-checks against `scopeOf(address)`.

## 4. UI / UX contract

- Mount: floating button "🎼 Mestre" right edge on all connected screens (not in
  Stage full-screen mode); opens as 24rem right drawer over content, ESC closes.
  Shortcut Ctrl/⌘+M. Drawer state (open/msgs) persists per patch (history.ts).
- Proposal card per turn: intent line; table row per item
  `label · current → proposed [why]`, chips: accepted 🟠 / clamped ⚠️ /
  rejected ❌ (reason text i18n). Buttons: `Apply all` · per-row `Apply` ·
  `Discard`. Apply calls `editor.write` (ledger counts update live everywhere).
- loadSlot: reply kind `edit` + field key `common/patchName` mismatch →
  orchestrator detects request implies another slot ("load U14:2") → drawer
  shows confirm card (current unsaved count, target slot, source unknown) →
  `selectPatch` → history notes the switch.
- Voice: mic toggles Web Speech (`lang` = locale), transcript lands in the input
  draft — never auto-sends.
- Settings modal: paste key (password field), `Remember on this device` checkbox,
  `Test` (ping), `Forget`, tiny privacy line (what is sent, in current locale).
- All copy via `t('maestro.*')`: en.ts gets a `maestro` section, pt-BR.ts the
  mirror (copy.test.ts keeps them equal by construction).

## 5. Delivery sequence (commits on `main`, each green: `npm run lint && npm run test && npm run build`)

1. **F1-a** `docs: Maestro implementation plan` — this file.
2. **F1-b** `maestro: field registry and context ladder` —
   `fieldRegistry.ts`, `contextLadder.ts` + unit tests (every patch field
   resolves; ≤4k tokens for a canned query; hide/brief/full behavior).
3. **F1-c** `maestro: contracts, policy and validator` —
   `contracts.ts`, `policy.ts`, `validator.ts` + tests (accept/coerce enum
   EN+PT labels, reject unknown keys, reject system scope, boolean synonyms,
   numeric bounds, complex/assign fields blocked).
4. **F1-d** `maestro: Gemini provider, settings and history` — `provider.ts`,
   `settings.ts`, `history.ts` + tests (fake fetch: schema reply parses; key
   never persists without opt-in; malformed JSON repair round).
5. **F1-e** `maestro: orchestrator` — rounds loop, caps, degradation paths +
   tests (search round appended; >3 rounds aborts; no-MIDI state handled).
6. **F1-f** `maestro: drawer UI with proposal cards` — `MaestroDrawer.tsx`,
   mount in `Gr55Screen`/`Workspace`, styles, copy keys en+pt.
7. **F2-a** `maestro: voice input (Web Speech)`.
8. **F2-b** `maestro: loadSlot confirmation flow`.
9. **F2-c** `docs: README Maestro section + privacy note`.
10. **F3** (separate approval): manual RAG over `docs/manuals/` — build-time
    index only after the EULA question is decided; not in this sequence.

## 6. Acceptance (the user's test list, all scripted or 1-minute manual)

- [ ] "more dry on the amp" (EN) and "deixa mais seco no amp" (PT) each produce
    a proposal whose accepted items are amp gain/EQ-family keys; nothing else.
- [ ] A hallucinated key (`reverb/magic`) is rejected with a visible reason.
- [ ] A system key attempt (`gk/1/sensitivity`) is refused by policy, message
    explains it belongs to the Device area.
- [ ] Apply → header 🟠 count increments; Discard → no MIDI traffic (assert on
    fake session); Apply → fake device receives DT1 and echoes.
- [ ] Reload keeps conversation for that patch; new patch starts clean.
- [ ] Drawer opens on Library and Editor; Ctrl+M toggles; Stage full-screen has
    no write entry point.
- [ ] Key: paste, test, reload browser → asked again (sessionStorage semantics);
    opt-in remember → survives reload until "Forget".
- [ ] `copy:check` passes in both locales; prettier clean.

## 7. Explicit non-goals for v1

Slot writes, system/GK-set edits, multi-patch batch edits, Ollama/OpenAI
adapters (interface only), manual citations, translations of protocol-owned
labels beyond the curated `enums` groups already shipped.
