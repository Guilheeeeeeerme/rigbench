import { useMemo, useState, useSyncExternalStore } from 'react';
import { useT } from '../../copy';
import type { CopyKey } from '../../copy';
import type { Gr55Editor } from './editor';
import { FieldControl } from './FieldControl';
import { buildPages, isField, memberOf, type PageId, PAGE_IDS } from './pages';
import { asSnapshotSource, snapshotFieldHost } from './snapshotHost';
import { runAppMutation } from './sessionAuthority';
import { slotsOfMode } from './slots';
import { useSystem } from './SystemParts';

const PAGE_COPY: Record<PageId, CopyKey> = {
  patch: 'gr55.pages.patch',
  pcm1: 'gr55.pages.pcm1',
  pcm2: 'gr55.pages.pcm2',
  modeling: 'gr55.pages.modeling',
  'normal-pickup': 'gr55.pages.normalPickup',
  amp: 'gr55.pages.amp',
  mod: 'gr55.pages.mod',
  mfx: 'gr55.pages.mfx',
  delay: 'gr55.pages.delay',
  chorus: 'gr55.pages.chorus',
  reverb: 'gr55.pages.reverb',
  eq: 'gr55.pages.eq',
  assigns: 'gr55.pages.assigns',
  'pedal-gk': 'gr55.pages.pedalGk',
  master: 'gr55.pages.master',
};

/**
 * Current patch: all patch-level parameters. Writes DT1 then full snapshot.
 */
export function PatchPage({
  editor,
  onError,
}: {
  editor: Gr55Editor;
  onError: (error: unknown) => void;
}) {
  const t = useT();
  const system = useSystem();
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  const patchName = useSyncExternalStore(editor.subscribe, () => editor.patchName);
  const patchSource = useSyncExternalStore(editor.subscribe, () => editor.patchSource);
  const pages = useMemo(() => buildPages(gkMode, t), [gkMode, t]);
  const [pageId, setPageId] = useState<PageId>('patch');
  const source = useMemo(() => asSnapshotSource({ editor, system }), [editor, system]);
  const host = useMemo(
    () => snapshotFieldHost(editor, source, onError),
    [editor, source, onError],
  );

  const page = pages.find((candidate) => candidate.id === pageId) ?? pages[0];
  const slots = slotsOfMode(gkMode);
  const currentSlot =
    patchSource?.kind === 'slot'
      ? slots.find((slot) => slot.userPatchNumber === patchSource.userPatchNumber)
      : undefined;

  const selectSlot = (userPatchNumber: number) => {
    const msb = Math.floor(userPatchNumber / 128);
    const pc = userPatchNumber % 128;
    void runAppMutation(() => editor.selectPatch(msb, pc), source).catch(onError);
  };

  return (
    <div className="app-page patch-page">
      <header className="app-page-header">
        <div>
          <h1>{t('gr55.navPatch')}</h1>
          <p className="hint">
            <strong>{patchName || t('gr55.unnamed')}</strong>
            {currentSlot ? ` · ${currentSlot.label}` : ''}
            {' · '}
            {t(`gr55.mode.${gkMode}`)}
          </p>
        </div>
        <label className="patch-slot-picker">
          {t('gr55.patchSlot')}
          <select
            value={currentSlot?.userPatchNumber ?? ''}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isNaN(value)) {
                selectSlot(value);
              }
            }}
          >
            <option value="">{t('gr55.patchSlotUnknown')}</option>
            {slots.map((slot) => (
              <option key={slot.userPatchNumber} value={slot.userPatchNumber}>
                {slot.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <nav className="patch-page-tabs" aria-label={t('gr55.navPatch')}>
        {PAGE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={pageId === id ? 'active' : undefined}
            onClick={() => setPageId(id)}
          >
            {t(PAGE_COPY[id])}
          </button>
        ))}
      </nav>

      {page.sections.map((section) => (
        <section key={section.slug} className="patch-section">
          <h2>{section.title}</h2>
          <div className="fields">
            {section.keys.map((key) => {
              const atom = memberOf(section.struct, key);
              if (!isField(atom)) {
                return null;
              }
              return <FieldControl key={key} editor={host} field={atom} />;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
