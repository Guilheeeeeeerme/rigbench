import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../copy';
import { downloadBytes } from './download';
import type { Gr55Editor } from './editor';
import { gkHref, setupHref } from './routes';
import { useSync } from './sync/SyncBadge';
import { SyxError, decodeSystemBlocksSyx, encodeSystemBlocksSyx } from './syx';
import {
  ApplyBar,
  MidiFields,
  ModeSwitch,
  OutputFields,
  PedalFields,
  SystemField,
  SystemGate,
  useSystem,
} from './SystemParts';
import { SYSTEM_ADDRESS, SYSTEM_BLOCKS, SYSTEM_SPAN } from './systemMap';

function systemFileName(): string {
  return `${new Date().toISOString().slice(0, 10)}_gr55-system.syx`;
}

/**
 * The device domain: pedal-wide settings, always blue. Changes are staged and listed,
 * and nothing reaches the pedal without a confirmation that names what it does.
 */
export function DeviceScreen({
  editor,
  onError,
}: {
  editor: Gr55Editor;
  onError: (error: unknown) => void;
}) {
  const t = useT();
  const sync = useSync();
  const system = useSystem();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const restoreInput = useRef<HTMLInputElement>(null);

  const backup = () => {
    const file = systemFileName();
    downloadBytes(
      encodeSystemBlocksSyx(SYSTEM_ADDRESS, system.appliedBytes(), SYSTEM_BLOCKS),
      file,
    );
    setNotice(t('device.backupDone', file));
  };

  const restoreSystem = (file: File) => {
    setBusy(true);
    void file
      .arrayBuffer()
      .then(async (buffer) => {
        const writes = decodeSystemBlocksSyx(new Uint8Array(buffer), SYSTEM_ADDRESS, SYSTEM_SPAN);
        // Blue rule: a system write names what it touches before it happens.
        if (!window.confirm(t('device.confirmSystemWrite'))) {
          return;
        }
        await sync.exclusive(() => system.restore(writes));
        await editor.readSystem();
        setNotice(t('device.systemRestored'));
      })
      .catch((error) => {
        if (error instanceof SyxError) {
          setNotice(t(`librarian.problems.${error.problem}`));
        } else {
          onError(error);
        }
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="device">
      <h1>
        {t('device.title')}{' '}
        <span className="scope chip-blue">
          <span className="dot" aria-hidden="true" />
          {t('gr55.workspace.pedal')}
        </span>
      </h1>
      <p className="hint">{t('device.intro')}</p>
      <p>
        <Link to={setupHref}>{t('wizard.reopen')} →</Link>
      </p>

      <SystemGate>
        <section className="section">
          <h2>{t('system.gkTitle')}</h2>
          <p className="hint">{t('system.gkIntro')}</p>
          <div className="fields">
            <SystemField name="activeGkSet" />
          </div>
          <div className="actions">
            <Link className="button-link primary" to={gkHref}>
              {t('system.gkOpen')} →
            </Link>
          </div>
        </section>

        <section className="section">
          <h2>{t('system.outputTitle')}</h2>
          <p className="hint">{t('system.outputIntro')}</p>
          <OutputFields />
        </section>

        <section className="section">
          <h2>{t('system.pedalsTitle')}</h2>
          <p className="hint">{t('system.pedalsIntro')}</p>
          <PedalFields />
        </section>

        <section className="section">
          <h2>{t('system.midiTitle')}</h2>
          <p className="hint">{t('system.midiIntro')}</p>
          <MidiFields />
          <p className="hint">{t('system.notMapped')}</p>
        </section>

        <ApplyBar onError={onError} />

        <section className="section">
          <h2>{t('device.modeTitle')}</h2>
          <p className="hint">{t('device.modeIntro')}</p>
          <ModeSwitch editor={editor} onError={onError} />
        </section>

        <section className="section">
          <h2>{t('device.backupTitle')}</h2>
          <p className="hint">{t('device.backupIntro')}</p>
          <div className="actions">
            <button type="button" disabled={busy} onClick={backup}>
              {t('device.backup')}
            </button>
            <button type="button" disabled={busy} onClick={() => restoreInput.current?.click()}>
              {t('device.backupWrite')}
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
          {notice && (
            <p className="status" role="status">
              {notice}
            </p>
          )}
        </section>
      </SystemGate>

      <p className="hint">{t('device.systemNotice')}</p>
    </div>
  );
}
