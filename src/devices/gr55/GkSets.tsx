import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../copy';
import type { MidiSession } from '../../midi/session';
import type { Gr55Editor } from './editor';
import { FieldControl } from './FieldControl';
import { TEMPORARY_PATCH, TEMPORARY_PATCH_ADDRESS } from './patchLayout';
import { deviceHref } from './routes';
import { loadSetup, saveSetup } from './setupState';
import { slotsOfMode } from './slots';
import { useSync } from './sync/SyncBadge';
import { ApplyBar, SystemGate, useSystem, useSystemVersion } from './SystemParts';
import { TopNav } from './TopNav';
import {
  GK_SET_COUNT,
  GK_STRING_SENS,
  SCALE_BASE_MM,
  SCALE_MAX_MM,
  SYSTEM,
  gkSet,
} from './systemMap';
import type { Gr55System } from './systemState';

const NOTE_ON = 0x90;
const STRINGS = 6;

function setName(system: Gr55System, number: number): string {
  const name = system.read(gkSet(number).name);
  return name.ok ? name.value.replace(/[^ -~]/g, ' ').trim() : '';
}

function activeSet(system: Gr55System): number {
  const active = system.read(SYSTEM.common.gkSetSelect);
  return active.ok ? active.value + 1 : 1;
}

/**
 * How hard the pedal heard the last note on each string, from the notes it sends when
 * Guitar to MIDI is on. In mono mode each string has its own channel, counted up from
 * the first string's; in poly mode they share one and so share one reading.
 */
function useStringLevels(session: MidiSession, system: Gr55System) {
  const [levels, setLevels] = useState<number[]>(() => Array<number>(STRINGS).fill(0));
  const channels = system.readApplied(SYSTEM.common.guitarToMidiStringChannel);
  const mode = system.readApplied(SYSTEM.common.guitarToMidiMode);
  const firstChannel = channels.ok ? Number(String(channels.value).split('-')[0]) - 1 : 0;
  const poly = mode.ok && mode.value === 'POLY';

  useEffect(
    () =>
      session.onChannelMessage((data) => {
        const velocity = data[2] ?? 0;
        if ((data[0] & 0xf0) !== NOTE_ON || velocity === 0) {
          return;
        }
        const string = (data[0] & 0x0f) - firstChannel;
        setLevels((current) =>
          poly
            ? current.map(() => velocity)
            : string >= 0 && string < STRINGS
              ? current.map((level, index) => (index === string ? velocity : level))
              : current,
        );
      }),
    [session, firstChannel, poly],
  );

  return { levels, reset: () => setLevels(Array<number>(STRINGS).fill(0)) };
}

/** Scale length: any length the pedal takes, with the two usual ones a click away. */
function ScaleControl({ system, number }: { system: Gr55System; number: number }) {
  const t = useT();
  const field = gkSet(number).scale;
  const raw = system.read(field);
  const value = raw.ok ? raw.value : 0;
  const span = SCALE_MAX_MM - SCALE_BASE_MM;
  // Above the longest plain length sit the pedal's named presets, which stay as they are.
  const isPreset = value > span;
  const set = (mm: number) =>
    system.write(field, Math.min(SCALE_MAX_MM, Math.max(SCALE_BASE_MM, mm)) - SCALE_BASE_MM);
  const id = `gk-scale-${number}`;
  return (
    <div className="field">
      <span className="field-head">
        <label htmlFor={id}>{t('gk.scale')}</label>
        <span className="scope chip-blue">
          <span className="dot" aria-hidden="true" />
          {t('gr55.workspace.pedal')}
        </span>
      </span>
      <span className="control scale-control">
        <input
          id={id}
          type="number"
          min={SCALE_BASE_MM}
          max={SCALE_MAX_MM}
          value={isPreset ? '' : value + SCALE_BASE_MM}
          placeholder={isPreset ? t('gk.scalePresetOnPedal') : undefined}
          onChange={(event) => {
            const mm = Number(event.target.value);
            if (Number.isFinite(mm) && mm >= SCALE_BASE_MM) {
              set(mm);
            }
          }}
        />
        <button type="button" onClick={() => set(648)}>
          {t('gk.scaleSt')}
        </button>
        <button type="button" onClick={() => set(628)}>
          {t('gk.scaleLp')}
        </button>
      </span>
    </div>
  );
}

