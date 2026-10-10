import { en } from '../../copy/en';
import type { Gr55Editor } from './editor';

/**
 * The stage: calm, dark, big, and read-only. What sounds, what each pedal step does,
 * and whether the pedal is playing the working copy or a saved slot.
 */
export function Stage({ editor }: { editor: Gr55Editor }) {
  return (
    <main className="stage">
      <h1>{en.stage.title}</h1>
      <p className="stage-patch">{editor.patchName || en.gr55.unnamed}</p>
      {editor.isDirty && (
        <p className="notice stage-notice" role="alert">
          {en.stage.playingCopy}
        </p>
      )}
      <p className="hint">{en.stage.intro}</p>
      <p className="hint">{en.stage.body}</p>
    </main>
  );
}
