import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useParams } from 'react-router-dom';
import { en } from '../../copy/en';
import { RolandGR55SysExConfig } from '../../protocol/RolandDevices';
import { confirmDiscard } from './dirtyGuard';
import type { Gr55Editor, SlotDiffEntry } from './editor';
import { editorHref } from './pages';
import { SyxError, decodeSlotBackupSyx, encodeSlotBackupSyx } from './syx';
import type { SlotImage } from './syx';

interface Slot {
  label: string;
  userPatchNumber: number;
  bankMsb: number;
  programChange: number;
}

function userSlots(editor: Gr55Editor): Slot[] {
  const maps = RolandGR55SysExConfig.gr55!;
  const { patchList } = editor.gkMode === 'BASS' ? maps.patchMapBassMode : maps.patchMapGuitarMode;
  return patchList.flatMap((patch) =>
    patch.userPatch
      ? [
          {
            label: patch.patchNumberLabel,
            userPatchNumber: patch.userPatch.patchNumber,
            bankMsb: patch.bankMSB,
            programChange: patch.pc,
          },
        ]
      : [],
  );
}

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

function fileNameFor(patchName: string): string {
  const safe = patchName.replace(/[^\w .-]/g, '_').trim();
  return `${safe || 'patch'}.syx`;
}

const DIFF_PREVIEW_LIMIT = 12;

type Guard = { get(): boolean };

/**
 * Write the working copy into a slot: see the exact diff, then confirm. While the
 * pedal writes it goes deaf for a few seconds, so the modal repeats the warning.
 */
