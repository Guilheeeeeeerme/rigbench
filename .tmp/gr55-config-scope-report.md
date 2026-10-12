# GR-55 configuration scope report

**Status:** Discovery only (no product code changes).  
**Date:** 2026-10-11  
**Primary source:** Roland GR-55 Owner’s Manual EN (`docs/manuals/GR-55_OM.pdf`), Parameter List SYSTEM pp.74–80, MASTER pp.54–59, TONE pp.25–37, EFFECT pp.38–53.  
**Also used:** `GR-55_PT.pdf` (PT OM), online Roland PDFs + VGuitar Forums; `src/devices/gr55/systemMap.ts` as app cross-check only.

---

## 0. Manuals inventory

| File | Role for this report |
| --- | --- |
| `GR-55_OM.pdf` | English Owner’s Manual — **source of truth** for SYSTEM vs PATCH |
| `GR-55_PT.pdf` | Portuguese Owner’s Manual — same structure |
| `GR-55_PA.pdf` | Factory patch *names* list — not a parameter guide |
| `GR-55_PCM_Tone_List.pdf` | PCM tone catalog |
| `GR-55_Additional_PatchList.pdf` | Additional patch names |

Roland support lists Owner’s Manual, Tone List, Patch List, Addendum — **no separate Parameter Guide PDF**. Parameter lists live inside the OM.

**Scope rule (OM p.69):**

> Settings that affect the overall operation of the entire GR-55, such as tuning and pedal assignments, are called “system settings.”

Everything else that lives in a patch / temporary edit buffer is **current patch**.

---

## 1. Classification overview

```
┌─────────────────────────────────────────────────────────────┐
│ GLOBAL (SYSTEM) — pedal-wide, auto-saved                    │
│  ├─ Device profiles: GUITAR↔BASS + 10× GK SET contents      │
│  └─ Pedal environment: OUTPUT, pedals, MIDI/USB, OTHER…     │
└─────────────────────────────────────────────────────────────┘
                              ▲ pointers / gates
┌─────────────────────────────────────────────────────────────┐
│ CURRENT PATCH — WRITE to slot                               │
│  ├─ TONE (PCM1, PCM2, Modeling, Normal PU routing)          │
│  ├─ EFFECT (STRUCTURE, AMP, MOD, MFX, Delay, Rev, Cho, EQ)│
│  └─ MASTER (controllers, tempo, GK SET select, …)           │
└─────────────────────────────────────────────────────────────┘
```

### Bridge rules (hybrids)

| Topic | Global side | Patch side | Rule |
| --- | --- | --- | --- |
| Active GK profile | GK set **contents** (1–10) + SYSTEM **GK SET SELECT** | MASTER **GK SET › SELECT** = `SYSTEM` \| `1–10` | Patch = `SYSTEM` → system select wins. Patch = `1–10` → that set’s contents apply for the patch. Contents are never stored in the patch. |
| Pedal / GK CTL | SYSTEM FUNCTION (+ nested) | MASTER PEDAL/GK CTL | Available on patch only if SYSTEM FUNCTION = `PATCH SETTING`. Else UI shows `**[SYSTEM]**`. |
| GUITAR OUT | SYSTEM SOURCE | MASTER SOURCE | Patch value used only if SYSTEM SOURCE = `PATCH`. |
| Tempo FX | MIDI SYNC | PATCH TEMPO | If MIDI SYNC ON, external clock overrides patch tempo. |
| ASSIGN HOLD | System only | — | Carries EXP / GK VOL state across patch changes. |
| OUTPUT SELECT | System only | — | No per-patch override; does not color GUITAR OUT jack. |

---

# GROUP A — GLOBAL (SYSTEM)

## A.1 Device / instrument profile

These settings are about **which physical instrument** is plugged in (guitar with GK, bass, Godin/Caimbé piezo, etc.).

### A.1.1 GUITAR ↔ BASS (`BACKUP/INIT › GUITAR-BASS SELECT`)

| Parameter | Values | Description |
| --- | --- | --- |
| Guitar / Bass mode | GUITAR, BASS | Pedal-wide mode. Must be set before use. Changing requires power cycle. Changes PU TYPE lists, SCALE ranges, string labels (1–6 vs H/1/2/3/4/L), and whether **GK PU POS** exists. Factory default GUITAR. Factory reset returns to GUITAR if unit was in BASS. Separate User/Preset patch banks per mode (community + Training Guide). |

**Not a per-patch flag.** Bass is a mode + its own patch world, not “another guitar GK set inside guitar mode.”

