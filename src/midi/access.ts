export type BrowserSupport =
  | { kind: 'ok'; needsSysexPermissionNotice: boolean }
  | { kind: 'insecure-context' }
  | { kind: 'no-web-midi' };

export interface BrowserEnvironment {
  isSecureContext: boolean;
  hasWebMidi: boolean;
  userAgent: string;
}

function currentEnvironment(): BrowserEnvironment {
  return {
    isSecureContext: window.isSecureContext,
    hasWebMidi: 'requestMIDIAccess' in navigator,
    userAgent: navigator.userAgent,
  };
}

export function detectSupport(env: BrowserEnvironment = currentEnvironment()): BrowserSupport {
  // Checked first: outside HTTPS or localhost, browsers that do support Web MIDI hide the API too.
  if (!env.isSecureContext) {
    return { kind: 'insecure-context' };
  }
  if (!env.hasWebMidi) {
    return { kind: 'no-web-midi' };
  }
  return { kind: 'ok', needsSysexPermissionNotice: /firefox/i.test(env.userAgent) };
}

export function requestAccess(): Promise<MIDIAccess> {
  return navigator.requestMIDIAccess({ sysex: true });
}
