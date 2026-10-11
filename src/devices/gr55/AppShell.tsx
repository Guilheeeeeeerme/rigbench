import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useT } from '../../copy';
import { useAppDispatch } from '../../app/store/hooks';
import { MaestroDrawer } from '../../maestro/MaestroDrawer';
import { saveSession, type SessionId } from '../../maestro/session';
import type { Gr55Editor } from './editor';
import { BankPage } from './BankPage';
import { GlobalPage } from './GlobalPage';
import { exitToHome } from './connectionThunks';
import { bankHref, bankRoute, globalHref, globalRoute } from './routes';
import { asSnapshotSource } from './snapshotHost';
import { getAuthority, syncFromPedal, subscribeAuthority } from './sessionAuthority';
import { useSystem } from './SystemParts';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const CHAT_MIN = 240;
const CHAT_MAX = 720;
const CHAT_DEFAULT = 360;

/**
 * Connected app: Exit · Bank | Global, Maestro left, parameters right.
 * Viewport-locked: chat composer stays put; messages scroll inside the pane.
 * On Bank, Maestro may configure the whole bank set (keys + sounding patch).
 */
export function AppShell({
  editor,
  page,
}: {
  editor: Gr55Editor;
  page: 'bank' | 'global';
}) {
  const t = useT();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const system = useSystem();
  const [error, setError] = useState<unknown>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)').matches : false,
  );
  const [chatWidth, setChatWidth] = useState(CHAT_DEFAULT);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const authority = useSyncExternalStore(subscribeAuthority, getAuthority);

  const session: SessionId = page === 'global' ? 'system' : 'bank';

  useEffect(() => {
    saveSession(session);
  }, [session]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      const next = Math.min(
        CHAT_MAX,
        Math.max(CHAT_MIN, drag.startWidth + (event.clientX - drag.startX)),
      );
      setChatWidth(next);
    };
    const onUp = () => {
      dragRef.current = null;
      document.body.classList.remove('app-shell-resizing');
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const source = asSnapshotSource({ editor, system });

  const onSync = () => {
    setSyncBusy(true);
    void syncFromPedal(source, async () => {
      // Discover current slot from the pedal, then copy USER memory → temp.
      // Re-selecting the same PC alone often leaves temp edits in place on hardware.
      await editor.readPatchLocation();
      const slot = editor.patchSource;
      if (slot?.kind === 'slot') {
        await editor.loadUserSlotIntoWorkingCopy(slot.userPatchNumber);
      }
    })
      .catch(setError)
      .finally(() => setSyncBusy(false));
  };

  const onExit = () => {
    dispatch(exitToHome());
    void navigate('/');
  };

  const onResizeStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    dragRef.current = { startX: event.clientX, startWidth: chatWidth };
    document.body.classList.add('app-shell-resizing');
  };

  return (
    <div className="app-shell">
      <header className="app-shell-bar">
        <button type="button" className="app-exit" onClick={onExit}>
          {t('gr55.exit')}
        </button>
        <nav className="app-nav" aria-label={t('app.name')}>
          <NavLink
            to={bankHref}
            className={({ isActive }) => (isActive ? 'app-nav-item active' : 'app-nav-item')}
          >
            {t('gr55.navBank')}
          </NavLink>
          <NavLink
            to={globalHref}
            className={({ isActive }) => (isActive ? 'app-nav-item active' : 'app-nav-item')}
          >
            {t('gr55.navGlobal')}
          </NavLink>
        </nav>
        <div className="app-shell-actions">
          <span className="hint" role="status">
            {authority === 'app' ? t('gr55.authorityApp') : t('gr55.authorityPedal')}
          </span>
          <button type="button" disabled={syncBusy} onClick={onSync} title={t('gr55.syncHint')}>
            {syncBusy ? t('gr55.syncBusy') : t('gr55.sync')}
          </button>
          <button
            type="button"
            className="app-chat-toggle"
            aria-expanded={!chatCollapsed}
            onClick={() => setChatCollapsed((value) => !value)}
          >
            {chatCollapsed ? t('gr55.chatExpand') : t('gr55.chatCollapse')}
          </button>
        </div>
      </header>

      {error != null && (
        <p className="error app-shell-error" role="alert">
          {t('gr55.error', errorText(error))}{' '}
          <button type="button" onClick={() => setError(undefined)}>
            {t('gr55.dismiss')}
          </button>
        </p>
      )}

      <div
        className={chatCollapsed ? 'app-shell-body chat-collapsed' : 'app-shell-body'}
        style={
          chatCollapsed
            ? undefined
            : ({ ['--app-chat-width' as string]: `${chatWidth}px` } as CSSProperties)
        }
      >
        {!chatCollapsed && (
          <>
            <section className="app-maestro" aria-label={t('maestro.title')}>
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
            <button
              type="button"
              className="app-split-handle"
              aria-label={t('gr55.chatResize')}
              onPointerDown={onResizeStart}
            />
          </>
        )}
        <section className="app-main" aria-label={page === 'bank' ? bankRoute : globalRoute}>
          {page === 'bank' ? (
            <BankPage editor={editor} onError={setError} />
          ) : (
            <GlobalPage editor={editor} onError={setError} />
          )}
        </section>
      </div>
    </div>
  );
}
