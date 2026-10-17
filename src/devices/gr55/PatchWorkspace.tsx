import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useLocale, useT } from '../../copy';
import type { Gr55Editor } from './editor';
import { ScopeConfirm } from './ScopeConfirm';
import { ToneDeck } from './ToneDeck';
import { AdvancedPatchEditor } from './AdvancedPatchEditor';
import { asSnapshotSource, snapshotFieldHost } from './snapshotHost';
import { runAppMutation } from './sessionAuthority';
import { saveUserSlotVerified } from './saveUserSlot';
import { requireCurrentUserSlot } from './patchGuard';
import { useSystem } from './SystemParts';
import {
  INSTRUMENT_PROFILES,
  OUTPUT_DESTINATIONS,
  PIEZO_BRAND_OPTIONS,
  calibrationOf,
  profileOf,
  type CalibrationSubProfileId,
  type InstrumentProfileId,
  type OutputDestinationId,
} from './instrumentProfiles';
import { applyInstrumentProfile, applyOutputDestination } from './applyInstrument';
import {
  FAMILY_LABELS,
  ROLE_LABELS,
  ROLES,
  RHYTHMS,
  type RhythmFamilyId,
  type RoleId,
} from './presets/taxonomy';
import {
  presetsMatching,
  presetFitsInstrument,
  type MusicalPreset,
  type ValidationStatus,
} from './presets/catalog';
import { applyPitchToTemp, applyPresetToTemp, clampPitchShift } from './presets/applyPreset';
import { applyCtlExpForPreset } from './presets/applyCtlExp';
import { ctlAction, expAction, expSwAction } from './presets/ctlExp';
import { TROUBLE_FLOWS, applyTroubleFix, type TroubleId } from './troubleshooting';
import { formatUserSlot } from './slots';

/** Top-level musician jobs — mutually exclusive so intents never blur. */
type JobId = 'setup' | 'choose' | 'shape';

type ShapeSectionId = 'feel' | 'controls' | 'trouble' | 'advanced';

function statusLabel(t: ReturnType<typeof useT>, status: ValidationStatus): string {
  switch (status) {
    case 'approximation':
      return t('gr55.mvp.statusApproximation');
    case 'implemented':
      return t('gr55.mvp.statusImplemented');
    case 'documented':
      return t('gr55.mvp.statusDocumented');
    case 'hardware-tested':
      return t('gr55.mvp.statusHardware');
  }
}

function Collapsible({
  id,
  title,
  open,
  onToggle,
  children,
  summary,
}: {
  id: ShapeSectionId;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  summary?: string;
}) {
  const t = useT();
  return (
    <section className="mvp-section" data-section={id}>
      <button type="button" className="mvp-section-toggle" aria-expanded={open} onClick={onToggle}>
        <span>{title}</span>
        {summary ? <span className="hint">{summary}</span> : null}
        <span className="mvp-section-chevron">{open ? t('gr55.mvp.collapse') : t('gr55.mvp.expand')}</span>
      </button>
      {open ? <div className="mvp-section-body">{children}</div> : null}
    </section>
  );
}

/**
 * Musician-oriented patch generator:
 * Setup instrument (SYSTEM/GK, confirm) · Choose sound (full replace) · Shape (light).
 */
