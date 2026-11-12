import { describe, expect, test } from 'vitest';
import { connectionReducer, initialConnectionState, setPhase, setProblem } from './slices/connectionSlice';

describe('connection slice', () => {
  test('phase stays in memory and starts idle', () => {
    expect(initialConnectionState.phase).toBe('idle');
    const next = connectionReducer(initialConnectionState, setPhase('connected'));
    expect(next.phase).toBe('connected');
    expect(initialConnectionState.phase).toBe('idle');
  });

  test('another tab is a connection problem, not a fake device', () => {
    const next = connectionReducer(initialConnectionState, setProblem('otherTab'));
    expect(next.problem).toBe('otherTab');
    expect(next.phase).toBe('idle');
  });
});
