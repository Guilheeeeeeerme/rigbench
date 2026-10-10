import type { ReactNode } from 'react';
import { useT } from '../copy';
import { detectSupport } from '../midi/access';

const support = detectSupport();

/** Lets the app through only where Web MIDI can work, and says why where it cannot. */
export function BrowserGate({ children }: { children: ReactNode }) {
  const t = useT();
  if (support.kind !== 'ok') {
    const reason = support.kind === 'insecure-context' ? 'insecure' : 'noWebMidi';
    return (
      <main className="gate">
        <p className="brand">{t('app.name')}</p>
        <h1>{t(`gate.${reason}.title`)}</h1>
        <p>{t(`gate.${reason}.body`)}</p>
      </main>
    );
  }
  return (
    <>
      {support.needsSysexPermissionNotice && (
        <p className="notice" role="note">
          {t('gate.firefoxNotice')}
        </p>
      )}
      {children}
    </>
  );
}
