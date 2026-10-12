import { describe, expect, test } from 'vitest';
import {
  connectionReducer,
  initialConnectionState,
  setPhase,
} from './slices/connectionSlice';
import {
  sessionPrefsReducer,
  setLastRoute,
  setRememberedPorts,
} from './slices/sessionPrefsSlice';

describe('sessionPrefs + connection slices', () => {
  test('persisted prefs hold ports and last route', () => {
    let prefs = sessionPrefsReducer(
      undefined,
      setRememberedPorts({ inputId: 'in-1', outputId: 'out-1' }),
    );
    prefs = sessionPrefsReducer(prefs, setLastRoute('maestro'));

    expect(prefs.rememberedPorts).toEqual({ inputId: 'in-1', outputId: 'out-1' });
    expect(prefs.lastRoute).toBe('maestro');
  });

  test('live connection phase is separate from prefs', () => {
    const connection = connectionReducer(initialConnectionState, setPhase('connected'));
    const prefs = sessionPrefsReducer(
      undefined,
      setRememberedPorts({ inputId: 'in-1', outputId: 'out-1' }),
    );

    expect(connection.phase).toBe('connected');
    expect(prefs.rememberedPorts).toEqual({ inputId: 'in-1', outputId: 'out-1' });
  });

  test('clearing remembered ports leaves the user on the prompt path', () => {
    let prefs = sessionPrefsReducer(
      undefined,
      setRememberedPorts({ inputId: 'in-1', outputId: 'out-1' }),
    );
    prefs = sessionPrefsReducer(prefs, setRememberedPorts(null));
    const connection = connectionReducer(initialConnectionState, setPhase('needsPrompt'));

    expect(prefs.rememberedPorts).toBeNull();
    expect(connection.phase).toBe('needsPrompt');
  });
});
