/**
 * The little free drawings that say what an instrument is without words:
 * four sound sources (guitar pickup, modeled guitar, two PCM synths) and the
 * sound shapers (amp, chorus, delay, reverb, EQ, master level).
 */

export function GuitarIcon(props: { title: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} role="img" aria-label={props.title}>
      <title>{props.title}</title>
      <path
        d="M4 15.5c-1.2 2 .4 4.5 2.5 4.5 1.9 0 2.6-1.3 3.8-2.2 1-.8 1.8-1 2.7-1.6 2.6-1.7 6.6-5.6 9-8-1.4-.6-2-1.3-2.4-2.7-2.4 2.4-6.3 6.4-8 9-1.3 2-2.6 2.3-3.4 2.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6.5" cy="17.5" r="1.1" fill="currentColor" />
      <circle cx="4.6" cy="16" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function ModeledIcon(props: { title: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} role="img" aria-label={props.title}>
      <title>{props.title}</title>
      <path
        d="M3 16c2 0 2-2.5 4-2.5S9 16 11 16s2-2.5 4-2.5 2 2.5 4 2.5 2-1.5 2-1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2 20c1.6 0 1.6-2 3.2-2s1.6 2 3.2 2 1.6-2 3.2-2 1.6 2 3.2 2 1.6-2 3.2-2 1.6 2 3 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M3 6l1.5 6 2-4 2 5 1.5-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
    </svg>
  );
}

export function PcmIcon(props: { title: string; number?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} role="img" aria-label={props.title}>
      <title>{props.title}</title>
      <rect
        x="2.5"
        y="7"
        width="19"
        height="10"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6 7v10M9 7v6M12 7v10M15 7v6M18 7v10"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.8"
      />
      {props.number !== undefined && (
        <text
          x="21.5"
          y="20.5"
          textAnchor="middle"
          fontSize="7"
          fontWeight="700"
          fill="currentColor"
        >
          {props.number}
        </text>
      )}
    </svg>
  );
}

export function AmpIcon(props: { title: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} role="img" aria-label={props.title}>
      <title>{props.title}</title>
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="8.5" cy="9.5" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="16" cy="9.5" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.5 15.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function ReverbIcon(props: { title: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} role="img" aria-label={props.title}>
      <title>{props.title}</title>
      <path
        d="M12 20V9c0-2.2 1.8-4 4-4 .9 0 1.7.3 2.4.8M12 20c2.8 0 5-2.2 5-5 0-2.8-2.2-5-5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="18" r="2.2" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export function DelayIcon(props: { title: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} role="img" aria-label={props.title}>
      <title>{props.title}</title>
      <path
        d="M4 6v12c0-4 2.5-6 6-6s6 2 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9 9v8c0-3 2-4.5 4-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="18.5" cy="18" r="1.8" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

export function EqIcon(props: { title: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} role="img" aria-label={props.title}>
      <title>{props.title}</title>
      <path d="M6 4v16M12 4v16M18 4v16" stroke="currentColor" strokeWidth="1.3" />
      <rect x="4.2" y="8" width="3.6" height="3" rx="1" fill="currentColor" />
      <rect x="10.2" y="13" width="3.6" height="3" rx="1" fill="currentColor" />
      <rect x="16.2" y="5.5" width="3.6" height="3" rx="1" fill="currentColor" />
    </svg>
  );
}

export function VolumeIcon(props: { title: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} role="img" aria-label={props.title}>
      <title>{props.title}</title>
      <path
        d="M4 9h3.5L12 5v14l-4.5-4H4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Every icon the screens show, keyed so the data layer can reference them by name. */
export type IconKind =
  'guitar' | 'modeled' | 'pcm1' | 'pcm2' | 'amp' | 'chorus' | 'delay' | 'reverb' | 'eq' | 'master';

export function InstrumentIcon({ kind, title }: { kind: IconKind; title: string }) {
  switch (kind) {
    case 'guitar':
      return <GuitarIcon title={title} />;
    case 'modeled':
      return <ModeledIcon title={title} />;
    case 'pcm1':
      return <PcmIcon title={title} number={1} />;
    case 'pcm2':
      return <PcmIcon title={title} number={2} />;
    case 'amp':
      return <AmpIcon title={title} />;
    case 'chorus':
      return <ModeledIcon title={title} />;
    case 'delay':
      return <DelayIcon title={title} />;
    case 'reverb':
      return <ReverbIcon title={title} />;
    case 'eq':
      return <EqIcon title={title} />;
    case 'master':
      return <VolumeIcon title={title} />;
  }
}
