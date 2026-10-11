import { useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../copy';
import { confirmDiscard } from './dirtyGuard';
import { downloadText } from './download';
import type { Gr55Editor } from './editor';
import { stageHref } from './routes';
import {
  SetlistFileError,
  changesPatch,
  exportSetlist,
  importSetlist,
  loadSetlist,
  moveSong,
  newSong,
  patchChangeCount,
  saveSetlist,
} from './setlist';
import type { Setlist, Song } from './setlist';
import { slotsOfMode } from './slots';
import { readerOf, stageView } from './stageModel';
import { useSlotNames, useSync } from './sync/SyncBadge';
import { TopNav } from './TopNav';

function fileNameFor(name: string): string {
  const safe = name.replace(/[^\w .-]/g, '_').trim();
  return `${safe || 'setlist'}.json`;
}

/** The names a musician gives the cuts of one song's patch, read from the synced slot. */
function CutNames({ song, onChange }: { song: Song; onChange: (song: Song) => void }) {
  const t = useT();
  const sync = useSync();
  useSyncExternalStore(sync.subscribe, sync.slotsSnapshot);
  const record = sync.slot(song.userPatchNumber);
  if (!record) {
    return <p className="hint">{t('setlist.cutsNotRead')}</p>;
  }
  const { cuts } = stageView(readerOf(record.bytes), song.mode);
  return (
    <div className="setlist-cuts">
      <h3>{t('setlist.cutsTitle')}</h3>
      <p className="hint">{t('setlist.cutsIntro')}</p>
      {cuts.length === 0 ? (
        <p className="hint">{t('stage.noCuts')}</p>
      ) : (
        <ul>
          {cuts.map((cut) => (
            <li key={cut.key}>
              <label>
                <span>{t('stage.cut', cut.source, cut.target)}</span>
                <input
                  type="text"
                  value={song.cuts[cut.key] ?? ''}
                  placeholder={t('setlist.cutPlaceholder')}
                  onChange={(event) =>
                    onChange({ ...song, cuts: { ...song.cuts, [cut.key]: event.target.value } })
                  }
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The setlist: the songs of the show, each on the slot that plays it. Everything here is
 * kept on this computer; the only thing sent to the pedal is "play this slot" on Test.
 */
export function SetlistScreen({
  editor,
  onError,
}: {
  editor: Gr55Editor;
  onError: (error: unknown) => void;
}) {
  const t = useT();
  const sync = useSync();
  const cachedName = useSlotNames(sync);
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  const slots = slotsOfMode(gkMode);
  const [setlist, setSetlist] = useState<Setlist>(() => loadSetlist());
  const [title, setTitle] = useState('');
  const [slotNumber, setSlotNumber] = useState(slots[0]?.userPatchNumber ?? 0);
  const [editing, setEditing] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const dragged = useRef<number | undefined>(undefined);
  const fileInput = useRef<HTMLInputElement>(null);
  const { songs } = setlist;

  const keep = (next: Setlist) => {
    setSetlist(next);
    saveSetlist(next);
  };
  const keepSongs = (next: Song[]) => keep({ ...setlist, songs: next });
  const slotName = (userPatchNumber: number) => cachedName(userPatchNumber) || t('gr55.unnamed');
  const slotLabel = (song: Song) =>
    slotsOfMode(song.mode).find((slot) => slot.userPatchNumber === song.userPatchNumber)?.label ??
    '';

  const add = () => {
    const name = title.trim();
    if (!name) {
      return;
    }
    keepSongs([...songs, newSong(name, gkMode, slotNumber)]);
    setTitle('');
  };

  const test = (song: Song) => {
    const slot = slots.find((candidate) => candidate.userPatchNumber === song.userPatchNumber);
    if (!slot || song.mode !== gkMode || !confirmDiscard(editor)) {
      return;
    }
    setBusy(true);
    editor
      .selectPatch(slot.bankMsb, slot.programChange)
      .then(() => setMessage(t('setlist.tested', song.title)))
      .catch(onError)
      .finally(() => setBusy(false));
  };

  const openFile = async (file: File) => {
    try {
      const next = importSetlist(await file.text());
      if (songs.length > 0 && !window.confirm(t('setlist.confirmImport', next.songs.length))) {
        return;
      }
      keep(next);
      setMessage(undefined);
    } catch (error) {
      if (error instanceof SetlistFileError) {
        setMessage(t('setlist.importFailed'));
      } else {
        onError(error);
      }
    }
  };

  return (
    <div className="device setlist">
      <TopNav current="stage" />
      <p>
        <Link to={stageHref}>← {t('setlist.back')}</Link>
      </p>
      <h1>{t('setlist.title')}</h1>
      <p className="hint">{t('setlist.intro')}</p>

      <label className="wizard-field">
        {t('setlist.name')}
        <input
          type="text"
          value={setlist.name}
          placeholder={t('setlist.namePlaceholder')}
          onChange={(event) => keep({ ...setlist, name: event.target.value })}
        />
      </label>

      <section className="section">
        {songs.length === 0 ? (
          <p className="hint">{t('setlist.empty')}</p>
        ) : (
          <>
            <p className={patchChangeCount(songs) > 0 ? 'notice' : 'status'}>
              {t('setlist.gaps', patchChangeCount(songs))}
            </p>
            <p className="hint">
              {t('setlist.gapsHint')} {t('setlist.dragHint')}
            </p>
            <ol className="setlist-songs">
              {songs.map((song, index) => (
                <li
                  key={song.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragged.current !== undefined) {
                      keepSongs(moveSong(songs, dragged.current, index));
                    }
                    dragged.current = undefined;
                  }}
                >
                  {changesPatch(songs[index - 1], song) && (
                    <span className="stage-gap-mark">{t('setlist.gapHere')}</span>
                  )}
                  <div className="setlist-row">
                    <span
                      className="setlist-handle"
                      draggable
                      onDragStart={() => (dragged.current = index)}
                      title={t('setlist.dragHint')}
                    >
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      aria-label={t('setlist.songTitle')}
                      value={song.title}
                      onChange={(event) =>
                        keepSongs(
                          songs.map((other) =>
                            other.id === song.id ? { ...song, title: event.target.value } : other,
                          ),
                        )
                      }
                    />
                    {song.mode === gkMode ? (
                      <select
                        aria-label={t('setlist.slot')}
                        value={song.userPatchNumber}
                        onChange={(event) =>
                          keepSongs(
                            songs.map((other) =>
                              other.id === song.id
                                ? { ...song, userPatchNumber: Number(event.target.value) }
                                : other,
                            ),
                          )
                        }
                      >
                        {slots.map((slot) => (
                          <option key={slot.userPatchNumber} value={slot.userPatchNumber}>
                            {t('setlist.slotOption', slot.label, slotName(slot.userPatchNumber))}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="hint">
                        {slotLabel(song)} · {t('stage.otherMode', t(`gr55.mode.${song.mode}`))}
                      </span>
                    )}
                    <span className="setlist-actions">
                      <button
                        type="button"
                        disabled={busy || song.mode !== gkMode}
                        onClick={() => test(song)}
                      >
                        ▶ {t('setlist.test')}
                      </button>
                      <button
                        type="button"
                        aria-expanded={editing === song.id}
                        onClick={() => setEditing(editing === song.id ? undefined : song.id)}
                      >
                        {editing === song.id ? t('setlist.done') : t('setlist.edit')}
                      </button>
                      <button
                        type="button"
                        aria-label={t('setlist.moveUp')}
                        title={t('setlist.moveUp')}
                        disabled={index === 0}
                        onClick={() => keepSongs(moveSong(songs, index, index - 1))}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={t('setlist.moveDown')}
                        title={t('setlist.moveDown')}
                        disabled={index === songs.length - 1}
                        onClick={() => keepSongs(moveSong(songs, index, index + 1))}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(t('setlist.confirmRemove', song.title))) {
                            keepSongs(songs.filter((other) => other.id !== song.id));
                          }
                        }}
                      >
                        {t('setlist.remove')}
                      </button>
                    </span>
                  </div>
                  {editing === song.id && (
                    <CutNames
                      song={song}
                      onChange={(next) =>
                        keepSongs(songs.map((other) => (other.id === next.id ? next : other)))
                      }
                    />
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
        {message && (
          <p className="status" role="status">
            {message}
          </p>
        )}
      </section>

      <section className="section">
        <h2>{t('setlist.add')}</h2>
        <form
          className="setlist-add"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <label>
            {t('setlist.songTitle')}
            <input
              type="text"
              value={title}
              placeholder={t('setlist.songTitlePlaceholder')}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            {t('setlist.slot')}
            <select
              value={slotNumber}
              onChange={(event) => setSlotNumber(Number(event.target.value))}
            >
              {slots.map((slot) => (
                <option key={slot.userPatchNumber} value={slot.userPatchNumber}>
                  {t('setlist.slotOption', slot.label, slotName(slot.userPatchNumber))}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="primary" disabled={title.trim() === ''}>
            {t('setlist.add')}
          </button>
        </form>
      </section>

      <section className="section">
        <div className="actions">
          <button
            type="button"
            disabled={songs.length === 0}
            onClick={() => downloadText(exportSetlist(setlist), fileNameFor(setlist.name))}
          >
            {t('setlist.exportFile')}
          </button>
          <button type="button" onClick={() => fileInput.current?.click()}>
            {t('setlist.importFile')}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) {
                void openFile(file);
              }
            }}
          />
        </div>
      </section>
    </div>
  );
}