---

### A.1.2 GK SETTING — ten global profiles

The unit stores **ten GK sets**. Edits save **into the selected set** and survive power-off (OM p.69). Intended use: one set per guitar/bass so you can switch instruments without re-calibrating.

#### Tab: GK SET SELECT

| Parameter | Values | Description |
| --- | --- | --- |
| **GK SET SELECT** | 1–10 | (1) Which set is edited. (2) Which set is used when patch MASTER GK SET = `SYSTEM`. |
| **NAME** | up to 8 characters | Label the set after the instrument (e.g. `CAIMBE`, `STRAT GK`). |

#### Tab: PICKUP

| Parameter | Values | Description |
| --- | --- | --- |
| **PU TYPE** (GUITAR mode) | GK-3, GK-2A, PIEZO, PIEZO F, PIEZO G, PIEZO L, PIEZO R | Type of divided / piezo pickup. **GK-3** / **GK-2A** for Roland hex pickups. **PIEZO** flat response. **PIEZO F** Fishman. **PIEZO G** Graph Tech. **PIEZO L** L.R. Baggs. **PIEZO R** RMC (Godin / Caimbé class). |
| **PU TYPE** (BASS mode) | GK-3B, GK-2B, PIEZO, PIEZO G, PIEZO R | Bass pickup list (shorter; no PIEZO F/L). |
| **SCALE** (GUITAR) | 500–660 mm, ST (648 mm), LP (628 mm) | Scale length of the guitar. |
| **SCALE** (BASS) | 710–940 mm, SHORT (760), MEDIUM (812), LONG JB/PB (864), EXTRA LONG (914) | Scale length of the bass. |
| **GK PU POS** | 4STR-1/2/3, 5STR Lo1/Lo2, 5STR Hi1/Hi2, 6STR | **Bass only.** Where the divided PU sits relative to string count / low-B vs high-C layouts. |
| **PU PHASE** | NORMAL, INVERSE | Phase of divided PU vs normal PU. If lows are thin when mixed, try INVERSE. Easier to hear with GK switch on MIX. |
| **PU DIRECTION** | NORMAL, REVERSE | Cable from 6th-string side (NORMAL) vs 1st-string side (REVERSE). |
| **S1/S2 POSITION** | NORMAL, REVERSE | Swap GK [S1]/[S2] button functions. |
| **NORM PU GAIN** | −20…+20 dB | Normal (magnetic) PU input level. Set GK select switch to **MIX** while adjusting. |
| **PIEZO TONE LOW** | −10…+10 dB | Low EQ for piezo PU TYPEs only. |
| **PIEZO TONE HIGH** | −10…+10 dB | High EQ for piezo PU TYPEs only. |

#### Tab: DISTANCE

| Parameter | Values | Description |
| --- | --- | --- |
| **PU↔BRIDGE** (per string) | Guitar 10.0–30.0 mm; Bass 5.5–55.5 mm | Distance from divided PU to bridge saddle per string. **Ignored** when PU TYPE is any PIEZO* variant. |

#### Tab: SENSITIVITY

| Parameter | Values | Description |
| --- | --- | --- |
| **SENS** (per string) | 0–100 | Divided-PU input sensitivity. Adjust so strongest playing reaches the top of the meter without clipping. Community values vary widely by pickup era (older RMC often low; GK-3 higher). |

#### Tab: VELOCITY

| Parameter | Values | Description |
| --- | --- | --- |
| **VELOCITY DYNAMICS** | 1–10 | How easily PCM velocity reaches high values. Higher = easier to get high velocity. |
| **PLAY FEEL** | 1–5 | Velocity curve vs pick dynamics. Lower = wider dynamic range; **5** = fixed velocity. |
| **LOW VELOCITY CUT** | 0–10 | Raises trigger threshold to reduce accidental notes from touching strings. |

#### Tab: NUANCE

| Parameter | Values | Description |
| --- | --- | --- |
| **NUANCE DYNAMICS** | 0–10 | Sensitivity of the Nuance effect (finger vs pick / soft touch). Higher = Nuance fires more easily. |
| **NUANCE TRIM** | 0–10 | Threshold so normal playing does not fire Nuance. Lower if Nuance fires too often. |

Calibrate so the level meter maxes on softest Nuance gesture and barely moves on normal playing (OM p.75).

#### Tab: DOWN TUNE

| Parameter | Values | Description |
| --- | --- | --- |
| **SHIFT** | 0 … −5 | Chromatic steps of instrument down-tune (tell the GR-55 the guitar is tuned down). |

