import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useT } from '../../copy';
import { matchPcmTones } from '../../maestro/toneMatch';

const RECENT_KEY = 'rigbench.recentTones';
const RECENT_LIMIT = 8;
const EMPTY_PAGE = 80;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function pushRecent(label: string): void {
  const next = [label, ...loadRecent().filter((item) => item !== label)].slice(0, RECENT_LIMIT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

/** Filter catalog labels; empty query keeps order for the caller to page. */
export function filterToneLabels(query: string, labels: readonly string[], limit = 64): string[] {
  const q = query.trim();
  if (!q) return [...labels];
  const ranked = matchPcmTones(q, labels, limit);
  if (ranked.length > 0) return ranked;
  const lower = q.toLowerCase();
  return labels.filter((label) => label.toLowerCase().includes(lower)).slice(0, limit);
}

export interface TonePickerProps {
  open: boolean;
  title: string;
  labels: readonly string[];
  current?: string;
  onPick: (label: string) => void;
  onClose: () => void;
}

/**
 * Full-screen searchable tone browser. Search is always visible.
 * Used for PCM catalogs and flattened modeling tone labels.
 */
export function TonePicker({ open, title, labels, current, onPick, onClose }: TonePickerProps) {
  const t = useT();
  const searchId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>(() => loadRecent());

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setRecent(loadRecent());
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => filterToneLabels(query, labels), [query, labels]);
  const shown = query.trim() ? filtered : filtered.slice(0, EMPTY_PAGE);
  const recentShown = query.trim()
    ? []
    : recent.filter((label) => labels.includes(label));

  if (!open) return null;

  const pick = (label: string) => {
    pushRecent(label);
    setRecent(loadRecent());
    onPick(label);
    onClose();
  };

  return (
    <div className="tone-picker" role="dialog" aria-modal="true" aria-labelledby={`${searchId}-title`}>
      <div className="tone-picker-sheet">
        <header className="tone-picker-head">
          <h2 id={`${searchId}-title`}>{title}</h2>
          <button type="button" className="tone-picker-close" onClick={onClose}>
            {t('gr55.tonePicker.close')}
          </button>
        </header>
        <label className="tone-picker-search" htmlFor={searchId}>
          <span className="visually-hidden">{t('gr55.tonePicker.search')}</span>
          <input
            ref={inputRef}
            id={searchId}
            type="search"
            value={query}
            placeholder={t('gr55.tonePicker.searchPlaceholder')}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="tone-picker-body">
          {recentShown.length > 0 && (
            <section className="tone-picker-section" aria-label={t('gr55.tonePicker.recent')}>
              <h3>{t('gr55.tonePicker.recent')}</h3>
              <ul className="tone-picker-list">
                {recentShown.map((label) => (
                  <li key={`recent-${label}`}>
                    <button
                      type="button"
                      className={label === current ? 'tone-pick active' : 'tone-pick'}
                      onClick={() => pick(label)}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="tone-picker-section" aria-label={t('gr55.tonePicker.all')}>
            {!query.trim() && <h3>{t('gr55.tonePicker.all')}</h3>}
            {shown.length === 0 ? (
              <p className="hint">{t('gr55.tonePicker.empty')}</p>
            ) : (
              <ul className="tone-picker-list">
                {shown.map((label) => (
                  <li key={label}>
                    <button
                      type="button"
                      className={label === current ? 'tone-pick active' : 'tone-pick'}
                      onClick={() => pick(label)}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!query.trim() && labels.length > EMPTY_PAGE && (
              <p className="hint">{t('gr55.tonePicker.typeToSearch', labels.length)}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
