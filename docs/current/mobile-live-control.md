# Mobile platform truth

> **Status: platform facts only.** Not shipped IA. The current screen is the intention workspace
> ([intention-workbench.md](./intention-workbench.md)).
> The Stage-era mobile brief stays in
> [archive/research/mobile-gr55-system-prompt.md](../archive/research/mobile-gr55-system-prompt.md).
> Do not follow that prompt for routes, Maestro, or Setup.
> The root [README](../../README.md#what-you-need) points here for the Android USB-C note.

## Platform truth

| Platform | Web MIDI + SysEx | Product posture |
| --- | --- | --- |
| **Chrome / Edge on a computer** | Supported | **Source of truth** today (`BrowserGate`, README) |
| **Firefox (desktop)** | Works; extra SysEx permission notice | Supported with notice |
| **Android Chrome + USB-C / OTG** | API category possible; **unverified** on GR-55 | Experimental research only |
| **iPhone / iPad (any browser)** | **No Web MIDI** | Hard block; needs a future native MIDI bridge |
| **Safari (desktop)** | No Web MIDI | Unsupported |

Additional constraints:

- Secure context required: **HTTPS or `localhost`** (`src/midi/access.ts`).
- **USB audio streaming is out of product scope.** MIDI SysEx control only.
  `usbDirectMonitor` in `systemMap.ts` is a pedal flag set over MIDI, not an audio I/O path.
- Windows still typically needs the Roland GR-55 driver; phone OTG class-compliance is
  environment-dependent and unclaimed until a real device matrix exists.
