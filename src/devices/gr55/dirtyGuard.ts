import type { Gr55Editor } from './editor';
import { t } from '../../copy';

/**
 * Gates every action that would replace the working copy on whether it still holds
 * unsaved edits. Returns true when the action may go ahead.
 */
export function confirmDiscard(editor: Gr55Editor): boolean {
  if (!editor.isDirty) {
    return true;
  }
  return window.confirm(t('gr55.workspace.confirmDiscard', editor.changeCount));
}
