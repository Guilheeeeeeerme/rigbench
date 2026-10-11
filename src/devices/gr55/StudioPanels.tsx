import { useMemo, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { getLocale, useT } from '../../copy';
import {
  applyMacroOption,
  groupsForSession,
  matchGroup,
  type MacroGroup,
  type MacroOption,
} from '../../maestro/macros';
import { buildFieldRegistry, registryIndex } from '../../maestro/fieldRegistry';
import type { SessionId } from '../../maestro/session';
import type { Gr55Editor } from './editor';
import { deviceHref, editorRootHref, gkHref, libraryHref, stageHref } from './routes';
import { ApplyBar, useSystem, useSystemVersion } from './SystemParts';

function groupTitle(group: MacroGroup, locale: 'en' | 'pt-BR'): string {
  return locale === 'pt-BR' ? group.titlePt : group.titleEn;
}

function optionLabel(option: MacroOption, locale: 'en' | 'pt-BR'): string {
  return locale === 'pt-BR' ? option.labelPt : option.labelEn;
}

function MacroGroupCard({
  group,
  session,
  editor,
  onError,
  onLibraryFilter,
}: {
  group: MacroGroup;
  session: SessionId;
  editor: Gr55Editor;
  onError: (error: unknown) => void;
  onLibraryFilter: (style: string) => void;
}) {
  const t = useT();
  const locale = getLocale();
  const system = useSystem();
  useSystemVersion(system);
  useSyncExternalStore(editor.subscribe, () => editor.dirtySnapshot());
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  const index = useMemo(() => registryIndex(buildFieldRegistry(gkMode)), [gkMode]);
  const match = matchGroup(group, editor, system, index);

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
    return (
      <section className="studio-group" aria-labelledby={`macro-${group.id}`}>
        <h3 id={`macro-${group.id}`}>{groupTitle(group, locale)}</h3>
        <p className="hint">
          {group.id === 'care'
            ? t('studio.careHint')
            : group.id === 'load-craft'
              ? t('studio.loadHint')
              : t('studio.saveHint')}
        </p>
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
}: {
  session: SessionId;
  editor: Gr55Editor;
  onError: (error: unknown) => void;
  libraryFilter: string | undefined;
  onLibraryFilter: (style: string) => void;
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
