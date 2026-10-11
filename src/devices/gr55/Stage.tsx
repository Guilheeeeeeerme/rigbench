import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { useEnumLabel, useT } from '../../copy';
import type { BooleanField, FieldReference, FieldType } from '../../protocol/RolandAddressMap';
import { confirmDiscard } from './dirtyGuard';
import type { Gr55Editor } from './editor';
import { editorHref } from './pages';
import type { PageId } from './pages';
import { TEMPORARY_PATCH } from './patchLayout';
import { deviceHref, setlistHref, setupHref } from './routes';
import { changesPatch, loadSetlist } from './setlist';
import type { Song } from './setlist';
import { loadSetup, skippedSteps } from './setupState';
import { slotsOfMode } from './slots';
import { effectChoice } from './stageInfo';
import { PEDAL_SECTIONS, stageView } from './stageModel';
import type { PatchReader, PedalId } from './stageModel';
import { useSlotNames, useSync } from './sync/SyncBadge';
import { useSystem, useSystemVersion } from './SystemParts';
import { SYSTEM } from './systemMap';
import { TopNav } from './TopNav';

const patch = TEMPORARY_PATCH;

/** Every power switch of the chain, in the order the sound runs through it. */
const POWER_FIELDS: {
  block: 'amp' | 'mod' | 'mfx' | 'eq' | 'chorus' | 'delay' | 'reverb';
  field: FieldReference<BooleanField>;
}[] = [
  { block: 'amp', field: patch.ampModNs.ampSwitch },
  { block: 'mod', field: patch.ampModNs.modSwitch },
  { block: 'mfx', field: patch.mfx.mfxSwitch },
  { block: 'eq', field: patch.sendsAndEq.eqSwitch },
  { block: 'chorus', field: patch.sendsAndEq.chorusSwitch },
  { block: 'delay', field: patch.sendsAndEq.delaySwitch },
  { block: 'reverb', field: patch.sendsAndEq.reverbSwitch },
];

/** The pedal-wide function of each pedal: the first of the three layers. */
const SYSTEM_PEDAL_FUNCTIONS: Record<PedalId, FieldReference> = {
  ctl: SYSTEM.pedals.ctlFunction,
  exp: SYSTEM.pedals.expOffFunction,
  expOn: SYSTEM.pedals.expOnFunction,
  expSw: SYSTEM.pedals.expSwFunction,
  gkVol: SYSTEM.pedals.gkVolFunction,
  gkS1: SYSTEM.pedals.gkS1Function,
  gkS2: SYSTEM.pedals.gkS2Function,
};

// The pedal-wide value that hands a pedal over to the patch.
const LEFT_TO_PATCH = 'PATCH SETTING';

function typing(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName);
}

/**
 * The stage: the root of a pedal that is set up. The setlist on one side; on the other,
 * the song sounding now, what each pedal does in it, and the cuts inside its patch.
 * Nothing here saves to the pedal — the only thing it sends is which patch to play.
 */
