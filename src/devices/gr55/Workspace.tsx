import { useMemo, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { en } from '../../copy/en';
import { confirmDiscard } from './dirtyGuard';
import { Librarian } from './Librarian';
import { SectionView } from './SectionView';
import type { Gr55Editor } from './editor';
import { buildPages } from './pages';

const LIBRARIAN = 'librarian';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Scope chip for the status line: every color shows with a word, never alone. */
function ScopeTag({ scope, word, hint }: { scope: 'amber' | 'blue'; word: string; hint: string }) {
  return (
    <span className={`scope chip-${scope}`} title={hint}>
      <span className="dot" aria-hidden="true" />
      {word}
    </span>
  );
}

/** The editor once a pedal is connected and its patch has been read. */
export function Workspace({
  editor,
  error,
  onError,
  onDisconnect,
}: {
  editor: Gr55Editor;
  error: unknown;
  onError: (error: unknown) => void;
  onDisconnect: () => void;
}) {
  const patchName = useSyncExternalStore(editor.subscribe, () => editor.patchName);
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  // Re-renders whenever the change set changes, keeping the count honest.
  useSyncExternalStore(editor.subscribe, () => editor.dirtySnapshot());
  const pages = useMemo(() => buildPages(gkMode), [gkMode]);
  const [pageId, setPageId] = useState(pages[0].id);
  const [reading, setReading] = useState(false);
  /** Discard occurrences the user has already seen. A new one re-raises the notice. */
  const [dismissedDiscard, setDismissedDiscard] = useState<number>();
  const discard = editor.discardedChanges;
  const seen = discard !== undefined && editor.discardSequence === dismissedDiscard;
  const notice =
    discard !== undefined && !seen ? en.gr55.workspace.pedalSwitchedNotice(discard) : undefined;
  const page = pages.find((candidate) => candidate.id === pageId);

  const reload = async () => {
    if (!confirmDiscard(editor)) {
      return;
    }
    setReading(true);
    try {
      await editor.readSystem();
      await editor.readPatch();
      onError(undefined);
    } catch (reason) {
      onError(reason);
    } finally {
      setReading(false);
    }
  };

  return (
    <div className="workspace">
      <header className="workspace-header">
        <Link className="brand" to="/">
          {en.app.name}
        </Link>
        <div className="patch-title">
          <span className="device-name">{en.devices.gr55.name}</span>
          <strong>{patchName || en.gr55.unnamed}</strong>
          <span className="mode">{en.gr55.mode[gkMode]}</span>
        </div>
        <div className="actions">
          <button type="button" disabled={reading} onClick={() => void reload()}>
            {en.gr55.reload}
          </button>
          <button type="button" onClick={onDisconnect}>
            {en.connection.disconnect}
          </button>
        </div>
      </header>

      <div className="context-bar" aria-live="polite">
        <ScopeTag
          scope="amber"
          word={en.gr55.workspace.workingCopy}
          hint={en.gr55.workspace.workingCopyHint}
        />
        <span className="changes">
          {editor.isDirty
            ? en.gr55.workspace.unsavedChanges(editor.changeCount)
            : en.gr55.workspace.noUnsavedChanges}
        </span>
        <ScopeTag
          scope="blue"
          word={`${en.gr55.workspace.pedal}: ${en.gr55.mode[gkMode]}`}
          hint={en.gr55.workspace.pedalHint}
        />
      </div>

      <div className="alerts">
        {notice != null && (
          <p className="notice" role="alert">
            {notice}{' '}
            <button type="button" onClick={() => setDismissedDiscard(editor.discardSequence)}>
              {en.gr55.workspace.dismissNotice}
            </button>
          </p>
        )}
        {error != null && (
          <p className="error" role="alert">
            {en.gr55.error(errorText(error))}{' '}
            <button type="button" onClick={() => onError(undefined)}>
              {en.gr55.dismiss}
            </button>
          </p>
        )}
      </div>

      <nav className="pages" aria-label={en.devices.gr55.name}>
        {pages.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            aria-current={candidate.id === pageId ? 'page' : undefined}
            onClick={() => setPageId(candidate.id)}
          >
            {candidate.title}
          </button>
        ))}
        <button
          type="button"
          className="librarian-tab"
          aria-current={pageId === LIBRARIAN ? 'page' : undefined}
          onClick={() => setPageId(LIBRARIAN)}
        >
          {en.gr55.librarian}
        </button>
      </nav>

      <main className="page">
        {page ? (
          page.sections.map((section) => (
            <SectionView
              key={`${page.id}:${section.struct.address}:${section.title}`}
              editor={editor}
              section={section}
            />
          ))
        ) : (
          <Librarian editor={editor} onError={onError} />
        )}
      </main>
    </div>
  );
}
