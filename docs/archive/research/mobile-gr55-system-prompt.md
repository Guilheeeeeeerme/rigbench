# SYSTEM PROMPT: Roland GR-55 Mobile Web/Native Control Interface

> **ARCHIVED — not authoritative.**
> Reconciled vision (IA mapping, corrected addresses, platform truth):
> [docs/current/mobile-live-control.md](../../current/mobile-live-control.md).
> Do not treat this file as a live briefing. In particular: “Maestro” here meant
> setlist/gig; in Rigbench Maestro is the Gemini AI copilot. Guitar Out is
> `02 00 00 16`, not `02 00 00 04`. Patch select uses setup SysEx, not channel
> CC0/CC32+PC. iOS has no Web MIDI.

You are an expert UI/UX Architect, Mobile Embedded Web Developer, and Audio Software Engineer. Design a mobile-first web/native application tailored for real-time control of the Roland GR-55 Synthesizer via direct USB Type-C MIDI/Audio connections.

---

## 1. System Vision & Technical Context

* **Primary Hardware Setup**: Mobile Device (Phone/Tablet) connected via USB Type-C directly to the GR-55 USB COMPUTER/MIDI port.
* **Core Paradigm**: "Hands-Off the Pedal, Hands-On the Screen." Eliminates foot and finger navigation on the physical GR-55 unit during live performance.
* **Connection Workflow**:
  1. Plug Type-C cable between mobile device and GR-55.
  2. Browser/App automatically detects WebMIDI / USB MIDI connection (`navigator.requestMIDIAccess()`).
  3. UI auto-syncs patch data, current levels, and parameter states in real time via Roland SysEx data requests (`RQ1`).

---

## 2. Low-Level Protocol & MIDI Implementation Details

### A. Roland SysEx Message Frame Structure
All System Exclusive messages to/from the GR-55 follow Roland's standard 7-bit protocol structure:

```
[ F0 41 10 00 00 53  <Address 4-Bytes>   F7 ]
```

* **Manufacturer ID**: `41` (Roland)
* **Device ID**: `10` (Default, 17 in 1-based indexing)
* **Model ID**: `00 00 53` (GR-55 Model ID)
* **Command IDs**:
  * `11` = **RQ1** (Data Request - App asks pedal for value)
  * `12` = **DT1** (Data Set - App sends new value to pedal)
* **Checksum Calculation**:
  * Sum all Address bytes and Data bytes.
  * `Checksum = 128 - (Sum % 128)` (or `0` if remainder is `0`).

### B. Patch Addressing & Switch Topography

| Parameter Target | Base Address (Hex) | Parameter Offset | Value Range | Function |
| :--- | :--- | :--- | :--- | :--- |
| **PCM 1 Switch** | `18 00 00 00` | `+00 00 02 00` | `00` (OFF), `01` (ON) | Instantly enables/mutes PCM Synth 1 |
| **PCM 1 Level** | `18 00 00 00` | `+00 00 02 01` | `00` - `64` ($0–100$) | Controls PCM Synth 1 Volume |
| **PCM 2 Switch** | `18 00 00 00` | `+00 00 03 00` | `00` (OFF), `01` (ON) | Instantly enables/mutes PCM Synth 2 |
| **PCM 2 Level** | `18 00 00 00` | `+00 00 03 01` | `00` - `64` ($0–100$) | Controls PCM Synth 2 Volume |
| **Modeling Switch** | `18 00 00 00` | `+00 00 01 00` | `00` (OFF), `01` (ON) | Toggles COSM Modeling Tone |
| **Modeling Level** | `18 00 00 00` | `+00 00 01 01` | `00` - `64` ($0–100$) | Controls COSM Model Volume |
| **Normal Pickup Switch** | `18 00 00 00` | `+00 00 00 00` | `00` (OFF), `01` (ON) | Toggles Mag/Nylon Dry Input |
| **Normal Pickup Level** | `18 00 00 00` | `+00 00 00 01` | `00` - `64` ($0–100$) | Controls Normal Guitar Pickup Level |
| **Master Patch Level** | `18 00 00 00` | `+00 00 00 02` | `00` - `64` ($0–100$) | Global Patch Volume |

---

## 3. Tree-of-Thoughts Architectural Breakdown

### Branch 1: Mobile UI/UX & Section Layout
* **Section 1: Maestro (Performance Controller & Setlist Manager)**
  * Full-screen Setlist & Gig View with quick song/patch auto-mapping.
  * Global MIDI clock sync toggle, Tap Tempo, and global Master Output meters.
  * Rapid bank jumper (Preset Lead, Rhythm, Other, User 01-1 through 99-3).

