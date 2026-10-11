import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { getLocale, useT } from '../../copy';
import {
  applyMacroOption,
  groupsForSession,
  matchGroup,
  type MacroGroup,
  type MacroOption,
} from '../../maestro/macros';
import { categoryForToneOption, PCM_TONE_CATEGORIES } from '../../maestro/macros/tones';
import { buildFieldRegistry, registryIndex } from '../../maestro/fieldRegistry';
import type { SessionId } from '../../maestro/session';
import { confirmDiscard } from './dirtyGuard';
import type { Gr55Editor } from './editor';
import { deviceHref, editorRootHref, gkHref, libraryHref, stageHref } from './routes';
import { browsePatches, filterBrowsePatches, type BrowsePatch, type BrowseStyle } from './slots';
import { useSlotNames, useSync } from './sync/SyncBadge';
import { ApplyBar, useSystem, useSystemVersion } from './SystemParts';

function groupTitle(group: MacroGroup, locale: 'en' | 'pt-BR'): string {
  return locale === 'pt-BR' ? group.titlePt : group.titleEn;
}

function optionLabel(option: MacroOption, locale: 'en' | 'pt-BR'): string {
  return locale === 'pt-BR' ? option.labelPt : option.labelEn;
}

function LoadCraftPanel({
  group,
  editor,
  libraryFilter,
  onError,
  onPatchLoaded,
}: {
  group: MacroGroup;
  editor: Gr55Editor;
  libraryFilter: string | undefined;
  onError: (error: unknown) => void;
  onPatchLoaded?: () => void;
}) {
  const t = useT();
  const locale = getLocale();
  const sync = useSync();
  const cachedName = useSlotNames(sync);
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  const style = (libraryFilter as BrowseStyle | undefined) ?? 'user';
  const patches = useMemo(() => filterBrowsePatches(browsePatches(gkMode), style), [gkMode, style]);
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const selected: BrowsePatch | undefined = patches.find((patch) => patch.label === selectedLabel);

  const displayName = (patch: BrowsePatch): string => {
    if (patch.name) return patch.name;
    if (patch.userPatchNumber !== undefined) {
      return cachedName(patch.userPatchNumber) ?? t('gr55.unnamed');
    }
    return t('gr55.unnamed');
  };

  const load = async () => {
    if (!selected || busy) return;
    if (!confirmDiscard(editor)) return;
    setBusy(true);
    try {
      await editor.selectPatch(selected.bankMsb, selected.programChange);
      onPatchLoaded?.();
    } catch (reason) {
      onError(reason);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="studio-group" aria-labelledby={`macro-${group.id}`}>
      <div className="studio-group-head">
        <h3 id={`macro-${group.id}`}>{groupTitle(group, locale)}</h3>
      </div>
      <p className="hint">{t('studio.loadHint')}</p>
      <div className="studio-load-row">
        <label className="studio-load-label" htmlFor="studio-load-slot">
          {t('studio.loadSlotLabel')}
        </label>
        <select
          id="studio-load-slot"
          className="studio-load-select"
          value={selectedLabel}
          disabled={busy || patches.length === 0}
          onChange={(event) => setSelectedLabel(event.target.value)}
        >
          <option value="">{t('studio.loadPickSlot')}</option>
          {patches.map((patch) => (
            <option key={patch.label} value={patch.label}>
              {patch.label} — {displayName(patch)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="studio-pill selected"
          disabled={!selected || busy}
          onClick={() => void load()}
        >
          {busy ? t('studio.loading') : t('studio.loadPatch')}
        </button>
      </div>
      <Link className="studio-advanced-link" to={libraryHref}>
        {t('studio.openLibrary')}
      </Link>
    </section>
  );
}

function ToneBrowseCard({
  group,
  session,
  editor,
  onError,
}: {
  group: MacroGroup;
  session: SessionId;
  editor: Gr55Editor;
  onError: (error: unknown) => void;
}) {
  const t = useT();
  const locale = getLocale();
  const system = useSystem();
  useSyncExternalStore(editor.subscribe, () => editor.dirtySnapshot());
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  const index = useMemo(() => registryIndex(buildFieldRegistry(gkMode)), [gkMode]);
  const match = matchGroup(group, editor, system, index);
  const matchedCategory =
    match.kind === 'option' ? categoryForToneOption(match.optionId) : undefined;
  const [categoryId, setCategoryId] = useState<string>('accordion');
  useEffect(() => {
    if (matchedCategory && matchedCategory !== 'off') {
      setCategoryId(matchedCategory);
    }
  }, [matchedCategory]);
  const activeCategory = categoryId;

  const select = (option: MacroOption) => {
    const result = applyMacroOption(group, option, {
      editor,
      system,
      index,
      policy: { stageLive: false, session },
    });
    if (!result.ok && result.reason !== 'opens-advanced' && result.reason !== 'stub') {
      onError(new Error(t('studio.applyFailed')));
    }
  };

  const offOption = group.options.find((option) => option.id === 'off');
  const categoryTones = group.options.filter(
    (option) => categoryForToneOption(option.id) === activeCategory,
  );

  return (
    <section className="studio-group" aria-labelledby={`macro-${group.id}`}>
      <div className="studio-group-head">
        <h3 id={`macro-${group.id}`}>{groupTitle(group, locale)}</h3>
        {match.kind === 'custom' && <span className="studio-custom">{t('studio.custom')}</span>}
      </div>
      <p className="hint">{t('studio.toneBrowseHint')}</p>
      <div className="studio-pills" role="group" aria-label={t('studio.toneFamily')}>
        {offOption && (
          <button
            type="button"
            className={
              match.kind === 'option' && match.optionId === 'off'
                ? 'studio-pill selected'
                : 'studio-pill'
            }
            aria-pressed={match.kind === 'option' && match.optionId === 'off'}
            onClick={() => select(offOption)}
          >
            {optionLabel(offOption, locale)}
          </button>
        )}
        {PCM_TONE_CATEGORIES.map((category) => {
          const selected = activeCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              className={selected ? 'studio-pill selected' : 'studio-pill'}
              aria-pressed={selected}
              onClick={() => setCategoryId(category.id)}
            >
              {locale === 'pt-BR' ? category.labelPt : category.labelEn}
            </button>
          );
        })}
      </div>
      {activeCategory !== 'off' && (
        <div
          className="studio-pills studio-tone-pills"
          role="group"
          aria-label={t('studio.tonePick')}
        >
          {categoryTones.map((option) => {
            const selected = match.kind === 'option' && match.optionId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                className={selected ? 'studio-pill selected' : 'studio-pill'}
                aria-pressed={selected}
                onClick={() => select(option)}
              >
                {optionLabel(option, locale)}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MacroGroupCard({
  group,
  session,
  editor,
  onError,
  onLibraryFilter,
  libraryFilter,
  onPatchLoaded,
}: {
  group: MacroGroup;
  session: SessionId;
  editor: Gr55Editor;
  onError: (error: unknown) => void;
  onLibraryFilter: (style: string) => void;
  libraryFilter: string | undefined;
  onPatchLoaded?: () => void;
}) {
  const t = useT();
  const locale = getLocale();
  const system = useSystem();
  useSystemVersion(system);
  useSyncExternalStore(editor.subscribe, () => editor.dirtySnapshot());
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  const index = useMemo(() => registryIndex(buildFieldRegistry(gkMode)), [gkMode]);
  const match = matchGroup(group, editor, system, index);

  if (group.kind === 'toneBrowse') {
    return <ToneBrowseCard group={group} session={session} editor={editor} onError={onError} />;
  }

  if (group.kind === 'rename') {
    return (
      <section className="studio-group" aria-labelledby={`macro-${group.id}`}>
        <h3 id={`macro-${group.id}`}>{groupTitle(group, locale)}</h3>
        <p className="hint">{t('studio.renameHint')}</p>
        <Link className="studio-advanced-link" to={`${editorRootHref}/patch/common`}>
          {t('studio.openAdvanced')}
        </Link>
      </section>
    );
  }

  if (group.kind === 'actions') {
    if (group.id === 'load-craft') {
      return (
        <LoadCraftPanel
          group={group}
          editor={editor}
          libraryFilter={libraryFilter}
          onError={onError}
          onPatchLoaded={onPatchLoaded}
        />
      );
    }
    return (
      <section className="studio-group" aria-labelledby={`macro-${group.id}`}>
        <h3 id={`macro-${group.id}`}>{groupTitle(group, locale)}</h3>
        <p className="hint">{group.id === 'care' ? t('studio.careHint') : t('studio.saveHint')}</p>
        <Link className="studio-advanced-link" to={group.id === 'care' ? deviceHref : libraryHref}>
          {group.id === 'care' ? t('studio.openDevice') : t('studio.openLibrary')}
        </Link>
      </section>
    );
  }

  if (group.kind === 'mode') {
    return (
      <section className="studio-group" aria-labelledby={`macro-${group.id}`}>
        <h3 id={`macro-${group.id}`}>{groupTitle(group, locale)}</h3>
        <p className="hint">{t('studio.modeHint')}</p>
        <Link className="studio-advanced-link" to={deviceHref}>
          {t('studio.openDevice')}
        </Link>
      </section>
    );
  }

  const select = (option: MacroOption) => {
    if (option.opensAdvanced) {
      return;
    }
    const result = applyMacroOption(group, option, {
      editor,
      system,
      index,
      policy: { stageLive: false, session },
      onLibraryFilter,
    });
    if (!result.ok && result.reason !== 'opens-advanced' && result.reason !== 'stub') {
      onError(new Error(t('studio.applyFailed')));
    }
  };

  return (
    <section className="studio-group" aria-labelledby={`macro-${group.id}`}>
      <div className="studio-group-head">
        <h3 id={`macro-${group.id}`}>{groupTitle(group, locale)}</h3>
        {!group.implemented && <span className="studio-stub">{t('studio.stub')}</span>}
        {match.kind === 'custom' && group.implemented && (
          <span className="studio-custom">{t('studio.custom')}</span>
        )}
      </div>
      <div className="studio-pills" role="group" aria-labelledby={`macro-${group.id}`}>
        {group.options.map((option) => {
          const selected = match.kind === 'option' && match.optionId === option.id;
          if (option.opensAdvanced) {
            return (
              <Link key={option.id} className="studio-pill studio-pill-link" to={gkHref}>
                {optionLabel(option, locale)}
              </Link>
            );
          }
          return (
            <button
              key={option.id}
              type="button"
              className={selected ? 'studio-pill selected' : 'studio-pill'}
              aria-pressed={selected}
              disabled={!group.implemented && option.writes.length === 0}
              onClick={() => select(option)}
            >
              {optionLabel(option, locale)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function StudioPanels({
  session,
  editor,
  onError,
  libraryFilter,
  onLibraryFilter,
  onPatchLoaded,
}: {
  session: SessionId;
  editor: Gr55Editor;
  onError: (error: unknown) => void;
  libraryFilter: string | undefined;
  onLibraryFilter: (style: string) => void;
  onPatchLoaded?: () => void;
}) {
  const t = useT();
  const groups = groupsForSession(session);

  return (
    <div className="studio-panels">
      <header className="studio-panels-head">
        <h2>{t('studio.panelsTitle')}</h2>
        {session === 'library' && libraryFilter && (
          <p className="hint" role="status">
            {t('studio.filterActive', libraryFilter)}
          </p>
        )}
      </header>
      {session === 'system' && <ApplyBar onError={onError} />}
      <div className="studio-groups">
        {groups.map((group) => (
          <MacroGroupCard
            key={group.id}
            group={group}
            session={session}
            editor={editor}
            onError={onError}
            onLibraryFilter={onLibraryFilter}
            libraryFilter={libraryFilter}
            onPatchLoaded={onPatchLoaded}
          />
        ))}
      </div>
      <footer className="studio-panels-foot">
        <Link to={editorRootHref}>{t('studio.advancedEditor')}</Link>
        {session === 'system' && <Link to={gkHref}>{t('studio.advancedGk')}</Link>}
        {session === 'library' && <Link to={libraryHref}>{t('studio.openLibrary')}</Link>}
        <Link to={stageHref}>{t('studio.goStage')}</Link>
      </footer>
    </div>
  );
}
