/** The steps of the stage setup, in the one order they are walked. */
export const SETUP_STEPS = [
  'rig',
  'mode',
  'instruments',
  'output',
  'pedals',
  'midi',
  'backup',
  'sync',
] as const;

export type SetupStep = (typeof SETUP_STEPS)[number];

/** How a step was left: done, or passed over with "continue anyway". */
export type StepOutcome = 'ok' | 'warn';

/** What the musician told the setup. It lives on this computer, never in the pedal. */
export interface SetupState {
  rigName: string;
  steps: Partial<Record<SetupStep, StepOutcome>>;
  /** The setup was walked to its end once; the app opens on the Stage from then on. */
  complete: boolean;
  /** A note per GK set 1–10: which instrument it belongs to. */
  gkNotes: Record<number, string>;
}

const SETUP_KEY = 'rigbench.gr55.setup';

const EMPTY: SetupState = { rigName: '', steps: {}, complete: false, gkNotes: {} };

export function loadSetup(): SetupState {
  try {
    const stored = JSON.parse(localStorage.getItem(SETUP_KEY) ?? 'null') as Partial<SetupState>;
    if (stored && typeof stored === 'object') {
      return {
        rigName: typeof stored.rigName === 'string' ? stored.rigName : '',
        steps: { ...stored.steps },
        complete: stored.complete === true,
        gkNotes: { ...stored.gkNotes },
      };
    }
  } catch {
    // Nothing stored, or not ours: start from an empty setup.
  }
  return { ...EMPTY, steps: {}, gkNotes: {} };
}

export function saveSetup(state: SetupState): void {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(state));
  } catch {
    // Without storage the setup still holds for this visit.
  }
}

/**
 * The steps that were passed over, for the reminder the Stage shows. Sync is left out:
 * it carries on behind every screen, and its own seal says where it is.
 */
export function skippedSteps(state: SetupState): SetupStep[] {
  return SETUP_STEPS.filter((step) => step !== 'sync' && state.steps[step] === 'warn');
}
