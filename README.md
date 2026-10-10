# Rigbench

Edit your guitar gear from the browser. Rigbench is a static web app that talks to the device over
[Web MIDI](https://developer.mozilla.org/docs/Web/API/Web_MIDI_API): there is no backend, and
nothing you edit leaves your computer.

| Device       | Status               |
| ------------ | -------------------- |
| Roland GR-55 | Editor and librarian |
| Roland VG-99 | Coming soon          |
| BOSS GT-10   | Coming soon          |

## GR-55

- Finds the pedal with a MIDI Identity Request, then reads the patch you are playing.
- Every parameter of the patch is editable live: PCM tones 1 and 2, modeling, normal pickup, amp,
  MOD, MFX, delay, chorus, reverb, EQ, assigns, pedal and GK controls, master. Moving a control
  sends that one parameter to the pedal.
- Edits go to the pedal's edit buffer. A user patch stored in the pedal is only overwritten when
  you press **Write here** in the librarian and confirm.
- Librarian: load a user patch, write the current patch to a user slot, download the current patch
  as a `.syx` file and open one again.
- Guitar and bass mode are both read from the pedal; the mode itself is not changed from here.

So far this has been developed against a simulated pedal. If something misbehaves on a real
GR-55, please open an issue with the firmware version and what you did.

## Check on a real GR-55

The simulator answers what the editor sends. These checks need the pedal, the Roland driver, and
Chrome or Edge. Do them before changing any byte encoding.

- Identity Reply reports family `53 02`, and guitar/bass mode is read from `02 00 00 1A`.
- Turn the reverb level. The sound changes, and only that parameter's byte goes out.
- Type a patch name that contains a space. It stays in the field and comes back after a reload.
- Write the patch to a user slot and wait. The pedal locks for a few seconds and sends a program
  change before the `0F 00 00 02` reply. The queue holds the next read until that reply. If the
  read still hits the 5 second timeout, lengthen the wait on that command only.
- Set a delay time in the middle of the millisecond range, then one at the top (a note division).
  If the bytes on the wire do not match the sound, then adjust `USplit12Field` encode. Not before.

Not included yet: `.g5l` librarian files, and system settings beyond reading guitar/bass mode.

## What you need

- **Chrome or Edge on a computer.** Safari and every browser on iPhone and iPad have no Web MIDI.
  Firefox works, but asks for an extra permission before a page may send SysEx.
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
you try the editor with no hardware attached.

| Script              | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Development server with hot reload              |
| `npm run build`     | Type-check and build the static site to `dist/` |
| `npm run preview`   | Serve the built site locally                    |
| `npm test`          | Unit tests (Vitest)                             |
| `npm run lint`      | ESLint and Prettier check                       |
| `npm run typecheck` | TypeScript only                                 |

## How it is put together

```
src/
  app/            App shell, routes, styles
  shell/          Browser gate and the device picker
  copy/en.ts      Every string the interface shows
  midi/           Web MIDI access; the session that queues RQ1/DT1 messages 20 ms apart
  protocol/       Roland SysEx and the GR-55 address map (see Credits)
  devices/gr55/   Editor state, generated pages, librarian, .syx files
```

The editor pages are not drawn parameter by parameter. Each page is a slice of the address map,
and the control for a parameter (slider, switch, list, text) is chosen from the type the map gives
it. A test checks that every parameter of the patch lands on exactly one page.

## Credits and license

Rigbench is released under the [MIT License](LICENSE).

The files in `src/protocol/` are copied from
[motiz88/gr55-remote](https://github.com/motiz88/gr55-remote), copyright 2022 Moti Zilberman, MIT
License (see `src/protocol/LICENSE`). Each file says at the top whether and how it was changed.

Rigbench is not affiliated with or endorsed by Roland Corporation. Roland, BOSS, GR-55, VG-99 and
GT-10 are trademarks of their owners.