---

### A.1.3 Suggested GK sets for multi-instrument use

| Set (example) | Instrument | Starting PU TYPE | Notes |
| --- | --- | --- | --- |
| 1 | Electric + GK-3 / GK-2A | GK-3 or GK-2A | Set SCALE (ST/LP), DISTANCE, SENS, VEL, NUANCE. |
| 2 | Godin / Caimbé (RMC 13-pin) | **PIEZO R** | SCALE ~648–650 mm; DISTANCE ignored; use PIEZO TONE L/H; SENS often lower than GK-3; raise PLAY FEEL / LOW VELOCITY CUT if false triggers. No official Caimbé page — treat as RMC class. |
| 3+ | Other guitars | matching type | Name each set after the guitar. |
| (Bass mode) | Bass + GK-3B / piezo | GK-3B / PIEZO R… | First switch **GUITAR↔BASS = BASS** + reboot. Set GK PU POS. Community tip: keep the same slot index as the matching guitar set after mode switch. |

**Workflow A:** Leave patches on `GK SET = SYSTEM`; change SYSTEM GK SET SELECT when you change instruments.  
**Workflow B:** Pin song patches to set `1–10` via MASTER GK SET so patch change recalls the right guitar.

---

## A.2 Pedal-wide environment

### A.2.1 OUTPUT SELECT

| Parameter | Values | Description |
| --- | --- | --- |
| **OUTPUT SELECT** | LINE/PHONES, JC-120, SMALL, COMBO, STACK, JC-120 RETURN, COMBO RETURN, STACK RETURN, B-AMP WITH TWEETER, B-AMP NO TWEETER | Voicing for the device on the **OUTPUT** jacks. Does **not** apply to GUITAR OUT. Headphones always hear a phones-optimized path regardless (setup notes). |

---

### A.2.2 PEDAL / GK CTL (system layer)

Makes pedals “operate identically regardless of the patch” unless FUNCTION = `PATCH SETTING` (OM p.70).

#### Controllers: CTL, EXP SW, GK S1, GK S2 (switch-style)

| Parameter / value | Nested params | Description |
| --- | --- | --- |
| **FUNCTION = OFF** | — | No function. |
| **FUNCTION = PATCH SETTING** | — | Defer to patch MASTER PEDAL/GK CTL. |
| **FUNCTION = HOLD** (CTL only) | HOLD TYPE 1–4; SWITCH MODE LATCH/MOMENT; PCM TONE 1/2 OFF/ON | Hold notes. Type 1 replaces same-string notes; 2 holds only notes already sounding; 3 holds prior, new notes play unheld; 4 holds prior + new. |
| **FUNCTION = TAP TEMPO** | — | Tap tempo from presses. |
| **FUNCTION = TONE SW** | SW OFF / SW ON matrices: PCM1, PCM2, MODELING, NORMAL PU each OFF/ON | Toggle tone/normal PU mute banks for pedal OFF vs ON state (GK S1/S2: default vs pressed). |
| **FUNCTION = AMP / MOD / MFX / DELAY / REVERB / CHORUS SW** | — | Toggle that effect block. |
| **FUNCTION = SOUND STYLE INC/DEC** | — | Step sound style. |
| **FUNCTION = BANK NUMBER INC/DEC** | — | Step bank. |
| **FUNCTION = PATCH NUMBER INC/DEC** | — | Step patch. |
| **FUNCTION = AUDIO PLAYER PLAY/STOP, SONG INC/DEC, SW** | — | USB audio player control. |
| **FUNCTION = V-LINK SW** | — | Same as panel V-LINK. |

#### Controllers: EXP, EXP ON, GK VOL (continuous)

| Parameter / value | Nested params | Description |
| --- | --- | --- |
| **OFF** | — | No function. |
| **PATCH SETTING** | — | Defer to patch. |
| **PATCH VOLUME** | — | Overall patch volume. |
| **TONE VOLUME** | PCM1/2, MODELING, NORMAL PU OFF/ON | Which sources the pedal/knob levels. |
| **PITCH BEND** | DEPTH −12…+12; PCM1/2, MODELING OFF/ON | Pitch via pedal. |
| **MODULATION** | MIN/MAX 0–100; PCM1/2 OFF/ON | PCM mod depth. |
| **CROSS FADER** | Per source POLARITY OFF / TOE / HEEL | Balance sources with heel/toe. |
| **DELAY / REVERB / CHORUS LEVEL** | MIN/MAX (Delay 0–120; Rev/Cho 0–100) | Effect send levels. |
| **MOD CONTROL** | MIN/MAX (type-dependent) | Principal MOD param (DRIVE, WAH position, RATE, etc.). WAH needs MODE=MANUAL. |

