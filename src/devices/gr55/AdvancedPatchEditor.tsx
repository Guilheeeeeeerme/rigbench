import { useEffect, useMemo, useState } from 'react';
import { useT } from '../../copy';
import { isEnumField } from '../../protocol/RolandAddressMap';
import type { FieldReference } from '../../protocol/RolandAddressMap';
import type { FieldHost } from './FieldControl';
import { FieldControl } from './FieldControl';
import type { GkMode } from './editor';
import {
  buildPages,
  effectOfFields,
  isField,
  memberOf,
  type PageId,
  type Section,
} from './pages';

function activeEffectOf(host: FieldHost, section: Section): string | undefined {
  if (!section.typeKey) return undefined;
  const atom = memberOf(section.struct, section.typeKey);
  if (!isField(atom) || !isEnumField(atom.definition.type)) return undefined;
  const result = host.read(atom as FieldReference);
  return result.ok ? String(result.value) : undefined;
}

function visibleKeys(host: FieldHost, section: Section, showAll: boolean): string[] {
  const essential = new Set(section.essentialKeys ?? []);
  const effectMap = section.typeKey ? effectOfFields(section) : undefined;
  const activeEffect = activeEffectOf(host, section);
  const keys = showAll || essential.size === 0 ? [...section.keys] : [...essential];
  if (!effectMap || !activeEffect) return keys;
  return keys.filter((key) => {
    const owner = effectMap.get(key);
    return owner === undefined || owner === activeEffect;
  });
}

/**
 * Full OM-grouped patch editor for the sounding temporary patch.
 * Essentials first; “Show all” reveals the rest of each section.
 */
export function AdvancedPatchEditor({
  host,
  gkMode,
  patchVersion,
  initialPageId,
}: {
  host: FieldHost;
  gkMode: GkMode;
  /** Bumps when the temporary patch changes (e.g. editor.patchSnapshot). */
  patchVersion: string | number;
  initialPageId?: PageId;
}) {
  const t = useT();
  const pages = useMemo(() => buildPages(gkMode, t), [gkMode, t]);
  const [pageId, setPageId] = useState<PageId>(
    () => initialPageId ?? (pages[0]?.id as PageId) ?? 'patch',
  );
  const [showAll, setShowAll] = useState(false);

  // Recompute type-gated keys when the sounding patch changes.
  void patchVersion;

  useEffect(() => {
    if (initialPageId) setPageId(initialPageId);
  }, [initialPageId]);

  const page = pages.find((item) => item.id === pageId) ?? pages[0];

  return (
    <section className="advanced-patch-editor" aria-label={t('gr55.advanced.title')}>
      <div className="advanced-patch-head">
        <h2>{t('gr55.advanced.title')}</h2>
        <label className="advanced-show-all">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(event) => setShowAll(event.target.checked)}
          />
          {t('gr55.advanced.showAll')}
        </label>
      </div>
      <div className="patch-page-tabs" role="tablist" aria-label={t('gr55.advanced.pages')}>
        {pages.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === page?.id}
            className={item.id === page?.id ? 'active' : undefined}
            onClick={() => setPageId(item.id as PageId)}
          >
            {item.title}
          </button>
        ))}
      </div>
      {page?.sections.map((section) => {
        const keys = visibleKeys(host, section, showAll);
        if (keys.length === 0) return null;
        const readOnly = new Set(section.readOnlyKeys ?? []);
        return (
          <div key={section.slug} className="advanced-section">
            <h3>{section.title}</h3>
            <div className="fields">
              {keys.map((key) => {
                const atom = memberOf(section.struct, key);
                if (!isField(atom)) return null;
                return (
                  <FieldControl
                    key={key}
                    editor={host}
                    field={atom}
                    readOnly={readOnly.has(key)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
