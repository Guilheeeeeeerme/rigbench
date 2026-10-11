# Maestro craft — session-scoped macros

> **Status:** ACTIVE for **session taxonomy + macros only**.
> **Superseded for app home / top nav:** the live product is **Stage · Maestro · Setup**
> ([AGENTS.md](../../AGENTS.md)). `#/gr55/estudio` redirects to Stage. Do **not** treat
> “Studio home” or “TopNav Studio · Stage · ⋯” in older sections of this file as current IA.
> **SoT for:** System / Patch / Library session model, macro groups, Stage write boundary for craft.
> Precedence: code → [AGENTS.md](../../AGENTS.md) → this file (craft sections) → archive.
> Connect / resume: [connection-resume.md](./connection-resume.md).
> Grounded in: `docs/manuals/GR-55_OM.pdf` (Owner’s Manual EN),
> `docs/manuals/GR-55_PT.pdf` (manual PT), `GR-55_PA.pdf` (patch list),
> `GR-55_PCM_Tone_List.pdf`, `GR-55_Additional_PatchList.pdf`.
> Cross-checked: `src/devices/gr55/pages.ts`, `systemMap.ts` / Device / GkSets,
> `src/maestro/fieldRegistry.ts`, `policy.ts`, `macros/registry.ts`.
> Read-with: [maestro-architecture.md](./maestro-architecture.md).

---

## 1. Intent (locked)

- **Prioritize Maestro.** Chat is a first-class half of the craft screen, not a FAB drawer.
- **Sessions organize everything.** Chat context **and** high-level configuration panels
  share one active session. The user never navigates by “setup vs Stage vs Device.”
- **Musician language, multi-parameter writes.** Each control is a 3–4 option selector
  that writes a **bundle** of real SYSTEM or temporary-patch fields. The user never
  needs Roland page names.
- **Apple-simple:** large tap targets, one job per section, minimal chrome.
- **Escape hatch:** dense editor / canvas / Device-grade detail stay under Advanced —
  demoted, not deleted.
- **Stage stays outside craft sessions** — live/show (read-mostly). Craft ≠ stage.

---

## 2. Manual truth → session taxonomy

The Owner’s Manual draws a hard line the product must mirror:

| Manual domain | OM language | Scope chip | App truth today |
|---|---|---|---|
| **SYSTEM** | “Settings for the Entire GR-55” (OM p. 69 / PT “Ajustes gerais”) | 🔵 pedal-wide | `systemMap` / Device / GkSets — staged + confirm |
| **PATCH** | TONE + EFFECT + MASTER inside one patch (OM “How the GR-55 Works” p. 22, EFFECT p. 38, MASTER p. 54) | 🟠 temporary patch | `PAGE_IDS` + Maestro `fieldRegistry` |
| **Library** *(third session)* | Selecting / PATCH WRITE / preset banks (OM p. 16, 60; PA + Additional PatchList) | 🟢 slot / browse | Library + Maestro `loadSlot` (ask) |

**Setup is not an organizer.** First-run GK / OUTPUT SELECT work becomes groups *inside
System*. The old wizard is “reopen calibration” from System → Instrument, not a home.

**Stage is not a craft session.** It remains a separate perform surface
(`stageLive` write-deny). From Maestro: “Go to Stage.”

### Sessions (product names)

| Session | EN · PT | Owns | Write model |
|---|---|---|---|
| **System** | System · Sistema | Everything that applies to all patches: GK SETTING, OUTPUT SELECT, SYSTEM PEDAL/GK CTL, SYSTEM GUITAR OUT, MIDI/USB, GUITAR↔BASS, backup | 🔵 Stage → confirm → apply (same safety as Device `ApplyBar` / restore confirm) |
| **Patch** | Patch · Patch | Working-copy sound: tones, effects, master (levels, structure, alt-tune, patch pedals/assigns templates) | 🟠 Immediate to temporary patch via `Gr55Editor.write` (Maestro still propose→confirm) |
| **Library** | Library · Biblioteca | Browse / load / save user & preset slots; style banks from manuals | 🟢 Load asks confirm; write-slot stays denied in Maestro v1 (Save UI is human-driven) |

