import { createContext, useContext } from 'react';
import type { MidiSession } from '../../midi/session';
import type { Gr55Editor } from './editor';
import type { SyncEngine } from './sync/engine';
import type { Gr55System } from './systemState';

/** Live MIDI objects for the open GR-55. Never put these in Redux. */
export interface LiveConnection {
  session: MidiSession;
  editor: Gr55Editor;
  sync: SyncEngine;
  system: Gr55System;
}

let access: MIDIAccess | undefined;
let live: LiveConnection | undefined;
let retainCount = 0;
let pendingRelease: ReturnType<typeof setTimeout> | undefined;

/** Delay so React StrictMode's unmount→remount does not drop a good session. */
const RELEASE_GRACE_MS = 120;

export function getMidiAccess(): MIDIAccess | undefined {
  return access;
}

export function setMidiAccess(next: MIDIAccess | undefined): void {
  access = next;
}

export function getLiveConnection(): LiveConnection | undefined {
  return live;
}

export function setLiveConnection(next: LiveConnection | undefined): void {
  if (live && live !== next) {
    disposeLive(live);
  }
  live = next;
}

function disposeLive(connection: LiveConnection): void {
  connection.sync.dispose();
  connection.editor.dispose();
  connection.session.close();
}

/** Drop the live session immediately (failed connect, explicit disconnect). */
export function releaseLiveConnection(): void {
  if (pendingRelease) {
    clearTimeout(pendingRelease);
    pendingRelease = undefined;
  }
  if (live) {
    disposeLive(live);
    live = undefined;
  }
}

/**
 * Layout mount retain. Survives StrictMode double-invoke; releases shortly
 * after the last holder leaves `/gr55`.
 */
export function retainLiveConnection(onReleased?: () => void): () => void {
  retainCount += 1;
  if (pendingRelease) {
    clearTimeout(pendingRelease);
    pendingRelease = undefined;
  }
  return () => {
    retainCount -= 1;
    if (retainCount > 0) {
      return;
    }
    pendingRelease = setTimeout(() => {
      pendingRelease = undefined;
      if (retainCount === 0) {
        releaseLiveConnection();
        onReleased?.();
      }
    }, RELEASE_GRACE_MS);
  };
}

const ConnectionContext = createContext<LiveConnection | null>(null);

export const ConnectionProvider = ConnectionContext.Provider;

export function useConnection(): LiveConnection {
  const value = useContext(ConnectionContext);
  if (!value) {
    throw new Error('useConnection needs a connected GR-55 above it');
  }
  return value;
}

export function useConnectionOptional(): LiveConnection | null {
  return useContext(ConnectionContext);
}