/** The six sensitivities, each beside a bar that shows how hard the pedal hears the string. */
function StringCalibration({
  session,
  system,
  number,
}: {
  session: MidiSession;
  system: Gr55System;
  number: number;
}) {
  const t = useT();
  const { levels, reset } = useStringLevels(session, system);
  const guitarToMidi = system.readApplied(SYSTEM.common.guitarToMidiSwitch);
  const listening = guitarToMidi.ok && guitarToMidi.value;
  const heard = levels.some((level) => level > 0);
  const set = gkSet(number);

  return (
    <div className="calibration">
      <h3>{t('gk.sensTitle')}</h3>
      <p className="hint">{t('gk.sensIntro')}</p>
      {!listening && (
        <p className="notice">
          {t('gk.meterNeedsMidi')}{' '}
          <button
            type="button"
            onClick={() => system.write(SYSTEM.common.guitarToMidiSwitch, true)}
          >
            {t('gk.meterEnable')}
          </button>
        </p>
      )}
      <ol className="strings">
        {GK_STRING_SENS.map((key, index) => (
          <li key={key}>
            <FieldControl editor={system} field={set[key]} label={t('gk.string', index + 1)} />
            <meter
              className="string-meter"
              min={0}
              max={127}
              high={120}
              optimum={100}
              value={levels[index]}
              aria-label={t('gk.string', index + 1)}
            />
          </li>
        ))}
      </ol>
      {listening && (
        <p className="hint">
          {heard ? t('gk.meterHint') : t('gk.meterWaiting')}{' '}
          {heard && (
            <button type="button" onClick={reset}>
              {t('gk.meterReset')}
            </button>
          )}
        </p>
      )}
    </div>
  );
}

/** Everything one GK set holds, as controls that stage their changes. */
export function GkSetForm({
  editor,
  session,
  number,
}: {
  editor: Gr55Editor;
  session: MidiSession;
  number: number;
}) {
  const t = useT();
  const system = useSystem();
  useSystemVersion(system);
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  const [note, setNote] = useState(() => loadSetup().gkNotes[number] ?? '');
  const set = gkSet(number);
  const noteId = `gk-note-${number}`;

  const keepNote = (next: string) => {
    setNote(next);
    const setup = loadSetup();
    saveSetup({ ...setup, gkNotes: { ...setup.gkNotes, [number]: next } });
  };

  return (
    <div className="gk-form">
      <div className="fields">
        <FieldControl editor={system} field={set.name} label={t('gk.name')} />
        <div className="field">
          <span className="field-head">
            <label htmlFor={noteId}>{t('gk.instrumentNote')}</label>
          </span>
          <span className="control">
            <input
              id={noteId}
              type="text"
              value={note}
              placeholder={t('gk.instrumentNotePlaceholder')}
              onChange={(event) => keepNote(event.target.value)}
            />
          </span>
        </div>
        <FieldControl
          editor={system}
          field={set.puType}
          label={t('gk.puType')}
          enumGroup={gkMode === 'BASS' ? 'puTypeBass' : 'puType'}
        />
        {gkMode === 'GUITAR' && (
          <>
            <ScaleControl system={system} number={number} />
            <FieldControl
              editor={system}
              field={set.puPhase}
              label={t('gk.puPhase')}
              enumGroup="polarity"
            />
            <FieldControl
              editor={system}
              field={set.puDirection}
              label={t('gk.puDirection')}
              enumGroup="polarity"
            />
            <FieldControl
              editor={system}
              field={set.s1s2Position}
              label={t('gk.s1s2')}
              enumGroup="polarity"
            />
            <FieldControl editor={system} field={set.normalPuGain} label={t('gk.normalGain')} />
          </>
        )}
      </div>
      {gkMode === 'GUITAR' ? (
        <>
          <p className="hint">{t('gk.puPhaseHint')}</p>
          <StringCalibration session={session} system={system} number={number} />
        </>
      ) : (
        <p className="notice">{t('gk.bassLimited')}</p>
      )}
    </div>
  );
}