Default session after connect: **Patch** (craft-first). Remember last session per device.

---

## 3. Layout — Studio with session switcher

```
┌─ header: [System | Patch | Library] · patch/source · mode · 🟠/🔵 N · [Save] [Stage] [⋯] ─┐
│                                                                                          │
│  ┌─ Agent (Maestro) ────────────┐  ┌─ Session panels (macros) ─────────────────────────┐ │
│  │ scoped to active session     │  │ high-level groups for that session only           │ │
│  │ System → 🔵 proposals/stage  │  │ 3–4 pills per group → multi-param bundle          │ │
│  │ Patch  → 🟠 temporary only   │  │ Custom when no preset matches                     │ │
│  │ Library→ load/browse only    │  │ [Advanced →] respects session                     │ │
│  └──────────────────────────────┘  └───────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### Interaction rules

1. **Session switcher is the primary IA** (3 segments). Changing session swaps both
   chat system-prompt/context **and** the right-hand panel set.
2. **One section = one musician question.** Never a knob grid on the default path.
3. **3 or 4 mutually exclusive options** per group. Selecting applies the whole bundle.
4. **Macros and Maestro share truth** inside the session. After a macro, chat rebuilds
   from new state; after Apply, pills re-match or show **Custom**.
5. **Cross-session refusal.** Patch chat must not write SYSTEM addresses. System chat
   must not write temporary-patch via the patch path. Library chat must not silently
   mutate sound or system — only propose loads / explain banks.
6. **Stage full-screen** remains Maestro write-denied.

### Navigation (resolved — live product)

| Surface | Role |
|---|---|
| **Stage** `#/gr55/palco` | **App home** after setup — live/show, not a craft session |
| **Maestro** `#/gr55/maestro` | AI craft (`Studio.tsx`); session switcher = System / Patch / Library |
| **Setup** `#/gr55/configuracao` | Global cards: Device / GK / recalibrate |
| **Setup wizard** | First-run gate + recalibrate (`#/gr55/configurar`) |
| Advanced editor / Canvas | **Removed**; deep links redirect to Stage |

Top chrome (shipped): **Stage · Maestro · Setup** (`AppNav`). `#/gr55/estudio` redirects to Stage.
Default **craft session** inside Maestro remains **Patch**. Setup is never home.
Older “Studio home” / “TopNav Studio · Stage · ⋯” wording elsewhere in this file is **not** current IA.

---

## 4. Macro engine (design shape)

```
SessionId = 'system' | 'patch' | 'library'
MacroGroup { session, id, titleEn, titlePt, options[3|4] }
MacroOption { id, labelEn, labelPt, writes: Write[] }
Write =
  | { domain: 'patch', key: `${pageId}/${section}/${field}`, value }
  | { domain: 'system', ref: 'SYSTEM…' | gkSet(n).…, value }
```

- Patch keys match `fieldRegistry` locale-free keys.
- System writes go through the existing **staging** queue; nothing hits the pedal until
  the user confirms (Device rule preserved).
- Matching: score field equality → nearest option or **Custom**.
- Coverage: every `PAGE_IDS` page and every SYSTEM group the app maps is owned by
  ≥1 group below, or marked Advanced-only.

---

## 5. Session A — System · Sistema

Manual icons (OM p. 69): **GK SETTING · OUTPUT SELECT · PEDAL/GK CTL · MIDI/USB ·
GUITAR OUT · OTHER · BACKUP/INIT · GUITAR↔BASS**.

Chip 🔵. Panels + chat both speak pedal-wide language.

### S1 — Instrument · Instrumento *(GK SETTING)*