export function Stage({
  editor,
  onError,
}: {
  editor: Gr55Editor;
  onError: (error: unknown) => void;
}) {
  const t = useT();
  const enumLabel = useEnumLabel();
  const sync = useSync();
  const system = useSystem();
  useSystemVersion(system);
  const cachedName = useSlotNames(sync);
  // Follows the pedal: a patch change or a pedal step re-renders the whole screen.
  useSyncExternalStore(editor.subscribe, editor.patchSnapshot);
  const changeCount = useSyncExternalStore(editor.subscribe, () => editor.changeCount);
  const gkMode = editor.gkMode;
  const [setlist] = useState(() => loadSetlist());
  const [skipped] = useState(() => skippedSteps(loadSetup()));
  const [rigName] = useState(() => loadSetup().rigName);
  const [switching, setSwitching] = useState(false);
  const songs = setlist.songs;
  const soundingSlot =
    editor.patchSource?.kind === 'slot' ? editor.patchSource.userPatchNumber : undefined;
  const [position, setPosition] = useState(() =>
    songs.findIndex((song) => song.mode === gkMode && song.userPatchNumber === soundingSlot),
  );

  // The pedal-wide pedal rules are read once, behind the screen; the Stage works without.
  useEffect(() => {
    if (!system.loaded) {
      system.load().catch(() => {});
    }
  }, [system]);

  const slots = slotsOfMode(gkMode);
  const slotOf = (song: Song) =>
    slots.find((slot) => slot.userPatchNumber === song.userPatchNumber);
  const current = position >= 0 ? songs[position] : undefined;
  const onSetlist =
    current !== undefined && current.mode === gkMode && current.userPatchNumber === soundingSlot;
  const next = position + 1 < songs.length ? songs[position + 1] : undefined;

  const go = useCallback(
    (index: number) => {
      const song = songs[index];
      if (!song || switching || song.mode !== editor.gkMode) {
        return;
      }
      const sounding =
        editor.patchSource?.kind === 'slot' ? editor.patchSource.userPatchNumber : undefined;
      if (song.userPatchNumber === sounding) {
        // Same patch as the one sounding: only the place in the setlist moves. No gap.
        setPosition(index);
        return;
      }
      if (!confirmDiscard(editor)) {
        return;
      }
      const slot = slotsOfMode(editor.gkMode).find(
        (candidate) => candidate.userPatchNumber === song.userPatchNumber,
      );
      if (!slot) {
        return;
      }
      setSwitching(true);
      editor
        .selectPatch(slot.bankMsb, slot.programChange)
        .then(() => setPosition(index))
        .catch(onError)
        .finally(() => setSwitching(false));
    },
    [songs, switching, editor, onError],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || typing(event.target)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'n' || key === 'arrowright' || key === 'pagedown') {
        event.preventDefault();
        go(position + 1);
      } else if (key === 'p' || key === 'arrowleft' || key === 'pageup') {
        event.preventDefault();
        go(position - 1);
      } else if (/^[1-9]$/.test(key)) {
        event.preventDefault();
        go(Number(key) - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, position]);

  const read: PatchReader = (field) => editor.read(field);
  const view = stageView(read, gkMode);
  const cutNames = current?.cuts ?? {};
  const scene = view.cuts
    .filter((cut) => cut.active && cutNames[cut.key])
    .map((cut) => cutNames[cut.key]);

  const systemFunction = (id: PedalId): string | undefined => {
    if (!system.loaded) {
      return undefined;
    }
    const value = system.readApplied(
      SYSTEM_PEDAL_FUNCTIONS[id] as FieldReference<FieldType<string>>,
    );
    return value.ok && value.value !== LEFT_TO_PATCH ? String(value.value) : undefined;
  };

  const switchOn = (field: FieldReference<BooleanField>): boolean | undefined => {
    const result = editor.read(field);
    return result.ok ? result.value !== field.definition.type.invertedForDisplay : undefined;
  };

  return (
    <main className="stage">
      <header className="stage-head">
        <TopNav current="stage" />
        {rigName && <p className="stage-rig">{rigName}</p>}
      </header>

      {skipped.length > 0 && (
        <p className="notice" role="note">
          ⚠️ {t('wizard.summaryWarn', skipped.map((step) => t(`wizard.steps.${step}`)).join(', '))}{' '}
          <Link to={setupHref}>{t('wizard.reopen')}</Link>
        </p>
      )}
      {switching && (
        <p className="stage-gap" role="alert">
          {t('stage.switching')}
        </p>
      )}
      {changeCount > 0 && (
        <p className="notice stage-notice" role="alert">
          {t('stage.playingCopy')}
        </p>
      )}

      <div className="stage-grid">
        <section className="stage-setlist" aria-label={t('setlist.title')}>
          <h2>
            {setlist.name || t('setlist.title')}{' '}
            <Link className="stage-edit" to={setlistHref}>
              {t('stage.manage')}
            </Link>
          </h2>
          {songs.length === 0 ? (
            <>
              <p>
                <strong>{t('stage.emptyTitle')}</strong>
              </p>
              <p className="hint">{t('stage.emptyIntro')}</p>
            </>
          ) : (
            <>
              <ol className="stage-songs">
                {songs.map((song, index) => {
                  const slot = slotOf(song);
                  const otherMode = song.mode !== gkMode;
                  return (
                    <li key={song.id}>
                      {changesPatch(songs[index - 1], song) && (
                        <span className="stage-gap-mark" title={t('stage.nextGap')}>
                          {t('setlist.gapHere')}
                        </span>
                      )}
                      <button
                        type="button"
                        className="stage-song"
                        aria-current={index === position ? 'true' : undefined}
                        disabled={switching || otherMode}
                        onClick={() => go(index)}
                      >
                        <span className="stage-song-number">{index + 1}</span>
                        <span className="stage-song-title">{song.title}</span>
                        <span className="stage-song-slot">
                          {otherMode
                            ? t('stage.otherMode', t(`gr55.mode.${song.mode}`))
                            : `${slot?.label ?? ''} ${cachedName(song.userPatchNumber) ?? ''}`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <p className="hint">{t('stage.keys')}</p>
            </>
          )}
        </section>

        <div className="stage-now">
          <section className="stage-block">
            <h2>{t('stage.now')}</h2>
            {current && onSetlist && (
              <p className="stage-count">{t('stage.songOf', position + 1, songs.length)}</p>
            )}
            <p className="stage-patch">
              {current && onSetlist ? current.title : editor.patchName || t('gr55.unnamed')}
            </p>
            {current && onSetlist && (
              <p className="stage-patch-name">
                {slotOf(current)?.label} · {editor.patchName || t('gr55.unnamed')}
              </p>
            )}
            {songs.length > 0 && !onSetlist && <p className="notice">{t('stage.offSetlist')}</p>}
            {scene.length > 0 && (
              <p className="stage-scene">{t('stage.sceneNow', scene.join(' · '))}</p>
            )}
            {songs.length > 0 && (
              <div className="stage-next">
                <button
                  type="button"
                  disabled={switching || position <= 0}
                  onClick={() => go(position - 1)}
                >
                  ← {t('stage.previous')}
                </button>
                {next ? (
                  <button
                    type="button"
                    className="primary"
                    disabled={switching || next.mode !== gkMode}
                    onClick={() => go(position + 1)}
                  >
                    {t('stage.next', next.title)} →
                  </button>
                ) : (
                  <span className="hint">{t('stage.lastSong')}</span>
                )}
                {next &&
                  (next.userPatchNumber !== soundingSlot ? (
                    <span className="stage-gap-warning">{t('stage.nextGap')}</span>
                  ) : (
                    <span className="hint">{t('stage.nextNoGap')}</span>
                  ))}
              </div>
            )}
          </section>

          <section className="stage-block">
            <h2>{t('stage.pedals')}</h2>
            <ul className="stage-pedals">
              {view.pedals.map((pedal) => {
                const rule = systemFunction(pedal.id);
                return (
                  <li key={pedal.id} className={pedal.on ? 'on' : undefined}>
                    <span className="stage-pedal-name">{t(`stage.pedalNames.${pedal.id}`)}</span>
                    <span className="stage-pedal-does">
                      {enumLabel('pedalFunction', rule ?? pedal.function ?? '?')}
                      {pedal.on !== undefined && (
                        <strong>{pedal.on ? t('stage.on') : t('stage.off')}</strong>
                      )}
                    </span>
                    {rule ? (
                      <Link
                        className="scope chip-blue"
                        to={deviceHref}
                        title={t('stage.systemRule')}
                      >
                        <span className="dot" aria-hidden="true" />
                        {t('gr55.workspace.pedal')}
                      </Link>
                    ) : (
                      <Link
                        className="stage-edit"
                        to={editorHref('pedal-gk', PEDAL_SECTIONS[pedal.id])}
                      >
                        {t('stage.edit')}
                      </Link>
                    )}
                  </li>
                );
              })}
              <li>
                <span className="stage-pedal-name">{t('stage.pedalNames.fs')}</span>
                <span className="stage-pedal-does">{t('stage.fixed')}</span>
              </li>
            </ul>
          </section>

          <section className="stage-block">
            <h2>{t('stage.cuts')}</h2>
            <p className="hint">{t('stage.cutsIntro')}</p>
            {view.cuts.length === 0 ? (
              <p className="hint">{t('stage.noCuts')}</p>
            ) : (
              <ul className="stage-cuts">
                {view.cuts.map((cut) => (
                  <li key={cut.key} className={cut.active ? 'on' : undefined}>
                    {cutNames[cut.key] && <strong>{cutNames[cut.key]}</strong>}
                    <span>
                      {t('stage.cut', cut.source, cut.target)}
                      {cut.active && <em> · {t('stage.cutActive')}</em>}
                    </span>
                    <Link className="stage-edit" to={editorHref('assigns', cut.key)}>
                      {t('stage.edit')}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="stage-block">
            <h2>{t('stage.effects')}</h2>
            <ul className="stage-effects">
              {POWER_FIELDS.map(({ block, field }) => {
                const on = switchOn(field);
                return (
                  <li key={field.address} className={on ? 'on' : 'off'}>
                    <span className="dot" aria-hidden="true" />
                    {t(`gr55.blocks.${block}`)}{' '}
                    <strong>{on ? t('stage.on') : t('stage.off')}</strong>
                    {on && effectChoice(editor, field) && <em>{effectChoice(editor, field)}</em>}
                    <Link className="stage-edit" to={editorHref(block as PageId, block)}>
                      {t('stage.edit')}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
      <p className="hint stage-footnote">{t('stage.footnote')}</p>
    </main>
  );
}