#### ASSIGN HOLD

| Parameter | Values | Description |
| --- | --- | --- |
| **ASSIGN HOLD** | OFF, ON | ON: carry EXP / GK VOL state into the next patch. OFF: don’t. |

---

### A.2.3 MIDI / USB

#### GENERAL

| Parameter | Values | Description |
| --- | --- | --- |
| **PATCH CH** | 1–16 | MIDI channel for patch change and CC → ASSIGN. |
| **PC RX SWITCH** | OFF, ON | Allow external Program Change to switch patches. |
| **PC TX SWITCH** | OFF, ON | Transmit PC when switching patches. |
| **MIDI SYNC** | OFF, ON | Sync tempo FX to external MIDI clock (overrides PATCH TEMPO). |
| **MIDI CLOCK OUT** | OFF, ON | Transmit MIDI clock (disabled if MIDI SYNC ON). |
| **V-LINK TX CH** | 1–16 | MIDI channel for V-LINK. |

#### GTR-MIDI (guitar performance → MIDI OUT)

| Parameter | Values | Description |
| --- | --- | --- |
| **SWITCH** | OFF, ON | Enable guitar → MIDI OUT. |
| **MODE** | MONO, POLY | MONO = one channel per string (6 ch); POLY = all strings on one channel. |
| **CHROMATIC** | OFF, ON | Quantize pitch for external module. |
| **STRING CH** | 1–11 | Base TX channel (MONO uses six starting here). |
| **DATA THIN** | OFF, ON | Thin pitch-bend traffic. |
| **CTL PDL CC** | OFF, 1–31, 64–95 | CC for CTL pedal. |
| **EXP PDL CC** | OFF, 1–31, 64–95 | CC for expression pedal. |
| **EXP PDL BEND RANGE** | −24…+24 | Max bend to external (0 = none). |
| **GK VOL CC** | OFF, 1–31, 64–95 | CC for GK volume. |
| **GK S1 CC / GK S2 CC** | OFF, 1–31, 64–95 | CC for S1/S2. |

#### RX PC MAP

| Parameter | Values | Description |
| --- | --- | --- |
| **MAP SELECT** | FIX, PROG | Fixed PC→patch map vs programmable. |
| **BANK** | 0–63 | Bank MSB for map edit (LSB fixed 0). |
| **PC** (entries) | LEAD/RHYTHM/OTHER/USER **-\* | Incoming PC → patch. |

#### USB

| Parameter | Values | Description |
| --- | --- | --- |
| **AUDIO IN LEVEL** | 0–200 | USB digital in level. |
| **AUDIO OUT LEVEL** | 0–200 | USB digital out level. |
| **DIRECT MONITOR** | OFF, ON | ON = local GR-55 at OUTPUT; OFF = only USB-returned audio. |

---

### A.2.4 OTHER

#### GUITAR OUT (system)

| Parameter | Values | Description |
| --- | --- | --- |
| **SOURCE** | PATCH, OFF, NORMAL PU, MODELING, BOTH | Global GUITAR OUT routing. **PATCH** → use each patch’s MASTER GUITAR OUT. Any other value forces that routing for all patches. Does not affect OUTPUT jacks; OUTPUT SELECT does not color GUITAR OUT. |

#### TUNER

| Parameter | Values | Description |
| --- | --- | --- |
| **MASTER TUNE** | 435–445 Hz | Reference pitch (factory 440). |
| **TUNER MUTE** | OFF, ON | Mute outputs while tuning (factory ON). |

#### AUDIO PLAYER / LCD / POWER

| Parameter | Values | Description |
| --- | --- | --- |
| **AUDIO PLAYER › LEVEL** | 0–200 | USB audio player volume. |
| **LCD › CONTRAST** | 1–10 | Display contrast. |
| **POWER › AUTO POWER OFF** | OFF, ON | ON = power off after 10 h idle (warning ~15 min before). Unsaved edits lost. |

---

### A.2.5 BACKUP / INITIALIZE