**Job:** “Which guitar/bass profile is active, and how is the divided pickup set?”
Manual: ten GK sets; PU TYPE, SCALE, PHASE, SENS, NORM PU GAIN, etc. (OM p. 74).

| Option EN | PT | Bundle (multi-param) |
|---|---|---|
| **GK-3 guitar** | Guitarra GK-3 | `gkSetSelect` → chosen set; that set: `PU TYPE=GK-3`, scale ~648 mm (ST), `PU PHASE=NORMAL`, `PU DIRECTION=NORMAL`, `NORM PU GAIN=0`, string SENS mid template, name hint |
| **Piezo acoustic** | Violão piezo | Active set: `PU TYPE=PIEZO` (or F/G/L/R family pick), piezo tone defaults, sens template for acoustic, name hint |
| **Bass GK** | Baixo GK | Requires GUITAR↔BASS = BASS (see S6): `PU TYPE=GK-3B` family, bass scale preset, bass sens template |
| **Keep & edit** | Manter e editar | Does not rewrite PU TYPE; opens Advanced GK form for the active set (SENS / nuance / distance) |

Keys: `SYSTEM.common.gkSetSelect`, `gkSet(n).name|puType|scale|puPhase|puDirection|normalPuGain|string*Sens` (+ bass-only fields when mapped).

---

### S2 — Speakers · Caixas *(OUTPUT SELECT)*

**Job:** “What am I plugged into?” Manual: tone is adjusted inside the GR-55 for the device (OM p. 12, 70, 75).

| Option EN | PT | Bundle |
|---|---|---|
| **Headphones / line** | Fones / linha | `OUTPUT SELECT=LINE/PHONES` |
| **Combo amp** | Amplificador combo | `JC-120` or `COMBO` (prefer JC-120 when unsure) |
| **Stack / return** | Stack / return | `STACK` or `STACK RETURN` / `COMBO RETURN` family — “power amp + cab” mood |
| **Bass amp** | Amp de baixo | `B-AMP WITH TWEETER` or `B-AMP NO TWEETER` |

Single enum, four musician buckets (maps many manual values → 4 choices). Exact enum
label per option is a tuning constant.

---

### S3 — Global feet · Pés globais *(SYSTEM › PEDAL/GK CTL)*

**Job:** Pedals identical for every patch, or hand off to each patch (OM p. 70, 76:
“operate identically regardless of the patch” vs `PATCH SETTING`).

| Option EN | PT | Bundle |
|---|---|---|
| **Follow each patch** | Seguir cada patch | CTL / EXP / EXP ON / EXP SW / GK VOL / S1 / S2 → `PATCH SETTING` |
| **Volume everywhere** | Volume em tudo | EXP (+ EXP ON) → `PATCH VOLUME`; CTL → `HOLD` or safe; GK VOL → `PATCH VOLUME`; switches mild |
| **Hold + swell** | Hold + swell | CTL → `HOLD`; EXP → `PATCH VOLUME`; EXP SW → `PATCH SETTING` or tone sw |
| **Effects at feet** | Efeitos nos pés | EXP → `MOD CONTROL` or delay/reverb level; CTL → `DELAY SW` / `MOD SW` template |

Keys: `SYSTEM.pedals.ctlFunction`, `expOffFunction`, `expOnFunction`, `expSwFunction`,
`gkVolFunction`, `gkS1Function`, `gkS2Function`.

---

### S4 — Monitor jack · Jack monitor *(SYSTEM › GUITAR OUT)*

**Job:** What always leaves GUITAR OUT for *all* patches (OM p. 70–71, 80). When not
`PATCH`, per-patch GUITAR OUT in Patch session is ignored (manual MEMO).

| Option EN | PT | Bundle |
|---|---|---|
| **Decide per patch** | Por patch | `guitarOutSource=PATCH` |
| **Always normal PU** | Sempre captador | `NORMAL PU` |
| **Always modeling** | Sempre modelagem | `MODELING` |
| **Always both** | Sempre ambos | `BOTH` |

