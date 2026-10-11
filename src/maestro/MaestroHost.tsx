import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useT } from '../copy';
import type { Gr55Editor } from '../devices/gr55/editor';
import { maestroHref, maestroRoute, stageRoute } from '../devices/gr55/routes';

/**
 * FAB + Ctrl/⌘+M. Hidden on Stage and Studio (chat is embedded in Studio).
 * ⌘M / FAB jump to Studio when not already there (except Stage full-screen).
 */
export function MaestroHost({ editor }: { editor: Gr55Editor }) {
  const t = useT();
  void editor;
  const location = useLocation();
  const navigate = useNavigate();
  const stageLive = location.pathname.endsWith(`/${stageRoute}`);
  const onMaestro = location.pathname.includes(`/${maestroRoute}`);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.key.toLowerCase() !== 'm') return;
      if (stageLive || onMaestro) return;
      event.preventDefault();
      void navigate(maestroHref);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stageLive, onMaestro, navigate]);

  if (onMaestro || stageLive) return null;

  return (
    <button
      type="button"
      className="maestro-fab"
      aria-label={t('maestro.open')}
      onClick={() => void navigate(maestroHref)}
    >
      🎼
    </button>
  );
}
