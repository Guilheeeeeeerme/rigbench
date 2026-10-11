import { useMemo, useState, useSyncExternalStore } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useT } from '../../copy';
import { confirmDiscard } from './dirtyGuard';
import { SectionView } from './SectionView';
import { userSlots, WriteFlow } from './Library';
import type { Slot } from './Library';
import type { Gr55Editor } from './editor';
import { FieldSearch } from './FieldSearch';
import { buildPages, editorHref } from './pages';
import { TopNav } from './TopNav';
import { PAGE_IDS } from './pages';
import type { PageId } from './pages';

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

/**
 * The editor screen: one patch page at a time, reached by a URL that survives a
 * refresh. The scope situation always lives in the context bar under the header.
 */
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
  const t = useT();
  const { pageId: pageParam } = useParams<{ pageId?: string; sectionSlug?: string }>();
  // An unknown page id falls back to the first page instead of an empty screen.
  const pageId = (PAGE_IDS as readonly string[]).includes(pageParam ?? '')
    ? (pageParam as PageId)
    : 'patch';
  const patchName = useSyncExternalStore(editor.subscribe, () => editor.patchName);
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  // Re-renders whenever the change set changes, keeping the count honest.
  const changeSet = useSyncExternalStore(editor.subscribe, () => editor.dirtySnapshot());
  const changeCount = editor.changeCount;
  // The Advanced switch lives beyond this session; localStorage keeps it app-local.
  const [advanced, setAdvanced] = useState(
    () => localStorage.getItem('rigbench.gr55.advanced') === 'yes',
  );
  // The write-to-slot dialog runs for both Save and Save as…, diff and confirm inside.
  const [chooseOpen, setChooseOpen] = useState(false);
  const [writeTo, setWriteTo] = useState<Slot>();
  const pages = useMemo(() => buildPages(gkMode, t), [gkMode, t]);
  const slots = useMemo(() => userSlots(editor), [editor]);
  const [reading, setReading] = useState(false);
  const page = pages.find((candidate) => candidate.id === pageId) ?? pages[0];

  const setAdvancedStored = (next: boolean) => {
    setAdvanced(next);
    localStorage.setItem('rigbench.gr55.advanced', next ? 'yes' : 'no');
  };
  void changeSet;

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

  const save = () => {
    const source = editor.patchSource;
    if (source === undefined || source.kind !== 'slot') {
      return;
    }
    const chosen = slots.find((slot) => slot.userPatchNumber === source.userPatchNumber);
    if (chosen) {
      setWriteTo(chosen);
    }
  };

  const revert = async () => {
    if (changeCount === 0) {
      return;
    }
    if (!window.confirm(t('gr55.document.revertConfirm', changeCount))) {
      return;
    }
    setReading(true);
    try {
      await editor.revert();
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
          {t('app.name')}
        </Link>
        <TopNav current="editor" />
        <div className="patch-title">
          <strong>{patchName || t('gr55.unnamed')}</strong>
          <span className="mode">{t(`gr55.mode.${gkMode}`)}</span>
          <span className="changes">
            {editor.isDirty
              ? t('library.changes', changeCount)
              : t('gr55.workspace.noUnsavedChanges')}
          </span>
        </div>
        <div className="actions">
          <button
            type="button"
            className="primary"
            disabled={reading || !editor.isDirty || editor.patchSource?.kind !== 'slot'}
            onClick={save}
          >
            {t('gr55.document.save')}
          </button>
          <button type="button" disabled={reading} onClick={() => setChooseOpen(true)}>
            {t('gr55.document.saveAs')}
          </button>
          <button type="button" disabled={reading || !editor.isDirty} onClick={() => void revert()}>
            {t('gr55.document.revert')}
          </button>
          <button type="button" disabled={reading} onClick={() => void reload()}>
            {t('gr55.reload')}
          </button>
          <button type="button" onClick={onDisconnect}>
            {t('connection.disconnect')}
          </button>
        </div>
      </header>

      <div className="context-bar" aria-live="polite">
        <FieldSearch editor={editor} />
        <ScopeTag
          scope="amber"
          word={t('gr55.workspace.workingCopy')}
          hint={t('gr55.workspace.workingCopyHint')}
        />
        <span className="changes">
          {editor.isDirty
            ? t('gr55.workspace.unsavedChanges', editor.changeCount)
            : t('gr55.workspace.noUnsavedChanges')}
        </span>
        <ScopeTag
          scope="blue"
          word={`${t('gr55.workspace.pedal')}: ${t(`gr55.mode.${gkMode}`)}`}
          hint={t('gr55.workspace.pedalHint')}
        />
      </div>

      <div className="alerts">
        {error != null && (
          <p className="error" role="alert">
            {t('gr55.error', errorText(error))}{' '}
            <button type="button" onClick={() => onError(undefined)}>
              {t('gr55.dismiss')}
            </button>
          </p>
        )}
      </div>

      <nav className="pages" aria-label={t('devices.gr55.name')}>
        {pages.map((candidate) => (
          <Link
            key={candidate.id}
            to={editorHref(candidate.id as PageId, candidate.sections[0].slug)}
            aria-current={candidate.id === page?.id ? 'page' : undefined}
          >
            {candidate.title}
          </Link>
        ))}
      </nav>

      <main className="page">
        {page?.sections.map((section) => (
          <SectionView
            key={`${page.id}:${section.struct.address}:${section.slug}`}
            editor={editor}
            section={section}
            advanced={advanced}
          />
        ))}
      </main>

      <footer className="doc-footer">
        <label>
          <input
            type="checkbox"
            checked={advanced}
            onChange={(event) => setAdvancedStored(event.target.checked)}
          />
          {t('gr55.document.advanced')}
        </label>
      </footer>

      {writeTo && (
        <WriteFlow
          editor={editor}
          onError={onError}
          slot={writeTo}
          close={(outcome) => {
            void outcome;
            setWriteTo(undefined);
          }}
        />
      )}

      {chooseOpen && (
        <div className="modal-backdrop" onClick={() => setChooseOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-labelledby="choose-slot-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="choose-slot-title">{t('gr55.document.saveAs')}</h2>
            <p className="hint">
              {editor.patchSource?.kind === 'slot'
                ? t('gr55.document.saveHint', t('gr55.workspace.savedSlot'))
                : t('gr55.document.saveNoSlot')}
            </p>
            <select
              onChange={(event) => {
                const chosen = slots.find(
                  (slot) => String(slot.userPatchNumber) === event.target.value,
                );
                if (chosen) {
                  setChooseOpen(false);
                  setWriteTo(chosen);
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>
                {t('library.choosing')}
              </option>
              {slots.map((slot) => (
                <option key={slot.userPatchNumber} value={slot.userPatchNumber}>
                  {slot.label}
                </option>
              ))}
            </select>
            <div className="actions">
              <button type="button" onClick={() => setChooseOpen(false)}>
                {t('gr55.dismiss')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
