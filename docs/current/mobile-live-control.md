# Mobile / live simplified control — Rigbench vision

> **Status:** Vision + research. Not a second app. Not a rename of Maestro.
> **Precedence:** code → [AGENTS.md](../../AGENTS.md) + [studio-sessions.md](./studio-sessions.md)
> → this file → [archive research](../archive/research/mobile-gr55-system-prompt.md).
> If this doc disagrees with `routes.ts`, `policy.ts`, `systemMap.ts`, or Studio IA, **fix this doc**.

External brief (archived): “Roland GR-55 Mobile Web/Native Control Interface”
([raw prompt](../archive/research/mobile-gr55-system-prompt.md)). This file reconciles that
brief with Rigbench as it ships today.

---

## 1. Intent

**Hands-off the pedal, hands-on the screen** for live GR-55 control over USB MIDI (SysEx RQ1/DT1).

Rigbench already owns the protocol stack, sync, Studio craft, Stage perform, and Advanced editor.
This vision adds a **mobile-aware, Stage-first simplify surface** and documents platform truth —
it does not invent a parallel WebMIDI stack or redefine product names.

---

## 2. Platform truth

| Platform | Web MIDI + SysEx | Product posture |
| --- | --- | --- |
| **Chrome / Edge on a computer** | Supported | **Source of truth** today (`BrowserGate`, README) |
| **Firefox (desktop)** | Works; extra SysEx permission notice | Supported with notice |
| **Android Chrome + USB-C / OTG** | API category possible; **unverified** on GR-55 | Experimental research only |
| **iPhone / iPad (any browser)** | **No Web MIDI** | Hard block; needs a future native MIDI bridge |
| **Safari (desktop)** | No Web MIDI | Unsupported |

Additional constraints:

- Secure context required: **HTTPS or `localhost`** (`src/midi/access.ts`).
- **USB audio streaming is out of product scope.** MIDI SysEx control only.
  `usbDirectMonitor` in `systemMap.ts` is a pedal flag set over MIDI, not an audio I/O path.
- Windows still typically needs the Roland GR-55 driver; phone OTG class-compliance is
  environment-dependent and unclaimed until a real device matrix exists.

---

## 3. IA mapping (do not rename Maestro)

The external brief used “Maestro” for setlist/gig. In Rigbench **Maestro means the Gemini
copilot** ([maestro-architecture.md](./maestro-architecture.md)). Keep that name.

| Vision section | Rigbench surface | Fit today |
| --- | --- | --- |
| §1 Gig / setlist / bank jumper | **Stage** `#/gr55/palco` + setlist `#/gr55/agenda` | Partial — setlist and cuts exist; not bank tiles / meters |
| §2 Simplified live (Pure Guitar, large faders, quick knobs) | Proposed **Stage Live Simplify** (+ reuse Studio macros) | Missing on Stage; craft macro `layers/guitar-only` exists |
| §3 Advanced deep edit / system / GK | Advanced editor `#/gr55/editor/…`, Device / GK under ⋯ | Shipped |

Canonical chrome: **Studio · Stage · ⋯** ([glossary.md](./glossary.md)). Studio remains craft home
after setup; Stage remains perform. Maestro AI stays write-denied when `stageLive`.

```
Connect → Setup (first time) → Sync → Studio (craft)
                                      ├─ System | Patch | Library + Maestro AI
                                      └─ Stage (perform)  ← Live Simplify backlog lives here
                                           └─ Advanced under ⋯
```

---

## 4. ASCII wireframes — Stage Live Simplify (phone portrait)

Proposed evolution of Stage for thumb-friendly live use (minimum ~48px targets). Desktop first
in P1; responsive layout follows in P2.

### 4.1 Connect (existing flow, mobile-sized)

```
┌─────────────────────────────┐
│ Rigbench                    │
│ GR-55 · Allow MIDI          │
│ [ Input ▼ ] [ Output ▼ ]    │
│ [ Connect ]                 │
│ (dev: Use simulated pedal)  │
└─────────────────────────────┘
```