(`OFF` reachable via Advanced / Custom.)

---

### S5 — MIDI & USB · MIDI e USB

**Job:** Pedal talk to the outside world (OM p. 66–67, 71; `systemMap` common).

| Option EN | PT | Bundle |
|---|---|---|
| **Local only** | Só local | `rxSwitch=false`, `txSwitch=false`, `guitarToMidiSwitch=false`; USB monitor default on |
| **Receive patches** | Receber patches | `rxSwitch=true`, channel sensible; TX optional off |
| **Guitar→MIDI poly** | Guitarra→MIDI poly | `guitarToMidiSwitch=true`, `guitarToMidiMode=POLY`, string channels default |
| **Guitar→MIDI mono** | Guitarra→MIDI mono | Switch on, `MONO`, string channel spread template |

Keys: `patchControlChannel`, `rxSwitch`, `txSwitch`, `guitarToMidiSwitch`,
`guitarToMidiMode`, `guitarToMidiStringChannel`, `usbDirectMonitor`.

---

### S6 — Guitar or bass · Guitarra ou baixo *(GUITAR↔BASS)*

**Job:** Whole-pedal instrument mode (OM p. 9, 71). Destructive — confirm twice.

| Option EN | PT | Bundle |
|---|---|---|
| **Guitar** | Guitarra | `guitarBassSelect=GUITAR` (+ confirm copy) |
| **Bass** | Baixo | `guitarBassSelect=BASS` (+ confirm) |

Only **2** options (manual is binary). UI may show as a dedicated mode control, not four pills.

---

### S7 — Care · Cuidado *(BACKUP / RESTORE)*

Not pills — two actions: **Backup system .syx** / **Restore system .syx** (existing
Device flows). Factory reset stays Advanced + hard confirm; Maestro never offers it
(`factoryReset` deny).

### System Advanced-only

LCD / POWER / TUNER / PEDAL CALIB / unmapped nuance-distance fine controls /
FACTORY RESET — pedal LCD or Advanced System detail.

---

## 6. Session B — Patch · Patch (temporary 🟠)

Manual structure of a patch (OM p. 22, 38):

```
PCM TONE 1/2 + MODELING TONE + NORMAL PICKUP
        → STRUCTURE (1 parallel / 2 series) + line selects
        → AMP · MOD · MFX · EQ · CHORUS · DELAY · REVERB
        → MASTER (pedals, assigns, tempo, GK SET, GUITAR OUT, ALT-TUNING, level)
```

Signal order for panels: **sources → amp/color → motion → atmosphere → path/loudness → feet → name**.

### P1 — Layers · Camadas *(TONE switches + levels)*

**Job:** What is audible in the stack?

| Option EN | PT | Bundle |
|---|---|---|
| **Guitar only** | Só guitarra | Mute PCM1/2 + modeling; unmute normal PU + level up |
| **Modeled guitar** | Guitarra modelada | Modeling on/level up; normal PU soft/off; PCM muted |
| **Synth lead** | Synth lead | PCM1 up; PCM2/modeling/PU down or muted |
| **Full stack** | Pilha cheia | All sources on, balanced levels |

Keys: `pcm1|pcm2/tone/muteSwitch`, `partLevel`; `modeling/tone/muteSwitch`, `level`;
`normal-pickup/level/normalPuMute`, `normalPuLevel`.

---

### P2 — Synth voice · Voz do synth *(PCM TONE 1/2)*

**Job:** Character of the PCM side without browsing the tone ROM.

| Option EN | PT | Bundle |
|---|---|---|
| **Off** | Desligado | Both PCM muted |
| **Soft pad** | Pad suave | PCM1 on, moderate level, center pan; PCM2 low/off |
| **Bright lead** | Lead brilhante | PCM1 on, higher level; PCM2 off |
| **Dual layer** | Duas camadas | PCM1+PCM2 on, mild L/R pans |

