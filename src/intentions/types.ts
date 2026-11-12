export type PersistenceMode = 'explicit-verified-write' | 'physical-write';

export type LayerId =
  | 'piano'
  | 'epiano'
  | 'strings'
  | 'pad'
  | 'organ'
  | 'harmonica'
  | 'sax'
  | 'brass'
  | 'bass';

export type SoundMode = 'original' | 'accompaniment' | 'both';

export type EffectId = 'dry' | 'small-room' | 'soft-ambience' | 'solo-delay';

export type RecipeId = 'nylon-harmonica-exp' | 'nylon-piano-strings-ctl' | 'solo-without-guitar';

export type ValidationGrade = 'documented' | 'implemented' | 'hardware-tested';

export interface DeviceCapabilities {
  id: string;
  persistence: PersistenceMode;
  /** Proven on hardware for the claims this screen makes. */
  hardwareConfirmed: boolean;
  maxSynthLayers: number;
  hasModeling: boolean;
  hasNormalSignal: boolean;
  hasExpression: boolean;
  hasCtl: boolean;
  /** A single parameter that sets legato versus separated notes. */
  supportsArticulation: boolean;
  assignSlots: number;
  gkSets: number;
  sharedEffects: readonly string[];
  userSlotCount: number;
}

export type MusicalIntention =
  | {
      kind: 'instrument';
      profileId: string;
      calibrationId?: string;
      puType?: string;
      scaleMm?: number;
    }
  | {
      kind: 'calibration';
      playFeel?: number;
      lowVelocityCut?: number;
      velocityDynamics?: number;
      sens?: number;
    }
  | { kind: 'mode'; mode: SoundMode }
  | { kind: 'layer'; slot: 1 | 2; layer: LayerId; level: number }
  | { kind: 'clear-layer'; slot: 1 | 2 }
  | { kind: 'effect'; effect: EffectId }
  | { kind: 'recipe'; id: RecipeId };

export type PreviewGroup =
  | 'normal'
  | 'layer1'
  | 'layer2'
  | 'expression'
  | 'ctl'
  | 'effect'
  | 'gkTouch'
  | 'gkCut'
  | 'gkDynamics'
  | 'gkBalance'
  | 'gkPickup'
  | 'gkName'
  | 'gkScale'
  | 'systemPedals';

export type PedalRole = 'off' | 'layer-1' | 'layer-2' | 'toggle-1' | 'toggle-2' | 'other';

export interface ConfirmedView {
  patchName: string;
  userSlot: number | null;
  slotLabel: string | null;
  tempDiffersFromUser: boolean | null;
  normalOn: boolean;
  modelingOn: boolean;
  layers: Array<{ slot: 1 | 2; on: boolean; toneName: string; level: number }>;
  expression: PedalRole;
  ctl: PedalRole;
  /** Set only when the sounding patch matches one recipe without leftover pedal roles. */
  recipeId: RecipeId | null;
  gk: {
    setNumber: number;
    name: string;
    playFeel: number;
    lowVelocityCut: number;
    velocityDynamics: number;
    sens: number[];
  } | null;
}

export type PreviewResult =
  | { ok: true; groups: PreviewGroup[]; scope: 'patch' | 'system' | 'both' }
  | { ok: false; code: 'refused' | 'unsupported'; control?: 'expression' | 'ctl' };

export type OperationResult =
  | { ok: true }
  | { ok: false; code: 'refused' | 'unsupported' | 'blocked' | 'timeout' | 'mismatch' | 'failed'; control?: 'expression' | 'ctl' };

export interface SessionView {
  phase:
    | 'idle'
    | 'reading'
    | 'applying'
    | 'applied'
    | 'saving'
    | 'saved'
    | 'verifying'
    | 'uncertain';
  detail: string;
  blocked: boolean;
  lastVerifiedAt: number | null;
  confirmed: ConfirmedView | null;
  canRestore: boolean;
}

export interface IntentionSession {
  readonly capabilities: DeviceCapabilities;
  subscribe(listener: () => void): () => void;
  getState(): SessionView;
  preview(intention: MusicalIntention): PreviewResult;
  apply(intention: MusicalIntention): Promise<OperationResult>;
  save(slot: number): Promise<OperationResult>;
  /** Load a USER slot on the pedal and show the reading that comes back. */
  selectSlot(slot: number): Promise<OperationResult>;
  restore(): Promise<OperationResult>;
  reread(): Promise<void>;
  recover(): Promise<void>;
}
