import { useMemo, useSyncExternalStore } from 'react';
import { useLocale, useT } from '../../copy';
import type { Gr55Editor } from './editor';
import { applyMacroOption } from '../../maestro/macros/apply';
import { matchGroup } from '../../maestro/macros/match';
import { findGroup } from '../../maestro/macros/registry';
import type { MacroGroup } from '../../maestro/macros/types';
import { buildFieldRegistry, registryIndex } from '../../maestro/fieldRegistry';
import type { PageId } from './pages';
import { runAppMutation, type SnapshotSource } from './sessionAuthority';

/** Patch Simple groups shown on Bank (Tone Deck owns layers). */
export const BANK_SIMPLE_GROUP_IDS = [
  'amp-grit',
  'atmosphere',
  'tone-shape',
  'loudness',
  'front-effect',
  'color-box',
  'guitar-body',
  'synth-voice',
  'chain-path',
  'tuning',
  'patch-feet',
] as const;

function groupsForBank(): MacroGroup[] {
  return BANK_SIMPLE_GROUP_IDS.map((id) => findGroup(id)).filter(
    (group): group is MacroGroup => group != null && group.implemented,
  );
}

/**
 * Bose-style use-case profile pills for the sounding temporary patch.
 */
export function SimpleProfiles({
  editor,
  source,
  onOpenAdvanced,
  onError,
}: {
  editor: Gr55Editor;
  source: SnapshotSource;
  onOpenAdvanced?: (pageId?: PageId) => void;
  onError: (error: unknown) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  useSyncExternalStore(editor.subscribe, editor.patchSnapshot);

  const index = useMemo(() => registryIndex(buildFieldRegistry(gkMode)), [gkMode]);
  const groups = useMemo(() => groupsForBank(), []);

  const apply = (group: MacroGroup, optionId: string) => {
    const option = group.options.find((item) => item.id === optionId);
    if (!option) return;
    if (option.opensAdvanced) {
      onOpenAdvanced?.(group.id === 'tuning' ? 'master' : undefined);
      return;
    }
    void runAppMutation(() => {
      const result = applyMacroOption(group, option, {
        editor,
        index,
        policy: { stageLive: false, session: 'bank' },
      });
      if (!result.ok) {
        throw new Error(t('gr55.simple.applyFailed', result.reason));
      }
    }, source).catch(onError);
  };

  return (
    <section className="simple-profiles" aria-label={t('gr55.simple.title')}>
      <h2>{t('gr55.simple.title')}</h2>
      <p className="hint">{t('gr55.simple.hint')}</p>
      {groups.map((group) => {
        const match = matchGroup(group, editor, undefined, index);
        const title = locale === 'pt-BR' ? group.titlePt : group.titleEn;
        return (
          <div key={group.id} className="simple-profile-group">
            <h3>{title}</h3>
            <div className="simple-profile-pills" role="group" aria-label={title}>
              {group.options.map((option) => {
                const label = locale === 'pt-BR' ? option.labelPt : option.labelEn;
                const active = match.kind === 'option' && match.optionId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={active ? 'simple-pill active' : 'simple-pill'}
                    aria-pressed={active}
                    onClick={() => apply(group, option.id)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
