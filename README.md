# Rigbench

Run your guitar gear from the browser, on stage and off. Rigbench is a static web app that talks
to the device over [Web MIDI](https://developer.mozilla.org/docs/Web/API/Web_MIDI_API): there is
no backend, and nothing you edit leaves your computer.

The interface is in English and Brazilian Portuguese. It follows the browser's language on the
first visit; the **EN | PT-BR** switch in the corner of every screen changes it without a reload.
The UI is a dark Linear-inspired shell (Inter, indigo accent) — see
[docs/current/ui-guidelines.md](./docs/current/ui-guidelines.md).

| Device       | Status                                             |
| ------------ | -------------------------------------------------- |
| Roland GR-55 | Stage (home), Maestro, setup, config; silent MIDI resume |
| Roland VG-99 | Coming soon                                        |
| BOSS GT-10   | Coming soon                                        |

Contributors and coding agents: start at [AGENTS.md](./AGENTS.md) and [docs/](./docs/).

## GR-55

One path from a cold start to playing, in three surfaces:

```
Pick the device → Connect (resumes when ports still work) → Stage setup (first time) → Stage (now)
                             ├─ Maestro (AI: any configuration, by conversation)
                             └─ Setup (global: Device · GK)
```

One app bar, rendered once: **Stage · Maestro · Setup**. Nothing else to think about.

- **Connect.** Remembers your MIDI ports and last screen. If those ports are still
  there and answer as a GR-55, Rigbench reconnects without asking again; otherwise
  it prompts. After identify it reads the patch that is playing **and** which user
  slot is selected, so Stage matches the pedal face.
- **Stage setup** (`#/gr55/configurar`). Eight steps: language and rig name, guitar or bass mode,
  your instruments (GK sets), output, pedals, MIDI and USB, backup, sync. A step can be skipped
  with "Continue anyway"; later screens remind you of what was skipped. Also reachable as
  **Recalibrate** from Setup.
- **Sync.** Reads all 297 user slots and the pedal-wide settings into the browser's IndexedDB,
  one slot at a time, starting at a safe pace and speeding up until the pedal times out. The seal
  in the corner of every screen shows the slot being read, the count and the time left, then
  **READY**, or how many slots changed on the pedal since the last sync. A sync cut short — page
  reload, cable pulled — picks up where it stopped. It never saves anything to the pedal.
- **Stage** (`#/gr55/palco`). Focused on now — like holding the pedal in hand. At the top it says
  where you are: `USER 04-2 <name>`; the three keys of the current bank sit there as buttons, with
  previous / next bank beside them, and the pedal flips along (about one second of silence per
  switch). Below, the sound of the patch that is playing, as instruments: one row per voice (normal pickup, modeled guitar, PCM synths) with an icon, a mute
  switch and a level; a master level; and the chain switches (amp, chorus, delay, reverb, EQ).
  Everything writes the working copy — nothing on the Stage saves to a slot, and Maestro writes
  stay denied. Which patch plays comes from the pedal's pedals or from Maestro.
- **Setup** (`#/gr55/configuracao`). One screen of cards for everything configured once,
  updated rarely: Device, GK sets, and the guided recalibration.
- **Device** (`#/gr55/dispositivo`, from Setup). Pedal-wide settings — output select, what the
  GUITAR OUT jack carries, the pedal-wide pedal functions, MIDI and USB, guitar/bass mode, and a
  system backup. Changes here are staged and listed, and reach the pedal only on **Apply**, after
  a confirmation that names each one.
- **GK sets** (`#/gr55/dispositivo/gk`). Name each set, choose pickup and scale, and set the
  sensitivity of each string beside a meter. Updated at a very low frequency.
- **Maestro AI** (`#/gr55/maestro`). Chat copilot. It proposes temporary-patch (🟠) edits
  and can stage system (🔵) changes you confirm before Apply; it never writes a pedal slot.
  Write-denied while Stage is live (policy).
- **Advanced editor.** Removed: the simple surfaces above change the sound with instruments and
  switches. Old `#/gr55/editor/**` links redirect home; `pages.ts` stays as the field-key source
  of truth for Maestro.

Every control carries a chip that says what it changes: 🟠 the working copy, 🟢 a saved slot,
🔵 the whole pedal.

### Maestro (BYOK Gemini)

Maestro talks to Google Gemini (`gemini-3.6-flash`) with **your** API key. Rigbench never ships a
key and never puts one in the repository, `.env`, logs, or fixtures.

- **Open.** From the Maestro nav item (`#/gr55/maestro`), or `Ctrl`/`⌘`+`M` where the host
  exposes a drawer. `Esc` closes the drawer when it is a drawer.
- **Storage.** The key lives in `sessionStorage` by default. Opt in to “Remember on this device”
  to keep it in `localStorage`. Use **Forget** to clear both. Use **Test** to ping Gemini without
  sending patch data.
- **Privacy / rotation.** In Google AI Studio, restrict the key by HTTP referrer to this app’s
  origin, set a budget cap, and rotate the key if it was ever exposed.
- **What it can do.** Propose edits to orange temporary-patch fields (you apply them), stage
  blue system changes into the same Apply confirmation as Device, explain controls, and ask to
  load a user slot (you confirm). Voice input (Chrome/Edge) fills the draft only — it never
  auto-sends.
- **What it cannot do.** Auto-apply, write slots directly, or edit while Stage is open.

`npm run check:secrets` scans the tree for Gemini/Google key-shaped strings.

### What has not been checked on a real pedal

Rigbench has been developed against a simulated pedal. The patch editor follows a map that is
proven on hardware elsewhere; the parts below are newer and are the ones to watch. If something
misbehaves on a real GR-55, please open an issue with the firmware version and what you did.

- **System addresses.** GK sets, output, pedals, MIDI and USB follow the system map of the
  CASouthEast fork of gr55-remote (see Credits), which was made against a real pedal. Rigbench
  has not confirmed them itself. Read the values on the Device screen and compare them with the
  pedal's own screen before applying a change.
- **Pickup list.** The order of PU TYPE follows that fork and lists eight values where the
  owner's manual lists seven. Check that the pickup named on screen is the one the pedal shows.
- **Scale length.** Stored as millimetres above 500, on the evidence of one captured GK set.
  Rigbench only ever writes a plain length between 500 and 660 mm; the pedal's ST and LP presets
  are shown as "a preset chosen on the pedal" and never written.
- **Bass mode GK sets.** Only the name and the pickup are editable; the rest of the bass layout
  is not settled, so it is left to the pedal.
- **String meter.** The pedal does not report its own level meter. The bars are drawn from the
  velocity of the notes the pedal sends when Guitar to MIDI is on, which follows how hard the
  pedal heard each string but is not the pedal's meter.
- **Stage states.** Whether CTL or the EXP switch is on, and so which cut is active, is read from
  the status the patch reports. Treat it as a guide.
- **Quick sync.** A second sync reads the first block of each slot — its name and common
  settings — and reads a slot in full only when that block differs. An edit made on the pedal
  itself outside that block is not noticed until you choose **Read every slot again**.
- **Sync pace.** How fast a real pedal answers 297 slots in a row is not published; the pace
  adapts, and the first estimate of the time left is a guess until a few slots have been timed.
- Screen contrast, auto power off and MIDI soft thru are not mapped; they stay on the pedal.

### Check on a real GR-55

These checks need the pedal, the Roland driver, and Chrome or Edge. Do them before changing any
byte encoding.

- Identity Reply reports family `53 02`, and guitar/bass mode is read from `02 00 00 1A`.
- Turn the reverb level. The sound changes, and only that parameter's byte goes out.
- Type a patch name that contains a space. It stays in the field and comes back after a reload.
- Save the patch to a user slot and wait. The pedal locks for a few seconds and sends a program
  change before the `0F 00 00 02` reply. The queue holds the next read until that reply. If the
  read still hits the 5 second timeout, lengthen the wait on that command only.
- Set a delay time in the middle of the millisecond range, then one at the top (a note division).
  If the bytes on the wire do not match the sound, then adjust `USplit12Field` encode. Not before.
- Open Device. The GK set in use, its name and OUTPUT SELECT match the pedal's EDIT › SYSTEM
  screens. Change OUTPUT SELECT, apply, and confirm it on the pedal.
- Let a full sync run. Note the time it takes and whether the seal ever reports a stop.
- Build a two-song setlist on two slots and press `N`. The pedal changes patch and the Stage
  shows the new one.

Not included yet: `.g5l` librarian files, and the read-only preset banks.

## What you need

- **Chrome or Edge on a computer.** Safari and every browser on iPhone and iPad have no Web MIDI.
  Firefox works, but asks for an extra permission before a page may send SysEx. Android Chrome over
  USB-C is experimental and unverified; see [docs/current/mobile-live-control.md](./docs/current/mobile-live-control.md).
- **The page on HTTPS or `localhost`.** Browsers hide MIDI everywhere else.
- **The GR-55 connected by USB**, with the Roland GR-55 driver installed. On Windows the pedal
  shows up in Device Manager with hardware ID `USB\VID_0582&PID_0127`; if it is listed as an
  unknown device, install the driver for your Windows version from Roland's GR-55 downloads page.

## Run it locally

Node 22 is the version in `.nvmrc`; 20.19 or newer also works.

```sh
npm install
npm run dev
```

Open the address Vite prints (`http://localhost:5173`), pick the GR-55, allow MIDI access and
choose the pedal's input and output ports.

In the development build the connection screen also offers **Use a simulated pedal**, which lets
you walk the setup, the sync and the Stage with no hardware attached.

| Script                  | What it does                                                       |
| ----------------------- | ------------------------------------------------------------------ |
| `npm run dev`           | Development server with hot reload                                 |
| `npm run build`         | Check the dictionaries, type-check, build the site to `dist/`      |
| `npm run preview`       | Serve the built site locally                                       |
| `npm test`              | Unit tests (Vitest)                                                |
| `npm run check:copy`    | Fail if `en.ts` and `pt-BR.ts` differ in any key or its parameters |
| `npm run check:secrets` | Fail if Gemini/Google key-shaped strings appear in the tree        |
| `npm run lint`          | ESLint and Prettier check                                          |
| `npm run typecheck`     | TypeScript only                                                    |

## How it is put together

```
src/
  app/            App shell, routes, styles
  shell/          Browser gate, device picker, language switch
  copy/           en.ts (source of truth) and pt-BR.ts; t() and useT() in index.ts
  maestro/        Maestro (policy, registry, Gemini BYOK, macros/, Studio host)
  midi/           Web MIDI access; the session that queues RQ1/DT1 messages 20 ms apart
  protocol/       Roland SysEx and the GR-55 patch address map (see Credits)
  devices/gr55/   Everything the GR-55 screens are made of:
    Stage.tsx, PatchBoard.tsx     the live surface and the iconified patch picker
    Icons.tsx, voices.ts          instrument icons and the four voices of a patch
    Stage.tsx, stageModel.ts     live Stage and what it reads out of a patch
    editor.ts, pages.ts, …       working copy; pages.ts stays the Maestro field-key source
    Setup.tsx                     the global-config screen of cards
    Studio.tsx, StudioPanels.tsx Maestro sessions (chat + macro panels)
    systemMap.ts, systemState.ts pedal-wide settings, staged until applied
    sync/                        sync engine, IndexedDB cache, corner seal
    Wizard.tsx, setupState.ts    first-run / recalibrate setup
    routes.ts, AppNav.tsx        hash routes and the Stage · Setup app bar
    fakeDevice.ts                simulated pedal for tests and the dev build
```

There is no parameter-by-parameter screen anymore. The simple surfaces read what a patch holds
from the address map (voices, icons) and change it with whole-instrument controls; `pages.ts`
survives as the locale-free field-key source of truth for Maestro macros and validation, with a
test pinning every patch field to exactly one key.

Every string the interface shows lives in `src/copy/`. New text goes into `en.ts` and `pt-BR.ts`
under the same key and is read with `t('some.key')`; the names of synths, amps and tones stay as
the pedal prints them.

What Rigbench keeps on your computer: the language, the stage setup and the setlist in
`localStorage`; the synced slots in IndexedDB. Clearing the site's data removes them and nothing
on the pedal.

Agent-oriented recipes and glossary: [docs/current/](./docs/current/).

## Credits and license

Rigbench is released under the [MIT License](LICENSE).

The files in `src/protocol/` are copied from
[motiz88/gr55-remote](https://github.com/motiz88/gr55-remote), copyright 2022 Moti Zilberman, MIT
License (see `src/protocol/LICENSE`). Each file says at the top whether and how it was changed.

The layout of the system area in `src/devices/gr55/systemMap.ts` — addresses, sizes and value
order — follows the system map of
[CASouthEast/gr55-remote-main](https://github.com/CASouthEast/gr55-remote-main), an MIT-licensed
fork of gr55-remote. The code is written against this project's own types.

Rigbench is not affiliated with or endorsed by Roland Corporation. Roland, BOSS, GR-55, VG-99 and
GT-10 are trademarks of their owners.
