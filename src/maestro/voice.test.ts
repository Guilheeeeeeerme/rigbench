import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVoiceInput, voiceSupported } from './voice';

describe('voice', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports unsupported when SpeechRecognition is missing', () => {
    vi.stubGlobal('SpeechRecognition', undefined);
    vi.stubGlobal('webkitSpeechRecognition', undefined);
    expect(voiceSupported()).toBe(false);
    expect(createVoiceInput('en', () => undefined)).toBeUndefined();
  });

  it('creates a recognizer when the API exists', () => {
    class FakeRecognition {
      lang = '';
      interimResults = false;
      continuous = false;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start = vi.fn();
      stop = vi.fn();
    }
    const instances: FakeRecognition[] = [];
    vi.stubGlobal(
      'SpeechRecognition',
      class extends FakeRecognition {
        constructor() {
          super();
          instances.push(this);
        }
      },
    );
    const drafts: string[] = [];
    const voice = createVoiceInput('pt-BR', (text) => drafts.push(text));
    expect(voice).toBeDefined();
    expect(instances[0]?.lang).toBe('pt-BR');
    voice!.start();
    expect(instances[0]?.start).toHaveBeenCalled();
    instances[0]?.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: ' mais seco ' } }],
    });
    expect(drafts).toEqual(['mais seco']);
  });
});