Keys: mute/level/pan on `pcm1`, `pcm2`. **`toneSelect` / category not forced** — Maestro
or Advanced picks specific tones (“sax”, “piano”). Offsets → Advanced.

---

### P3 — Guitar body · Corpo da guitarra *(MODELING + NORMAL PICKUP)*

| Option EN | PT | Bundle |
|---|---|---|
| **Silent** | Mudo | Both muted |
| **Pickup** | Captador | Normal PU on; modeling muted |
| **Modeled** | Modelagem | Modeling on; normal PU muted/low |
| **Blend** | Mistura | Both mid levels |

Modeling *type* → Maestro / Advanced.

---

### P4 — Amp & grit · Amp e pegada *(AMP + NS)*

**Job:** How hard the amp hits **and** how tight the gate is (manual AMP + noise
suppressor live together in the guitar path).

| Option EN | PT | Bundle |
|---|---|---|
| **Clean open** | Limpo aberto | Clean amp type, low gain, NS off or very low |
| **Warm studio** | Quente estúdio | Blues/tweed-ish, mid gain, NS studio threshold |
| **Crunch stage** | Crunch palco | Crunch type, gain ~70, NS stage threshold |
| **High-gain tight** | High-gain fechado | High-gain type, high gain, NS tight |

Keys: `amp/amp/*` (switch, type, gain, gainSwitch, level, bass/mid/treble/presence,
solo…), `amp/noise-suppressor/nsSwitch|nsThreshold|nsReleaseTime`. SP/MIC kept at
sensible defaults per option.

---

### P5 — Tone shape · Forma do tom *(EQ + amp tone accent)*

| Option EN | PT | Bundle |
|---|---|---|
| **Dark** | Escuro | Lower treble/presence; EQ high cut / low boost |
| **Natural** | Natural | EQ off or flat; amp stack centered |
| **Bright** | Brilhante | Treble/presence up; mild high EQ |
| **Scooped** | Escavado | Mid scoop; extremes up |

Keys: amp tone stack + `eq/eq/*`.

---

### P6 — Front effect · Efeito da frente *(MOD)*

Manual MOD types (OD/DS, WAH, COMP, …). Moods, not type lists.

| Option EN | PT | Bundle |
|---|---|---|
| **Off** | Desligado | `modSwitch=false` |
| **Steady** | Firme | COMP, mild sustain/attack/level |
| **Edge** | Distôrce | OD/DS, moderate drive/tone/level |
| **Sweep** | Varredura | WAH or PHASER, gentle rate/depth; MOD CONTROL-friendly |

Plus low default sends when useful. Deep per-type params → Advanced.

---

### P7 — Color box · Caixa de cor *(MFX)*

| Option EN | PT | Bundle |
|---|---|---|
| **Off** | Desligado | `mfxSwitch=false` |
| **Polish** | Polido | Gentle EQ/enhancer-like type, low sends |
| **Filter** | Filtro | Filter-family MFX, moderate |
| **Wide** | Aberto | Spatial/modulation MFX, mild chorus/delay/reverb sends |

---

### P8 — Atmosphere · Atmosfera *(CHORUS + DELAY + REVERB together)*

**Job:** One space/time mood writes **three** processors (manual EFFECT chain end).

| Option EN | PT | Bundle |
|---|---|---|
| **Dry** | Seco | Chorus/delay/reverb off (or levels ≈0) |
| **Slap room** | Sala curta | Short delay slap + small room reverb; chorus off/subtle |
| **Stage wash** | Lavado de palco | Medium delay + hall reverb; mild chorus |
| **Deep space** | Espaço fundo | Longer delay/feedback + washed reverb + deeper chorus |

Keys: `chorus/*`, `delay/*`, `reverb/*` switches, types, time/feedback/depth/levels.
Independent fine control → Advanced (or future split groups).

---

### P9 — Chain path · Caminho *(STRUCTURE + line selects)*