export function PatchWorkspace({
  editor,
  onError,
}: {
  editor: Gr55Editor;
  onError: (error: unknown) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const system = useSystem();
  const source = useMemo(() => asSnapshotSource({ editor, system }), [editor, system]);
  const host = useMemo(
    () => snapshotFieldHost(editor, source, onError),
    [editor, source, onError],
  );
  const patchVersion = useSyncExternalStore(editor.subscribe, editor.patchSnapshot);
  useSyncExternalStore(system.subscribe, system.snapshot);

  const [job, setJob] = useState<JobId>('choose');
  const [shapeOpen, setShapeOpen] = useState<Record<ShapeSectionId, boolean>>({
    feel: true,
    controls: true,
    trouble: false,
    advanced: false,
  });
  const toggleShape = (id: ShapeSectionId) =>
    setShapeOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  const [instrumentId, setInstrumentId] = useState<InstrumentProfileId>('godin-multiac-nylon');
  const [piezoOverride, setPiezoOverride] = useState<string | undefined>();
  const [calibrationId, setCalibrationId] = useState<CalibrationSubProfileId | undefined>();
  const [outputId, setOutputId] = useState<OutputDestinationId>('phones');
  const [familyId, setFamilyId] = useState<RhythmFamilyId | 'all'>('samba');
  const [rhythmId, setRhythmId] = useState('samba-raiz');
  const [roleId, setRoleId] = useState<RoleId>('base');
  const [presetId, setPresetId] = useState<string | undefined>();
  const [activeSoundName, setActiveSoundName] = useState<string | undefined>();
  /** Semitone pitch (−24…+24). Session-owned; replace never resets. */
  const [pitchShift, setPitchShift] = useState(0);
  /**
   * User pitch-correction override. `null` = follow preset profile chromatic.
   * Explicit true/false is preserved across Replace.
   */
  const [pitchCorrectionOverride, setPitchCorrectionOverride] = useState<boolean | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>();
  const [confirm, setConfirm] = useState<'instrument' | 'replace' | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const pitchOptions = useMemo(
    () => Array.from({ length: 49 }, (_, i) => i - 24),
    [],
  );

  const familyRhythms = useMemo(
    () =>
      familyId === 'all'
        ? RHYTHMS
        : RHYTHMS.filter((rhythm) => rhythm.family === familyId),
    [familyId],
  );
  const rhythm = RHYTHMS.find((item) => item.id === rhythmId) ?? familyRhythms[0] ?? RHYTHMS[0];
  const presets = useMemo(
    () =>
      presetsMatching({
        rhythmId: rhythm.id,
        role: roleId,
        instrumentId,
      }),
    [rhythm.id, roleId, instrumentId],
  );
  const selectedPreset: MusicalPreset | undefined =
    presets.find((p) => p.id === presetId) ?? presets[0];
  const resolvedChromatic =
    pitchCorrectionOverride !== null
      ? pitchCorrectionOverride
      : Boolean(selectedPreset?.chromatic);
  const profile = profileOf(instrumentId)!;
  const activeCalibration = calibrationOf(profile, calibrationId);
  const output = OUTPUT_DESTINATIONS.find((item) => item.id === outputId)!;

  const slotLabel =
    editor.patchSource?.kind === 'slot'
      ? formatUserSlot(editor.patchSource.userPatchNumber)
      : t('gr55.patchSlotUnknown');

  const label = (en: string, pt: string) => (locale === 'pt-BR' ? pt : en);

  const onSave = () => {
    setSaveBusy(true);
    setSaveMessage(undefined);
    void runAppMutation(async () => {
      const guard = await requireCurrentUserSlot(editor);
      if (!guard.ok) {
        setSaveMessage(t('gr55.mvp.slotChanged'));
        return;
      }
      const result = await saveUserSlotVerified(editor, guard.identity.userPatchNumber);
      if (!result.ok) {
        setSaveMessage(t('gr55.mvp.saveFail', result.reason));
        return;
      }
      setSaveMessage(t('gr55.mvp.saveOk'));
    }, source)
      .catch(onError)
      .finally(() => setSaveBusy(false));
  };

  const runInstrumentApply = () => {
    setConfirmBusy(true);
    void runAppMutation(() => {
      applyInstrumentProfile(system, profile, {
        puTypeOverride: piezoOverride,
        name: profile.gkSetName ?? profile.labelEn.slice(0, 8),
        calibrationId: activeCalibration?.id,
      });
      applyOutputDestination(system, output);
    }, source)
      .catch(onError)
      .finally(() => {
        setConfirmBusy(false);
        setConfirm(null);
        setJob('choose');
      });
  };

  const runReplaceSound = () => {
    if (!selectedPreset) return;
    setConfirmBusy(true);
    const pitch = {
      pitchShift: clampPitchShift(pitchShift),
      // Only pass chromatic when user overrode; else apply uses profile recommendation.
      ...(pitchCorrectionOverride !== null ? { chromatic: pitchCorrectionOverride } : {}),
    };
    void runAppMutation(() => {
      applyPresetToTemp(editor, selectedPreset, pitch);
      applyCtlExpForPreset(system, selectedPreset);
    }, source)
      .then(() => {
        setActiveSoundName(label(selectedPreset.nameEn, selectedPreset.namePt));
        setJob('shape');
      })
      .catch(onError)
      .finally(() => {
        setConfirmBusy(false);
        setConfirm(null);
      });
  };

  const writePitchLive = (nextShift: number, nextChromatic: boolean) => {
    void runAppMutation(() => {
      applyPitchToTemp(editor, {
        pitchShift: clampPitchShift(nextShift),
        chromatic: nextChromatic,
      });
    }, source).catch(onError);
  };

  const pitchControls = (
    <div className="mvp-pitch">
      <label className="mvp-field">
        <span>{t('gr55.mvp.pitchShift')}</span>
        <select
          value={pitchShift}
          onChange={(event) => {
            const next = clampPitchShift(Number(event.target.value));
            setPitchShift(next);
            if (job === 'shape' && activeSoundName) {
              writePitchLive(next, resolvedChromatic);
            }
          }}
        >
          {pitchOptions.map((semitone) => (
            <option key={semitone} value={semitone}>
              {semitone === 0
                ? t('gr55.mvp.pitchZero')
                : t('gr55.mvp.pitchSemitones', semitone > 0 ? `+${semitone}` : String(semitone))}
            </option>
          ))}
        </select>
      </label>
      <label className="mvp-check">
        <input
          type="checkbox"
          checked={resolvedChromatic}
          onChange={(event) => {
            const next = event.target.checked;
            setPitchCorrectionOverride(next);
            if (job === 'shape' && activeSoundName) {
              writePitchLive(pitchShift, next);
            }
          }}
        />
        <span>
          <strong>{t('gr55.mvp.pitchCorrection')}</strong>
          <span className="hint">{t('gr55.mvp.pitchCorrectionHint')}</span>
        </span>
      </label>
    </div>
  );

  const jobs: { id: JobId; title: string; blurb: string }[] = [
    { id: 'setup', title: t('gr55.mvp.jobSetup'), blurb: t('gr55.mvp.jobSetupBlurb') },
    { id: 'choose', title: t('gr55.mvp.jobChoose'), blurb: t('gr55.mvp.jobChooseBlurb') },
    { id: 'shape', title: t('gr55.mvp.jobShape'), blurb: t('gr55.mvp.jobShapeBlurb') },
  ];

  return (
    <div className="mvp-workspace">
      <header className="mvp-header">
        <div>
          <p className="hint">{t('gr55.mvp.activePatch')}</p>
          <h1>
            {slotLabel} · {editor.patchName || t('gr55.unnamed')}
          </h1>
          {activeSoundName ? (
            <p className="mvp-preset-line">
              {t('gr55.mvp.soundingAs')} {activeSoundName}
            </p>
          ) : (
            <p className="mvp-preset-line hint">{t('gr55.mvp.soundingHint')}</p>
          )}
        </div>
        <button type="button" className="primary mvp-save" disabled={saveBusy} onClick={onSave}>
          {saveBusy ? t('gr55.mvp.saveBusy') : t('gr55.mvp.save')}
        </button>
      </header>
      {saveMessage ? (
        <p className="hint" role="status">
          {saveMessage}
        </p>
      ) : null}

      <nav className="mvp-jobs" aria-label={t('gr55.mvp.jobsLabel')}>
        {jobs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={job === item.id ? 'mvp-job mvp-job-active' : 'mvp-job'}
            aria-pressed={job === item.id}
            onClick={() => setJob(item.id)}
          >
            <strong>{item.title}</strong>
            <span className="hint">{item.blurb}</span>
          </button>
        ))}
      </nav>

      {job === 'setup' ? (
        <section className="mvp-job-panel" data-job="setup">
          <p className="mvp-job-lead">{t('gr55.mvp.setupLead')}</p>
          <label className="mvp-field">
            <span>{t('gr55.mvp.pickInstrument')}</span>
            <select
              value={instrumentId}
              onChange={(event) => {
                const next = event.target.value as InstrumentProfileId;
                setInstrumentId(next);
                setPiezoOverride(undefined);
                const nextProfile = profileOf(next);
                setCalibrationId(nextProfile?.defaultCalibrationId);
              }}
            >
              {INSTRUMENT_PROFILES.map((item) => (
                <option key={item.id} value={item.id}>
                  {label(item.labelEn, item.labelPt)}
                </option>
              ))}
            </select>
          </label>
          {profile.bassMode ? <p className="hint">{t('gr55.mvp.bassModeWarn')}</p> : null}
          {profile.confirmPiezoBrand ? (
            <label className="mvp-field">
              <span>{t('gr55.mvp.piezoConfirm')}</span>
              <select
                value={piezoOverride ?? profile.puType}
                onChange={(event) => setPiezoOverride(event.target.value)}
              >
                {PIEZO_BRAND_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {label(item.labelEn, item.labelPt)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {profile.calibrations?.length ? (
            <label className="mvp-field">
              <span>{t('gr55.mvp.pickCalibration')}</span>
              <select
                value={activeCalibration?.id ?? profile.defaultCalibrationId ?? profile.calibrations[0]!.id}
                onChange={(event) =>
                  setCalibrationId(event.target.value as CalibrationSubProfileId)
                }
              >
                {profile.calibrations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {label(item.labelEn, item.labelPt)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {activeCalibration ? (
            <p className="hint">{label(activeCalibration.notesEn, activeCalibration.notesPt)}</p>
          ) : null}
          {profile.gkSetName ? (
            <p className="hint">{t('gr55.mvp.gkSetNameHint', profile.gkSetName)}</p>
          ) : null}
          <p className="hint">{label(profile.notesEn, profile.notesPt)}</p>
          {instrumentId === 'caimbe-nylon' ? (
            <p className="hint">{t('gr55.mvp.caimbeGhostHint')}</p>
          ) : null}
          <label className="mvp-field">
            <span>{t('gr55.mvp.pickOutput')}</span>
            <select
              value={outputId}
              onChange={(event) => setOutputId(event.target.value as OutputDestinationId)}
            >
              {OUTPUT_DESTINATIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {label(item.labelEn, item.labelPt)}
                </option>
              ))}
            </select>
          </label>
          <p className="scope-chip scope-system">{t('gr55.mvp.systemScope')}</p>
          <button type="button" className="primary" onClick={() => setConfirm('instrument')}>
            {t('gr55.mvp.applyInstrument')}
          </button>
        </section>
      ) : null}

      {job === 'choose' ? (
        <section className="mvp-job-panel" data-job="choose">
          <p className="mvp-job-lead">{t('gr55.mvp.chooseLead')}</p>
          <p className="mvp-callout" role="note">
            {t('gr55.mvp.replaceCallout')}
          </p>
          <p className="hint">
            {t('gr55.mvp.chooseInstrumentHint', label(profile.labelEn, profile.labelPt))}
          </p>
          <label className="mvp-field">
            <span>{t('gr55.mvp.pickFamily')}</span>
            <select
              value={familyId}
              onChange={(event) => {
                const next = event.target.value as RhythmFamilyId | 'all';
                setFamilyId(next);
                const nextList =
                  next === 'all' ? RHYTHMS : RHYTHMS.filter((item) => item.family === next);
                const first = nextList[0];
                if (first) {
                  setRhythmId(first.id);
                  setPresetId(undefined);
                }
              }}
            >
              <option value="all">{t('gr55.mvp.familyAll')}</option>
              {(Object.keys(FAMILY_LABELS) as RhythmFamilyId[]).map((id) => (
                <option key={id} value={id}>
                  {label(FAMILY_LABELS[id].en, FAMILY_LABELS[id].pt)}
                </option>
              ))}
            </select>
          </label>
          <label className="mvp-field">
            <span>{t('gr55.mvp.pickRhythm')}</span>
            <select
              value={rhythm.id}
              onChange={(event) => {
                setRhythmId(event.target.value);
                setPresetId(undefined);
              }}
            >
              {familyRhythms.map((item) => (
                <option key={item.id} value={item.id}>
                  {label(item.labelEn, item.labelPt)}
                </option>
              ))}
            </select>
          </label>
          <label className="mvp-field">
            <span>{t('gr55.mvp.pickRole')}</span>
            <select
              value={roleId}
              onChange={(event) => {
                setRoleId(event.target.value as RoleId);
                setPresetId(undefined);
              }}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {label(ROLE_LABELS[role].en, ROLE_LABELS[role].pt)}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="mvp-preset-list">
            <legend>{t('gr55.mvp.pickPreset')}</legend>
            {presets.length === 0 ? (
              <p className="hint">—</p>
            ) : (
              presets.map((preset) => {
                const fits = presetFitsInstrument(preset, instrumentId);
                return (
                  <label key={preset.id} className="mvp-preset-card">
                    <input
                      type="radio"
                      name="preset"
                      checked={selectedPreset?.id === preset.id}
                      onChange={() => setPresetId(preset.id)}
                    />
                    <span>
                      <strong>{label(preset.nameEn, preset.namePt)}</strong>
                      {preset.priority ? (
                        <span className="hint">{t('gr55.mvp.priorityBadge')}</span>
                      ) : null}
                      {!fits ? (
                        <span className="hint">{t('gr55.mvp.incompatibleInstrument')}</span>
                      ) : null}
                      <span className="hint">{label(preset.descriptionEn, preset.descriptionPt)}</span>
                      <span className="hint">{statusLabel(t, preset.validationStatus)}</span>
                    </span>
                  </label>
                );
              })
            )}
          </fieldset>
          {selectedPreset ? (
            <>
              <p className="hint">
                <strong>{t('gr55.mvp.technique')}:</strong>{' '}
                {label(selectedPreset.techniqueEn, selectedPreset.techniquePt)}
              </p>
              {pitchControls}
              <p className="scope-chip scope-working">{t('gr55.mvp.patchScope')}</p>
              <button type="button" className="primary" onClick={() => setConfirm('replace')}>
                {t('gr55.mvp.replaceSound')}
              </button>
            </>
          ) : null}
        </section>
      ) : null}

      {job === 'shape' ? (
        <section className="mvp-job-panel" data-job="shape">
          <p className="mvp-job-lead">{t('gr55.mvp.shapeLead')}</p>
          <p className="mvp-callout mvp-callout-quiet" role="note">
            {t('gr55.mvp.shapeCallout')}
          </p>

          <div className="mvp-shape-pitch">
            <h2 className="mvp-subhead">{t('gr55.mvp.sectionPitch')}</h2>
            {pitchControls}
          </div>

          <Collapsible
            id="feel"
            title={t('gr55.mvp.sectionFeel')}
            open={shapeOpen.feel}
            onToggle={() => toggleShape('feel')}
          >
            <p className="hint">{t('gr55.mvp.feelCalibrate')}</p>
            <p className="hint">{t('gr55.mvp.feelRefineHint')}</p>
          </Collapsible>

          <Collapsible
            id="controls"
            title={t('gr55.mvp.sectionControls')}
            open={shapeOpen.controls}
            onToggle={() => toggleShape('controls')}
          >
            {selectedPreset || activeSoundName ? (
              <ul className="mvp-ctl-list">
                <li>
                  <strong>{t('gr55.mvp.ctlLabel')}</strong>{' '}
                  {selectedPreset
                    ? (() => {
                        const action = ctlAction(selectedPreset.ctlExp.ctl);
                        return action ? label(action.labelEn, action.labelPt) : selectedPreset.ctlExp.ctl;
                      })()
                    : '—'}
                </li>
                <li>
                  <strong>{t('gr55.mvp.expLabel')}</strong>{' '}
                  {selectedPreset
                    ? (() => {
                        const action = expAction(selectedPreset.ctlExp.exp);
                        return action ? label(action.labelEn, action.labelPt) : selectedPreset.ctlExp.exp;
                      })()
                    : '—'}
                </li>
                <li>
                  <strong>{t('gr55.mvp.expSwLabel')}</strong>{' '}
                  {selectedPreset
                    ? (() => {
                        const action = expSwAction(selectedPreset.ctlExp.expSw);
                        return action
                          ? label(action.labelEn, action.labelPt)
                          : selectedPreset.ctlExp.expSw;
                      })()
                    : '—'}
                </li>
              </ul>
            ) : (
              <p className="hint">{t('gr55.mvp.shapeNeedSound')}</p>
            )}
          </Collapsible>

          <Collapsible
            id="trouble"
            title={t('gr55.mvp.sectionTrouble')}
            open={shapeOpen.trouble}
            onToggle={() => toggleShape('trouble')}
          >
            {TROUBLE_FLOWS.map((flow) => (
              <details key={flow.id} className="mvp-trouble">
                <summary>{label(flow.titleEn, flow.titlePt)}</summary>
                <ol>
                  {(locale === 'pt-BR' ? flow.stepsPt : flow.stepsEn).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="hint">{label(flow.applyHintEn, flow.applyHintPt)}</p>
                <button
                  type="button"
                  onClick={() => {
                    void runAppMutation(() => {
                      applyTroubleFix(
                        system,
                        flow.id as TroubleId,
                        flow.needsEditor ? editor : undefined,
                      );
                    }, source).catch(onError);
                  }}
                >
                  {t('gr55.mvp.applyFix')}
                </button>
              </details>
            ))}
          </Collapsible>

          <Collapsible
            id="advanced"
            title={t('gr55.mvp.sectionAdvanced')}
            open={shapeOpen.advanced}
            onToggle={() => toggleShape('advanced')}
          >
            <ToneDeck host={host} gkMode={editor.gkMode} />
            <AdvancedPatchEditor
              host={host}
              gkMode={editor.gkMode}
              patchVersion={patchVersion}
            />
          </Collapsible>
        </section>
      ) : null}

      <ScopeConfirm
        open={confirm === 'instrument'}
        title={t('gr55.mvp.systemWarnTitle')}
        body={t('gr55.mvp.systemWarnBody')}
        scopeLabel={t('gr55.mvp.systemScope')}
        onCancel={() => setConfirm(null)}
        onConfirm={runInstrumentApply}
        busy={confirmBusy}
      />
      <ScopeConfirm
        open={confirm === 'replace'}
        title={t('gr55.mvp.replaceWarnTitle')}
        body={
          selectedPreset
            ? t(
                'gr55.mvp.replaceWarnBody',
                label(selectedPreset.nameEn, selectedPreset.namePt),
              )
            : ''
        }
        scopeLabel={t('gr55.mvp.patchScope')}
        onCancel={() => setConfirm(null)}
        onConfirm={runReplaceSound}
        busy={confirmBusy}
      />
    </div>
  );
}