### 4.2 Stage Live Simplify (proposed)

```
┌─────────────────────────────┐
│ Studio │ Stage │ ⋯     SINC │
├─────────────────────────────┤
│ Song 3/8 · U14:2 Blues Riff │
│ [◀ P]  [ N ▶ ]   gap warn   │
├─────────────────────────────┤
│ [ PURE GUITAR ]             │  ← layers/guitar-only (+ opt. GUITAR OUT)
├─────────────────────────────┤
│ PCM1  ═══════●────  72      │
│ PCM2  ════●────────  40      │
│ Model ══════●──────  55      │
│ Norm  ═════════●──  80      │
│ Master═══════●────  75      │  ← 🟠 working copy via Gr55Editor.write
├─────────────────────────────┤
│ Cutoff ○   Gain ○           │
│ DlyMix ○   Rev  ○           │
├─────────────────────────────┤
│ Cuts: Verso · Solo · …      │
│ Pedals: CTL EXP …           │
│ [ Edit setlist ] [ Advanced ]│
└─────────────────────────────┘
```

Tablet landscape: same controls in two columns (mix | setlist/cuts); no new IA.

Escape hatches: **Advanced** → dense editor; **Studio** → craft/macros/Maestro AI.

---

## 5. Pure Guitar

**Product name:** Pure Guitar (EN) / guitar-only craft label already exists in macros.

**Patch bundle (🟠, immediate DT1)** — already implemented as Studio macro
`layers` → `guitar-only` in `src/maestro/macros/registry.ts`:

| Registry key | Intent |
| --- | --- |
| `pcm1/tone/muteSwitch` | Mute PCM 1 |
| `pcm2/tone/muteSwitch` | Mute PCM 2 |
| `modeling/tone/muteSwitch` | Mute modeling |
| `normal-pickup/level/normalPuMute` | Unmute normal PU |
| `normal-pickup/level/normalPuLevel` | Level ≈ 80 |

Mute fields are inverted in the macro helpers (`true` = MUTE).

**Optional system complement (🔵, staged Apply)** — not the same as the wrong address in the
external brief:

| Field | Address | Enum |
| --- | --- | --- |
| `guitarOutSource` | system `02 00 00 16` | `PATCH` · `OFF` · `NORMAL PU` · `MODELING` · `BOTH` |

`02 00 00 04` is **Bank/Program Change RX Switch** (`rxSwitch`) — never Guitar Out.

**Stage policy note:** Maestro `decide()` denies all writes when `stageLive`. Live Simplify
controls (Pure Guitar, faders) must use a **Stage-owned write path** through `Gr55Editor.write`
(and system staging for GUITAR OUT), not Maestro propose/apply. Do not weaken `stageLive` deny
for the AI drawer.

---

## 6. Protocol appendix (corrected)

### 6.1 Frame (matches code)

When device ID is `0x10` (common Identity default):

```
F0 41 10 00 00 53  <cmd>  <addr 4 bytes>  [data…]  <checksum>  F7
```

| Field | Value | Code |
| --- | --- | --- |
| Manufacturer | `41` | `RolandDevices.ts` |
| Model | `00 00 53` | `RolandDevices.ts` |
| RQ1 | `11` | `RolandSysExProtocol.ts` |
| DT1 | `12` | `RolandSysExProtocol.ts` |
| Checksum | `128 - (sum % 128)`, or `0` if remainder `0` | same |

Temporary patch base: **`18 00 00 00`** (`TEMPORARY_PATCH_ADDRESS`). Prefer **registry / map
field keys** over hand-maintained offset tables when implementing UI.

### 6.2 Live mix field keys (🟠)

| Control | Prefer key path |
| --- | --- |
| PCM 1 mute / level | `pcm1/tone/muteSwitch`, `pcm1/tone/partLevel` |
| PCM 2 mute / level | `pcm2/tone/muteSwitch`, `pcm2/tone/partLevel` |
| Modeling mute / level | `modeling/tone/muteSwitch`, `modeling/tone/level` |
| Normal PU mute / level | `normal-pickup/level/normalPuMute`, `normal-pickup/level/normalPuLevel` |
| Master patch level | `master/output/patchLevel` |

