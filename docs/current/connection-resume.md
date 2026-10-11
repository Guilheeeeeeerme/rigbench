# Connection, resume, and Exit

> **Status:** Live (WIP two-page app). SoT for MIDI connect / silent resume / Exit purge.
> **Precedence:** code (`src/app/store/**`, `connectionThunks.ts`, `connectionRuntime.ts`,
> `Gr55Screen.tsx`) → this file → [AGENTS.md](../../AGENTS.md) → README.
> Do not restate this flow in other docs beyond a one-line pointer.

## Product rule

If remembered MIDI ports still exist and identify as a GR-55, **reconnect silently** and land on
the **last app page** (`bank` or `global`). Prompt only when permission, ports, device identity,
or the connect handshake fails. Legacy persisted `lastRoute` values (e.g. `patch`) normalize to
Bank or Global.

On a successful connect the app reads a **full snapshot**: system + temporary patch + patch
location. The UI shows that snapshot. Pedal configuration is **never** stored in localStorage.

**Exit** (top-left in the app): disconnect MIDI, clear `rememberedPorts` / `preferSimulated` /
`lastRoute`, navigate Home. Next visit must Connect again (or pick simulated pedal in DEV).

## Architecture (do not put MIDI objects in Redux)

| Layer | Owns | Persist? |
| --- | --- | --- |
| Redux `sessionPrefs` | `rememberedPorts`, `lastRoute` (`bank`\|`global`), DEV `preferSimulated` | Yes (`redux-persist`, key `rigbench.redux`) |
| Redux `connection` | phase, progress, port lists, selection, problems | No |
| `connectionRuntime` | `MIDIAccess`, live `MidiSession` / `Gr55Editor` / `Gr55System` | No (in-memory) |

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
                    → phase connected → restore lastRoute or bank
Exit → disconnect + purge connection prefs → Home
```

## Authority (edit vs mirror)

See [AGENTS.md](../../AGENTS.md) and `sessionAuthority.ts`:

- App mutation → authority `app` → DT1 → full snapshot → authority `pedal`
- While `app`, ignore pedal-originated DT1 / program-change reloads
- While `pedal`, mirror the board
- Header **Sync** (`syncFromPedal`): on a USER slot, copies that slot’s USER memory
  into the temporary patch (`loadUserSlotIntoWorkingCopy` — not a same-PC reselect),
  then re-reads system + working copy + location
