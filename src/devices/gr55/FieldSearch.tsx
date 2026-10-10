import { useMemo, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../copy';
import type { Translate } from '../../copy';
import type { Gr55Editor } from './editor';
import { buildPages, editorHref, memberOf } from './pages';
import type { PageId } from './pages';

interface SearchHit {
  title: string;
  pageId: PageId;
  sectionSlug: string;
  sectionTitle: string;
  page: string;
}

const SEARCH_LIMIT = 12;

function buildIndex(mode: Gr55Editor['gkMode'], t: Translate): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const page of buildPages(mode, t)) {
    for (const section of page.sections) {
      for (const key of section.keys) {
        const field = memberOf(section.struct, key);
        hits.push({
          title: field.definition.description,
          pageId: page.id as PageId,
          sectionSlug: section.slug,
          sectionTitle: section.title,
          page: page.title,
        });
      }
    }
  }
  return hits;
}

function search(index: readonly SearchHit[], query: string): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) {
    return [];
  }
  return index.filter((hit) => hit.title.toLowerCase().includes(needle)).slice(0, SEARCH_LIMIT);
}

/**
 * Type a word from the parameter's name and land on it: the one place every one of
 * the patch's parameters can be reached in two clicks, whatever section it lives in.
 */
export function FieldSearch({ editor }: { editor: Gr55Editor }) {
  const t = useT();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  const index = useMemo(() => buildIndex(gkMode, t), [gkMode, t]);
  const hits = useMemo(() => search(index, query), [index, query]);

  return (
    <div className="field-search">
      <input
        type="search"
        value={query}
        placeholder={t('gr55.search.placeholder')}
        aria-label={t('gr55.search.placeholder')}
        onChange={(event) => setQuery(event.target.value)}
      />
      {hits.length > 0 && (
        <ul className="search-hits" role="listbox">
          {hits.map((hit) => (
            <li key={`${hit.pageId}:${hit.sectionSlug}:${hit.title}`}>
              <button
                type="button"
                onClick={() => {
                  navigate(editorHref(hit.pageId, hit.sectionSlug));
                  setQuery('');
                }}
              >
                <strong>{hit.title}</strong>
                <span>
                  {hit.page} › {hit.sectionTitle}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
