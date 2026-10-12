import { beforeEach, describe, expect, test, vi } from 'vitest';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  connectionReducer,
  setHasAccess,
  setPhase,
} from '../../app/store/slices/connectionSlice';
import {
  sessionPrefsReducer,
  setRememberedPorts,
} from '../../app/store/slices/sessionPrefsSlice';
import { setLiveConnection, setMidiAccess } from './connectionRuntime';
import { resumeIfPossible } from './connectionThunks';

function makeStore() {
  return configureStore({
    reducer: combineReducers({
      connection: connectionReducer,
      sessionPrefs: sessionPrefsReducer,
    }),
  });
}

describe('resumeIfPossible', () => {
  beforeEach(() => {
    setLiveConnection(undefined);
    setMidiAccess(undefined);
  });

  test('prompts when nothing was remembered', async () => {
    const store = makeStore();
    const ok = await store.dispatch(resumeIfPossible());
    expect(ok).toBe(false);
    expect(store.getState().connection.phase).toBe('needsPrompt');
  });

  test('forgets stale ports and prompts when they are gone', async () => {
    const store = makeStore();
    store.dispatch(setRememberedPorts({ inputId: 'missing-in', outputId: 'missing-out' }));
    store.dispatch(setHasAccess(true));
    setMidiAccess({
      inputs: new Map(),
      outputs: new Map(),
      onstatechange: null,
    } as unknown as MIDIAccess);

    const ok = await store.dispatch(resumeIfPossible());
    expect(ok).toBe(false);
    expect(store.getState().sessionPrefs.rememberedPorts).toBeNull();
    expect(store.getState().connection.phase).toBe('needsPrompt');
  });

  test('returns true immediately when a live session is already open', async () => {
    const store = makeStore();
    store.dispatch(setPhase('connected'));
    setLiveConnection({
      session: { close: vi.fn() },
      editor: { dispose: vi.fn() },
      sync: { dispose: vi.fn() },
      system: {},
    } as never);

    const ok = await store.dispatch(resumeIfPossible());
    expect(ok).toBe(true);
    expect(store.getState().connection.phase).toBe('connected');
  });
});
