import type { FieldReference, FieldType } from '../../protocol/RolandAddressMap';
import type { FieldHost } from './FieldControl';
import type { Gr55Editor } from './editor';
import { SYSTEM_ADDRESS, SYSTEM_SPAN } from './systemMap';
import type { Gr55System } from './systemState';
import type { Gr55IntentionSession } from './intentions/session';

/**
 * Advanced editor host. Each confirmed edit is one verified write on the
 * session queue. The mirror updates from the readback, not from the request.
 */
export function verifiedFieldHost(
  session: Gr55IntentionSession,
  editor: Gr55Editor,
  system: Gr55System,
  onError?: (error: unknown) => void,
): FieldHost {
  const inSystem = (address: number) =>
    address >= SYSTEM_ADDRESS && address < SYSTEM_ADDRESS + SYSTEM_SPAN;
  return {
    subscribe(listener) {
      const stopEditor = editor.subscribe(listener);
      const stopSystem = system.subscribe(listener);
      const stopSession = session.subscribe(listener);
      return () => {
        stopEditor();
        stopSystem();
        stopSession();
      };
    },
    fieldSnapshot(address: number) {
      return `${editor.fieldSnapshot(address)}:${system.fieldSnapshot(address)}:${session.getState().phase}`;
    },
    read<T>(field: FieldReference<FieldType<T>>) {
      return inSystem(field.address) ? system.read(field) : editor.read(field);
    },
    write<T>(field: FieldReference<FieldType<T>>, value: T) {
      void session.writeField(field as FieldReference<FieldType<unknown>>, value).then((result) => {
        if (!result.ok) onError?.(new Error(result.code));
      });
    },
  };
}