Manual (OM p. 40): Structure 1 = AMP+MOD ‖ MFX parallel; Structure 2 = series;
each tone BYPS / AMP / MFX.

| Option EN | PT | Bundle |
|---|---|---|
| **Guitar amp path** | Caminho do amp | Structure favoring modeling→AMP; PCM→MFX or BYPS template |
| **Synth through MFX** | Synth no MFX | PCM→MFX; modeling→AMP |
| **Everything in series** | Tudo em série | `effectStructure` → series (manual Structure 2) + line selects aligned |
| **Bypass coloring** | Sem colorir | Critical tones BYPS; effects off or minimal |

Keys: `master/output/effectStructure`, `lineSelectModel`, `lineSelectNormalPU`,
PCM line-select fields if present in map.

---

### P10 — Loudness · Volume *(PATCH LEVEL + amp solo bits)*

| Option EN | PT | Bundle |
|---|---|---|
| **Practice** | Ensaio | `patchLevel` low; amp level tempered |
| **Stage** | Palco | `patchLevel` ~70–80 |
| **Loud** | Alto | `patchLevel` ~90 |
| **Solo push** | Solo | High level + `ampSoloSwitch` / `ampSoloLevel` up |

Keys: `master/output/patchLevel`, `amp/amp/ampLevel`, `ampSoloSwitch`, `ampSoloLevel`.

---

### P11 — Patch monitor · Monitor do patch *(MASTER › GUITAR OUT)*

Only meaningful when System S4 = **Decide per patch** (manual).

| Option EN | PT | Bundle |
|---|---|---|
| **Jack off** | Jack off | `guitarOutSource=OFF` |
| **Normal PU** | Captador | `NORMAL PU` |
| **Modeling** | Modelagem | `MODELING` |
| **Both** | Ambos | `BOTH` |

Key: `master/output/guitarOutSource`. If SYSTEM GUITAR OUT ≠ PATCH, panel shows a
single note + link to System S4.

---

### P12 — Tuning · Afinação *(ALT-TUNING)*

| Option EN | PT | Bundle |
|---|---|---|
| **Standard** | Padrão | `altTuneSwitch=false` |
| **Drop feel** | Drop | Alt on + drop-oriented `altTuneType` |
| **Open** | Aberta | Alt on + OPEN-D/G/E family |
| **Custom** | Personalizada | Alt on; string shifts → Advanced |

Keys: `master/tuning/altTuneSwitch`, `altTuneType`. Normal PU pitch unchanged (manual).

---

### P13 — Patch feet · Pés do patch *(MASTER › PEDAL/GK CTL + ASSIGN templates)*

**Job:** What EXP/CTL/GK do **on this patch** when SYSTEM function is `PATCH SETTING`
(OM p. 54–57, 61).

| Option EN | PT | Bundle |
|---|---|---|
| **Volume swell** | Volume | EXP → patch/tone volume; GK vol → volume; CTL mild |
| **Expression morph** | Morfagem | EXP → MOD CONTROL / wah-position family; volume switches on sources |
| **Solo boost** | Boost de solo | CTL → level/amp solo; EXP → volume |
| **Safe default** | Seguro | Curated volume + hold template |

Patch keys: `pedal-gk/ctl|exp-off|exp-on|exp-switch|gk-volume|gk-s1|gk-s2/...`,
`pedal-gk/ranges/gkSet` when relevant.

**Assigns 1–8:** registry `complex` today. **Resolved prior decision #2:** v1 macros may
use **curated assign-template writes only** (privileged path for these four scenes).
Free-form assign editing stays Advanced. If SYSTEM feet ≠ `PATCH SETTING`, panel
explains and links to System S3.

---

### P14 — Name · Nome *(PATCH common)*

Inline rename → `patch/common/patchName` (16-char ASCII rules). Not a 4-pill group.
`patchAttribute` read-only.

### Patch GK SET select

