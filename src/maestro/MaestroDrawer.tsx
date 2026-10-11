import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getLocale, useT } from '../copy';
import type { Gr55Editor } from '../devices/gr55/editor';
import { formatFieldBytes } from '../devices/gr55/editor';
import { TEMPORARY_PATCH_ADDRESS } from '../devices/gr55/patchLayout';
import { useConnectionOptional } from '../devices/gr55/connectionRuntime';
import { globalHref } from '../devices/gr55/routes';
import { asSnapshotSource } from '../devices/gr55/snapshotHost';
import { runAppMutation } from '../devices/gr55/sessionAuthority';
import { slotsOfMode } from '../devices/gr55/slots';
import type { ValidatedItem, ValidatedPlan } from './contracts';
import { appendMessage, clearHistory, loadHistory, markStale, sourceKeyOf } from './history';
import type { HistoryThread } from './history';
import { abortActiveTurn, runTurn } from './orchestrator';
import type { LoadSlotAsk, TurnResult } from './orchestrator';
import { GeminiProvider } from './provider';
import { buildFieldRegistry, registryIndex } from './fieldRegistry';
import { forgetApiKey, getApiKey, isRemembered, setApiKey, testApiKey } from './settings';
import type { SessionId } from './session';
import { resolveSlotLabel } from './slotResolve';
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
  loadSlot?: LoadSlotAsk;
  applied?: boolean;
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

  useEffect(() => {
    if (lastSource.current !== sourceKey || lastMode.current !== gkMode) {
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
    if (!getApiKey()) {
      setHasKey(false);
      return;
    }
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
    if (result.state === 'proposal' && result.plan) {
      pushLine({
        role: 'assistant',
        text: result.reply ?? t('maestro.proposal', result.intent ?? ''),
        plan: result.plan,
      });
      setThread((prev) =>
        appendMessage(prev, {
          role: 'assistant',
          text: result.reply ?? '',
          intent: result.intent,
        }),
      );
      return;
    }
    pushLine({ role: 'assistant', text: result.reply ?? '' });
    setThread((prev) =>
      appendMessage(prev, { role: 'assistant', text: result.reply ?? '', intent: result.intent }),
    );
  };

  const applyItems = (items: ValidatedItem[]) => {
    for (const item of items) {
      if (!item.entry || item.coerced === undefined) continue;
      if (item.entry.ref.address < TEMPORARY_PATCH_ADDRESS) continue;
      editor.write(item.entry.ref, item.coerced as never);
    }
  };

  const applyPlan = (lineIdToFlip: string, plan: ValidatedPlan) => {
    const items = [...plan.accepted, ...plan.clamped];
    const finish = () => {
      setLines((prev) =>
        prev.map((line) => (line.id === lineIdToFlip ? { ...line, applied: true } : line)),
      );
      setThread((prev) =>
        appendMessage(prev, {
          role: 'assistant',
          text: t('maestro.applied', items.length),
          outcome: 'applied',
        }),
      );
    };
    if (live) {
      void runAppMutation(() => applyItems(items), asSnapshotSource(live)).then(finish);
    } else {
      applyItems(items);
      finish();
    }
  };

  const confirmLoad = async (lineIdToClear: string, slot: LoadSlotAsk) => {
    const select = () => editor.selectPatch(slot.bankMsb, slot.programChange);
    if (live) {
      await runAppMutation(select, asSnapshotSource(live));
    } else {
      await select();
    }
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
              {line.plan && (
                <ProposalCard
                  plan={line.plan}
                  applied={line.applied}
                  intent={line.text}
                  onApplyAll={() => applyPlan(line.id, line.plan!)}
                  onApplyItem={(item) => {
                    applyItems([item]);
                    setLines((prev) =>
                      prev.map((row) => (row.id === line.id ? { ...row, applied: true } : row)),
                    );
                  }}
                  onDiscard={() =>
                    setLines((prev) =>
                      prev.map((row) => (row.id === line.id ? { ...row, plan: undefined } : row)),
                    )
                  }
                />
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
              disabled={stageLive || !hasKey}
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
                disabled={stageLive || !hasKey}
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
                disabled={stageLive || !hasKey || !draft.trim()}
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

function ProposalCard({
  plan,
  applied,
  intent,
  onApplyAll,
  onApplyItem,
  onDiscard,
}: {
  plan: ValidatedPlan;
  applied?: boolean;
  intent: string;
  onApplyAll: () => void;
  onApplyItem: (item: ValidatedItem) => void;
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
            {item.reason === 'truncated' && <span>{t('maestro.clampedNote')}</span>}
            {(item.action === 'accept' || item.action === 'clamp') && !applied && (
              <button type="button" onClick={() => onApplyItem(item)}>
                {t('maestro.applyItem')}
              </button>
            )}
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
