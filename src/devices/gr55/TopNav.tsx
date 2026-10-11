import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../copy';
import {
  deviceHref,
  editorRootHref,
  libraryHref,
  setupHref,
  stageHref,
  studioHref,
} from './routes';

export type NavArea = 'studio' | 'stage' | 'editor' | 'library' | 'device';

/**
 * Top chrome after Maestro-first: Studio · Stage · ⋯ (rare tools).
 * Library / dense editor / Device stay reachable under More.
 */
export function TopNav({ current }: { current?: NavArea }) {
  const t = useT();
  const [moreOpen, setMoreOpen] = useState(false);
  const mark = (area: NavArea) => (area === current ? 'page' : undefined);
  return (
    <nav className="top-nav" aria-label={t('app.name')}>
      <Link to={studioHref} aria-current={mark('studio')}>
        {t('gr55.navStudio')}
      </Link>
      <Link to={stageHref} aria-current={mark('stage')}>
        {t('gr55.navStage')}
      </Link>
      <div className="top-more">
        <button
          type="button"
          className="top-more-btn"
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          onClick={() => setMoreOpen((open) => !open)}
        >
          {t('gr55.navMore')}
        </button>
        {moreOpen && (
          <div className="top-more-menu" role="menu">
            <Link role="menuitem" to={editorRootHref} onClick={() => setMoreOpen(false)}>
              {t('gr55.navAdvancedEditor')}
            </Link>
            <Link role="menuitem" to={libraryHref} onClick={() => setMoreOpen(false)}>
              {t('gr55.navLibrary')}
            </Link>
            <Link
              role="menuitem"
              className="top-device"
              to={deviceHref}
              onClick={() => setMoreOpen(false)}
            >
              {t('gr55.navDevice')} <span className="dot" aria-hidden="true" />
            </Link>
            <Link role="menuitem" to={setupHref} onClick={() => setMoreOpen(false)}>
              {t('gr55.navRecalibrate')}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
