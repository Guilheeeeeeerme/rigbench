import { useState, useSyncExternalStore } from 'react';
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

/**
 * The device domain: pedal-wide settings, always blue, always confirmed. Nothing
 * here is a patch parameter, and nothing here is touched without a named modal.
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
  // Keeps the mode-dependent copy honest after a switch.
  useSyncExternalStore(editor.subscribe, () => editor.dirtySnapshot());
  const changeCount = editor.changeCount;

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
        <h2>{en.device.midiTitle}</h2>
        <p className="hint">{en.device.midiIntro}</p>
      </section>

      <p className="hint">{en.device.systemNotice}</p>
    </div>
  );
}