| Item | Description |
| --- | --- |
| **BACKUP / RESTORE** | Dump / restore all settings to USB. Pedal calibration is **not** included in backup. |
| **PEDAL CALIBRATION** | Heel / toe / toe-pressure procedure; THRESHOLD for EXP PEDAL SW indicator. |
| **FACTORY RESET** | Restore factory. Does **not** reset pedal calibration. Forces GUITAR MODE if was BASS. Wipes patches + system + GK sets. |
| **GUITAR-BASS SELECT** | See A.1.1. |

---

# GROUP B — CURRENT PATCH

A patch = **4 sound sources** + **7 effect processors** + **MASTER** (OM p.22).

Also patch identity: **PATCH NAME** (≤16 chars on WRITE) and **PATCH LEVEL** (0–200).

---

## B.1 Tone layers

### B.1.1 PCM TONE 1 / PCM TONE 2 (identical trees)

#### Group: TONE

| Parameter | Values | Description |
| --- | --- | --- |
| SWITCH | OFF, ON | Mute / enable tone. |
| TONE CATEGORY | (catalog groups) | Tone family. |
| TONE NUMBER | (within category) | Specific tone. |
| LEVEL | 0–100 | Tone volume. |
| OCTAVE | −3…+3 | Octave shift. |
| CHROMATIC | OFF, ON | Pitch in semitone steps only (no continuous bend). |
| LEGATO | OFF, ON | Hammer/pull changes pitch without re-attack. Requires CHROMATIC ON. |
| LEVEL VELOCITY SENS | −50…+50 | How pick strength affects volume. |
| VELOCITY CURVE TYPE | FIX, 1–7, TONE | Velocity→volume curve (`TONE` = per-tone optimum). |
| NUANCE SW | OFF, ON | Allow Nuance (system GK Nuance + play technique) to color this tone. |
| PAN | L50–R50 | Stereo position. |
| STRING LEVEL 1–6 | 0–100 | Per-string level; 0 = silent on that string (splits). |

#### Group: PITCH

| Parameter | Values | Description |
| --- | --- | --- |
| PITCH SHIFT | −24…+24 | Semitone shift (±2 oct). |
| PITCH FINE | −50…+50 | Cents. |
| PORTAMENTO SW | OFF, ON | Portamento on/off. |
| PORTAMENTO TYPE | TONE, RATE, TIME | Shape of pitch glide. |
| PORTAMENTO TIME | 0–100 | Glide time. |

#### Group: FILTER

| Parameter | Values | Description |
| --- | --- | --- |
| FILTER TYPE | OFF, LPF, BPF, HPF, PKG, LPF2, LPF3, TONE | Filter algorithm (`LPF2`/`LPF3` disable resonance). |
| CUTOFF | −50…+50 | Cutoff offset. |
| RESONANCE | −50…+50 | Resonance (caution: oscillation). |
| CUTOFF VELOCITY SENS | −50…+50 | Pick strength → cutoff. |
| CUTOFF NUANCE SENS | −50…+50 | Nuance → cutoff. |
| CUTOFF VELOCITY CURVE | FIX, 1–7, TONE | Curve for velocity→cutoff. |
| CUTOFF KEYFOLLOW | −200…+200 | Note pitch → cutoff. |

#### Group: TVF (filter envelope)

| Parameter | Values | Description |
| --- | --- | --- |
| TVF ENV DEPTH | −50…+50 | Envelope depth. |
| TVF ATTACK / DECAY / SUSTAIN / RELEASE | −50…+50 each | Filter ADSR. |
| TVF ATTACK VEL SENS | −50…+50 | Velocity → attack. |
| TVF ATK NUANCE SENS | −50…+50 | Nuance → attack. |

#### Group: TVA (amp envelope)

| Parameter | Values | Description |
| --- | --- | --- |
| TVA ATTACK / DECAY / SUSTAIN / RELEASE | −50…+50 | Amp ADSR. |
| TVA ATTACK VEL SENS | −50…+50 | Velocity → attack. |
| TVA ATK NUANCE SENS | −50…+50 | Nuance → attack. |
| LEVEL NUANCE SENS | −50…+50 | Nuance → volume. |
| RELEASE MODE | 1, 2 | 1 = overlap release on same string; 2 = force decay before next note. |

#### Group: PITCH ENV

| Parameter | Values | Description |
| --- | --- | --- |
| PITCH ENV VEL SENS | −50…+50 | Velocity → pitch-env depth. |
| PITCH ENV DEPTH | −12…+12 | Pitch envelope depth. |
| PITCH ATTACK / DECAY TIME | −50…+50 | Pitch env times. |

#### Group: LFO1 / LFO2

