import type { FieldReference, FieldType } from '../../../protocol/RolandAddressMap';
import { GR55_CAPABILITIES } from '../../contract/gr55Capabilities';
import type {
  ConfirmedView,
  IntentionSession,
  MusicalIntention,
  OperationResult,
  PedalRole,
  PreviewResult,
  RecipeId,
  SessionView,
} from '../../../intentions/types';
import {
  MismatchError,
  OperationQueue,
  QueueBlockedError,
  QueueTimeoutError,
} from '../../../session/operationQueue';
import { holdRemoteMirror } from '../sessionAuthority';
import type { Gr55Editor } from '../editor';
import { formatUserSlot } from '../slots';
import { SYSTEM_ADDRESS, SYSTEM_SPAN, SYSTEM, gkSet } from '../systemMap';
import { TEMPORARY_PATCH } from '../patchLayout';
import type { Gr55System } from '../systemState';
import { readCtl, readExpression, translate, type FieldChange } from './translate';

const patch = TEMPORARY_PATCH;

export interface Gr55IntentionSession extends IntentionSession {
  writeField(field: FieldReference<FieldType<unknown>>, value: unknown): Promise<OperationResult>;
}

export function createGr55Session(editor: Gr55Editor, system: Gr55System): Gr55IntentionSession {
  const queue = new OperationQueue();
  const listeners = new Set<() => void>();
  let view = capture(editor, system, null);
  let restorePoint: FieldChange[] | null = null;
  let cached: SessionView = {
    phase: 'idle',
    detail: '',
    blocked: false,
    lastVerifiedAt: null,
    confirmed: view,
    canRestore: false,
  };
  queue.touchVerified();

  function publish(): void {
    const queued = queue.snapshot();
    cached = {
      phase: queued.phase,
      detail: queued.detail,
      blocked: queued.blocked,
      lastVerifiedAt: queued.lastVerifiedAt,
      confirmed: view,
      canRestore: restorePoint != null,
    };
    for (const listener of listeners) listener();
  }

  queue.subscribe(() => publish());
  publish();

  async function reloadView(): Promise<void> {
    const delta = await editor.differsFromCurrentUserSlot();
    view = capture(editor, system, delta);
    publish();
  }

  async function commit(changes: FieldChange[]): Promise<void> {
    const prior: FieldChange[] = [];
    for (const change of changes) {
      prior.push(readChange(editor, system, change));
    }
    holdRemoteMirror(true);
    try {
      for (const change of changes) {
        const host = change.area === 'patch' ? editor : system;
        const result = change.raw
          ? await host.writeVerifiedBytes(change.field, change.raw)
          : await host.writeVerified(change.field, change.value);
        if (!result.match) throw new MismatchError();
      }
      restorePoint = prior;
    } finally {
      holdRemoteMirror(false);
    }
    await reloadView();
  }

  async function reread(): Promise<void> {
    await queue.run('read', 'read', async () => {
      await system.load();
      await editor.readSystem();
      await editor.readPatch();
      await editor.readPatchLocation();
      await reloadView();
    });
  }

  async function applyChanges(changes: FieldChange[], kind: 'apply' | 'save' = 'apply'): Promise<OperationResult> {
    if (queue.snapshot().blocked) return { ok: false, code: 'blocked' };
    try {
      await queue.run(kind, kind, async () => {
        await commit(changes);
      });
      return { ok: true };
    } catch (error) {
      return mapError(error);
    }
  }

  return {
    capabilities: GR55_CAPABILITIES,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState: () => cached,
    preview(intention): PreviewResult {
      const plan = translate(editor, system, intention);
      if (!plan.ok) return plan;
      return { ok: true, groups: plan.groups, scope: plan.scope };
    },
    async apply(intention: MusicalIntention): Promise<OperationResult> {
      if (queue.snapshot().blocked) return { ok: false, code: 'blocked' };
      try {
        if (queue.stale()) await reread();
        const plan = translate(editor, system, intention);
        if (!plan.ok) return plan;
        await queue.run('apply', intention.kind, async () => {
          const again = translate(editor, system, intention);
          if (!again.ok) throw new MismatchError();
          await commit(again.changes);
        });
        return { ok: true };
      } catch (error) {
        return mapError(error);
      }
    },
    async save(slot: number): Promise<OperationResult> {
      if (queue.snapshot().blocked) return { ok: false, code: 'blocked' };
      try {
        await queue.run('save', 'save', async () => {
          holdRemoteMirror(true);
          try {
            const verified = await editor.writeToUserSlotVerified(slot);
            if (!verified.ok) throw new MismatchError();
            await editor.readPatchLocation();
          } finally {
            holdRemoteMirror(false);
          }
          await reloadView();
        });
        return { ok: true };
      } catch (error) {
        return mapError(error);
      }
    },
    async restore(): Promise<OperationResult> {
      if (!restorePoint) return { ok: false, code: 'failed' };
      const changes = restorePoint;
      const result = await applyChanges(changes);
      if (result.ok) {
        restorePoint = null;
        publish();
      }
      return result;
    },
    reread,
    async recover() {
      queue.unblock();
      try {
        await reread();
      } catch {
        queue.markUncertain('failed');
      }
    },
    writeField(field, value) {
      const area =
        field.address >= SYSTEM_ADDRESS && field.address < SYSTEM_ADDRESS + SYSTEM_SPAN
          ? 'system'
          : 'patch';
      return applyChanges([{ area, field, value }]);
    },
  };
}

