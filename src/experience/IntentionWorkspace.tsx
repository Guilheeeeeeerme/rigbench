import { useEffect, useId, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useT } from '../copy';
import type { Translate } from '../copy';
import type {
  IntentionSession,
  LayerId,
  MusicalIntention,
  OperationResult,
  PedalRole,
  PreviewGroup,
  PreviewResult,
} from '../intentions/types';

const LAYERS: readonly LayerId[] = [
  'piano',
  'epiano',
  'strings',
  'pad',
  'organ',
  'harmonica',
  'sax',
  'brass',
  'bass',
];

const TESTS = ['silence', 'string', 'articulation', 'groove', 'validate'] as const;

export interface InstrumentChoice {
  id: string;
  label: string;
  note: string;
  confirmPickup: boolean;
  pickups: readonly { id: string; label: string }[];
  calibrations: readonly { id: string; label: string; note: string }[];
}

export interface SlotChoice {
  id: number;
  label: string;
}

export function IntentionWorkspace({
  session,
  instruments,
  slots,
  advanced,
}: {
  session: IntentionSession;
  instruments: readonly InstrumentChoice[];
  slots: readonly SlotChoice[];
  advanced?: ReactNode;
}) {
  const t = useT();
  const state = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  const confirmed = state.confirmed;
  const busy =
    state.blocked ||
    state.phase === 'applying' ||
    state.phase === 'saving' ||
    state.phase === 'verifying';
  const [instrumentId, setInstrumentId] = useState(instruments[0]?.id ?? '');
  const [calibrationId, setCalibrationId] = useState(instruments[0]?.calibrations[0]?.id ?? '');
  const [pickup, setPickup] = useState('');
  const [scale, setScale] = useState('');
  const [brand, setBrand] = useState('');
  const [playing, setPlaying] = useState('mixed');
  const [use, setUse] = useState('both');
  const [pending, setPending] = useState<MusicalIntention | null>(null);
  const [preview, setPreview] = useState<Extract<PreviewResult, { ok: true }> | null>(null);
  const [notice, setNotice] = useState<string>();
  const [slot, setSlot] = useState<number>(confirmed?.userSlot ?? slots[0]?.id ?? 0);
  const [acceptedSlot, setAcceptedSlot] = useState<number | null>(null);
  const [checks, setChecks] = useState<Record<string, 'ok' | 'issue'>>({});
  const [layerSlot, setLayerSlot] = useState<1 | 2>(1);
  const [layerId, setLayerId] = useState<LayerId>('piano');
  const [level, setLevel] = useState(80);
  const [feel, setFeel] = useState(confirmed?.gk?.playFeel ?? 3);
  const [cut, setCut] = useState(confirmed?.gk?.lowVelocityCut ?? 3);
  const [dynamics, setDynamics] = useState(confirmed?.gk?.velocityDynamics ?? 4);
  const [sens, setSens] = useState(confirmed?.gk?.sens[0] ?? 28);

  useEffect(() => {
    const gk = state.confirmed?.gk;
    if (!gk) return;
    setFeel(gk.playFeel);
    setCut(gk.lowVelocityCut);
    setDynamics(gk.velocityDynamics);
    setSens(gk.sens[0] ?? 0);
  }, [state.lastVerifiedAt, state.confirmed]);

  const instrument = instruments.find((item) => item.id === instrumentId) ?? instruments[0];

  const report = (result: OperationResult) => {
    if (result.ok) {
      setNotice(undefined);
      return;
    }
    if (result.code === 'refused' && result.control === 'expression') {
      setNotice(t('intention.refusedExpression'));
    } else if (result.code === 'refused') {
      setNotice(t('intention.refusedCtl'));
    } else if (result.code === 'timeout') setNotice(t('intention.timeout'));
    else if (result.code === 'mismatch') setNotice(t('intention.mismatch'));
    else if (result.code === 'unsupported') setNotice(t('intention.unsupported'));
    else if (result.code === 'blocked') setNotice(t('intention.blocked'));
    else setNotice(t('intention.failed'));
  };

  const ask = (intention: MusicalIntention) => {
    const plan = session.preview(intention);
    if (!plan.ok) {
      report(plan);
      return;
    }
    setPending(intention);
    setPreview(plan);
    setNotice(undefined);
  };

  const run = (intention: MusicalIntention) => {
    void session.apply(intention).then((result) => {
      report(result);
      if (result.ok) {
        setPending(null);
        setPreview(null);
      }
    });
  };

  const checked = (time: number | null) =>
    time == null
      ? t('intention.phases.verifying')
      : t('intention.lastCheck', new Date(time).toLocaleTimeString());

  return (
    <div className="mvp-workspace intention-workspace">
      <header className="mvp-header">
        <div>
          <h1>{t('intention.title')}</h1>
          <p className="mvp-preset-line">
            {confirmed?.patchName || t('intention.unnamed')}
            {confirmed?.slotLabel ? ` · ${confirmed.slotLabel}` : ''}
            {' · '}
            {checked(state.lastVerifiedAt)}
          </p>
        </div>
        <p className="status" role="status">
          {phaseLabel(t, state.phase)}
        </p>
      </header>

      <p className="mvp-callout">{t('intention.persistence')}</p>
      <p className="hint">{t('intention.cable')}</p>
      {confirmed && confirmed.recipeId == null && (
        <p className="mvp-callout">
          <strong>{t('intention.custom')}</strong> {t('intention.customHint')}
        </p>
      )}
      {confirmed?.tempDiffersFromUser && <p className="hint">{t('intention.tempDiffers')}</p>}
      {notice && (
        <p className="error" role="alert">
          {notice}
        </p>
      )}

      {(state.phase === 'applying' ||
        state.phase === 'saving' ||
        state.phase === 'verifying' ||
        state.phase === 'uncertain') && (
        <div className="intention-overlay" role="status" aria-live="polite">
          <p>{phaseLabel(t, state.phase)}</p>
          {state.phase === 'uncertain' && (
            <button type="button" onClick={() => void session.recover()}>
              {t('intention.recover')}
            </button>
          )}
        </div>
      )}

      {preview && pending && (
        <section className="mvp-callout">
          <h2>{t('intention.confirmTitle')}</h2>
          <p>
            {preview.scope === 'system'
              ? t('intention.scopeSystem')
              : preview.scope === 'both'
                ? t('intention.scopeBoth')
                : t('intention.scopePatch')}
          </p>
          <ul>
            {preview.groups.map((group) => (
              <li key={group}>{groupLabel(t, group)}</li>
            ))}
          </ul>
          <p className="hint">{t('intention.sentStays')}</p>
          <button type="button" className="primary" disabled={busy} onClick={() => run(pending)}>
            {t('intention.confirm')}
          </button>
          <button
            type="button"
            onClick={() => {
              setPending(null);
              setPreview(null);
            }}
          >
            {t('intention.cancel')}
          </button>
        </section>
      )}

      <section className="mvp-section">
        <h2>{t('intention.instrumentTitle')}</h2>
        <p className="hint">{t('intention.instrumentLead')}</p>
        <p className="hint">{t('intention.sessionOnly')}</p>
        <label>
          {t('intention.instrumentTitle')}
          <select
            value={instrument?.id ?? ''}
            disabled={busy}
            onChange={(event) => {
              const next = instruments.find((item) => item.id === event.target.value);
              setInstrumentId(event.target.value);
              setCalibrationId(next?.calibrations[0]?.id ?? '');
              setPickup('');
            }}
          >
            {instruments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        {instrument && <p className="hint">{instrument.note}</p>}
        <label>
          {t('intention.brand')}
          <input value={brand} onChange={(event) => setBrand(event.target.value)} disabled={busy} />
        </label>
        <p className="hint">{t('intention.brandHint')}</p>
        {instrument?.confirmPickup && (
          <label>
            {t('intention.pickup')}
            <select value={pickup} disabled={busy} onChange={(event) => setPickup(event.target.value)}>
              <option value="">{instrument.pickups[0]?.label ?? ''}</option>
              {instrument.pickups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {instrument && instrument.calibrations.length > 0 && (
          <label>
            {t('intention.touch')}
            <select
              value={calibrationId}
              disabled={busy}
              onChange={(event) => setCalibrationId(event.target.value)}
            >
              {instrument.calibrations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          {t('intention.playing')}
          <select value={playing} disabled={busy} onChange={(event) => setPlaying(event.target.value)}>
            <option value="finger">{t('intention.playingFinger')}</option>
            <option value="pick">{t('intention.playingPick')}</option>
            <option value="hard">{t('intention.playingHard')}</option>
            <option value="soft">{t('intention.playingSoft')}</option>
            <option value="mixed">{t('intention.playingMixed')}</option>
          </select>
        </label>
        <p className="hint">{t('intention.playingHint')}</p>
        <label>
          {t('intention.use')}
          <select value={use} disabled={busy} onChange={(event) => setUse(event.target.value)}>
            <option value="base">{t('intention.useBase')}</option>
            <option value="solo">{t('intention.useSolo')}</option>
            <option value="both">{t('intention.useBoth')}</option>
          </select>
        </label>
        <label>
          {t('intention.scale')}
          <input
            inputMode="numeric"
            value={scale}
            disabled={busy}
            onChange={(event) => setScale(event.target.value)}
          />
        </label>
        <p className="hint">{t('intention.scaleHint')}</p>
        <button
          type="button"
          className="primary"
          disabled={busy || !instrument}
          onClick={() => {
            if (!instrument) return;
            const scaleMm = scale.trim() === '' ? undefined : Number(scale);
            ask({
              kind: 'instrument',
              profileId: instrument.id,
              calibrationId: calibrationId || undefined,
              puType: pickup || undefined,
              scaleMm: scaleMm != null && Number.isFinite(scaleMm) ? scaleMm : undefined,
            });
          }}
        >
          {t('intention.activate')}
        </button>
      </section>

      <section className="mvp-section">
        <h2>{t('intention.touch')}</h2>
        <p className="hint">{t('intention.touchHint')}</p>
        <Range
          label={t('intention.touch')}
          min={1}
          max={5}
          value={feel}
          disabled={busy}
          onChange={setFeel}
          onCommit={(value) => void session.apply({ kind: 'calibration', playFeel: value }).then(report)}
        />
        <p className="hint">{t('intention.cutHint')}</p>
        <Range
          label={t('intention.cut')}
          min={0}
          max={10}
          value={cut}
          disabled={busy}
          onChange={setCut}
          onCommit={(value) =>
            void session.apply({ kind: 'calibration', lowVelocityCut: value }).then(report)
          }
        />
        <p className="hint">{t('intention.dynamicsHint')}</p>
        <Range
          label={t('intention.dynamics')}
          min={0}
          max={10}
          value={dynamics}
          disabled={busy}
          onChange={setDynamics}
          onCommit={(value) =>
            void session.apply({ kind: 'calibration', velocityDynamics: value }).then(report)
          }
        />
        <p className="hint">{t('intention.balanceHint')}</p>
        <Range
          label={t('intention.balance')}
          min={0}
          max={100}
          value={sens}
          disabled={busy}
          onChange={setSens}
          onCommit={(value) => void session.apply({ kind: 'calibration', sens: value }).then(report)}
        />
        {!session.capabilities.supportsArticulation && <p className="hint">{t('intention.noArticulation')}</p>}
      </section>

      <section className="mvp-section">
        <h2>{t('intention.testsTitle')}</h2>
        <p className="hint">{t('intention.testsLead')}</p>
        {TESTS.map((step) => (
          <div key={step} className="intention-test">
            <p>{testLabel(t, step)}</p>
            <button type="button" disabled={busy} onClick={() => setChecks((prev) => ({ ...prev, [step]: 'ok' }))}>
              {t('intention.testOk')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setChecks((prev) => ({ ...prev, [step]: 'issue' }))}
            >
              {t('intention.testIssue')}
            </button>
            {checks[step] && <span className="hint">{checks[step] === 'ok' ? t('intention.testOk') : t('intention.testIssue')}</span>}
          </div>
        ))}
      </section>

      <section className="mvp-section">
        <h2>{t('intention.title')}</h2>
        <ModeButton
          busy={busy}
          title={t('intention.modeOriginal')}
          hint={t('intention.modeOriginalHint')}
          onClick={() => run({ kind: 'mode', mode: 'original' })}
        />
        <ModeButton
          busy={busy}
          title={t('intention.modeAccomp')}
          hint={t('intention.modeAccompHint')}
          onClick={() => run({ kind: 'mode', mode: 'accompaniment' })}
        />
        <ModeButton
          busy={busy}
          title={t('intention.modeBoth')}
          hint={t('intention.modeBothHint')}
          onClick={() => run({ kind: 'mode', mode: 'both' })}
        />
      </section>

      <section className="mvp-section">
        <h2>{t('intention.layersTitle')}</h2>
        <label>
          {t('intention.slot', layerSlot)}
          <select
            value={layerSlot}
            disabled={busy}
            onChange={(event) => setLayerSlot(Number(event.target.value) as 1 | 2)}
          >
            <option value={1}>{t('intention.slot', 1)}</option>
            {session.capabilities.maxSynthLayers > 1 && <option value={2}>{t('intention.slot', 2)}</option>}
          </select>
        </label>
        <div className="intention-cards">
          {LAYERS.map((id) => (
            <button
              key={id}
              type="button"
              className={id === layerId ? 'intention-card is-selected' : 'intention-card'}
              disabled={busy}
              onClick={() => setLayerId(id)}
            >
              {layerLabel(t, id)}
            </button>
          ))}
        </div>
        <Range label={t('intention.level')} min={0} max={100} value={level} disabled={busy} onChange={setLevel} />
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => run({ kind: 'layer', slot: layerSlot, layer: layerId, level })}
        >
          {t('intention.applyLayer')}
        </button>
        <button type="button" disabled={busy} onClick={() => run({ kind: 'clear-layer', slot: layerSlot })}>
          {t('intention.clearLayer')}
        </button>
        {confirmed && (
          <ul>
            {confirmed.layers.map((layer) => (
              <li key={layer.slot}>
                {t('intention.slot', layer.slot)}: {layer.on ? layer.toneName : t('intention.pedalOff')}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mvp-section">
        <h2>{t('intention.effectsTitle')}</h2>
        <p className="hint">{t('intention.effectsHint')}</p>
        {(
          [
            ['dry', 'intention.effectDry'],
            ['small-room', 'intention.effectRoom'],
            ['soft-ambience', 'intention.effectAmb'],
            ['solo-delay', 'intention.effectDelay'],
          ] as const
        ).map(([effect, key]) => (
          <button key={effect} type="button" disabled={busy} onClick={() => run({ kind: 'effect', effect })}>
            {t(key)}
          </button>
        ))}
      </section>

      <section className="mvp-section">
        <h2>{t('intention.pedalsTitle')}</h2>
        <p>{t('intention.expressionNow', pedalLabel(t, confirmed?.expression ?? 'off'))}</p>
        <p>{t('intention.ctlNow', pedalLabel(t, confirmed?.ctl ?? 'off'))}</p>
        <h3>{t('intention.recipesTitle')}</h3>
        <p className="hint">{t('intention.grade')}</p>
        <button type="button" disabled={busy} onClick={() => ask({ kind: 'recipe', id: 'nylon-harmonica-exp' })}>
          {t('intention.recipeHarmonica')}
        </button>
        <p className="hint">{t('intention.recipeHarmonicaHint')}</p>
        <button
          type="button"
          disabled={busy || session.capabilities.maxSynthLayers < 2}
          onClick={() => ask({ kind: 'recipe', id: 'nylon-piano-strings-ctl' })}
        >
          {t('intention.recipeStrings')}
        </button>
        <p className="hint">{t('intention.recipeStringsHint')}</p>
        <button type="button" disabled={busy} onClick={() => ask({ kind: 'recipe', id: 'solo-without-guitar' })}>
          {t('intention.recipeSolo')}
        </button>
        <p className="hint">{t('intention.recipeSoloHint')}</p>
      </section>

      <section className="mvp-section">
        <h2>{t('intention.save')}</h2>
        <p className="hint">{t('intention.bankBlocked')}</p>
        {confirmed?.userSlot == null && <p className="hint">{t('intention.noUserSlot')}</p>}
        <label>
          {t('intention.saveSlot')}
          <select
            value={slot}
            disabled={busy}
            onChange={(event) => {
              setSlot(Number(event.target.value));
              setAcceptedSlot(null);
            }}
          >
            {slots.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => {
            if (acceptedSlot !== slot) {
              setAcceptedSlot(slot);
              setNotice(t('intention.saveConfirm'));
              return;
            }
            void session.save(slot).then((result) => {
              if (result.ok) setNotice(t('intention.saved'));
              else {
                report(result);
                setNotice(t('intention.saveFailed'));
              }
            });
          }}
        >
          {acceptedSlot === slot ? t('intention.saveAgain') : t('intention.save')}
        </button>
        {state.canRestore && (
          <button type="button" disabled={busy} onClick={() => void session.restore().then(report)}>
            {t('intention.restore')}
          </button>
        )}
      </section>

      {advanced}
    </div>
  );
}

function Range({
  label,
  min,
  max,
  value,
  disabled,
  onChange,
  onCommit,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
}) {
  const id = useId();
  return (
    <label className="intention-range" htmlFor={id}>
      {label}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={(event) => onCommit?.(Number(event.currentTarget.value))}
        onKeyUp={(event) => onCommit?.(Number(event.currentTarget.value))}
        onBlur={(event) => onCommit?.(Number(event.currentTarget.value))}
      />
      <output htmlFor={id}>{value}</output>
    </label>
  );
}

function ModeButton({
  title,
  hint,
  busy,
  onClick,
}: {
  title: string;
  hint: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="intention-card" disabled={busy} onClick={onClick}>
      <strong>{title}</strong>
      <span className="hint">{hint}</span>
    </button>
  );
}

function phaseLabel(t: Translate, phase: string): string {
  switch (phase) {
    case 'applying':
      return t('intention.phases.applying');
    case 'applied':
      return t('intention.phases.applied');
    case 'saving':
      return t('intention.phases.saving');
    case 'saved':
      return t('intention.phases.saved');
    case 'uncertain':
      return t('intention.phases.uncertain');
    case 'verifying':
      return t('intention.phases.verifying');
    case 'reading':
      return t('intention.phases.reading');
    default:
      return t('intention.phases.idle');
  }
}

function groupLabel(t: Translate, group: PreviewGroup): string {
  switch (group) {
    case 'normal':
      return t('intention.groups.normal');
    case 'layer1':
      return t('intention.groups.layer1');
    case 'layer2':
      return t('intention.groups.layer2');
    case 'expression':
      return t('intention.groups.expression');
    case 'ctl':
      return t('intention.groups.ctl');
    case 'effect':
      return t('intention.groups.effect');
    case 'gkTouch':
      return t('intention.groups.gkTouch');
    case 'gkCut':
      return t('intention.groups.gkCut');
    case 'gkDynamics':
      return t('intention.groups.gkDynamics');
    case 'gkBalance':
      return t('intention.groups.gkBalance');
    case 'gkPickup':
      return t('intention.groups.gkPickup');
    case 'gkName':
      return t('intention.groups.gkName');
    case 'gkScale':
      return t('intention.groups.gkScale');
    case 'systemPedals':
      return t('intention.groups.systemPedals');
  }
}

function pedalLabel(t: Translate, role: PedalRole): string {
  switch (role) {
    case 'off':
      return t('intention.pedalOff');
    case 'layer-1':
      return t('intention.pedalLayer1');
    case 'layer-2':
      return t('intention.pedalLayer2');
    case 'toggle-1':
      return t('intention.pedalToggle1');
    case 'toggle-2':
      return t('intention.pedalToggle2');
    default:
      return t('intention.pedalOther');
  }
}

function layerLabel(t: Translate, id: LayerId): string {
  switch (id) {
    case 'piano':
      return t('intention.layers.piano');
    case 'epiano':
      return t('intention.layers.epiano');
    case 'strings':
      return t('intention.layers.strings');
    case 'pad':
      return t('intention.layers.pad');
    case 'organ':
      return t('intention.layers.organ');
    case 'harmonica':
      return t('intention.layers.harmonica');
    case 'sax':
      return t('intention.layers.sax');
    case 'brass':
      return t('intention.layers.brass');
    case 'bass':
      return t('intention.layers.bass');
  }
}

function testLabel(t: Translate, step: (typeof TESTS)[number]): string {
  switch (step) {
    case 'silence':
      return t('intention.testSilence');
    case 'string':
      return t('intention.testString');
    case 'articulation':
      return t('intention.testArticulation');
    case 'groove':
      return t('intention.testGroove');
    case 'validate':
      return t('intention.testValidate');
  }
}