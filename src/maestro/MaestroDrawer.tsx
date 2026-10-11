import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getLocale, useT } from '../copy';
import type { Gr55Editor } from '../devices/gr55/editor';
import { formatFieldBytes } from '../devices/gr55/editor';
import { useConnectionOptional } from '../devices/gr55/connectionRuntime';
import { globalHref } from '../devices/gr55/routes';
import { asSnapshotSource } from '../devices/gr55/snapshotHost';
import { runAppMutation } from '../devices/gr55/sessionAuthority';
import { slotsOfMode } from '../devices/gr55/slots';
import { SYSTEM } from '../devices/gr55/systemMap';
import { useSystem } from '../devices/gr55/SystemParts';
import type { ValidatedPlan } from './contracts';
import { appendMessage, clearHistory, loadHistory, markStale, sourceKeyOf } from './history';
import type { HistoryThread } from './history';
import { abortActiveTurn, runTurn } from './orchestrator';
import type { BankApplyStep, LoadSlotAsk, TurnResult } from './orchestrator';
import { GeminiProvider } from './provider';
import { buildFieldRegistry, registryIndex } from './fieldRegistry';
import { forgetApiKey, getApiKey, isRemembered, setApiKey, testApiKey } from './settings';
import type { SessionId } from './session';
import { resolveSlotLabel } from './slotResolve';
import { applyPlanToPedal } from './applyWrites';
import { applySystemPlan, type SystemPlan } from './systemPlan';
import { createVoiceInput, voiceSupported } from './voice';
import type { RegistryEntry } from './fieldRegistry';

function readFormatted(editor: Gr55Editor, entry: RegistryEntry): string {
  const result = editor.read(entry.ref);
  if (!result.ok) return formatFieldBytes(entry.ref, result.raw);
  const bytes = new Uint8Array(entry.ref.definition.size);
  entry.ref.definition.type.encode(result.value as never, bytes, 0, bytes.length);
  return formatFieldBytes(entry.ref, bytes);
}

function sourceLabel(editor: Gr55Editor): string {
  const source = editor.patchSource;
  if (source?.kind === 'slot') {
    const slot = slotsOfMode(editor.gkMode).find(
      (candidate) => candidate.userPatchNumber === source.userPatchNumber,
    );
    return slot?.label ?? `U${source.userPatchNumber}`;
  }
  return editor.patchName || 'anon';
}

function errorCopy(t: ReturnType<typeof useT>, code: string | undefined): string {
  switch (code) {
    case 'badKey':
      return t('maestro.err.badKey');
    case 'rateLimited':
      return t('maestro.err.rateLimited');
    case 'unreachable':
      return t('maestro.err.unreachable');
    case 'timeout':
      return t('maestro.err.timeout');
    case 'stageLive':
      return t('maestro.err.stageLive');
    default:
      return t('maestro.err.generic');
  }
}

interface ChatLine {
  id: string;
  role: 'user' | 'assistant' | 'divider' | 'system';
  text: string;
  plan?: ValidatedPlan;
  systemPlan?: SystemPlan;
  loadSlot?: LoadSlotAsk;
  bankSteps?: BankApplyStep[];
  /** Index of the key currently on the temporary patch (awaiting WRITE). */
  bankStepIndex?: number;
  /** Slot waiting for the user to press WRITE (temp already applied). */
  pendingWrite?: LoadSlotAsk;
  /** Local recipe applied to temp — do not show Apply/Discard. */
  autoApplied?: boolean;
  applied?: boolean;
  /** Pedal write/verify failure. */
  writeError?: string;
}

let lineId = 0;
const nextId = () => `m${++lineId}`;