function mapError(error: unknown): OperationResult {
  if (error instanceof QueueBlockedError) return { ok: false, code: 'blocked' };
  if (error instanceof QueueTimeoutError) return { ok: false, code: 'timeout' };
  if (error instanceof MismatchError) return { ok: false, code: 'mismatch' };
  return { ok: false, code: 'failed' };
}

function readChange(editor: Gr55Editor, system: Gr55System, change: FieldChange): FieldChange {
  const host = change.area === 'patch' ? editor : system;
  const read = host.read(change.field as never) as
    | { ok: true; value: unknown }
    | { ok: false; raw: Uint8Array };
  if (read.ok) return { area: change.area, field: change.field, value: read.value };
  if (read.raw.byteLength === 0) throw new MismatchError();
  return { area: change.area, field: change.field, value: undefined, raw: Uint8Array.from(read.raw) };
}

function capture(editor: Gr55Editor, system: Gr55System, tempDiffersFromUser: boolean | null): ConfirmedView {
  const slot = editor.patchSource?.kind === 'slot' ? editor.patchSource.userPatchNumber : null;
  const layers = [1, 2].map((slotNumber) => {
    const pcm = slotNumber === 1 ? patch.patchPCMTone1 : patch.patchPCMTone2;
    const tone = editor.read(pcm.toneSelect);
    const level = editor.read(pcm.partLevel);
    const mute = editor.read(pcm.muteSwitch);
    const levelValue = level.ok && typeof level.value === 'number' ? level.value : 0;
    const sounding = mute.ok && mute.value === false && levelValue > 0;
    return {
      slot: slotNumber as 1 | 2,
      on: sounding,
      toneName: tone.ok ? String(tone.value).trim() : '',
      level: levelValue,
    };
  });
  const normalMute = editor.read(patch.common.normalPuMute);
  const normalLevel = editor.read(patch.common.normalPuLevel);
  const modelingMute = editor.read(patch.modelingTone.muteSwitch);
  const expression = readExpression(editor);
  const ctl = readCtl(editor);
  const confirmed: ConfirmedView = {
    patchName: editor.patchName,
    userSlot: slot,
    slotLabel: slot == null ? null : formatUserSlot(slot, editor.gkMode),
    tempDiffersFromUser,
    normalOn:
      normalMute.ok &&
      normalMute.value === false &&
      normalLevel.ok &&
      typeof normalLevel.value === 'number' &&
      normalLevel.value > 0,
    modelingOn: !modelingMute.ok || modelingMute.value === false,
    layers,
    expression,
    ctl,
    recipeId: null,
    gk: readGk(system),
  };
  confirmed.recipeId = matchRecipe(confirmed, expression, ctl);
  return confirmed;
}

function readGk(system: Gr55System): ConfirmedView['gk'] {
  const select = system.read(SYSTEM.common.gkSetSelect);
  if (!select.ok) return null;
  const set = gkSet(select.value + 1);
  const name = system.read(set.name);
  const playFeel = system.read(set.playFeel);
  const cut = system.read(set.lowVelocityCut);
  const dynamics = system.read(set.velocityDynamics);
  const sens = [1, 2, 3, 4, 5, 6].map((string) => {
    const key = `string${string}Sens` as 'string1Sens';
    const read = system.read(set[key]);
    return read.ok && typeof read.value === 'number' ? read.value : 0;
  });
  if (!playFeel.ok || !cut.ok || !dynamics.ok) return null;
  return {
    setNumber: select.value + 1,
    name: name.ok ? String(name.value).trim() : '',
    playFeel: playFeel.value,
    lowVelocityCut: cut.value,
    velocityDynamics: dynamics.value,
    sens,
  };
}

function matchRecipe(view: ConfirmedView, expression: PedalRole, ctl: PedalRole): RecipeId | null {
  if (view.modelingOn) return null;
  const [first, second] = view.layers;
  if (
    view.normalOn &&
    first?.on &&
    first.toneName === 'Harmonica 1' &&
    !second?.on &&
    expression === 'layer-1' &&
    ctl === 'off'
  ) {
    return 'nylon-harmonica-exp';
  }
  if (
    view.normalOn &&
    first?.on &&
    first.toneName === 'St.Piano 1' &&
    second?.on &&
    second.toneName === 'Strings 1' &&
    ctl === 'toggle-2' &&
    expression === 'off'
  ) {
    return 'nylon-piano-strings-ctl';
  }
  if (
    !view.normalOn &&
    first?.on &&
    first.toneName === 'Alto Sax' &&
    !second?.on &&
    expression === 'off' &&
    ctl === 'off'
  ) {
    return 'solo-without-guitar';
  }
  return null;
}
