# Rigbench

Run your guitar gear from the browser, on stage and off. Rigbench is a static web app that talks
to the device over [Web MIDI](https://developer.mozilla.org/docs/Web/API/Web_MIDI_API): there is
no backend, and nothing you edit leaves your computer. The published app is
[guilheeeeeeerme.github.io/rigbench](https://guilheeeeeeerme.github.io/rigbench/). That build needs
Chrome or Edge and a GR-55 on USB. The simulated pedal is only in `npm run dev`.

The app opens in Brazilian Portuguese. English is the **EN | PT-BR** switch. Docs and code stay
English. Policy: [docs/current/intention-workbench.md](./docs/current/intention-workbench.md) (Language).
The UI is a dark Linear-inspired shell (Inter, indigo accent) — see
[docs/current/ui-guidelines.md](./docs/current/ui-guidelines.md).

| Device       | Status                                                           |
| ------------ | ---------------------------------------------------------------- |
| Roland GR-55 | Home → Connect → intention workspace (WIP); connect is a gesture |
| Roland VG-99 | Coming soon                                                      |
| BOSS GT-10   | Coming soon                                                      |

Contributors and coding agents: start at [AGENTS.md](./AGENTS.md), then [docs/](./docs/) —
app specs in `docs/current/`, design history in `docs/archive/`, and the GR-55 patch/manual
library in `docs/gr55-collection/` (data, not documentation; it is not in git).

## GR-55 (WIP)

Intention workspace for the GR-55. You describe the instrument and the sound; the app writes only the fields that intention needs, then reads them back.

```
Home → Connect (a gesture, then a confirmed read) → Patch board
         previous / next with the pedal
         Save · Guitar · Read again · Exit → Home
```

- **Home.** Pick GR-55 (or a placeholder device).
- **Connect.** [docs/current/connection-resume.md](./docs/current/connection-resume.md). Development builds can use a simulated pedal.
- **Patch** (`#/gr55/patch`). The sounding patch fills the window. Previous and next stay with the
  pedal. Save and Guitar open a sheet. Card anatomy:
  [docs/current/intention-workbench.md](./docs/current/intention-workbench.md).
- **Authority.** The screen follows the last confirmed reading. A send acknowledgement is not enough.
  Connect, Exit, and Sync: [docs/current/connection-resume.md](./docs/current/connection-resume.md).
- **Exit.** Top-left: disconnect and return Home. Ports are not remembered.
- **No AI** in this MVP. Legacy `#/gr55/bank`, `#/gr55/global`, `#/gr55/maestro` redirect to Patch.

Product SoT: [docs/current/intention-workbench.md](./docs/current/intention-workbench.md).
Hardware claims: [docs/current/capability-matrix.md](./docs/current/capability-matrix.md).
Parameter taxonomy: [docs/current/gr55-config-scope.md](./docs/current/gr55-config-scope.md).

Every control carries a chip that says what it changes: 🟠 the working copy, 🔵 the whole pedal.

### What has not been checked on a real pedal

Rigbench has been developed against a simulated pedal. The patch editor follows a map that is
proven on hardware elsewhere; the parts below are newer and are the ones to watch. If something
misbehaves on a real GR-55, please open an issue with the firmware version and what you did.

- **System addresses.** GK sets, output, pedals, MIDI and USB follow the system map of the
  CASouthEast fork of gr55-remote (see Credits), which was made against a real pedal. Rigbench
  has not confirmed them itself. Read the values on the workspace screens and compare them with
  the pedal's own screen before applying a change.
- **Pickup list.** The order of PU TYPE follows that fork and lists eight values where the
  owner's manual lists seven. Check that the pickup named on screen is the one the pedal shows.
- **Scale length.** Stored as millimetres above 500, on the evidence of one captured GK set.
  Rigbench only ever writes a plain length between 500 and 660 mm; the pedal's ST and LP presets
  are shown as "a preset chosen on the pedal" and never written.
- **Bass mode GK sets.** Only the name and the pickup are editable; the rest of the bass layout
  is not settled, so it is left to the pedal.
- **No string meter.** The workspace does not draw level, accuracy, or latency. You hear the change.
- **Save.** “Saved and verified” means the USER slot we read back matched. It does not yet mean the
  sound is still there after the pedal is switched off. See the capability matrix.
- **Panel patch changes.** The screen shows the time of the last check. Without a message from the
  pedal, editing waits on the next reading. How often a real GR-55 sends that message is not measured.
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
- On My instrument, the GK set in use and its name match the pedal's EDIT › SYSTEM screens.
  Activate, then confirm the same values on the pedal.
- Let a full sync run. Note the time it takes and whether the seal ever reports a stop.

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
you walk connect, the intention workspace, and a verified USER save with no hardware attached.

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
  app/            Redux connection phase, styles
  shell/          Browser gate, device picker, language switch
  copy/           en.ts (key schema) and pt-BR.ts; the app opens in pt-BR
  experience/     Intention screens. They do not import a device or SysEx
  intentions/     Shared intention types
  session/        Serial queue, tab lock, storage allow-list
  midi/           Web MIDI access; the session that queues RQ1/DT1 messages 20 ms apart
  protocol/       Roland SysEx and the GR-55 patch address map (see Credits)
  devices/gr55/   GR-55 adapter and screens:
    Gr55Screen.tsx, routes.ts     shell: Connect, legacy-hash redirects
    AppShell.tsx                  app bar: Exit · Sync
    Gr55Workspace.tsx             binds the GR-55 session to the experience
    ConnectScreen.tsx             MIDI port picker (+ simulated pedal in DEV)
    intentions/                   recipes and the confirmed-read session
    AdvancedPatchEditor.tsx       parameter editor on the same queue
    editor.ts                     working copy; verified writes update it from the readback
    intentions/translate.ts       recipe PCM names (`LAYER_PCM`) and field writes
    instrumentProfiles.ts         instrument → GK starting points
    systemMap.ts, systemState.ts  pedal-wide settings
    fakeDevice.ts                 simulated pedal for tests and the dev build
```

There is no parameter-by-parameter first screen. The workspace reads what a patch holds from the
address map and changes it with musician-level controls; `pages.ts` stays the locale-free field-key
source of truth for validation, with tests pinning every patch field to exactly one section. When
something needs parameter-level care, the workspace's Advanced section is the escape hatch.

Every string the interface shows lives in `src/copy/`. Language policy:
[docs/current/intention-workbench.md](./docs/current/intention-workbench.md) (Language).

What Rigbench keeps on your computer: the language, under `rigbench.locale`. Ports, recent tones,
and pedal settings are not stored. Clearing the site's data forgets the language and nothing on
the pedal.

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
