import { useEffect, useId, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useT } from '../copy';
import type { Translate } from '../copy';
import type {
  ConfirmedView,
  EffectId,
  IntentionSession,
  LayerId,
  MusicalIntention,
  OperationResult,
  PedalRole,
  PreviewGroup,
  PreviewResult,
  RecipeId,
  SoundMode,
} from '../intentions/types';

const TONES: readonly LayerId[] = [
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

const RECIPES: readonly RecipeId[] = [
  'nylon-harmonica-exp',
  'nylon-piano-strings-ctl',
  'solo-without-guitar',
];

const EFFECTS: readonly EffectId[] = ['dry', 'small-room', 'soft-ambience', 'solo-delay'];

const MODES: readonly SoundMode[] = ['original', 'accompaniment', 'both'];

type SheetKind = 'pcm' | 'recipe' | 'save' | 'guitar';

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
    state.phase === 'verifying' ||
    state.phase === 'reading';
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [pcmSlot, setPcmSlot] = useState<1 | 2>(1);
  const [tone, setTone] = useState<LayerId | null>(null);
  const [level, setLevel] = useState(80);
  const [instrumentId, setInstrumentId] = useState(instruments[0]?.id ?? '');
  const [calibrationId, setCalibrationId] = useState(instruments[0]?.calibrations[0]?.id ?? '');
  const [pickup, setPickup] = useState('');
  const [scale, setScale] = useState('');
  const [feel, setFeel] = useState(confirmed?.gk?.playFeel ?? 3);
  const [cut, setCut] = useState(confirmed?.gk?.lowVelocityCut ?? 3);
  const [dynamics, setDynamics] = useState(confirmed?.gk?.velocityDynamics ?? 4);
  const [sens, setSens] = useState(confirmed?.gk?.sens[0] ?? 28);
  const [pending, setPending] = useState<MusicalIntention | null>(null);
  const [preview, setPreview] = useState<Extract<PreviewResult, { ok: true }> | null>(null);
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    const gk = state.confirmed?.gk;
    if (!gk) return;
    setFeel(gk.playFeel);
    setCut(gk.lowVelocityCut);
    setDynamics(gk.velocityDynamics);
    setSens(gk.sens[0] ?? 0);
  }, [state.lastVerifiedAt, state.confirmed]);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSheet(null);
        setPending(null);
        setPreview(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  const instrument = instruments.find((item) => item.id === instrumentId) ?? instruments[0];
  const mode = confirmed ? confirmedMode(confirmed) : null;
  const slotIndex = slots.findIndex((item) => item.id === confirmed?.userSlot);
  const previousSlot = slotIndex >= 0 ? slots[(slotIndex - 1 + slots.length) % slots.length] : undefined;
  const nextSlot = slotIndex >= 0 ? slots[(slotIndex + 1) % slots.length] : undefined;

  const chooseSlot = (id: number | undefined) => {
    if (id == null) return;
    void session.selectSlot(id).then(report);
  };

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

  const closeSheet = () => {
    setSheet(null);
    setPending(null);
    setPreview(null);
  };

  const run = (intention: MusicalIntention, closeOnOk = false) => {
    void session.apply(intention).then((result) => {
      report(result);
      if (result.ok && closeOnOk) closeSheet();
    });
  };

  const ask = (intention: MusicalIntention, kind: SheetKind) => {
    const plan = session.preview(intention);
    if (!plan.ok) {
      report(plan);
      return;
    }
    setPending(intention);
    setPreview(plan);
    setNotice(undefined);
    setSheet(kind);
  };

  const applyPending = () => {
    if (!pending) return;
    const intention = pending;
    void session.apply(intention).then((result) => {
      report(result);
      if (result.ok) closeSheet();
    });
  };

  const openPcm = (next: 1 | 2) => {
    const layer = confirmed?.layers.find((item) => item.slot === next);
    setPcmSlot(next);
    setTone(null);
    setLevel(layer?.level ?? 80);
    setPending(null);
    setPreview(null);
    setSheet('pcm');
  };

  const openSave = () => {
    setPending(null);
    setPreview(null);
    setSheet('save');
  };

  return (
    <div className="mvp-workspace now-playing">
      <header className="now-patch">
        <button
          type="button"
          aria-label={t('intention.previous')}
          disabled={busy || previousSlot == null}
          onClick={() => chooseSlot(previousSlot?.id)}
        >
          ‹
        </button>
        <div className="now-title">
          <h1>{confirmed?.patchName || t('intention.unnamed')}</h1>
          <p>
            {confirmed?.slotLabel}
            {state.phase !== 'idle' && (
              <span className="now-phase">{phaseLabel(t, state.phase)}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          aria-label={t('intention.next')}
          disabled={busy || nextSlot == null}
          onClick={() => chooseSlot(nextSlot?.id)}
        >
          ›
        </button>
      </header>

      {notice && !sheet && (
        <p className="error now-notice" role="alert">
          {notice}
        </p>
      )}

      <div className="now-board">
        <div className="now-sound">
          <div className="now-row" role="group" aria-label={t('intention.modes')}>
            {MODES.map((item) => (
              <button
                key={item}
                type="button"
                className={mode === item ? 'now-card is-selected' : 'now-card'}
                aria-pressed={mode === item}
                disabled={busy}
                onClick={() => run({ kind: 'mode', mode: item })}
              >
                <span className="now-value">{modeLabel(t, item)}</span>
                <span className="now-detail">{modeDetail(t, item)}</span>
              </button>
            ))}
          </div>

          <div className="now-row now-row-2">
            {([1, 2] as const).map((index) => {
              const layer = confirmed?.layers.find((item) => item.slot === index);
              const on = layer?.on === true;
              return (
                <button key={index} type="button" className="now-card" disabled={busy} onClick={() => openPcm(index)}>
                  <span className="now-kicker">{t('intention.pcm', index)}</span>
                  <span className="now-value">{on ? layer.toneName : t('intention.free')}</span>
                  <span className="now-detail">
                    {on ? `${t('intention.level')} ${layer.level}` : t('intention.pcmChoose')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="now-side">
          <div className="now-row now-row-2 now-pills">
            <div className="now-card">
              <span className="now-kicker">EXP</span>
              <span className="now-value">{pedalLabel(t, confirmed?.expression ?? 'off')}</span>
            </div>
            <div className="now-card">
              <span className="now-kicker">CTL</span>
              <span className="now-value">{pedalLabel(t, confirmed?.ctl ?? 'off')}</span>
            </div>
          </div>

          <div className="now-block">
            <p className="now-kicker">
              {t('intention.effectRow')} · {t('intention.effectShared')}
            </p>
            <div className="now-effects" role="group" aria-label={t('intention.effectShared')}>
              {EFFECTS.map((effect) => (
                <button
                  key={effect}
                  type="button"
                  disabled={busy}
                  onClick={() => run({ kind: 'effect', effect })}
                >
                  {effectLabel(t, effect)}
                </button>
              ))}
            </div>
          </div>

          <div className="now-row">
            {RECIPES.map((id) => {
              const plan = session.preview({ kind: 'recipe', id });
              return (
                <button
                  key={id}
                  type="button"
                  className={confirmed?.recipeId === id ? 'now-card is-selected' : 'now-card'}
                  aria-pressed={confirmed?.recipeId === id}
                  disabled={busy || !plan.ok}
                  onClick={() => ask({ kind: 'recipe', id }, 'recipe')}
                >
                  <span className="now-kicker">{recipeKicker(id)}</span>
                  <span className="now-value">{recipeLabel(t, id)}</span>
                  <span className="now-detail">{plan.ok ? recipeHint(t, id) : t('intention.inUse')}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="now-actions">
        <button type="button" className="primary now-card" disabled={busy || confirmed?.userSlot == null} onClick={openSave}>
          <span className="now-kicker">USER {confirmed?.slotLabel}</span>
          <span className="now-value">
            {t('intention.save')}
            {confirmed?.tempDiffersFromUser ? <span className="now-dot" aria-hidden="true" /> : null}
          </span>
        </button>
        <button
          type="button"
          className="now-card"
          disabled={busy}
          onClick={() => {
            setPending(null);
            setPreview(null);
            setSheet('guitar');
          }}
        >
          <span className="now-kicker">GK</span>
          <span className="now-value">{t('intention.guitar')}</span>
          <span className="now-detail">{t('intention.playFeel')}</span>
        </button>
      </div>

      {sheet && (
        <div className="now-sheet-backdrop" role="presentation" onClick={closeSheet}>
          <div
            className="now-sheet"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            {notice && (
              <p className="error" role="alert">
                {notice}
              </p>
            )}
            {sheet === 'pcm' && (
              <>
                <h2>
                  {t('intention.pcm', pcmSlot)}
                  {confirmed?.layers.find((item) => item.slot === pcmSlot)?.on
                    ? ` · ${confirmed.layers.find((item) => item.slot === pcmSlot)?.toneName}`
                    : ''}
                </h2>
                <div className="now-tones">
                  {TONES.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={tone === id ? 'is-selected' : undefined}
                      aria-pressed={tone === id}
                      disabled={busy}
                      onClick={() => setTone(id)}
                    >
                      {toneLabel(t, id)}
                    </button>
                  ))}
                </div>
                <Range
                  label={t('intention.level')}
                  min={0}
                  max={100}
                  value={level}
                  disabled={busy}
                  onChange={setLevel}
                />
                <div className="now-actions">
                  <button
                    type="button"
                    className="primary"
                    disabled={busy || tone == null}
                    onClick={() => {
                      if (!tone) return;
                      run({ kind: 'layer', slot: pcmSlot, layer: tone, level }, true);
                    }}
                  >
                    {t('intention.use')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run({ kind: 'clear-layer', slot: pcmSlot }, true)}
                  >
                    {t('intention.remove')}
                  </button>
                </div>
              </>
            )}

            {sheet === 'recipe' && preview && (
              <Confirm
                t={t}
                preview={preview}
                busy={busy}
                onApply={applyPending}
                onCancel={closeSheet}
              />
            )}

            {sheet === 'save' && confirmed?.userSlot != null && confirmed.slotLabel && (
              <>
                <p className="now-slot">{confirmed.slotLabel}</p>
                <p className="scope chip-amber">
                  <span className="dot" aria-hidden="true" />
                  USER
                </p>
                <p>{t('intention.powerOff')}</p>
                <div className="now-actions">
                  <button
                    type="button"
                    className="primary"
                    disabled={busy}
                    onClick={() => {
                      void session.save(confirmed.userSlot!).then((result) => {
                        report(result);
                        if (result.ok) closeSheet();
                        else setNotice(t('intention.saveFailed'));
                      });
                    }}
                  >
                    {t('intention.apply')}
                  </button>
                  <button type="button" disabled={busy} onClick={closeSheet}>
                    {t('intention.cancel')}
                  </button>
                </div>
                {state.canRestore && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      void session.restore().then((result) => {
                        report(result);
                        if (result.ok) closeSheet();
                      });
                    }}
                  >
                    {t('intention.restore')}
                  </button>
                )}
              </>
            )}

            {sheet === 'guitar' && !preview && instrument && (
              <>
                <h2>{t('intention.guitar')}</h2>
                <p className="scope chip-blue">
                  <span className="dot" aria-hidden="true" />
                  {t('intention.scopeSystem')}
                </p>
                <label>
                  {t('intention.guitar')}
                  <select
                    value={instrument.id}
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
                {instrument.confirmPickup && (
                  <label>
                    {t('intention.puType')}
                    <select
                      value={pickup}
                      disabled={busy}
                      onChange={(event) => setPickup(event.target.value)}
                    >
                      <option value="">{instrument.pickups[0]?.label ?? ''}</option>
                      {instrument.pickups.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {instrument.calibrations.length > 0 && (
                  <label>
                    <select
                      aria-label={
                        instrument.calibrations.find((item) => item.id === calibrationId)?.label ??
                        instrument.calibrations[0]?.label
                      }
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
                <Range
                  label={t('intention.playFeel')}
                  min={1}
                  max={5}
                  value={feel}
                  disabled={busy}
                  onChange={setFeel}
                  onCommit={(value) => void session.apply({ kind: 'calibration', playFeel: value }).then(report)}
                />
                <Range
                  label={t('intention.lowVelocityCut')}
                  min={0}
                  max={10}
                  value={cut}
                  disabled={busy}
                  onChange={setCut}
                  onCommit={(value) =>
                    void session.apply({ kind: 'calibration', lowVelocityCut: value }).then(report)
                  }
                />
                <Range
                  label={t('intention.velocityDynamics')}
                  min={0}
                  max={10}
                  value={dynamics}
                  disabled={busy}
                  onChange={setDynamics}
                  onCommit={(value) =>
                    void session.apply({ kind: 'calibration', velocityDynamics: value }).then(report)
                  }
                />
                <Range
                  label={t('intention.sens')}
                  min={0}
                  max={100}
                  value={sens}
                  disabled={busy}
                  onChange={setSens}
                  onCommit={(value) => void session.apply({ kind: 'calibration', sens: value }).then(report)}
                />
                <label>
                  {t('intention.scale')}
                  <input
                    inputMode="numeric"
                    value={scale}
                    disabled={busy}
                    onChange={(event) => setScale(event.target.value)}
                  />
                </label>
                <div className="now-actions">
                  <button
                    type="button"
                    className="primary"
                    disabled={busy}
                    onClick={() => {
                      const scaleMm = scale.trim() === '' ? undefined : Number(scale);
                      ask(
                        {
                          kind: 'instrument',
                          profileId: instrument.id,
                          calibrationId: calibrationId || undefined,
                          puType: pickup || undefined,
                          scaleMm: scaleMm != null && Number.isFinite(scaleMm) ? scaleMm : undefined,
                        },
                        'guitar',
                      );
                    }}
                  >
                    {t('intention.activate')}
                  </button>
                  <button type="button" disabled={busy} onClick={closeSheet}>
                    {t('intention.cancel')}
                  </button>
                </div>
                {advanced}
              </>
            )}

            {sheet === 'guitar' && preview && (
              <Confirm
                t={t}
                preview={preview}
                busy={busy}
                onApply={applyPending}
                onCancel={() => {
                  setPending(null);
                  setPreview(null);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Confirm({
  t,
  preview,
  busy,
  onApply,
  onCancel,
}: {
  t: Translate;
  preview: Extract<PreviewResult, { ok: true }>;
  busy: boolean;
  onApply: () => void;
  onCancel: () => void;
}) {
  const scope =
    preview.scope === 'system'
      ? t('intention.scopeSystem')
      : preview.scope === 'both'
        ? t('intention.scopeBoth')
        : t('intention.scopePatch');
  return (
    <>
      <p className={preview.scope === 'patch' ? 'scope chip-amber' : 'scope chip-blue'}>
        <span className="dot" aria-hidden="true" />
        {scope}
      </p>
      <ul>
        {preview.groups.map((group) => (
          <li key={group}>{groupLabel(t, group)}</li>
        ))}
      </ul>
      <div className="now-actions">
        <button type="button" className="primary" disabled={busy} onClick={onApply}>
          {t('intention.apply')}
        </button>
        <button type="button" disabled={busy} onClick={onCancel}>
          {t('intention.cancel')}
        </button>
      </div>
    </>
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

function confirmedMode(view: ConfirmedView): SoundMode | null {
  if (!view.normalOn) return 'accompaniment';
  if (view.modelingOn) return null;
  return view.layers.some((layer) => layer.on) ? 'both' : 'original';
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
    case 'reading':
      return t('intention.phases.checking');
    default:
      return t('intention.phases.idle');
  }
}

function modeLabel(t: Translate, mode: SoundMode): string {
  if (mode === 'original') return t('intention.modeOriginal');
  if (mode === 'accompaniment') return t('intention.modePcm');
  return t('intention.modeBoth');
}

function modeDetail(t: Translate, mode: SoundMode): string {
  if (mode === 'original') return t('intention.modeHintOriginal');
  if (mode === 'accompaniment') return t('intention.modeHintPcm');
  return t('intention.modeHintBoth');
}

function recipeKicker(id: RecipeId): string {
  if (id === 'nylon-harmonica-exp') return 'EXP';
  if (id === 'nylon-piano-strings-ctl') return 'CTL';
  return 'PCM';
}

function recipeHint(t: Translate, id: RecipeId): string {
  if (id === 'nylon-harmonica-exp') return t('intention.recipeHintHarmonica');
  if (id === 'nylon-piano-strings-ctl') return t('intention.recipeHintStrings');
  return t('intention.recipeHintSolo');
}

function recipeLabel(t: Translate, id: RecipeId): string {
  if (id === 'nylon-harmonica-exp') return t('intention.recipeHarmonica');
  if (id === 'nylon-piano-strings-ctl') return t('intention.recipeStrings');
  return t('intention.recipeSolo');
}

function effectLabel(t: Translate, effect: EffectId): string {
  if (effect === 'dry') return t('intention.effectDry');
  if (effect === 'small-room') return t('intention.effectRoom');
  if (effect === 'soft-ambience') return t('intention.effectAmb');
  return t('intention.effectDelay');
}

function toneLabel(t: Translate, id: LayerId): string {
  return t(`intention.tones.${id}`);
}

function pedalLabel(t: Translate, role: PedalRole): string {
  if (role === 'off') return t('intention.free');
  if (role === 'layer-1') return t('intention.pcmLevel', 1);
  if (role === 'layer-2') return t('intention.pcmLevel', 2);
  if (role === 'toggle-1') return t('intention.togglesPcm', 1);
  if (role === 'toggle-2') return t('intention.togglesPcm', 2);
  return t('intention.inUse');
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
