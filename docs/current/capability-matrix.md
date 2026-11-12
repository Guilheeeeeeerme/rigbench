# Capability matrix

> **Status:** Live. What this repo is allowed to claim about a device.
> **Precedence:** a row stays open until a hardware note is written here. Code and [intention-workbench.md](./intention-workbench.md) must not treat an open row as proven.

One GR-55 was read and then written on 12 Nov 2026 (Windows, MIDI port name `USB MIDI Interface`). That session measured the rows that say so. It did not PATCH WRITE a USER slot and it did not power-cycle the pedal. USER `03-1` (`StackOfSoloSynth`) was left as read. The simulated pedal covered the two recipes this patch refused, instrument activation, and a verified save to USER `02-1`.

| Capability | GR-55 claim | Evidence |
| --- | --- | --- |
| Read mapped patch, system, GK, and assign blocks | Used by the app | 12 Nov 2026: identity passed, sounding patch `StackOfSoloSynth` at USER `03-1`, confirmed at 11:32:34. GK play feel 4, low-velocity cut 8, velocity dynamics 5, string sens 28. PCM layers `ResoSawLead` and `Warmy Lead`. Expression and CTL both read as already in use. Classified as a custom patch. |
| Write those blocks to the temporary patch / system | Used by the app | 12 Nov 2026, same pedal: GK play feel written 4 → 5 and read back as 5, then written back to 4 and read back as 4. Low-velocity cut stayed 8, velocity dynamics stayed 5, string sens stayed 28. The solo recipe then wrote the temporary patch (layer 1 `Alto Sax`, layer 2 off) and restore read back `ResoSawLead` and `Warmy Lead`. Expression and CTL stayed in use. |
| PATCH WRITE then USER readback | Implemented (`writeToUserSlotVerified`) | Not measured on hardware. AC03 open. Save was not pressed on the live pedal; destination showed `03-1`. On the simulated pedal, save to USER `02-1` read back as `Simulated Patch` at 12:34:30 and the screen said the USER slot was verified. |
| Sound survives power-off | Not claimed | Open |
| PATCH WRITE needs the physical write button | Unknown. If it does, persistence becomes `physical-write` and the same queue stays | Open |
| Patch-change messages from the panel | The screen shows the last check and blocks editing while it is verifying | Cadence not measured. AC06 / AC07 open |
| String level, tracking accuracy, acoustic latency | Not shown. The pedal does not provide them | Open by design |
| Normal pickup | The patch’s normal signal, with the 13-pin cable explained. Modeling is not a nylon guitar | Not a measurement |
| Reference recipes | `implemented`. Refusal before a write is measured when the control is already in use | 12 Nov 2026, live pedal: harmonica refused because expression was in use; piano and strings refused because CTL was in use. Both messages said nothing was written. Solo was written and restored (see the write row). On the simulated pedal the same two recipes read back: layer 1 `Harmonica 1` with expression as layer-1 level, then layer 1 `St.Piano 1`, layer 2 `Strings 1`, CTL switching layer 2. AC10 / AC13 stay open until those two recipes are measured on hardware. |
| GK set name | Up to 8 characters in the native name field | Round-trip not measured on hardware |
| Brand, playing style, recipe label | Session RAM only. The screen says they vanish on reload | Not stored on the pedal |
| Operation timeout | 12 seconds, provisional | Not measured |
| Reading stays fresh | 20 seconds, provisional | Not measured |

Until a row changes, the interface says that automatic saving has not been measured and that a verified save does not promise survival after the pedal is switched off.