`master` GK SET = SYSTEM | 1–10 (OM p. 58): small control under P13 or Advanced —
“use system GK” vs “lock this patch to GK set N.” Not a full pill group in v1.

### Patch Advanced-only

PCM/modeling offsets & string detail; full tone browsers; per-type MOD/MFX innards;
free-form assigns; V-LINK; EZ tone; PATCH TEMPO fine (unless a future BPM group).

---

## 7. Session C — Library · Biblioteca

Earned as third session: manuals treat **choosing and writing patches** as a first-class
job (OM p. 16, 60; PA patch lists by SOUND STYLE LEAD / RHYTHM / OTHER; PCM tone list
for discovery). Not Stage.

### L1 — Style bank · Banco de estilo

| Option EN | PT | Bundle / action |
|---|---|---|
| **Lead** | Lead | Filter browse → LEAD style (PA) |
| **Rhythm** | Rhythm | Filter → RHYTHM |
| **Other / pads** | Outros | Filter → OTHER |
| **User slots** | User | Filter → user bank only |

These options change **browse context**, not SysEx (until user loads).

### L2 — Load into craft · Carregar para editar

Actions (not four moods): pick slot → **Load to working copy** (Maestro `loadSlot`
policy = ask; same confirm as today). After load, app switches session to **Patch**.

### L3 — Save · Salvar

Human **Save / PATCH WRITE** into a user slot (existing librarian). Maestro
`writeSlot` remains **deny** in v1.

Library Advanced: import/export .syx, initialize, exchange order.

---

## 8. Coverage maps

### Patch pages → groups

| `PAGE_IDS` | Owned by |
|---|---|
| `patch` | P14 Name |
| `pcm1`, `pcm2` | P1 Layers, P2 Synth voice |
| `modeling`, `normal-pickup` | P1, P3 Guitar body |
| `amp` (+ NS) | P4 Amp & grit, P5 Tone shape, P10 Solo bits |
| `mod` | P6 Front effect |
| `mfx` | P7 Color box |
| `chorus`, `delay`, `reverb` | P8 Atmosphere |
| `eq` | P5 Tone shape |
| `master` | P9 Chain, P10 Loudness, P11 Patch monitor, P12 Tuning, patch GK SET |
| `pedal-gk` | P13 Patch feet |
| `assigns` | P13 curated templates / else Advanced |

### System map → groups

| Manual / `systemMap` | Group |
|---|---|
| GK SETTING / `gkSet(n)` + `gkSetSelect` | S1 |
| OUTPUT SELECT | S2 |
| SYSTEM PEDAL/GK CTL | S3 |
| SYSTEM GUITAR OUT | S4 |
| MIDI/USB fields | S5 |
| GUITAR↔BASS | S6 |
| BACKUP/RESTORE | S7 |
| LCD / POWER / TUNER / CALIB | Advanced |

### Group counts

| Session | High-level groups | Notes |
|---|---|---|
| **System** | **7** (S1–S7) | S6 is 2-option mode; S7 is actions |
| **Patch** | **14** (P1–P14) | P14 is rename, not pills |
| **Library** | **3** (L1–L3) | Browse / load / save |

Pill groups with 3–4 options: System S1–S5 (5) + Patch P1–P13 (13) + Library L1 (1) ≈ **19**
selector groups; plus mode, care actions, rename, load/save.

---

## 9. Maestro chat scoping

| Active session | Prompt domain | Allowed actions | Forbidden |
|---|---|---|---|
| **System** | Pedal-wide only; cite GK / OUTPUT / global pedals / MIDI / mode | Propose **system bundles** → same 🔵 staging queue as panels; user confirms Apply. Explain calibration. | Temporary-patch field writes; silent SYSTEM apply; factory reset |
| **Patch** | Working copy 🟠 only (current `prompts.ts` rules) | `changePlan` on registry keys; propose→confirm Apply | SYSTEM addresses; writeSlot; stageLive |
| **Library** | Banks, slot names, style filters, “what this preset is for” | `loadSlot` → ask confirm; after load suggest switching to Patch | Editing patch or system parameters in-place |

