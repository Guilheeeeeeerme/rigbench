# Connection and Exit

> **Status:** Live. Source of truth for MIDI connect and leaving the app.
> **Precedence:** code (`connectionThunks.ts`, `connectionRuntime.ts`, `Gr55Screen.tsx`, `src/session/tabLock.ts`) → this file → [AGENTS.md](../../AGENTS.md).
> Experience: [intention-workbench.md](./intention-workbench.md).

## Product rule

Connect is a gesture. The app does not remember ports, the last route, or a simulated pedal, and it does not reconnect by itself. The browser’s own MIDI permission is the only thing that can already be granted.

Discovery identifies family `0x5302` and does not write. **Ready** (`connected`) happens only after the identity, the system area, the temporary patch, and the patch position have been read. The app does not change the sounding patch during connect.

A second tab cannot take the writer lock (`navigator.locks`, name `rigbench-writer`). The screen says another tab is already connected. If the locks API is missing, this tab proceeds.

**Exit** disconnects MIDI and returns Home. Nothing about the pedal is stored to clear.

**Sync** reads the system area, the sounding patch, and the position again. It does not copy a USER slot over the temporary patch.

## What is stored

| Layer | Owns | Browser storage |
| --- | --- | --- |
| Redux `connection` | phase, ports, problems | No |
| `connectionRuntime` | live MIDI session, editor, system | No |
| `rigbench.locale` | interface language | `localStorage` only |

Port names, recent tones, the fake pedal’s memory, and the slot cache are not written. `src/session/storageAudit.ts` is the allow-list.

## Flow

```
Open /gr55/*  → Connect screen (no silent resume)
Connect       → identify → writer lock → read system → read patch → read position
              → phase connected
Exit          → disconnect → Home
```

## Uncertain state

A timed-out or mismatched write blocks the next edit. **Read the pedal again** clears the block only after a new reading succeeds. While a write is on the wire, unsolicited pedal data is ignored (`holdRemoteMirror`). When idle, the pedal is mirrored again.