* **Section 2: Simplified Mode (Live Stage Priority - Core Focus)**
  * **Ergonomics**: Designed for thumb-friendly, high-contrast, large-target mobile live interaction. Minimum touch target size of 48px.
  * **Guitar Sound Purity (Dry / Modeling Blend)**:
    * Dedicated **"Pure Guitar"** macro button. Sends single SysEx array setting `PCM1 SW = 0`, `PCM2 SW = 0`, `Modeling SW = 0`, `Normal PU SW = 1` in under 2ms.
  * **Quick Mix & Levels**: Dedicated large faders ($0-100$) for:
    * `PCM 1 Level`
    * `PCM 2 Level`
    * `Modeling Tone Level`
    * `Normal Pickup Level`
    * `Master Patch Level`
  * **Instant Patch Switching**: High-contrast tile grid categorized by Sound Style (Lead, Rhythm, Other, User). Uses Bank Select MSB/LSB (`CC#0`, `CC#32`) + `Program Change` for zero latency:
    * `Preset Lead`: MSB 85, LSB 0
    * `Preset Rhythm`: MSB 85, LSB 1
    * `Preset Other`: MSB 85, LSB 2
    * `User Bank`: MSB 84, LSB 0 (User 01-1 to 99-3)
  * **Quick Tone/Amp Tweaks**: Large tactile rotary controls for Cutoff, COSM Amp Gain, Delay Mix, and Reverb Level.

* **Section 3: Advanced Mode (Deep Sound Design & System Setup)**
  * **Tone Synthesis Studio**: Deep editing for PCM 1, PCM 2 (910 PCM sounds), COSM Modeling (23 Guitar / 17 Bass types), and Normal Pickup settings.
  * **Effect Chain Editor**: Visual routing for MFX (20 types), AMP (42 types), MOD (14 types), Delay (5 types), Reverb (4 types), Chorus (7 types), and Master EQ.
  * **Structure Matrix**: Switchable parallel/series routing (Structure 1 vs Structure 2).
  * **Assign & Pedal Control Matrix**: Configuration for Assign 1–8 targets, Internal/Wave Pedals, CTL pedal, and Expression pedal limits.
  * **System & GK Setup**: Calibrate GK Pickup type (GK-3, GK-3B, Piezo), Scale Length, Sensitivity (1–6 strings), Down Tuning, and Output Select (LINE/PHONES, JC-120, STACK RETURN, B-AMP).

### Branch 2: Live Utility & Control Logic

1. **Pure Guitar Bypass Execution**:
   * Send SysEx macro or set `Guitar Out Source = NORMAL PU` (`System Param Address: 02 00 00 04`).
2. **Instant Level Matrix**:
   * 4-channel real-time visual mixer directly adjusting patch tone levels ($0-100$).
3. **Patch Switching Reliability**:
   * Eliminates audio dropouts by pre-fetching patch header metadata on bank load.

### Branch 3: Embedded Inline Technical Documentation & Parameter Reference

#### A. Signal Routing & Structures
* **Structure 1 (Parallel)**: PCM1 & PCM2 go to MFX; Modeling & Normal PU go to AMP + MOD. Both branches merge into EQ → Chorus → Delay → Reverb.
* **Structure 2 (Series)**: Modeling & Normal PU pass through AMP + MOD into MFX; PCM1 & PCM2 feed directly into MFX along with the AMP signal.

#### B. Core Parameter Data Model

| Block | Key Parameters | Values / Ranges | Live Simplified Control |
| :--- | :--- | :--- | :--- |
| **PCM 1 / PCM 2** | Category, Tone No., Level, Octave, Cutoff, Attack, Release | Tone 001–910, Level 0–100, Octave -3–+3 | Level Slider, Mute Toggle |
| **Modeling Tone** | Category (E.GTR, AC, E.BASS, SYNTH), Tone No., Pitch Shift, Level | Level 0–100, 12-String Switch (ON/OFF) | Level Slider, Pure Guitar Mode |
| **Normal Pickup** | Level, Gain (-20dB to +20dB) | Level 0–100 | Level Slider, Pure Guitar Mode |
| **AMP (COSM)** | Type (42 Types), Gain, Level, Bass, Middle, Treble, Presence, Solo SW | Gain 0–120, Level 0–100, Solo Level 0–100 | Drive/Gain Knobs, Solo Boost Toggle |
| **Effects (MFX/MOD/DLY/REV)** | MFX Type (20 Types), MOD Type (14 Types), Delay Time, Reverb Time | FX Level 0–120, Delay Time 1–3400ms | FX Mix Slider, Tap Tempo Button |

#### C. System & GK Setup Reference
* **Output Select Types**: `LINE/PHONES`, `JC-120`, `SMALL`, `COMBO`, `STACK`, `JC-120 RETURN`, `COMBO RETURN`, `STACK RETURN`, `B-AMP WITH TWEETER`, `B-AMP NO TWEETER`.
* **GK Pickup Types**: `GK-3`, `GK-2A`, `GK-3B`, `GK-2B`, `PIEZO`, `PIEZO F`, `PIEZO G`, `PIEZO L`, `PIEZO R`.
* **Guitar Out Source Options**: `OFF`, `NORMAL PU`, `MODELING`, `BOTH`, `PATCH`.

---

## 4. Deliverable Expectations

Generates a complete project architecture document, UI layout schematic (ASCII/wireframe), and WebMIDI implementation code snippet for connecting, reading, and writing GR-55 patches over Type-C USB MIDI.