Implementation notes (design):

- Session id is part of orchestrator context (alongside `stageLive`).
- System session needs a **system field registry** (or allow-list of staged refs) —
  today’s `fieldRegistry` is patch-only by construction; that is intentional until
  System chat is implemented.
- Policy evolution: `writeSystem` stays deny for *direct* apply; new path
  `stageSystemPlan` → ask/confirm (mirrors Device). Do not bypass `ApplyBar` safety.
- UI shows a persistent scope chip: 🔵 System / 🟠 Patch / 🟢 Library.

---

## 10. What happens to older IA

| Today | After |
|---|---|
| Setup as mental home / Stage as post-setup home | **Forget setup as organizer**; Studio + sessions |
| Device screen as separate top nav | **System session panels** (routes kept for Advanced) |
| Patch macros only in Studio; system “open Device” | System macros + scoped System chat |
| FAB Maestro drawer | Embedded agent pane; session-aware |
| TopNav Stage · Editor · Library · Device | **Stage · Maestro · Setup**; Library is a craft session inside Maestro |
| Open decision “Studio vs Stage home” | **Superseded:** Stage is app home ([AGENTS.md](../../AGENTS.md)); this file keeps Patch as default **craft session** only |

---

## 11. Visual direction

- One composition: session switcher + agent ‖ panels.
- Active session is the hero context; patch name remains the craft signal in Patch.
- Atmosphere without purple-glow AI cliché; large ≥44px pills.
- Motion: session cross-fade; pill spring; proposal card enter; reduced-motion OK.

---

## 12. Delivery slices

1. **In progress:** Session shell + switcher + macro registry scaffold + Patch
   multi-param writes (priority groups) + System Instrument/Output staging stubs +
   Studio route; chat prompt scoping stubs; `stageSystemPlan` policy = ask.
2. Patch macro registry P1–P14 match/Custom polish + remaining Patch groups.
3. System macro registry S1–S7 complete + staging/confirm path shared with Device.
4. Library session browse filters + load confirm → jump to Patch.
5. Absorb Device/GK into System panels; demote setup wizard entry.
6. System Maestro chat proposing `stageSystemPlan` (same ApplyBar confirm).

---

## 13. Decisions

### Resolved / LOCKED

1. **Home:** Maestro Studio; default session **Patch**. Setup is not primary IA.
2. **Assigns:** Curated templates only inside P13; free-form Advanced.
3. **Third session:** **Library** (manual PATCH select/write + app librarian + `loadSlot`).
4. **Atmosphere:** Chorus+Delay+Reverb bundled as P8 (multi-param by design).
5. **System Maestro writes (LOCKED):** System-session chat **MAY stage** system
   bundles into the same 🔵 staging queue as Device / System panels. The musician
   confirms via the existing Apply flow. Never silent SYSTEM apply.
   `writeSystem` (direct) stays **deny**; new path `stageSystemPlan` → ask/confirm.

### Open blockers

None for product IA. Remaining work is implementation depth (full group coverage,
System chat registry), not open design choices.

---

## 14. Non-goals

- Auto-apply from Maestro chat (patch or system).
- Exposing SysEx / addresses in default UI.
- Replacing Stage with a craft session.
- Pixel-perfect clone of every `ampType` / MFX type — presets are intentional simplifications.
- Finishing every stubbed macro group in the first slice (priority groups first).

---

## Spec self-review

- Taxonomy follows OM SYSTEM vs PATCH vs patch selection, not setup/Stage debates.
- Every group aims at multi-parameter musician moods grounded in manual families.
- Chat and panels share session scope; cross-domain writes forbidden.
- Keys cited from `pages.ts` / `systemMap` / existing Device staging behavior.
- Prior open decisions closed; System-chat staging confirmed LOCKED by user.