function WriteFlow({
  editor,
  onError,
  slot,
  close,
}: {
  editor: Gr55Editor;
  onError: (error: unknown) => void;
  slot: Slot;
  close: (outcome?: string) => void;
}) {
  const [diff, setDiff] = useState<SlotDiffEntry[]>();
  const [busy, setBusy] = useState(false);

  const showDiff = async () => {
    setDiff([]);
    try {
      setDiff(await editor.diffUserSlot(slot.userPatchNumber));
    } catch (reason) {
      onError(reason);
      close();
    }
  };

  const write = async () => {
    setBusy(true);
    try {
      await editor.writeToUserSlot(slot.userPatchNumber);
      close(en.librarian.written(slot.label));
    } catch (reason) {
      onError(reason);
      close();
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => close()}>
      <div
        className="modal"
        role="dialog"
        aria-labelledby="write-flow-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="write-flow-title">{en.library.writeFlowTitle(slot.label)}</h2>
        <p className="hint">{en.library.writeFlowIntro}</p>
        {diff === undefined ? (
          <div className="actions">
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() => void showDiff()}
            >
              {en.library.readDiff}
            </button>
            <button type="button" disabled={busy} onClick={() => close()}>
              {en.gr55.dismiss}
            </button>
          </div>
        ) : (
          <>
            <h3>{en.library.diffTitle}</h3>
            {diff.length === 0 ? (
              <p className="hint">{en.library.diffEmpty}</p>
            ) : (
              <ul className="diff-list">
                {diff.slice(0, DIFF_PREVIEW_LIMIT).map((entry, index) => (
                  <li key={index}>
                    <span className="diff-field">{entry.description}</span>
                    <span className="diff-values">
                      <s>{entry.slot}</s> → {entry.current}
                    </span>
                  </li>
                ))}
                {diff.length > DIFF_PREVIEW_LIMIT && (
                  <li className="diff-more">+{diff.length - DIFF_PREVIEW_LIMIT}</li>
                )}
              </ul>
            )}
            {busy && (
              <p className="status" role="status">
                {en.library.writing}
              </p>
            )}
            <div className="actions">
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={() => void write()}
              >
                {en.library.diffConfirm}
              </button>
              <button type="button" disabled={busy} onClick={() => close()}>
                {en.gr55.dismiss}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** The home screen: one card per slot in the pedal, the working copy pinned on top. */
export function Library({
  editor,
  onError,
}: {
  editor: Gr55Editor;
  onError: (error: unknown) => void;
}) {
  const { slot: focusLabel } = useParams<{ slot?: string }>();
  const slots = useMemo(() => userSlots(editor), [editor]);
  const [names, setNames] = useState<ReadonlyMap<number, string>>(new Map());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [writeFlow, setWriteFlow] = useState<Slot>();
  const stopCurrent = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const restoreInput = useRef<HTMLInputElement>(null);
  // Live count of unsaved changes in the working copy card.
  const changeCount = useSyncExternalStore(editor.subscribe, () => editor.changeCount);

  // A deep link may focus one slot; bring it into view.
  useEffect(() => {
    if (!focusLabel) {
      return;
    }
    const index = slots.findIndex((slot) => slot.label === focusLabel);
    if (index >= 0) {
      document
        .getElementById(`slot-${slots[index].userPatchNumber}`)
        ?.scrollIntoView({ block: 'center' });
    }
  }, [focusLabel, slots]);

  const setName = (userPatchNumber: number, name: string) =>
    setNames((current) => new Map(current).set(userPatchNumber, name));

  const run = async (action: (guard: Guard) => Promise<string | void>) => {
    setBusy(true);
    setMessage(undefined);
    stopCurrent.current = false;
    try {
      setMessage((await action({ get: () => stopCurrent.current })) ?? undefined);
    } catch (error) {
      if (error instanceof SyxError) {
        setMessage(
          error.problem === 'no-patch-data'
            ? en.library.fileIsEmpty
            : en.librarian.problems[error.problem],
        );
      } else {
        onError(error);
      }
    } finally {
      setProgress(undefined);
      setBusy(false);
    }
  };

  const testSlot = (slot: Slot) => {
    if (!confirmDiscard(editor)) {
      return;
    }
    void run(async () => {
      await editor.selectPatch(slot.bankMsb, slot.programChange);
      setName(slot.userPatchNumber, editor.patchName);
      return en.library.tested(slot.label);
    });
  };

  const openFile = (file: File) =>
    run(async () => {
      if (!confirmDiscard(editor)) {
        return;
      }
      await editor.importSyx(new Uint8Array(await file.arrayBuffer()));
      return en.librarian.opened(file.name);
    });

  const readNames = () =>
    run(async () => {
      for (let index = 0; index < slots.length; index++) {
        const { userPatchNumber } = slots[index];
        setProgress(en.library.reading(index, slots.length));
        setName(userPatchNumber, await editor.readUserPatchName(userPatchNumber));
      }
    });

  /** Reads every slot and saves one .syx file that holds them all. */
  const backupAll = (guard: Guard) =>
    run(async () => {
      const images: SlotImage[] = [];
      for (let index = 0; index < slots.length; index++) {
        const { userPatchNumber } = slots[index];
        setProgress(en.library.backupProgress(index, slots.length));
        images.push({
          userPatchNumber,
          bytes: await editor.readUserPatch(userPatchNumber),
        });
        if (guard.get()) {
          break;
        }
      }
      if (images.length === 0) {
        return;
      }
      const file = `${new Date().toISOString().slice(0, 10)}_gr55-slots.syx`;
      download(encodeSlotBackupSyx(images), file);
      return en.library.backupDone(file);
    });

  const restore = (file: File) =>
    run(async () => {
      const images = decodeSlotBackupSyx(new Uint8Array(await file.arrayBuffer()));
      for (let index = 0; index < images.length; index++) {
        const image = images[index];
        setProgress(en.library.backupRestoring(index, images.length));
        await editor.restoreUserPatch(image.userPatchNumber, image.bytes);
      }
      return en.library.backupRestored;
    });

  return (
    <>
      <div className="library-head">
        <h1>{en.library.title}</h1>
        <p className="hint">{en.library.intro}</p>
      </div>

      <section className="section working-copy-card">
        <h2>{en.library.workingCopy}</h2>
        <div className="card-name">
          <strong>{editor.patchName || en.gr55.unnamed}</strong>
          <span className="scope chip-amber">
            <span className="dot" aria-hidden="true" />
            {en.gr55.workspace.workingCopy}
          </span>
          <span className="changes">
            {changeCount > 0 ? en.library.changes(changeCount) : en.gr55.workspace.noUnsavedChanges}
          </span>
        </div>
        <div className="actions">
          <Link type="button" className="primary" to={editorHref('patch', 'common')}>
            {en.library.openInEditor}
          </Link>
          <button
            type="button"
            onClick={() => download(editor.exportSyx(), fileNameFor(editor.patchName))}
          >
            {en.librarian.download}
          </button>
        </div>
      </section>

      <section className="section">
        <h2>{en.librarian.fileTitle}</h2>
        <p className="hint">{en.librarian.fileIntro}</p>
        <div className="actions">
          <button type="button" disabled={busy} onClick={() => fileInput.current?.click()}>
            {en.librarian.open}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".syx,application/octet-stream"
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

      <section className="section">
        <h2>{en.library.backupTitle}</h2>
        <p className="hint">{en.library.backupIntro}</p>
        <div className="actions">
          <button type="button" disabled={busy} onClick={() => void run(backupAll)}>
            {en.library.backup}
          </button>
          <button type="button" disabled={busy} onClick={() => restoreInput.current?.click()}>
            {en.library.backupWrite}
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
                void restore(file);
              }
            }}
          />
        </div>
      </section>

      <section className="section">
        <h2>{en.librarian.slotsTitle}</h2>
        <div className="actions">
          {progress ? (
            <>
              <span role="status">{progress}</span>
              <button type="button" onClick={() => (stopCurrent.current = true)}>
                {en.librarian.stop}
              </button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => void run(readNames)}>
              {en.library.readAllNames}
            </button>
          )}
        </div>
        {message && (
          <p className="status" role="status">
            {message}
          </p>
        )}
        <ol className="slots cards">
          {slots.map((slot) => (
            <li
              key={slot.userPatchNumber}
              id={`slot-${slot.userPatchNumber}`}
              className={slot.label === focusLabel ? 'slot-card focus' : 'slot-card'}
            >
              <span className="slot-label">{slot.label}</span>
              <span className="slot-name">
                {names.get(slot.userPatchNumber) ?? en.librarian.notRead}
              </span>
              <span className="slot-actions">
                <button type="button" disabled={busy} onClick={() => testSlot(slot)}>
                  ▶ {en.library.test}
                </button>
                <button type="button" disabled={busy} onClick={() => setWriteFlow(slot)}>
                  {en.library.writeTo}
                </button>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {writeFlow && (
        <WriteFlow
          editor={editor}
          onError={onError}
          slot={writeFlow}
          close={(outcome) => {
            if (outcome) {
              setMessage(outcome);
            }
            setWriteFlow(undefined);
          }}
        />
      )}
    </>
  );
}