Quick knobs (vision): cutoff / amp gain / delay mix / reverb level — map to existing page fields
in `pages.ts` / address map; do not invent addresses.

### 6.3 Patch switching

Rigbench selects patches with **setup SysEx**, not channel CC0/CC32+Program Change:

```ts
// src/devices/gr55/editor.ts — Gr55Editor.selectPatch
await session.writeData(setup.patchBsMsb.address, [bankMsb]);
await session.writeData(setup.patchPc.address, [programChange]);
```

User slots: bank MSB `0`–`2` + PC → user numbers 0–296 (`slots.ts`). Preset banks exist in the
protocol map but are **not productized** (README: read-only presets not included). The vision’s
MSB 84/85 + CC32 path is a future alternate only if proven on hardware — do not replace
`selectPatch` without an explicit task.

Changing patches mutes the pedal ~1 s — Stage already warns on cross-slot moves.

### 6.4 Structure 1 / 2

`effectStructure` `"1"` | `"2"` is in the address map; OM routing is summarized in
[studio-sessions.md](./studio-sessions.md). Studio macro `chain-path` is still a stub
(`implemented: false`). Live Simplify does not require Structure UI in P1.

---

## 7. WebMIDI implementation — use the existing stack

Do **not** add a second SysEx client. Call sites:

```ts
// Access (secure context + sysex)
import { requestAccess, detectSupport } from '../midi/access';
const access = await requestAccess(); // navigator.requestMIDIAccess({ sysex: true })

// Session queues RQ1/DT1 with pacing
import { MidiSession, identify } from '../midi/session';

// Patch read/write / select
import { Gr55Editor } from '../devices/gr55/editor';
editor.write(fieldRef, value);           // 🟠 DT1 to temporary patch
await editor.selectPatch(msb, pc);       // setup SysEx bank + PC

// Background library sync (RQ1 poll, never writes)
import { SyncEngine } from '../devices/gr55/sync/engine';

// Tests / no hardware
import { /* simulated pedal */ } from '../devices/gr55/fakeDevice';
```

Gate unsupported browsers with `BrowserGate` + `detectSupport()` — do not special-case “mobile”
by removing the gate; extend messaging after an Android spike proves SysEx works.

---

## 8. Signal routing (reference)

From the Owner’s Manual / Studio IA (not a new protocol):

- **Structure 1 (parallel):** PCM1 & PCM2 → MFX; Modeling & Normal PU → AMP + MOD; merge → EQ →
  Chorus → Delay → Reverb.
- **Structure 2 (series):** Modeling & Normal PU through AMP + MOD into MFX; PCM1 & PCM2 into MFX
  with the amp path.

Live Simplify exposes levels/mutes; deep structure stays Advanced / Studio.

---

## 9. Phased backlog

| Phase | Work | Notes |
| --- | --- | --- |
| **P0** | This doc + index links | Done when accepted |
| **P1** | Stage Live Simplify on **desktop** | Pure Guitar button, five faders, four knobs; `Gr55Editor.write`; setlist/cuts kept; no Maestro policy change |
| **P2** | Responsive layout + Android Chrome WebMIDI spike | Update BrowserGate/README only after evidence |
| **P3** | Preset-bank browse / alternate PC path | Only if hardware-proven; Library remains user-slot SoT until then |
| **P4** | iOS native MIDI shell | Separate product decision; not a Vite-only change |

---

## 10. Explicit non-goals (until tasked)

- Greenfield mobile app or Capacitor/React Native shell in this repo
- Renaming Maestro AI to mean setlist
- USB audio capture/playback in the browser
- Rewriting `src/protocol/**` or `src/midi/**` for this vision
- Treating the archived raw system prompt as authoritative
