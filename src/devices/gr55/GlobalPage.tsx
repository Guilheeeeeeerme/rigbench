import { useMemo, useState, useSyncExternalStore } from 'react';
import { useT } from '../../copy';
import type { Gr55Editor } from './editor';
import { FieldControl } from './FieldControl';
import { asSnapshotSource, snapshotFieldHost } from './snapshotHost';
import { gkSet, SYSTEM } from './systemMap';
import { SystemGate, useSystem, useSystemVersion } from './SystemParts';

/**
 * Pedal-wide (SYSTEM) settings. Writes DT1 then full snapshot. No staging.
 */
export function GlobalPage({
  editor,
  onError,
}: {
  editor: Gr55Editor;
  onError: (error: unknown) => void;
}) {
  const t = useT();
  const system = useSystem();
  useSystemVersion(system);
  useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  const source = useMemo(() => asSnapshotSource({ editor, system }), [editor, system]);
  const host = useMemo(
    () => snapshotFieldHost(system, source, onError),
    [system, source, onError],
  );
  const activeSet =
    system.read(SYSTEM.common.gkSetSelect).ok === true
      ? (system.read(SYSTEM.common.gkSetSelect) as { ok: true; value: number }).value + 1
      : 1;
  const [setNumber, setSetNumber] = useState(activeSet);
  const set = gkSet(setNumber);

  return (
    <div className="app-page global-page">
      <header className="app-page-header">
        <h1>{t('gr55.navGlobal')}</h1>
        <p className="hint">{t('gr55.workspace.pedalHint')}</p>
      </header>

      <SystemGate>
        <section className="patch-section">
          <h2>{t('system.outputTitle')}</h2>
          <div className="fields">
            <FieldControl
              editor={host}
              field={SYSTEM.common.outputSelect}
              label={t('system.fields.outputSelect')}
              enumGroup="outputSelect"
            />
            <FieldControl
              editor={host}
              field={SYSTEM.common.guitarOutSource}
              label={t('system.fields.guitarOut')}
              enumGroup="guitarOut"
            />
          </div>
        </section>

        <section className="patch-section">
          <h2>{t('system.midiTitle')}</h2>
          <div className="fields">
            <FieldControl
              editor={host}
              field={SYSTEM.common.patchControlChannel}
              label={t('system.fields.channel')}
              picker
            />
            <FieldControl
              editor={host}
              field={SYSTEM.common.rxSwitch}
              label={t('system.fields.rxSwitch')}
            />
            <FieldControl
              editor={host}
              field={SYSTEM.common.txSwitch}
              label={t('system.fields.txSwitch')}
            />
            <FieldControl
              editor={host}
              field={SYSTEM.common.guitarToMidiSwitch}
              label={t('system.fields.guitarToMidi')}
            />
            <FieldControl
              editor={host}
              field={SYSTEM.common.guitarToMidiMode}
              label={t('system.fields.guitarToMidiMode')}
              enumGroup="midiMode"
            />
            <FieldControl
              editor={host}
              field={SYSTEM.common.usbDirectMonitor}
              label={t('system.fields.usbMonitor')}
            />
          </div>
        </section>

        <section className="patch-section">
          <h2>{t('system.pedalsTitle')}</h2>
          <div className="fields">
            <FieldControl
              editor={host}
              field={SYSTEM.pedals.ctlFunction}
              label={t('system.fields.ctl')}
              enumGroup="pedalFunction"
            />
            <FieldControl
              editor={host}
              field={SYSTEM.pedals.expOffFunction}
              label={t('system.fields.expOff')}
              enumGroup="pedalFunction"
            />
            <FieldControl
              editor={host}
              field={SYSTEM.pedals.expOnFunction}
              label={t('system.fields.expOn')}
              enumGroup="pedalFunction"
            />
            <FieldControl
              editor={host}
              field={SYSTEM.pedals.expSwFunction}
              label={t('system.fields.expSw')}
              enumGroup="pedalFunction"
            />
            <FieldControl
              editor={host}
              field={SYSTEM.pedals.gkVolFunction}
              label={t('system.fields.gkVol')}
              enumGroup="pedalFunction"
            />
            <FieldControl
              editor={host}
              field={SYSTEM.pedals.gkS1Function}
              label={t('system.fields.gkS1')}
              enumGroup="pedalFunction"
            />
            <FieldControl
              editor={host}
              field={SYSTEM.pedals.gkS2Function}
              label={t('system.fields.gkS2')}
              enumGroup="pedalFunction"
            />
          </div>
        </section>

        <section className="patch-section">
          <h2>{t('gk.title')}</h2>
          <label>
            {t('system.fields.activeGkSet')}
            <select
              value={setNumber}
              onChange={(event) => setSetNumber(Number(event.target.value))}
            >
              {Array.from({ length: 10 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>
          </label>
          <div className="fields">
            <FieldControl
              editor={host}
              field={SYSTEM.common.gkSetSelect}
              label={t('system.fields.activeGkSet')}
              picker
            />
            <FieldControl editor={host} field={set.name} label={t('gk.name')} />
            <FieldControl
              editor={host}
              field={set.puType}
              label={t('gk.puType')}
              enumGroup="puType"
            />
            <FieldControl editor={host} field={set.scale} label={t('gk.scale')} />
            <FieldControl
              editor={host}
              field={set.puPhase}
              label={t('gk.puPhase')}
              enumGroup="polarity"
            />
            <FieldControl
              editor={host}
              field={set.puDirection}
              label={t('gk.puDirection')}
              enumGroup="polarity"
            />
            <FieldControl
              editor={host}
              field={set.s1s2Position}
              label={t('gk.s1s2')}
              enumGroup="polarity"
            />
            <FieldControl editor={host} field={set.normalPuGain} label={t('gk.normalGain')} />
            {(
              [
                set.string1Sens,
                set.string2Sens,
                set.string3Sens,
                set.string4Sens,
                set.string5Sens,
                set.string6Sens,
              ] as const
            ).map((field, index) => (
              <FieldControl
                key={field.address}
                editor={host}
                field={field}
                label={t('gk.string', index + 1)}
              />
            ))}
          </div>
        </section>
      </SystemGate>
    </div>
  );
}
