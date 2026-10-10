// Every string the interface shows. Another language is another file with this shape.
export const en = {
  app: {
    name: 'Rigbench',
    tagline: 'Edit your guitar gear from the browser, over MIDI.',
    footer: 'Runs in your browser. Nothing you edit leaves this computer.',
    notFound: 'There is nothing at this address.',
    backHome: 'All devices',
  },
  gate: {
    noWebMidi: {
      title: 'This browser cannot talk to MIDI devices',
      body: 'Rigbench needs Web MIDI, which Safari and every browser on iPhone and iPad lack. Open this page in Chrome or Edge on a computer.',
    },
    insecure: {
      title: 'MIDI needs a secure page',
      body: 'Browsers only allow MIDI on pages served over HTTPS or from localhost. Open Rigbench from its https:// address, or from http://localhost when running it yourself.',
    },
    firefoxNotice:
      'Firefox asks for an extra permission before it lets a page send SysEx. Allow it when prompted, or the editor cannot reach your device.',
  },
  home: {
    title: 'Pick your device',
    open: 'Open editor',
    comingSoon: 'Coming soon',
  },
  devices: {
    gr55: { name: 'Roland GR-55', kind: 'Guitar synthesizer' },
    vg99: { name: 'Roland VG-99', kind: 'V-Guitar system' },
    gt10: { name: 'BOSS GT-10', kind: 'Guitar effects processor' },
  },
  connection: {
    title: 'Connect your GR-55',
    intro:
      'Plug the GR-55 into this computer with a USB cable, switch it on, then allow MIDI access.',
    allow: 'Allow MIDI access',
    denied:
      'The browser refused MIDI access. Allow MIDI devices for this site in the browser settings and try again.',
    input: 'MIDI input (from the pedal)',
    output: 'MIDI output (to the pedal)',
    noPorts:
      'No MIDI ports found. Check the USB cable and that the Roland GR-55 driver is installed.',
    connect: 'Connect',
    connecting: 'Looking for the GR-55…',
    noReply:
      'Nothing answered on these ports. Check that the pedal is on and that both ports belong to it.',
    wrongDevice: 'The device on these ports answered, but it is not a GR-55.',
    simulate: 'Use a simulated pedal',
    simulatedPort: 'Simulated GR-55',
    disconnect: 'Disconnect',
    lost: 'The connection to the pedal failed.',
  },
  gr55: {
    reading: (done: number, total: number) => `Reading patch from the pedal… ${done}/${total}`,
    reload: 'Read from pedal',
    navLibrary: 'Library',
    navStage: 'Stage',
    navEditor: 'Patch',
    navDevice: 'Device',
    workspace: {
      /** Scope chip: this control edits the working copy, which the pedal loses on a patch switch. */
      workingCopy: 'Working copy',
      workingCopyHint:
        'This is the patch the pedal is sounding right now. It lives only while this patch is selected: the pedal throws it away when you switch patches.',
      /** Scope chip: this control is stored permanently in the pedal. */
      savedSlot: 'Saved slot',
      savedSlotHint: 'Saved in the pedal. It stays until you write something else there.',
      /** Scope chip: this control is device-wide, not per patch. */
      pedal: 'Pedal',
      pedalHint: 'Pedal-wide setting. The same for every patch.',
      noUnsavedChanges: 'No unsaved changes',
      unsavedChanges: (count: number) =>
        count === 1 ? '1 unsaved change' : `${count} unsaved changes`,
      confirmDiscard: (count: number) =>
        `The working copy has ${count === 1 ? '1 unsaved change' : `${count} unsaved changes`}. ` +
        'Replacing it loses them and the pedal keeps sounding the stored patch. Go ahead?',
      pedalSwitchedNotice: (count: number) =>
        `The pedal switched patches on its own. The working copy had ` +
        `${count === 1 ? 'one unsaved change' : `${count} unsaved changes`}, and it is gone. ` +
        'The patch below is the one the pedal now holds.',
      dismissNotice: 'Dismiss',
    },
    mode: { GUITAR: 'Guitar mode', BASS: 'Bass mode' },
    unnamed: '(unnamed)',
    librarian: 'Librarian',
    showAllEffects: 'Show the parameters of every effect type',
    unknownValue: (hex: string) => `Unknown value (${hex})`,
    error: (message: string) => `The pedal did not accept or answer the last message: ${message}`,
    dismiss: 'Dismiss',
    pages: {
      patch: 'Patch',
      pcm1: 'PCM 1',
      pcm2: 'PCM 2',
      tone: 'Tone',
      toneOffsets: 'Tone offsets',
      modeling: 'Modeling',
      normalPickup: 'Normal pickup',
      amp: 'Amp',
      noiseSuppressor: 'Noise suppressor',
      mod: 'MOD',
      mfx: 'MFX',
      delay: 'Delay',
      chorus: 'Chorus',
      reverb: 'Reverb',
      eq: 'EQ',
      assigns: 'Assigns',
      pedalGk: 'Pedals and GK',
      pedalRanges: 'GK set and control ranges',
      master: 'Master',
      output: 'Output',
      tuning: 'Tuning',
      vlink: 'V-LINK',
      ez: 'EZ sound',
    },
    document: {
      save: 'Save',
      saveAs: 'Save as…',
      revert: 'Revert',
      revertConfirm: (count: number) =>
        `Undo all ${count === 1 ? '1 unsaved change' : `${count} unsaved changes`} and go back ` +
        'to how the pedal had it? The pedal keeps sounding the stored patch in the meantime.',
      saveHint: (slot: string) => `This patch came from ${slot}. Saving writes it back there.`,
      saveNoSlot:
        'This patch came off the pedal’s screen or a file, so there is no slot to save to. Use Save as… to write it into a slot.',
      advanced: 'Advanced',
    },
    blocks: {
      title: 'Signal chain',
      intro:
        'How the sound travels through this patch. Click a block to set its parameters; greyed blocks are switched off.',
      input: 'Input',
      inputHint: 'GK 13-pin and the 1/4" normal pickup feed the patch.',
      sources: 'Sound sources',
      pcm1: 'PCM 1',
      pcm2: 'PCM 2',
      modeling: 'Modeling',
      normalPickup: 'Normal pickup',
      layers: 'Layers',
      layersHint: 'Level, pan and mute per source.',
      amp: 'Amp',
      mod: 'MOD',
      mfx: 'MFX',
      chorus: 'Chorus',
      delay: 'Delay',
      reverb: 'Reverb',
      eq: 'EQ',
      master: 'Master',
      control: 'Pedals and GK',
      controlHint: 'What stepping on each pedal does: assigns, CTL, EXP, GK controls.',
      output: 'Output',
      off: 'Off',
      assignCables: 'Cables: stepping on a pedal',
    },
  },
  librarian: {
    fileTitle: 'Patch file',
    fileIntro:
      'A .syx file holds one patch. Opening a file replaces the patch you are editing; it does not touch the patches stored in the pedal.',
    download: 'Download patch as .syx',
    open: 'Open .syx file…',
    opened: (name: string) => `Loaded ${name} into the pedal's edit buffer.`,
    problems: {
      'no-patch-data': 'This file has no GR-55 patch in it.',
      'bad-checksum': 'This file is damaged: a message in it fails its checksum.',
      'out-of-range': 'This file is damaged: it addresses data outside a GR-55 patch.',
    },
    slotsTitle: 'User patches in the pedal',
    slotsIntro:
      'Load a user patch to edit it, or write the patch you are editing into a slot. Writing is the only action here that changes what is stored in the pedal.',
    readNames: 'Read patch names',
    readingNames: (done: number, total: number) => `Reading names… ${done}/${total}`,
    stop: 'Stop',
    load: 'Load',
    write: 'Write here',
    notRead: '—',
    confirmWrite: (slot: string, current: string | undefined, name: string) =>
      `Overwrite user patch ${slot}${current ? ` (“${current}”)` : ''} with “${name}”? The patch stored there now is lost.`,
    written: (slot: string) => `Written to user patch ${slot}.`,
  },
  library: {
    title: 'Library',
    intro:
      'Every patch stored in the pedal. Try one with a single click, open it in the editor, or write the patch you are working on into a slot.',
    workingCopy: 'Working copy',
    workingCopyIntro:
      'The patch the pedal is sounding right now. The pedal throws it away when it switches patches.',
    openInEditor: 'Open',
    changes: (count: number) => (count === 1 ? '1 unsaved change' : `${count} unsaved changes`),
    noChanges: 'No unsaved changes',
    test: 'Test',
    writeTo: 'Write to…',
    reading: (done: number, total: number) => `Reading slots… ${done}/${total}`,
    namesTitle: 'Slot names',
    readAllNames: 'Read all slot names',
    backupTitle: 'Whole-pedal backup',
    backupIntro:
      'Save every slot in the pedal to a file, or put a saved backup back into the pedal. Both keep the pedal busy for a while; names first if you just want an inventory.',
    backup: 'Save a backup of every slot…',
    backupProgress: (done: number, total: number) => `Backing up… ${done}/${total} slots`,
    backupDone: (file: string) => `Backup saved as ${file}.`,
    backupWriteTitle: 'Restore a slot backup',
    backupWrite: 'Write a slot backup back to the pedal…',
    backupRestoring: (done: number, total: number) => `Restoring… ${done}/${total} slots`,
    backupRestored: 'The backup is back in the pedal.',
    fileIsEmpty: 'This backup file holds no slots.',
    writeFlowTitle: (slot: string) => `Write to ${slot}`,
    readDiff: 'Compare with the working copy',
    writeFlowIntro:
      'Only the parameters listed below change. Confirming sends them to the slot; the pedal stays silent for a few seconds — do not step on the pedals while it writes.',
    diffTitle: 'What changes in this slot',
    diffEmpty: 'Nothing differs; writing is safe.',
    diffConfirm: 'Write to the slot',
    choosing: 'Choose a slot',
    writing: 'Writing to the pedal — do not step on the pedals…',
    written: (slot: string) => `Slot ${slot} now holds this patch.`,
    tested: (slot: string) => `${slot} is sounding now.`,
    emptySlot: '(empty)',
    memory: (slot: string) => `Slot ${slot}`,
  },
  stage: {
    title: 'Stage',
    intro: 'What sounds now, and what each pedal step does.',
    playingCopy:
      'The pedal is sounding your working copy, not the saved slot. Step on the pedals and the sounding patch changes with them.',
    pedals: 'What each pedal step does',
    effects: 'Effects now',
    fixed: 'patch changes, fixed by hardware',
    on: 'On',
    off: 'Off',
    back: 'Back to the library',
    footnote: 'Nothing here is editable. Switch patches by ear on the pedal itself.',
  },
  device: {
    title: 'Device',
    intro:
      'Pedal-wide rules. Every change here carries the blue chip, because it affects the whole pedal and all 297 slots.',
    profileTitle: 'Your instrument',
    profileIntro:
      'Tell Rigbench what you play. It shapes hints and patch lists on this computer; the pedal itself is not touched.',
    profiles: {
      'guitar-gk': 'Electric guitar with a GK-3 pickup',
      'acoustic-piezo': 'Steel or nylon acoustic, piezo pickup',
      'bass-gk': 'Bass guitar with a GK-3B pickup',
    },
    modeTitle: 'Guitar mode / Bass mode',
    modeIntro:
      'Pedal-wide. Switching remakes the whole patch list — all 297 slots change meaning. Save your working copy first.',
    confirmMode: (count: number) =>
      `Switching Guitar⇄Bass is a pedal-wide change that affects all 297 slots` +
      `${count ? ` and discards ${count === 1 ? '1 unsaved change' : `${count} unsaved changes`}` : ''}. Switch it?`,
    modeSwitchBlocked:
      'The working copy still has unsaved changes. Save, revert, or discard them before switching modes.',
    modeSwitchedTo: (mode: string) => `The pedal is now in ${mode}.`,
    midiTitle: 'MIDI and USB',
    midiIntro:
      'The pedal talks over the USB cable with the driver Roland ships for it. Rigbench reads one patch at a time and sends changes as you make them; nothing is stored on this computer.',
    systemNotice: 'Pedal-wide settings always ask first.',
    profileModeWarn: 'Pedal not in this mode',
  },
};
