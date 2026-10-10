import type { ReactNode } from 'react';
import { en } from '../copy/en';
import { detectSupport } from '../midi/access';

const support = detectSupport();

/** Lets the app through only where Web MIDI can work, and says why where it cannot. */
export function BrowserGate({ children }: { children: ReactNode }) {
  if (support.kind !== 'ok') {
    const message = support.kind === 'insecure-context' ? en.gate.insecure : en.gate.noWebMidi;
    return (
      <main className="gate">
        <p className="brand">{en.app.name}</p>
        <h1>{message.title}</h1>
        <p>{message.body}</p>
      </main>
    );
  }
  return (
    <>
      {support.needsSysexPermissionNotice && (
        <p className="notice" role="note">
          {en.gate.firefoxNotice}
        </p>
      )}
      {children}
    </>
  );
}
