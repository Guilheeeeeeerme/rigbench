# Connection, resume, and Stage “where am I”

> **Status:** Live. SoT for MIDI connect / silent resume / route restore / patch location.
> **Precedence:** code (`src/app/store/**`, `connectionThunks.ts`, `connectionRuntime.ts`,
> `Gr55Screen.tsx`, `editor.readPatchLocation`) → this file → [AGENTS.md](../../AGENTS.md) → README.
> Do not restate this flow in other docs beyond a one-line pointer.

## Product rule

If remembered MIDI ports still exist and identify as a GR-55, **reconnect silently** and land on
the **last GR-55 route** (or Stage after setup / wizard before it). Prompt only when permission,
ports, device identity, or the connect handshake fails.

On a successful connect the app must mirror the pedal: temporary patch (sound) **and** which user
slot is selected (`USER xx-y`), so Stage looks like holding the board.

## Architecture (do not put MIDI objects in Redux)

| Layer | Owns | Persist? |
| --- | --- | --- |
| Redux `sessionPrefs` | `rememberedPorts`, `lastRoute`, DEV `preferSimulated` | Yes (`redux-persist`, key `rigbench.redux`) |
| Redux `connection` | phase, progress, port lists, selection, problems | No |
| `connectionRuntime` | `MIDIAccess`, live `MidiSession` / `Gr55Editor` / `SyncEngine` / `Gr55System` | No (in-memory) |

Legacy `localStorage` key `rigbench.gr55.ports` is read once into `sessionPrefs` if present.

Port picker prefers names matching GR-55 / Roland, then other USB MIDI ports, and
deprioritizes “Midi Through” (which never answers Identity Request).

## Flow

```
Open /gr55/*
  → PersistGate rehydrates sessionPrefs
  → resumeIfPossible()
       DEV + preferSimulated → reconnect FakeGr55
       no remembered ports → needsPrompt (ConnectScreen)
       ports missing from MIDIAccess → clear prefs, needsPrompt
       ports present → identify → readSystem → readPatch → readPatchLocation
                    → phase connected → restore lastRoute or home
```

Persist storage uses a Vite-safe `localStorage` adapter (`src/app/store/localStorage.ts`),
not `redux-persist/lib/storage` (broken under Vite ESM).

StrictMode / brief unmount: `retainLiveConnection` keeps the live session for a short grace
period so remount does not drop MIDI.

## Patch location

`Gr55Editor.readPatchLocation()` RQ1s `setup.patchBsMsb` + `setup.patchPc`. When the pair maps
to a user slot, `patchSource = { kind: 'slot', userPatchNumber }`. Called after connect and after
a pedal-driven patch change (`scheduleReload`). Outside the user map → `patchSource` cleared;
Stage shows the unknown-slot hint but still shows the sounding patch.

## Routes

Child names: [`routes.ts`](../../src/devices/gr55/routes.ts). Resumable: `palco`, `maestro`,
`configuracao`, `dispositivo`, `dispositivo/gk`, `configurar`. `conectar` is not restored; it
redirects once connected.

## Files

| Path | Role |
| --- | --- |
| `src/app/store/store.ts` | Store + persist (`sessionPrefs` only) |
| `src/app/store/slices/connectionSlice.ts` | Live connection UI state |
| `src/app/store/slices/sessionPrefsSlice.ts` | Persisted ports + last route |
| `src/devices/gr55/connectionThunks.ts` | request / connect / resume / simulate |
| `src/devices/gr55/connectionRuntime.ts` | Live holder + StrictMode retain |
| `src/devices/gr55/ConnectScreen.tsx` | Prompt UI |
| `src/devices/gr55/Gr55Screen.tsx` | Layout: resume + nested routes |
| `src/devices/gr55/editor.ts` | `readPatchLocation` |

## Verification

```bash
npm run typecheck
npm test -- src/app/store/connectionSlice.test.ts \
  src/devices/gr55/connectionResume.test.ts \
  src/devices/gr55/routes.test.ts \
  src/devices/gr55/gr55.test.ts
```

Hardware: Chrome/Edge + real GR-55 (or simulated pedal in DEV). After one successful Connect,
reload `#/gr55` — should return without re-picking ports and show the current `USER` slot on Stage.
