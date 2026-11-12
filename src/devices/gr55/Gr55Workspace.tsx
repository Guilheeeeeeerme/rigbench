import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useLocale, useT } from '../../copy';
import { IntentionWorkspace } from '../../experience/IntentionWorkspace';
import type { Gr55Editor } from './editor';
import { AdvancedPatchEditor } from './AdvancedPatchEditor';
import { createGr55Session } from './intentions/session';
import {
  INSTRUMENT_PROFILES,
  PIEZO_BRAND_OPTIONS,
} from './instrumentProfiles';
import { slotsOfMode } from './slots';
import { useSystem } from './SystemParts';
import { verifiedFieldHost } from './verifiedFieldHost';

export function Gr55Workspace({
  editor,
  session,
  onError,
}: {
  editor: Gr55Editor;
  session: ReturnType<typeof createGr55Session>;
  onError: (error: unknown) => void;
}) {
  const locale = useLocale();
  const t = useT();
  const system = useSystem();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const state = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  const patchVersion = useSyncExternalStore(editor.subscribe, editor.patchSnapshot);
  const host = useMemo(
    () => verifiedFieldHost(session, editor, system, onError),
    [session, editor, system, onError],
  );
  const instruments = useMemo(
    () =>
      INSTRUMENT_PROFILES.map((profile) => ({
        id: profile.id,
        label: locale === 'pt-BR' ? profile.labelPt : profile.labelEn,
        note: locale === 'pt-BR' ? profile.notesPt : profile.notesEn,
        confirmPickup: Boolean(profile.confirmPiezoBrand),
        pickups: PIEZO_BRAND_OPTIONS.map((item) => ({
          id: item.id,
          label: locale === 'pt-BR' ? item.labelPt : item.labelEn,
        })),
        calibrations: (profile.calibrations ?? []).map((item) => ({
          id: item.id,
          label: locale === 'pt-BR' ? item.labelPt : item.labelEn,
          note: locale === 'pt-BR' ? item.notesPt : item.notesEn,
        })),
      })),
    [locale],
  );
  const slots = useMemo(
    () => slotsOfMode(editor.gkMode).map((slot) => ({ id: slot.userPatchNumber, label: slot.label })),
    [editor, patchVersion],
  );

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      const current = session.getState();
      if (
        current.blocked ||
        current.phase === 'applying' ||
        current.phase === 'saving' ||
        current.phase === 'verifying' ||
        current.phase === 'reading'
      ) {
        return;
      }
      void session.reread().catch(onError);
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [session, onError]);

  return (
    <IntentionWorkspace
      session={session}
      instruments={instruments}
      slots={slots}
      advanced={
        <details
          className="mvp-section"
          onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
        >
          <summary>{t('gr55.advanced.title')}</summary>
          {advancedOpen && (
          <AdvancedPatchEditor
            host={host}
            gkMode={editor.gkMode}
            patchVersion={state.lastVerifiedAt ?? 0}
            locked={state.blocked || state.phase === 'applying' || state.phase === 'saving' || state.phase === 'verifying'}
          />
          )}
        </details>
      }
    />
  );
}
