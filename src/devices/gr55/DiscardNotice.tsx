import { useState, useSyncExternalStore } from 'react';
import { useT } from '../../copy';
import type { Gr55Editor } from './editor';

/**
 * The pedal can switch patches on its own at any moment, discarding the working copy
 * before the app could ask. This fixed banner says what was lost until dismissed.
 */
export function DiscardNotice({ editor }: { editor: Gr55Editor }) {
  const t = useT();
  const [dismissed, setDismissed] = useState(-1);
  const sequence = useSyncExternalStore(editor.subscribe, () => editor.discardSequence);
  const count = editor.discardedChanges;
  if (count === undefined || sequence === 0 || sequence === dismissed) {
    return null;
  }
  return (
    <div className="flash">
      <p className="notice" role="alert">
        {t('gr55.workspace.pedalSwitchedNotice', count)}{' '}
        <button type="button" onClick={() => setDismissed(sequence)}>
          {t('gr55.workspace.dismissNotice')}
        </button>
      </p>
    </div>
  );
}