| Parameter | Values | Description |
| --- | --- | --- |
| LFOn RATE | 0–100, BPM note, TONE | LFO speed; BPM syncs to PATCH TEMPO. |
| LFOn PITCH / TVF / TVA / PAN DEPTH | OFF, −50…+50 | Modulation depths. |

**→SYS (Nuance playability):** SYSTEM GK **NUANCE DYNAMICS / TRIM** gate how Nuance behaves; tone params stay in the patch.

---

### B.1.2 MODELING TONE

#### Common (all models)

| Parameter | Values | Description |
| --- | --- | --- |
| SWITCH | OFF, ON | Mute / enable. |
| TONE CATEGORY | Guitar mode: E.GTR / AC / E.BASS / SYNTH; Bass mode: E.BASS / SYNTH / E.GTR | Model family. |
| TONE NUMBER | per category | Specific model. |
| LEVEL | 0–100 | Volume. |
| STRING LEVEL 1–6 | 0–100 | Per-string levels / splits. |
| PITCH SHIFT / PITCH FINE | −24…+24 / −50…+50 | Pitch. |
| 12STR SW + DIRECT LEVEL + SHIFT1–6 + FINE1–6 | … | 12-string simulation. Hidden if conflicting pitch / ALT-TUNING ON / wrong category cross-mode. |

#### Per-model sections (summary; full trees OM pp.31–37)

| Category | Representative groups |
| --- | --- |
| E.GTR (CLA-ST…L4) | PU (SEL, VOLUME, TONE), NS (SWITCH, THRESHOLD, RELEASE) |
| AC (STEEL/NYLON/SITAR/BANJO/RESO) | BODY (TYPE, BODY, ATTACK, COLOR, BUZZ…), often NS |
| E.BASS (JB…VIOLIN) | PU vols/tones/EQ, NS |
| SYNTH (ANALOG GR, WAVE, FILTER BASS, CRYSTAL, ORGAN, BRASS) | MODE/COMP/FILTER, ENV MOD, PITCH A/B/DUET/SWEEP, VIBRATO, FEET, etc. |

---

### B.1.3 NORMAL PICKUP

No dedicated TONE EDIT list. Patch-scoped via:

- Hardware GK select **MIX** / **GUITAR** / **GK**
- Mute via TONE SW → NORMAL PU
- EFFECT STRUCTURE connection **BYPS / AMP / MFX**
- GUITAR OUT SOURCE including NORMAL PU
- Levels via PATCH LEVEL, EXP TONE VOLUME / CROSS FADER flags

---

## B.2 Effects / chain

Processors: **AMP · MOD · MFX · CHORUS · DELAY · REVERB · EQ**.

### B.2.1 Topology

| Parameter | Values | Description |
| --- | --- | --- |
| **STRUCTURE** | 1, 2 | 1 = AMP+MOD ∥ MFX; 2 = AMP+MOD → MFX series. |
| Per-source connection | BYPS, AMP, MFX | Route PCM1, PCM2, Modeling, Normal PU into the chain. |
| Effect SWITCH + type + level | per block | On/off, algorithm, wet level. |
| **PATCH LEVEL** | 0–200 | Overall patch volume. |
| Sends (Delay/Rev/Chorus) | MFX SEND, MOD SEND, BYPASS SEND | Post-chain send routing. |

BPM-synced RATE / DELAY TIME use **PATCH TEMPO** (or external clock if MIDI SYNC ON).

### B.2.2 AMP (pp.41–42)

| Parameter | Description |
| --- | --- |
| SWITCH, TYPE (01–42) | On/off + COSM preamp model |
| GAIN, LEVEL, GAIN SW, SOLO SW/LEVEL | Drive / level / solo |
| BASS, MIDDLE, TREBLE, PRESENCE, BRIGHT | Tone stack |
| SPEAKER TYPE, MIC TYPE, MIC DISTANCE, MIC POSITION, MIC LEVEL | Cab / mic sim |

### B.2.3 MOD (pp.42–45)

| Parameter | Description |
| --- | --- |
| SWITCH, PAN, EFFECT TYPE | On/off, pan (works even if SW off), type |
| NS SWITCH, THRESHOLD, RELEASE | Noise suppressor on MOD path |
| Type-specific tree | OD/DS, WAH, COMP, LIMITER, OCTAVE, PHASER, FLANGER, TREMOLO, ROTARY, UNI-V, PAN, DELAY, CHORUS, EQ |

MOD CONTROL (from pedal) maps to the principal param per type (DRIVE, PEDAL POSITION, RATE, etc.).

