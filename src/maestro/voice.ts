export type VoiceLocale = 'en' | 'pt-BR';

export interface VoiceInput {
  start: () => void;
  stop: () => void;
  /** True while the recognizer is listening. */
  listening: () => boolean;
}

type DraftHandler = (transcript: string, interim: boolean) => void;
type ErrorHandler = (reason: string) => void;

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionResultEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: { isFinal: boolean; 0: { transcript: string } };
  };
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): SpeechRecognitionCtor | undefined {
  const w = globalThis as typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function voiceSupported(): boolean {
  return Boolean(recognitionCtor());
}

/**
 * Web Speech wrapper. Transcript lands as an editable draft — never auto-sends.
 */
export function createVoiceInput(
  locale: VoiceLocale,
  onDraft: DraftHandler,
  onError?: ErrorHandler,
): VoiceInput | undefined {
  const Ctor = recognitionCtor();
  if (!Ctor) return undefined;

  const recognition = new Ctor();
  recognition.lang = locale === 'pt-BR' ? 'pt-BR' : 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;
  let active = false;

  recognition.onresult = (event) => {
    let finalText = '';
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const piece = event.results[i][0]?.transcript ?? '';
      if (event.results[i].isFinal) finalText += piece;
      else interim += piece;
    }
    if (finalText) onDraft(finalText.trim(), false);
    else if (interim) onDraft(interim.trim(), true);
  };
  recognition.onerror = (event) => {
    active = false;
    onError?.(event.error);
  };
  recognition.onend = () => {
    active = false;
  };

  return {
    start: () => {
      try {
        active = true;
        recognition.start();
      } catch (error) {
        active = false;
        onError?.(error instanceof Error ? error.message : 'start-failed');
      }
    },
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
      active = false;
    },
    listening: () => active,
  };
}
