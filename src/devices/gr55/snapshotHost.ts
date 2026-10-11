import type { FieldReference, FieldType } from '../../protocol/RolandAddressMap';
import type { FieldValue } from './editor';
import type { FieldHost } from './FieldControl';
import { runAppMutation, type SnapshotSource } from './sessionAuthority';

/**
 * FieldHost that writes through the underlying host, then takes a full snapshot
 * under app authority (no pending local staging).
 */
export function snapshotFieldHost(
  host: FieldHost,
  source: SnapshotSource,
  onError?: (error: unknown) => void,
): FieldHost {
  return {
    subscribe: host.subscribe.bind(host),
    fieldSnapshot: host.fieldSnapshot.bind(host),
    read: host.read.bind(host),
    write<T>(field: FieldReference<FieldType<T>>, value: T): void {
      void runAppMutation(() => {
        host.write(field, value);
      }, source).catch((error) => onError?.(error));
    },
  };
}

export function asSnapshotSource(parts: {
  editor: {
    readSystem(): Promise<void>;
    readPatch(): Promise<void>;
    readPatchLocation(): Promise<void>;
  };
  system: { load(): Promise<void> };
}): SnapshotSource {
  return {
    readSystem: () => parts.editor.readSystem(),
    readPatch: () => parts.editor.readPatch(),
    readPatchLocation: () => parts.editor.readPatchLocation(),
    loadSystem: () => parts.system.load(),
  };
}

export type { FieldValue };
