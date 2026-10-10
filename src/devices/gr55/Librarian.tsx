import { useMemo, useRef, useState } from 'react';
import { en } from '../../copy/en';
import { RolandGR55SysExConfig } from '../../protocol/RolandDevices';
import { confirmDiscard } from './dirtyGuard';
import type { Gr55Editor } from './editor';
import { SyxError } from './syx';

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

export function Librarian({
  editor,
  onError,
}: {
  editor: Gr55Editor;
  onError: (error: unknown) => void;
}) {
  const slots = useMemo(() => userSlots(editor), [editor]);
  const [names, setNames] = useState<ReadonlyMap<number, string>>(new Map());
  const [busy, setBusy] = useState(false);
  const [namesProgress, setNamesProgress] = useState<number>();
  const [message, setMessage] = useState<string>();
  const stopReadingNames = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const setName = (userPatchNumber: number, name: string) =>
    setNames((current) => new Map(current).set(userPatchNumber, name));

  const run = async (action: () => Promise<string | void>) => {
    setBusy(true);
    setMessage(undefined);
    try {
      setMessage((await action()) ?? undefined);
    } catch (error) {
      if (error instanceof SyxError) {
        setMessage(en.librarian.problems[error.problem]);
      } else {
        onError(error);
      }
    } finally {
      setBusy(false);
    }
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
      stopReadingNames.current = false;
      try {
        for (let i = 0; i < slots.length && !stopReadingNames.current; i++) {
          setNamesProgress(i);
          const { userPatchNumber } = slots[i];
          setName(userPatchNumber, await editor.readUserPatchName(userPatchNumber));
        }
      } finally {
        setNamesProgress(undefined);
      }
    });

  const writeTo = (slot: Slot) => {
    const name = editor.patchName || en.gr55.unnamed;
    const question = en.librarian.confirmWrite(slot.label, names.get(slot.userPatchNumber), name);
    if (!window.confirm(question)) {
      return;
    }
    void run(async () => {
      await editor.writeToUserSlot(slot.userPatchNumber);
      setName(slot.userPatchNumber, editor.patchName);
      return en.librarian.written(slot.label);
    });
  };

  return (
    <>
      <section className="section">
        <h2>{en.librarian.fileTitle}</h2>
        <p className="hint">{en.librarian.fileIntro}</p>
        <div className="actions">
          <button
            type="button"
            onClick={() => download(editor.exportSyx(), fileNameFor(editor.patchName))}
          >
            {en.librarian.download}
          </button>
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
        <h2>{en.librarian.slotsTitle}</h2>
        <p className="hint">{en.librarian.slotsIntro}</p>
        <div className="actions">
          {namesProgress == null ? (
            <button type="button" disabled={busy} onClick={() => void readNames()}>
              {en.librarian.readNames}
            </button>
          ) : (
            <>
              <span>{en.librarian.readingNames(namesProgress, slots.length)}</span>
              <button type="button" onClick={() => (stopReadingNames.current = true)}>
                {en.librarian.stop}
              </button>
            </>
          )}
        </div>
        {message && (
          <p className="status" role="status">
            {message}
          </p>
        )}
        <ol className="slots">
          {slots.map((slot) => (
            <li key={slot.userPatchNumber}>
              <span className="slot-label">{slot.label}</span>
              <span className="slot-name">
                {names.get(slot.userPatchNumber) ?? en.librarian.notRead}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (confirmDiscard(editor)) {
                    void run(() => editor.selectPatch(slot.bankMsb, slot.programChange));
                  }
                }}
              >
                {en.librarian.load}
              </button>
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={() => writeTo(slot)}
              >
                {en.librarian.write}
              </button>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