### B.2.4 MFX (pp.45–52)

| Parameter | Description |
| --- | --- |
| SWITCH, EFFECT TYPE | On/off + algorithm |
| Per-type params | Large trees — see OM EFFECT Parameter List |

**Types 01–20:** EQ, SUPER FILTER, PHASER, Step Phaser, RING MOD, TREMOLO, Autopan-related, SLICER, VK ROTARY, Hexa-chorus, SPACE-D, FLANGER, Step Flanger, GUITAR AMP SIM, Compressor, LIMITER, 3TAP PAN DELAY, TIME CTRL DELAY, LOFI COMPRESS, PITCH SHIFTER.

### B.2.5 DELAY · REVERB · CHORUS · EQ (pp.52–53)

| Block | Key parameters |
| --- | --- |
| DELAY | SWITCH, TYPE (SINGLE/PAN/REVERSE/ANALOG/TAPE/MODULATE/HICUT), DELAY TIME, FEEDBACK, EFFECT LEVEL, sends |
| REVERB | SWITCH, TYPE (AMBIENCE/ROOM/HALL1/HALL2/PLATE), REVERB TIME, HIGH CUT, EFFECT LEVEL, sends |
| CHORUS | SWITCH, TYPE (MONO/STEREO/MONO MILD/STEREO MILD), RATE, DEPTH, EFFECT LEVEL, sends |
| EQ | EQ SWITCH, LOW CUT, LOW/LO-MID/HI-MID/HIGH gains, LO-MID/HI-MID FREQ/Q, HIGH CUT, LEVEL, CHARACTER |

---

## B.3 MASTER

### B.3.1 PEDAL / GK CTL (patch layer)

**Gate:** SYSTEM FUNCTION must be `PATCH SETTING`.

Same function menus as SYSTEM PEDAL/GK CTL (HOLD, TONE SW, effect SW, PATCH VOLUME, TONE VOLUME, PITCH BEND, MODULATION, CROSS FADER, effect levels, MOD CONTROL, audio player, V-LINK). Plus patch-only:

| Parameter | Values | Description |
| --- | --- | --- |
| STATUS (CTL, EXP SW) | OFF, ON | Pedal indicator / logical state. |
| LED MOMENT / LED TOGGLE | — | How the pedal LED behaves. |

### B.3.2 ASSIGN 1–8

| Parameter | Values | Description |
| --- | --- | --- |
| SWITCH | OFF, ON | Enable assign. |
| TARGET | (any patch param) | Controlled parameter. |
| TARGET MIN / MAX | depends on target | Output range. |
| SOURCE | CTL, EXP, EXP ON, EXP SW, INT PDL, WAVE PDL, GK S1/S2/VOL, CC1–31, CC64–95 | Controller. |
| SOURCE MODE | MOMENT, TOGGLE | How source maps to min/max. |
| ACT RANGE LO / HI | 0–126 / 1–127 | Active portion of source travel. |
| INT TRIG | PATCH CHANGE, CTL PDL, EXP LOW/MID/HIGH, EXP ON *, EXP SW, GK S1/S2 | Internal pedal trigger (if SOURCE=INT PDL). |
| INT TIME | 0–100 | Internal pedal travel time. |
| INT CURVE | LINEAR, SLOW RISE, FAST RISE | Internal pedal curve. |
| WAVE RATE | 0–100, BPM | Wave pedal cycle (BPM → PATCH TEMPO). |
| WAVE FORM | SAW, TRI, SIN | Wave shape. |

### B.3.3 PATCH TEMPO

| Parameter | Values | Description |
| --- | --- | --- |
| TEMPO | 20–250 | Tempo for sync’d LFO/MOD/DELAY/WAVE. Overridden if SYSTEM MIDI SYNC = ON. |

### B.3.4 GK SET (pointer only)

| Parameter | Values | Description |
| --- | --- | --- |
| SELECT | SYSTEM, 1–10 | Which **global** GK set to use. Does **not** store sensitivity/PU data in the patch. |

### B.3.5 GUITAR OUT (patch)

| Parameter | Values | Description |
| --- | --- | --- |
| SOURCE | OFF, NORMAL PU, MODELING, BOTH | Per-patch GUITAR OUT. Ignored unless SYSTEM GUITAR OUT = PATCH. |

### B.3.6 ALT-TUNING