export function MaestroDrawer({
  editor,
  open,
  onClose,
  onOpenSettings,
  settingsOpen,
  onSettingsOpenChange,
  variant = 'drawer',
  session,
}: {
  editor: Gr55Editor;
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  /** Embedded Studio pane vs floating drawer. */
  variant?: 'drawer' | 'pane';
  session?: SessionId;
}) {
  const t = useT();
  const locale = getLocale();
  const location = useLocation();
  const live = useConnectionOptional();
  const system = useSystem();
  const stageLive = false;
  const patchName = useSyncExternalStore(editor.subscribe, () => editor.patchName);
  const gkMode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  const changeSet = useSyncExternalStore(editor.subscribe, () => editor.dirtySnapshot());
  const changeCount = editor.changeCount;
  void changeSet;

  const entries = useMemo(() => buildFieldRegistry(gkMode), [gkMode]);
  const index = useMemo(() => registryIndex(entries), [entries]);
  const sourceKey = sourceKeyOf(editor.patchSource, patchName);
  const [thread, setThread] = useState<HistoryThread>(() => loadHistory(locale, sourceKey));
  const [draft, setDraft] = useState('');
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [hasKey, setHasKey] = useState(() => Boolean(getApiKey()));
  const [listening, setListening] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const openerFocus = useRef<HTMLElement | null>(null);
  const voiceRef = useRef<ReturnType<typeof createVoiceInput>>(undefined);
  const lastSource = useRef(sourceKey);
  const lastMode = useRef(gkMode);
  /** True while a multi-key bank recipe is selecting USER slots — do not wipe chat. */
  const bankApplyActive = useRef(false);

  useEffect(() => {
    if (lastSource.current !== sourceKey || lastMode.current !== gkMode) {
      // Bank recipes call selectPatch between keys; keep the Continue queue alive.
      if (bankApplyActive.current) {
        lastSource.current = sourceKey;
        lastMode.current = gkMode;
        return;
      }
      const note = t(
        'maestro.staleDivider',
        `this talk was about ${patchName} (${sourceLabel(editor)})`,
      );
      const previous = loadHistory(locale, lastSource.current);
      if (previous.messages.length > 0) {
        markStale(previous, note);
      }
      const next = loadHistory(locale, sourceKey);
      setThread(next);
      setLines(
        next.stale
          ? [{ id: nextId(), role: 'divider', text: t('maestro.staleDivider', next.stale.note) }]
          : [],
      );
      lastSource.current = sourceKey;
      lastMode.current = gkMode;
    }
  }, [sourceKey, gkMode, locale, patchName, editor, t]);

  useEffect(() => {
    if (!open) return;
    openerFocus.current = document.activeElement as HTMLElement | null;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [open, lines, busy]);

  useEffect(() => {
    if (!open) {
      openerFocus.current?.focus?.();
    }
  }, [open]);

  useEffect(() => {
    if (!voiceSupported()) return;
    voiceRef.current = createVoiceInput(
      locale,
      (text, interim) => {
        setDraft(text);
        setListening(interim);
      },
      () => setListening(false),
    );
    return () => voiceRef.current?.stop();
  }, [locale]);

  const provider = useMemo(() => new GeminiProvider(), []);

  const pushLine = (line: Omit<ChatLine, 'id'>) => {
    setLines((prev) => [...prev, { ...line, id: nextId() }]);
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    // Always run the turn — local recipe compilation does not need a Gemini key.
    setHasKey(Boolean(getApiKey()));
    setDraft('');
    pushLine({ role: 'user', text });
    setThread((prev) => appendMessage(prev, { role: 'user', text }));
    setBusy(true);
    try {
      const pageMatch = location.pathname.match(/\/editor\/([^/]+)/);
      const result = await runTurn(text, {
        provider,
        entries,
        index,
        system,
        locale,
        stageLive,
        session,
        visiblePageId: pageMatch?.[1],
        sourceNote: sourceLabel(editor),
        history: thread.messages,
        slots: { resolve: (label) => resolveSlotLabel(gkMode, label) },
        editor: {
          gkMode,
          patchName,
          readFormatted: (entry) => readFormatted(editor, entry),
        },
      });
      handleResult(result);
    } finally {
      setBusy(false);
    }
  };

  const requireLive = () => {
    if (!live) {
      throw new Error(t('maestro.bankRecipe.needConnection'));
    }
    return live;
  };

  const selectSlot = async (slot: LoadSlotAsk) => {
    const conn = requireLive();
    await runAppMutation(
      () => editor.selectPatch(slot.bankMsb, slot.programChange),
      asSnapshotSource(conn),
    );
  };

  /**
   * Patch CTL (TONE SW) only works when SYSTEM CTL Function = PATCH SETTING.
   * Otherwise the pedal ignores the whole bank recipe's CTL matrix.
   */
  const ensureSystemPatchCtl = async () => {
    const conn = requireLive();
    const current = system.read(SYSTEM.pedals.ctlFunction);
    if (current.ok && current.value === 'PATCH SETTING') return;
    await runAppMutation(() => {
      system.write(SYSTEM.pedals.ctlFunction, 'PATCH SETTING');
    }, asSnapshotSource(conn));
    await editor.drainWrites();
  };

  /** DT1 + drain + RQ1 verify on the temporary patch. */
  const applyTempPlan = async (plan: ValidatedPlan, loadSlot?: LoadSlotAsk) => {
    const conn = requireLive();
    let result!: Awaited<ReturnType<typeof applyPlanToPedal>>;
    // Select + apply under one app-authority lock so a slow patch reload cannot
    // wipe DT1s between selectPatch settle and the recipe writes.
    await runAppMutation(async () => {
      if (loadSlot) {
        await editor.selectPatch(loadSlot.bankMsb, loadSlot.programChange);
      }
      result = await applyPlanToPedal(editor, plan);
    }, asSnapshotSource(conn));
    if (result.mismatches.length > 0) {
      throw new Error(
        t('maestro.bankRecipe.verifyFailed', result.mismatches.slice(0, 4).join('; ')),
      );
    }
    return result.written;
  };

  const writePendingSlot = async (slot: LoadSlotAsk) => {
    const conn = requireLive();
    const userPatchNumber = slot.bankMsb * 128 + slot.programChange;
    await runAppMutation(() => editor.writeToUserSlot(userPatchNumber), asSnapshotSource(conn));
    // Reload USER → temp so the UI matches what was stored.
    await selectSlot(slot);
  };

  /** Gemini / single recipe: temp only; optional WRITE button via pendingWrite. */
  const applyPlan = (lineIdToFlip: string, plan: ValidatedPlan, loadSlot?: LoadSlotAsk) => {
    void (async () => {
      try {
        await ensureSystemPatchCtl();
        const count = await applyTempPlan(plan, loadSlot);
        setLines((prev) =>
          prev.map((line) =>
            line.id === lineIdToFlip
              ? {
                  ...line,
                  autoApplied: true,
                  applied: !loadSlot,
                  pendingWrite: loadSlot,
                  writeError: undefined,
                  text: loadSlot
                    ? t(
                        'maestro.bankRecipe.stepReady',
                        loadSlot.label.replace(/^U/i, '').replace(':', '-'),
                        editor.patchName || 'patch',
                        1,
                        1,
                      )
                    : t('maestro.applied', count),
                }
              : line,
          ),
        );
        setThread((prev) =>
          appendMessage(prev, {
            role: 'assistant',
            text: t('maestro.applied', count),
            outcome: 'applied',
          }),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setLines((prev) =>
          prev.map((line) => (line.id === lineIdToFlip ? { ...line, writeError: message } : line)),
        );
        pushLine({ role: 'system', text: message });
      }
    })();
  };

  /** Load one bank key onto the temporary patch for testing (no USER WRITE yet). */
  const loadBankTemp = async (
    lineId: string,
    steps: BankApplyStep[],
    index: number,
    options?: { manageBusy?: boolean },
  ) => {
    const step = steps[index];
    if (!step) return;
    const manageBusy = options?.manageBusy !== false;
    bankApplyActive.current = true;
    if (manageBusy) setBusy(true);
    setLines((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, writeError: undefined, bankStepIndex: index } : line,
      ),
    );
    try {
      await ensureSystemPatchCtl();
      await applyTempPlan(step.plan, step.loadSlot);
      const text = t(
        'maestro.bankRecipe.stepReady',
        step.slotLabel,
        step.patchName,
        index + 1,
        steps.length,
      );
      setLines((prev) => {
        const updated = prev.map((line) =>
          line.id === lineId
            ? {
                ...line,
                plan: undefined,
                bankSteps: steps,
                bankStepIndex: index,
                autoApplied: true,
                applied: false,
                pendingWrite: step.loadSlot,
                writeError: undefined,
                text,
              }
            : line,
        );
        if (!updated.some((line) => line.id === lineId)) {
          updated.push({
            id: lineId,
            role: 'assistant',
            text,
            bankSteps: steps,
            bankStepIndex: index,
            autoApplied: true,
            pendingWrite: step.loadSlot,
          });
        }
        return updated;
      });
    } catch (error) {
      bankApplyActive.current = false;
      const message = error instanceof Error ? error.message : String(error);
      setLines((prev) =>
        prev.map((line) =>
          line.id === lineId ? { ...line, writeError: message, bankStepIndex: index } : line,
        ),
      );
      pushLine({ role: 'system', text: message });
      throw error;
    } finally {
      if (manageBusy) setBusy(false);
    }
  };

  /** USER WRITE for the key currently on the temporary patch, then load the next temp. */
  const writeBankCurrent = async (lineId: string, steps: BankApplyStep[], index: number) => {
    const step = steps[index];
    if (!step) return;
    bankApplyActive.current = true;
    setBusy(true);
    try {
      await writePendingSlot(step.loadSlot);
      const done = index + 1;
      const more = done < steps.length;
      if (more) {
        await loadBankTemp(lineId, steps, done, { manageBusy: false });
      } else {
        bankApplyActive.current = false;
        setLines((prev) =>
          prev.map((line) =>
            line.id === lineId
              ? {
                  ...line,
                  bankStepIndex: done,
                  pendingWrite: undefined,
                  applied: true,
                  writeError: undefined,
                  text: t('maestro.bankRecipe.allDone', steps.length),
                }
              : line,
          ),
        );
        setThread((prev) =>
          appendMessage(prev, {
            role: 'assistant',
            text: t('maestro.bankRecipe.allDone', steps.length),
            outcome: 'applied',
          }),
        );
      }
    } catch (error) {
      bankApplyActive.current = false;
      const message = error instanceof Error ? error.message : String(error);
      setLines((prev) =>
        prev.map((line) => (line.id === lineId ? { ...line, writeError: message } : line)),
      );
      pushLine({ role: 'system', text: t('maestro.bankRecipe.writeFailed', message) });
    } finally {
      setBusy(false);
    }
  };

  /** Single-slot WRITE after temp apply. */
  const writeSinglePending = async (lineId: string, slot: LoadSlotAsk) => {
    setBusy(true);
    try {
      await writePendingSlot(slot);
      setLines((prev) =>
        prev.map((line) =>
          line.id === lineId
            ? {
                ...line,
                pendingWrite: undefined,
                applied: true,
                writeError: undefined,
                text: t('maestro.bankRecipe.singleWritten', slot.label),
              }
            : line,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLines((prev) =>
        prev.map((line) => (line.id === lineId ? { ...line, writeError: message } : line)),
      );
      pushLine({ role: 'system', text: t('maestro.bankRecipe.writeFailed', message) });
    } finally {
      setBusy(false);
    }
  };

  const applySystem = (lineIdToFlip: string, plan: SystemPlan) => {
    const count = plan.accepted.length;
    const finish = () => {
      setLines((prev) =>
        prev.map((line) => (line.id === lineIdToFlip ? { ...line, applied: true } : line)),
      );
      setThread((prev) =>
        appendMessage(prev, {
          role: 'assistant',
          text: t('maestro.applied', count),
          outcome: 'applied',
        }),
      );
    };
    if (live) {
      void runAppMutation(() => {
        applySystemPlan(system, plan);
      }, asSnapshotSource(live)).then(finish);
    } else {
      applySystemPlan(system, plan);
      finish();
    }
  };

  const handleResult = (result: TurnResult) => {
    if (result.state === 'needsKey') {
      setHasKey(false);
      return;
    }
    if (result.state === 'stopped') {
      pushLine({ role: 'system', text: t('maestro.stopped') });
      return;
    }
    if (result.state === 'error') {
      pushLine({ role: 'system', text: errorCopy(t, result.errorCode) });
      return;
    }
    if (result.state === 'confirmLoad' && result.loadSlot) {
      pushLine({
        role: 'assistant',
        text: result.reply ?? '',
        loadSlot: result.loadSlot,
      });
      return;
    }
    if (result.state === 'proposal' && (result.plan || result.systemPlan || result.bankSteps?.length)) {
      const lineId = nextId();
      const isBankRecipe = Boolean(result.bankSteps?.length);
      setLines((prev) => [
        ...prev,
        {
          id: lineId,
          role: 'assistant',
          text: result.reply ?? t('maestro.proposal', result.intent ?? ''),
          // Bank recipe: progress card only — hide the Apply-all proposal diff.
          plan: isBankRecipe ? undefined : result.plan,
          systemPlan: result.systemPlan,
          loadSlot: result.autoApply ? undefined : result.loadSlot,
          bankSteps: result.bankSteps,
          bankStepIndex: 0,
          // So WRITE is visible immediately; loadBankTemp refreshes after temp apply.
          pendingWrite: result.bankSteps?.[0]?.loadSlot ?? result.loadSlot,
          autoApplied: Boolean(result.autoApply),
        },
      ]);
      setThread((prev) =>
        appendMessage(prev, {
          role: 'assistant',
          text: result.reply ?? '',
          intent: result.intent,
        }),
      );
      if (result.autoApply && result.systemPlan) {
        applySystem(lineId, result.systemPlan);
      } else if (result.autoApply && result.bankSteps && result.bankSteps.length > 0) {
        bankApplyActive.current = true;
        void loadBankTemp(lineId, result.bankSteps, 0);
      } else if (result.autoApply && result.plan) {
        applyPlan(lineId, result.plan, result.loadSlot);
      }
      return;
    }
    pushLine({ role: 'assistant', text: result.reply ?? '' });
    setThread((prev) =>
      appendMessage(prev, { role: 'assistant', text: result.reply ?? '', intent: result.intent }),
    );
  };

  const confirmLoad = async (lineIdToClear: string, slot: LoadSlotAsk) => {
    await selectSlot(slot);
    setLines((prev) =>
      prev.map((line) =>
        line.id === lineIdToClear
          ? { ...line, loadSlot: undefined, text: t('maestro.loadSlot.loaded', slot.label) }
          : line,
      ),
    );
  };

  if (!open) return null;

  const pane = variant === 'pane';

  return (
    <>
      <aside
        className={pane ? 'maestro-drawer maestro-pane' : 'maestro-drawer'}
        role="complementary"
        aria-label={t('maestro.title')}
      >
        <header className="maestro-drawer-head">
          <div>
            <h2>{t('maestro.title')}</h2>
            <p className="maestro-meta">
              {t('maestro.sourceCopy', sourceLabel(editor), gkMode, changeCount)}
              {session ? ` · ${session}` : ''}
            </p>
          </div>
          <div className="maestro-head-actions">
            <button
              type="button"
              className="maestro-icon"
              aria-label={t('maestro.settings.title')}
              onClick={() => onSettingsOpenChange(true)}
            >
              ⚙
            </button>
            {!pane && (
              <button
                type="button"
                className="maestro-icon"
                aria-label={t('maestro.close')}
                onClick={onClose}
              >
                ×
              </button>
            )}
          </div>
        </header>

        {stageLive && (
          <p className="maestro-banner" role="status">
            {t('maestro.policy.stageLive')}
          </p>
        )}

        {!hasKey && (
          <div className="maestro-needs-key">
            <h3>{t('maestro.needsKey.title')}</h3>
            <p>{t('maestro.needsKey.body')}</p>
            <button type="button" className="primary" onClick={onOpenSettings}>
              {t('maestro.needsKey.openSettings')}
            </button>
          </div>
        )}

        <div className="maestro-messages" ref={listRef} aria-live="polite">
          {lines.map((line) => (
            <div key={line.id} className={`maestro-line maestro-line-${line.role}`}>
              {line.role === 'divider' ? (
                <p className="maestro-stale">{line.text}</p>
              ) : (
                <p>{line.text}</p>
              )}
              {line.plan && !line.bankSteps && (
                <ProposalCard
                  plan={line.plan}
                  applied={line.applied || line.autoApplied}
                  intent={line.text}
                  onApplyAll={() => applyPlan(line.id, line.plan!)}
                  onDiscard={() =>
                    setLines((prev) =>
                      prev.map((row) => (row.id === line.id ? { ...row, plan: undefined } : row)),
                    )
                  }
                />
              )}
              {line.systemPlan && (
                <div className={`maestro-card ${line.applied ? 'maestro-row-applied' : ''}`}>
                  <ul className="maestro-diff">
                    {line.systemPlan.accepted.map((item) => (
                      <li key={item.change.ref}>
                        <code>{item.change.ref}</code> → {String(item.change.value)}
                        {item.change.why ? ` — ${item.change.why}` : ''}
                      </li>
                    ))}
                  </ul>
                  {!line.applied && !line.autoApplied && (
                    <div className="maestro-card-actions">
                      <button
                        type="button"
                        className="primary"
                        onClick={() => applySystem(line.id, line.systemPlan!)}
                      >
                        {t('maestro.applyAll')}
                      </button>
                    </div>
                  )}
                  {(line.applied || line.autoApplied) && (
                    <p role="status">{t('maestro.applied', line.systemPlan.accepted.length)}</p>
                  )}
                </div>
              )}
              {line.loadSlot && (
                <div className="maestro-card">
                  <p>{t('maestro.loadSlot.confirm', line.loadSlot.label, changeCount)}</p>
                  <div className="maestro-card-actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => void confirmLoad(line.id, line.loadSlot!)}
                    >
                      {t('maestro.loadSlot.load')}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLines((prev) =>
                          prev.map((row) =>
                            row.id === line.id ? { ...row, loadSlot: undefined } : row,
                          ),
                        )
                      }
                    >
                      {t('maestro.loadSlot.cancel')}
                    </button>
                  </div>
                </div>
              )}
              {line.bankSteps && line.bankSteps.length > 0 && (
                <BankRecipeCard
                  steps={line.bankSteps}
                  currentIndex={line.bankStepIndex ?? 0}
                  finished={Boolean(line.applied)}
                  busy={busy}
                  error={line.writeError}
                  onWrite={
                    !line.applied &&
                    (line.bankStepIndex ?? 0) < line.bankSteps.length &&
                    line.bankSteps[line.bankStepIndex ?? 0]
                      ? () =>
                          void writeBankCurrent(
                            line.id,
                            line.bankSteps!,
                            line.bankStepIndex ?? 0,
                          )
                      : undefined
                  }
                />
              )}
              {!line.bankSteps && (line.pendingWrite || (line.autoApplied && line.loadSlot)) && (
                <div className="maestro-card maestro-write-card">
                  <p>{t('maestro.bankRecipe.writeAllHint')}</p>
                  {line.writeError && (
                    <p className="error" role="alert">
                      {line.writeError}
                    </p>
                  )}
                  <div className="maestro-card-actions">
                    <button
                      type="button"
                      className="primary maestro-write-btn"
                      disabled={busy || line.applied}
                      onClick={() => {
                        const slot = line.pendingWrite ?? line.loadSlot;
                        if (slot) void writeSinglePending(line.id, slot);
                      }}
                    >
                      {t(
                        'maestro.bankRecipe.write',
                        (line.pendingWrite ?? line.loadSlot)!.label,
                        editor.patchName || 'patch',
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {busy && (
            <p className="maestro-thinking" role="status">
              {t('maestro.thinking')}
            </p>
          )}
        </div>

        <footer className="maestro-composer">
          <button
            type="button"
            className="maestro-clear"
            onClick={() => {
              bankApplyActive.current = false;
              clearHistory(locale, sourceKey);
              setThread({ sourceKey, locale, messages: [] });
              setLines([{ id: nextId(), role: 'system', text: t('maestro.cleared') }]);
            }}
          >
            {t('maestro.clear')}
          </button>
          <div className="maestro-input-row">
            <input
              type="text"
              value={draft}
              placeholder={t('maestro.placeholder')}
              aria-label={t('maestro.placeholder')}
              disabled={stageLive || busy}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            {voiceSupported() ? (
              <button
                type="button"
                className={listening ? 'maestro-mic live' : 'maestro-mic'}
                title={listening ? t('maestro.voice.listening') : t('maestro.voice.label')}
                aria-label={t('maestro.voice.label')}
                disabled={stageLive || busy}
                onClick={() => {
                  if (listening) voiceRef.current?.stop();
                  else voiceRef.current?.start();
                  setListening(!listening);
                }}
              >
                🎤
              </button>
            ) : (
              <span className="maestro-mic-missing" title={t('maestro.voice.unsupported')} />
            )}
            {busy ? (
              <button type="button" onClick={() => abortActiveTurn()}>
                {t('maestro.stop')}
              </button>
            ) : (
              <button
                type="button"
                className="primary"
                disabled={stageLive || busy || !draft.trim()}
                onClick={() => void send()}
              >
                {t('maestro.send')}
              </button>
            )}
          </div>
          <p className="maestro-policy-links">
            <Link to={globalHref}>{t('maestro.policy.systemDenied')}</Link>
          </p>
        </footer>
      </aside>

      {settingsOpen && (
        <SettingsModal
          onClose={() => {
            onSettingsOpenChange(false);
            setHasKey(Boolean(getApiKey()));
          }}
        />
      )}
    </>
  );
}

function BankRecipeCard({
  steps,
  currentIndex,
  finished,
  busy,
  error,
  onWrite,
}: {
  steps: BankApplyStep[];
  currentIndex: number;
  finished: boolean;
  busy: boolean;
  error?: string;
  onWrite?: () => void;
}) {
  const t = useT();
  const current = !finished ? steps[currentIndex] : undefined;
  return (
    <div className={`maestro-card ${finished ? 'maestro-row-applied' : ''}`}>
      <h3>{t('maestro.bankRecipe.progress')}</h3>
      <p className="hint">{t('maestro.bankRecipe.writeAllHint')}</p>
      <ol className="maestro-bank-progress">
        {steps.map((step, index) => {
          const state = finished
            ? 'written'
            : index < currentIndex
              ? 'written'
              : index === currentIndex
                ? 'testing'
                : 'pending';
          return (
            <li key={step.slotLabel} data-state={state === 'testing' ? 'current' : state}>
              <strong>USER {step.slotLabel}</strong> {step.patchName}
              <span>
                {state === 'written'
                  ? t('maestro.bankRecipe.written')
                  : state === 'testing'
                    ? t('maestro.bankRecipe.testing')
                    : t('maestro.bankRecipe.pending')}
              </span>
            </li>
          );
        })}
      </ol>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {onWrite && current && (
        <div className="maestro-card-actions maestro-write-actions">
          <button
            type="button"
            className="primary maestro-write-btn"
            disabled={busy}
            onClick={onWrite}
          >
            {t('maestro.bankRecipe.write', current.slotLabel, current.patchName)}
          </button>
        </div>
      )}
      {finished && <p role="status">{t('maestro.bankRecipe.allDone', steps.length)}</p>}
    </div>
  );
}

function ProposalCard({
  plan,
  applied,
  intent,
  onApplyAll,
  onDiscard,
}: {
  plan: ValidatedPlan;
  applied?: boolean;
  intent: string;
  onApplyAll: () => void;
  onDiscard: () => void;
}) {
  const t = useT();
  const rows = [...plan.accepted, ...plan.clamped, ...plan.rejected];
  return (
    <div className={`maestro-card ${applied ? 'maestro-row-applied' : ''}`}>
      <h3>{t('maestro.proposal', intent)}</h3>
      <ul>
        {rows.map((item) => (
          <li
            key={item.change.key}
            className={
              item.action === 'reject'
                ? 'maestro-row-rejected'
                : applied
                  ? 'maestro-row-applied'
                  : undefined
            }
          >
            <strong>{item.entry?.label ?? item.change.key}</strong>
            <span>
              {t('maestro.current')} {item.current} → {t('maestro.proposed')} {item.proposed}
            </span>
            {item.change.why && <em>{item.change.why}</em>}
            {item.action === 'reject' && item.reason && (
              <span>{t('maestro.rejected', item.reason)}</span>
            )}
            {item.reason === 'clamp' && <span>{t('maestro.clampedNote')}</span>}
          </li>
        ))}
      </ul>
      {!applied && plan.accepted.length + plan.clamped.length > 0 && (
        <div className="maestro-card-actions">
          <button type="button" className="primary" onClick={onApplyAll}>
            {t('maestro.applyAll')}
          </button>
          <button type="button" onClick={onDiscard}>
            {t('maestro.discard')}
          </button>
        </div>
      )}
      {applied && <p role="status">{t('maestro.applied', rows.length)}</p>}
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [key, setKey] = useState(() => getApiKey() ?? '');
  const [remember, setRemember] = useState(() => isRemembered());
  const [testNote, setTestNote] = useState<string>();

  return (
    <div className="maestro-settings-backdrop" role="presentation" onClick={onClose}>
      <div
        className="maestro-settings"
        role="dialog"
        aria-labelledby="maestro-settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="maestro-settings-title">{t('maestro.settings.title')}</h2>
        <label>
          {t('maestro.settings.key')}
          <input
            type="password"
            autoComplete="off"
            value={key}
            onChange={(event) => setKey(event.target.value)}
          />
        </label>
        <label className="maestro-remember">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />
          {t('maestro.settings.remember')}
        </label>
        <p className="hint">{t('maestro.settings.privacy')}</p>
        {testNote && <p role="status">{testNote}</p>}
        <div className="maestro-card-actions">
          <button
            type="button"
            className="primary"
            onClick={() => {
              setApiKey(key, remember);
              onClose();
            }}
          >
            {t('maestro.settings.close')}
          </button>
          <button
            type="button"
            onClick={() => {
              void testApiKey(fetch, key.trim() || undefined).then((result) => {
                setTestNote(result.ok ? t('maestro.settings.testOk') : errorCopy(t, result.error));
              });
            }}
          >
            {t('maestro.settings.test')}
          </button>
          <button
            type="button"
            onClick={() => {
              forgetApiKey();
              setKey('');
              setRemember(false);
              setTestNote(undefined);
            }}
          >
            {t('maestro.settings.forget')}
          </button>
        </div>
      </div>
    </div>
  );
}
