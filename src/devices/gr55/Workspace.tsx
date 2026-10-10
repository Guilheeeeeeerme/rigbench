import { useMemo, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { en } from '../../copy/en';
import { Librarian } from './Librarian';
import { SectionView } from './SectionView';
import type { Gr55Editor } from './editor';
import { buildPages } from './pages';

const LIBRARIAN = 'librarian';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
  const pages = useMemo(() => buildPages(editor.gkMode), [editor]);
  const [pageId, setPageId] = useState(pages[0].id);
  const [reading, setReading] = useState(false);
  const page = pages.find((candidate) => candidate.id === pageId);

  // The name can change from any page, from a loaded file or from the pedal.
  const patchName = useSyncExternalStore(editor.subscribe, () => editor.patchName);

  const reload = async () => {
    setReading(true);
    try {
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
          <span className="mode">{en.gr55.mode[editor.gkMode]}</span>
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

      {error != null && (
        <p className="error" role="alert">
          {en.gr55.error(errorText(error))}{' '}
          <button type="button" onClick={() => onError(undefined)}>
            {en.gr55.dismiss}
          </button>
        </p>
      )}

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
