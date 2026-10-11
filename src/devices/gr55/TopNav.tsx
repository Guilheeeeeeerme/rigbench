import { Link } from 'react-router-dom';
import { useT } from '../../copy';
import { deviceHref, editorRootHref, libraryHref, stageHref } from './routes';

export type NavArea = 'stage' | 'editor' | 'library' | 'device';

/**
 * The four areas of a connected pedal, one click apart from any screen. The Stage comes
 * first: it is the root, and the editor and library are reached from it.
 */
export function TopNav({ current }: { current?: NavArea }) {
  const t = useT();
  const mark = (area: NavArea) => (area === current ? 'page' : undefined);
  return (
    <nav className="top-nav" aria-label={t('app.name')}>
      <Link to={stageHref} aria-current={mark('stage')}>
        {t('gr55.navStage')}
      </Link>
      <Link to={editorRootHref} aria-current={mark('editor')}>
        {t('gr55.navEditor')}
      </Link>
      <Link to={libraryHref} aria-current={mark('library')}>
        {t('gr55.navLibrary')}
      </Link>
      <Link className="top-device" to={deviceHref} aria-current={mark('device')}>
        {t('gr55.navDevice')} <span className="dot" aria-hidden="true" />
      </Link>
    </nav>
  );
}
