import { intentionSupported } from '../../intentions/support';
import type {
  ConfirmedView,
  DeviceCapabilities,
  IntentionSession,
  MusicalIntention,
  PreviewResult,
  SessionView,
} from '../../intentions/types';

/**
 * In-memory board used to prove a second adapter can run the same intentions.
 * It has no GR-55 addresses and no modeling block.
 */
const TEST_CAPABILITIES: DeviceCapabilities = {
  id: 'test-board',
  persistence: 'explicit-verified-write',
  hardwareConfirmed: false,
  maxSynthLayers: 2,
  hasModeling: false,
  hasNormalSignal: true,
  hasExpression: true,
  hasCtl: true,
  supportsArticulation: false,
  assignSlots: 2,
  gkSets: 1,
  sharedEffects: ['reverb'],
  userSlotCount: 4,
};

export function createTestSession(): IntentionSession {
  const listeners = new Set<() => void>();
  let confirmed: ConfirmedView = empty();
  let saved: ConfirmedView | null = null;
  let previous: ConfirmedView | null = null;
  const state: SessionView = {
    phase: 'idle',
    detail: '',
    blocked: false,
    lastVerifiedAt: Date.now(),
    confirmed,
    canRestore: false,
  };

  const publish = () => {
    state.confirmed = confirmed;
    state.canRestore = previous != null;
    for (const listener of listeners) listener();
  };

  const preview = (intention: MusicalIntention): PreviewResult => {
    if (!intentionSupported(TEST_CAPABILITIES, intention)) {
      return { ok: false, code: 'unsupported' };
    }
    if (intention.kind === 'recipe' && intention.id === 'nylon-harmonica-exp') {
      if (confirmed.expression === 'other')
        return { ok: false, code: 'refused', control: 'expression' };
      return { ok: true, groups: ['normal', 'layer1', 'expression'], scope: 'patch' };
    }
    if (intention.kind === 'recipe' && intention.id === 'nylon-piano-strings-ctl') {
      if (confirmed.ctl === 'other') return { ok: false, code: 'refused', control: 'ctl' };
      return { ok: true, groups: ['normal', 'layer1', 'layer2', 'ctl'], scope: 'patch' };
    }
    if (intention.kind === 'recipe') {
      return { ok: true, groups: ['normal', 'layer1'], scope: 'patch' };
    }
    return { ok: true, groups: ['gkTouch'], scope: 'system' };
  };

  return {
    capabilities: TEST_CAPABILITIES,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState: () => state,
    preview,
    async apply(intention) {
      const plan = preview(intention);
      if (!plan.ok) return plan;
      if (state.blocked) return { ok: false, code: 'blocked' };
      previous = structuredClone(confirmed);
      if (intention.kind === 'recipe' && intention.id === 'nylon-harmonica-exp') {
        confirmed = {
          ...confirmed,
          normalOn: true,
          modelingOn: false,
          expression: 'layer-1',
          layers: [
            { slot: 1, on: true, toneName: 'Harmonica', level: 100 },
            { slot: 2, on: false, toneName: '', level: 0 },
          ],
          recipeId: confirmed.ctl === 'off' ? 'nylon-harmonica-exp' : null,
        };
      } else if (intention.kind === 'recipe' && intention.id === 'nylon-piano-strings-ctl') {
        confirmed = {
          ...confirmed,
          normalOn: true,
          modelingOn: false,
          ctl: 'toggle-2',
          layers: [
            { slot: 1, on: true, toneName: 'Piano', level: 80 },
            { slot: 2, on: true, toneName: 'Strings', level: 70 },
          ],
          recipeId: confirmed.expression === 'off' ? 'nylon-piano-strings-ctl' : null,
        };
      } else if (intention.kind === 'recipe') {
        confirmed = {
          ...confirmed,
          normalOn: false,
          modelingOn: false,
          layers: [
            { slot: 1, on: true, toneName: 'Sax', level: 100 },
            { slot: 2, on: false, toneName: '', level: 0 },
          ],
          recipeId:
            confirmed.expression === 'off' && confirmed.ctl === 'off'
              ? 'solo-without-guitar'
              : null,
        };
      }
      state.phase = 'applied';
      state.lastVerifiedAt = Date.now();
      publish();
      return { ok: true };
    },
    async selectSlot(slot) {
      if (state.blocked) return { ok: false, code: 'blocked' };
      confirmed = {
        ...confirmed,
        userSlot: slot,
        slotLabel: `T${slot}`,
        tempDiffersFromUser: null,
      };
      state.phase = 'idle';
      state.lastVerifiedAt = Date.now();
      publish();
      return { ok: true };
    },
    async save(slot) {
      if (state.blocked) return { ok: false, code: 'blocked' };
      saved = structuredClone(confirmed);
      confirmed = { ...confirmed, userSlot: slot, slotLabel: `T${slot}` };
      state.phase = 'saved';
      state.lastVerifiedAt = Date.now();
      publish();
      return { ok: true };
    },
    async restore() {
      if (!previous) return { ok: false, code: 'failed' };
      confirmed = previous;
      previous = null;
      state.phase = 'applied';
      publish();
      return { ok: true };
    },
    async reread() {
      if (saved) confirmed = structuredClone(saved);
      state.phase = 'idle';
      state.blocked = false;
      state.lastVerifiedAt = Date.now();
      publish();
    },
    async recover() {
      state.blocked = false;
      await this.reread();
    },
  };
}

function empty(): ConfirmedView {
  return {
    patchName: 'Test',
    userSlot: null,
    slotLabel: null,
    tempDiffersFromUser: null,
    normalOn: true,
    modelingOn: false,
    layers: [
      { slot: 1, on: false, toneName: '', level: 0 },
      { slot: 2, on: false, toneName: '', level: 0 },
    ],
    expression: 'off',
    ctl: 'off',
    recipeId: null,
    gk: {
      setNumber: 1,
      name: '',
      playFeel: 3,
      lowVelocityCut: 3,
      velocityDynamics: 4,
      sens: [28, 28, 28, 28, 28, 28],
    },
  };
}
