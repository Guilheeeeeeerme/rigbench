import { useMemo, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../copy';
import { MaestroDrawer } from '../../maestro/MaestroDrawer';
import {
  DEFAULT_SESSION,
  loadSession,
  saveSession,
  sessionChip,
  SESSION_IDS,
  type SessionId,
} from '../../maestro/session';
import type { Gr55Editor } from './editor';
import { TopNav } from './TopNav';
import { StudioPanels } from './StudioPanels';
import { SystemGate } from './SystemParts';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Maestro Studio — craft home: session switcher, embedded chat, macro panels.
 */
export function Studio({
  editor,
  error,
  onError,
}: {
  editor: Gr55Editor;
  error: unknown;
  onError: (error: unknown) => void;
}) {
  const t = useT();
  const [session, setSession] = useState<SessionId>(() => loadSession() || DEFAULT_SESSION);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<string>();
  const patchName = useSyncExternalStore(editor.subscribe, () => editor.patchName);
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  const changeCount = useSyncExternalStore(editor.subscribe, () => editor.changeCount);

  const switchSession = (next: SessionId) => {
    setSession(next);
    saveSession(next);
  };

  const sessionLabel = useMemo(() => {
    switch (session) {
      case 'system':
        return t('studio.session.system');
      case 'patch':
        return t('studio.session.patch');
      case 'library':
        return t('studio.session.library');
    }
  }, [session, t]);

  const panels = (
    <StudioPanels
      session={session}
      editor={editor}
      onError={onError}
      libraryFilter={libraryFilter}
      onLibraryFilter={setLibraryFilter}
      onPatchLoaded={() => switchSession('patch')}
    />
  );

  return (
    <div className="studio">
      <header className="studio-header">
        <Link className="brand" to="/">
          {t('app.name')}
        </Link>
        <TopNav current="studio" />
        <div className="studio-session" role="tablist" aria-label={t('studio.sessionSwitcher')}>
          {SESSION_IDS.map((id) => {
            const label =
              id === 'system'
                ? t('studio.session.system')
                : id === 'patch'
                  ? t('studio.session.patch')
                  : t('studio.session.library');
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={session === id}
                className={session === id ? 'studio-session-btn active' : 'studio-session-btn'}
                onClick={() => switchSession(id)}
              >
                <span aria-hidden="true">{sessionChip(id)}</span> {label}
              </button>
            );
          })}
        </div>
        <div className="patch-title">
          <strong>{patchName || t('gr55.unnamed')}</strong>
          <span className="mode">{t(`gr55.mode.${gkMode}`)}</span>
          <span className="changes">
            {changeCount > 0
              ? t('library.changes', changeCount)
              : t('gr55.workspace.noUnsavedChanges')}
          </span>
          <span className="studio-scope" title={sessionLabel}>
            {sessionChip(session)} {sessionLabel}
          </span>
        </div>
      </header>

      {error != null && (
        <p className="error studio-error" role="alert">
          {t('gr55.error', errorText(error))}{' '}
          <button type="button" onClick={() => onError(undefined)}>
            {t('gr55.dismiss')}
          </button>
        </p>
      )}

      <div className="studio-body">
        <section className="studio-agent" aria-label={t('maestro.title')}>
          <MaestroDrawer
            editor={editor}
            open
            variant="pane"
            session={session}
            onClose={() => undefined}
            onOpenSettings={() => setSettingsOpen(true)}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
          />
        </section>
        <section className="studio-macros" aria-label={t('studio.panelsTitle')}>
          {session === 'system' ? <SystemGate>{panels}</SystemGate> : panels}
        </section>
      </div>
    </div>
  );
}