| Parameter | Values | Description |
| --- | --- | --- |
| SWITCH | OFF, ON | Enable. Does **not** retune normal PU. |
| TYPE | OPEN-D/E/G/A, DROP-D, D-MODAL, −1/−2 STEP, BARITONE, NASHVL, −1/+1 OCT, USER | Preset retunes. |
| USER SHIFT 1–6 | −24…+24 | Per-string shift when TYPE=USER. |

### B.3.7 V-LINK

| Parameter | Values | Description |
| --- | --- | --- |
| PALETTE | LAST, 1–32 | Palette on patch change. |
| CLIP | LAST, 1–32 | Clip on patch change. |
| NOTE CLIP CHANGE | OFF, 1–4 | Clip from played pitch modes. |
| EXP / EXP ON / GK VOL | OFF, COLOR Cb/Cr, BRIGHT, PLAY SPEED | Image control from pedals. |

V-LINK **TX channel** is SYSTEM (`V-LINK TX CH`).

---

## B.4 PATCH MIDI — OM finding

There is **no** separate MASTER “PATCH MIDI” parameter group.

| Topic | Scope |
| --- | --- |
| Guitar → MIDI OUT | SYSTEM › MIDI/USB › GTR-MIDI |
| Patch PC RX/TX, PATCH CH, RX map | SYSTEM › MIDI/USB |
| OM p.68 “(PATCH-MIDI/GK SET)” label | Points at MASTER **V-LINK** (+ GK SET elsewhere), not a MIDI TX block |

External CC can drive patch ASSIGN SOURCE — that is patch wiring, not a MIDI settings page.

---

# GROUP C — Online corroboration

| Finding | Source |
| --- | --- |
| Official OM PDFs | [roland.com GR-55 manuals](https://www.roland.com/global/support/by_product/gr-55/owners_manuals/), [static.roland.com GR-55_OM.pdf](https://static.roland.com/assets/media/pdf/GR-55_OM.pdf) |
| No Parameter Guide product | Roland support manuals list |
| SYSTEM = overall; 10 GK sets | OM p.69 (also manualsdump mirrors) |
| Patch GK SET SELECT | OM p.58; VGuitar topic 38563 |
| Godin Multiac / ACS → PIEZO R, ~648 mm | VGuitar topic 4342 (Sweetwater) |
| RMC suggested PIEZO R, SENS often low | VGuitar topics 3965, 39837 |
| Caimbé = RMC 13-pin class (marketplace listings); no official Roland Caimbé page | BR listings + Godin SA docs |
| Guitar↔Bass reboot + separate banks; GK slot numbers shared across modes | VGuitar topic 22794 |

---

# GROUP D — Ambiguities / unknowns

1. **SENS numbers** disagree across communities (meter method vs RMC “0” vs Polydrive “20–30”). Always calibrate with the meter.  
2. **Scale** 648 vs 650 vs ST — all “close enough”; no Caimbé-specific official value.  
3. **PIEZO R vs PIEZO G** depends on bridge/preamp brand, not “Godin” alone.  
4. **Guitar↔Bass GK memory layout** (fully independent vs overlaid slots) not spelled out in OM prose.  
5. **Firmware addendum** deltas not fully scraped.  
6. App `systemMap.ts` maps a **subset** of SYSTEM (GK sets, OUTPUT, pedals tops, some MIDI); many VELOCITY/NUANCE/DISTANCE/PIEZO/MIDI map fields are not yet in the app map.

---

## Quick reference — two buckets

| Bucket | Contains |
| --- | --- |
| **GLOBAL** | GUITAR↔BASS; 10× GK SET contents (PU TYPE, SCALE, PHASE, DIRECTION, SENS, VEL, NUANCE, DOWN TUNE, piezo tone, bass GK PU POS, NAME); SYSTEM GK SET SELECT; OUTPUT SELECT; SYSTEM PEDAL/GK CTL + ASSIGN HOLD; MIDI/USB; SYSTEM GUITAR OUT; TUNER; LCD; POWER; AUDIO PLAYER level; BACKUP/RESTORE; PEDAL CALIB; FACTORY RESET |
| **CURRENT PATCH** | NAME, PATCH LEVEL; PCM1/2; Modeling; Normal PU routing; STRUCTURE + AMP/MOD/MFX/Delay/Rev/Chorus/EQ; MASTER PEDAL/GK CTL (if allowed); ASSIGN 1–8; PATCH TEMPO; GK SET SELECT pointer; GUITAR OUT (if allowed); ALT-TUNING; V-LINK |

---

*End of discovery report. Sources: local OM extracts under `.tmp/gr55-manual-extracts/`, parallel agent inventories, Roland + VGuitar online.*
