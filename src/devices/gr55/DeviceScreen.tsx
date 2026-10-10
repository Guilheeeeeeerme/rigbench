import { useRef, useState, useSyncExternalStore } from 'react';
import { en } from '../../copy/en';
import type { Gr55Editor, GkMode } from './editor';
import {
  PROFILE_PRESETS,
  loadProfile,
  profileName,
  profileMode,
  saveProfile,
  type InstrumentProfile,
} from './profiles';
import { SyxError, decodeSystemSyx, encodeSystemSyx } from './syx';

function download(bytes: Uint8Array, fileName: string): void {
  const url = URL.createObjectURL(
    new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/octet-stream' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function systemFileName(): string {
  return `${new Date().toISOString().slice(0, 10)}_gr55-system.syx`;
}

/**
 * The device domain: pedal-wide settings, always blue, always confirmed.
 * Nothing here is a patch parameter, and nothing here is touched without a
 * named modal that says what it does to the whole pedal.
 */
export function DeviceScreen({
  editor,
  onError,
}: {
  editor: Gr55Editor;
  onError: (error: unknown) => void;
}) {
  const [profile, setProfile] = useState<InstrumentProfile>(() => loadProfile());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  // Keeps the danger copy in step with the unsaved-change count.
  useSyncExternalStore(editor.subscribe, () => editor.dirtySnapshot());
  const changeCount = editor.changeCount;
  const restoreInput = useRef<HTMLInputElement>(null);

  const pickProfile = (next: InstrumentProfile) => {
    setProfile(next);
    saveProfile(next);
  };

  const switchMode = (mode: GkMode) => {
    if (mode === gkMode) {
      return;
    }
    // A dirty working copy dies in the switch; refuse before the modal, not after.
    if (editor.isDirty) {
      window.alert(en.device.modeSwitchBlocked);
      return;
    }
    if (!window.confirm(en.device.confirmMode(0))) {
      return;
    }
    setBusy(true);
    void editor
      .setGuitarBassMode(mode)
      .then(() => setNotice(en.device.modeSwitchedTo(en.gr55.mode[mode])))
      .catch((reason) => onError(reason))
      .finally(() => setBusy(false));
  };

  const backup = () => {
    setBusy(true);
    void editor
      .readSystemBytes()
      .then((bytes) => {
        const file = systemFileName();
        download(encodeSystemSyx(editor.systemAddress(), bytes), file);
        setNotice(en.device.backupDone(file));
      })
      .catch((reason) => onError(reason))
      .finally(() => setBusy(false));
  };

  const restoreSystem = (file: File) => {
    setBusy(true);
    void file
      .arrayBuffer()
      .then(async (buffer) => {
        const bytes = decodeSystemSyx(
          new Uint8Array(buffer),
          editor.systemAddress(),
          editor.systemSpan(),
        );
        // Blue rule: a system write names what it touches before it happens.
        if (!window.confirm(en.device.confirmSystemWrite)) {
          return;
        }
        await editor.writeSystemBytes(bytes);
        setNotice(en.device.systemRestored);
      })
      .catch((error) => {
        if (error instanceof SyxError) {
          setNotice(en.librarian.problems[error.problem]);
        } else {
          onError(error);
        }
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="device">
      <h1>
        {en.device.title}{' '}
        <span className="scope chip-blue">
          <span className="dot" aria-hidden="true" />
          {en.gr55.workspace.pedal}
        </span>
      </h1>
      <p className="hint">{en.device.intro}</p>

      <section className="section">
        <h2>{en.device.profileTitle}</h2>
        <p className="hint">{en.device.profileIntro}</p>
        <div className="profile-list">
          {PROFILE_PRESETS.map((preset) => (
            <label key={preset.id}>
              <input
                type="radio"
                name="instrument-profile"
                checked={profile.id === preset.id}
                onChange={() => pickProfile(preset)}
              />
              {profileName(preset)}
              {profileMode(preset) !== gkMode && (
                <span className="profile-warn">{en.device.profileModeWarn}</span>
              )}
            </label>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>{en.device.modeTitle}</h2>
        <p className="hint">{en.device.modeIntro}</p>
        <div className="actions">
          <button
            type="button"
            disabled={busy}
            className={gkMode === 'GUITAR' ? 'primary' : undefined}
            onClick={() => switchMode('GUITAR')}
          >
            {en.gr55.mode.GUITAR}
          </button>
          <button
            type="button"
            disabled={busy}
            className={gkMode === 'BASS' ? 'primary' : undefined}
            onClick={() => switchMode('BASS')}
          >
            {en.gr55.mode.BASS}
          </button>
        </div>
        {notice && (
          <p className="status" role="status">
            {notice}
          </p>
        )}
        {changeCount > 0 && (
          <p className="notice">{en.gr55.workspace.unsavedChanges(changeCount)}</p>
        )}
      </section>

      <section className="section">
        <h2>{en.device.backupTitle}</h2>
        <p className="hint">{en.device.backupIntro}</p>
        <div className="actions">
          <button type="button" disabled={busy} onClick={backup}>
            {en.device.backup}
          </button>
          <button type="button" disabled={busy} onClick={() => restoreInput.current?.click()}>
            {en.device.backupWrite}
          </button>
          <input
            ref={restoreInput}
            type="file"
            accept=".syx,application/octet-stream"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) {
                restoreSystem(file);
              }
            }}
          />
        </div>
      </section>

      <section className="section">
        <h2>{en.device.midiTitle}</h2>
        <p className="hint">{en.device.midiIntro}</p>
      </section>

      <p className="hint">{en.device.systemNotice}</p>
    </div>
  );
}