/** How many slots leave their GK set to the system, read from the synced copies. */
function FollowingPatches({ editor }: { editor: Gr55Editor }) {
  const t = useT();
  const sync = useSync();
  useSyncExternalStore(sync.subscribe, sync.slotsSnapshot);
  const field = TEMPORARY_PATCH.common.gkSet;
  const offset = field.address - TEMPORARY_PATCH_ADDRESS;
  const slots = slotsOfMode(editor.gkMode);
  let read = 0;
  let following = 0;
  for (const slot of slots) {
    const record = sync.slot(slot.userPatchNumber);
    if (!record) {
      continue;
    }
    read++;
    try {
      if (field.definition.type.decode(record.bytes, offset, field.definition.size) === 'SYSTEM') {
        following++;
      }
    } catch {
      // A byte the map has no label for: not a slot that follows the system.
    }
  }
  return (
    <p className="hint">
      {read < slots.length
        ? t('gk.patchesUnknown')
        : `${t('gk.patchesFollowing', following)} ${t('gk.patchesFollowingHint')}`}
    </p>
  );
}

/** The ten GK sets as cards: pick the one in use, open one to edit it. */
export function GkSetList({ editor, session }: { editor: Gr55Editor; session: MidiSession }) {
  const t = useT();
  const system = useSystem();
  useSystemVersion(system);
  const active = activeSet(system);
  const [open, setOpen] = useState(active);
  const notes = loadSetup().gkNotes;

  return (
    <div className="gk-sets">
      <ol className="gk-list">
        {Array.from({ length: GK_SET_COUNT }, (_, index) => index + 1).map((number) => (
          <li key={number} className={number === open ? 'gk-card is-open' : 'gk-card'}>
            <button
              type="button"
              className="gk-card-head"
              aria-expanded={number === open}
              onClick={() => setOpen(number)}
            >
              <span className="gk-number">{number}</span>
              <span className="gk-name">
                {setName(system, number) || t('gk.unnamed')}
                {notes[number] && <small>{notes[number]}</small>}
              </span>
              {number === active && <span className="gk-in-use">{t('gk.inUse')}</span>}
            </button>
          </li>
        ))}
      </ol>
      <section className="section gk-detail">
        <h2>
          {t('gk.set', open)}{' '}
          <span className="scope chip-blue">
            <span className="dot" aria-hidden="true" />
            {t('gr55.workspace.pedal')}
          </span>
        </h2>
        <div className="actions">
          <button
            type="button"
            disabled={open === active}
            className={open === active ? undefined : 'primary'}
            onClick={() => system.write(SYSTEM.common.gkSetSelect, open - 1)}
          >
            {open === active ? t('gk.inUse') : t('gk.use')}
          </button>
        </div>
        <FollowingPatches editor={editor} />
        <GkSetForm key={open} editor={editor} session={session} number={open} />
      </section>
    </div>
  );
}

/** The GK set editor as its own screen, under Device. */
export function GkSetsScreen({
  editor,
  session,
  onError,
}: {
  editor: Gr55Editor;
  session: MidiSession;
  onError: (error: unknown) => void;
}) {
  const t = useT();
  return (
    <div className="device">
      <TopNav current="device" />
      <p>
        <Link to={deviceHref}>← {t('gk.back')}</Link>
      </p>
      <h1>{t('gk.title')}</h1>
      <p className="hint">{t('gk.intro')}</p>
      <SystemGate>
        <GkSetList editor={editor} session={session} />
        <ApplyBar onError={onError} />
      </SystemGate>
    </div>
  );
}
