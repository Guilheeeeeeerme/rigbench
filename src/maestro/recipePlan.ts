import type { Locale } from '../copy';
import type { ChangeItem } from './contracts';
import { matchPcmTones } from './toneMatch';

const MUTE = true;
const SOUND = false;
const OFF = false;

export interface CompiledRecipe {
  /** Patch name to write into the working copy (≤16 chars on pedal). */
  patchName: string;
  /** USER slot to select before applying (e.g. 01-1), if any. */
  targetSlot?: string;
  /** @deprecated alias of targetSlot for older call sites */
  writeSlot?: string;
  /** Exact PCM tone label. */
  pcm1Tone: string;
  changes: ChangeItem[];
  replyEn: string;
  replyPt: string;
}

export interface BankRecipeStepSpec {
  slotLabel: string;
  patchName: string;
  toneQuery: string;
  pcm1Tone: string;
  changes: ChangeItem[];
}

export interface CompiledBankRecipe {
  steps: BankRecipeStepSpec[];
  replyEn: string;
  replyPt: string;
}

function change(key: string, value: string | number | boolean, why: string): ChangeItem {
  return { key, value, why };
}

/** Prefer harmonica for "gaita", else first strong match. */
export function pickSoloTone(query: string, labels: readonly string[]): string | undefined {
  const lower = query.toLowerCase();
  const hits = matchPcmTones(query, labels, 32);
  if (hits.length === 0) return undefined;
  if (/gaita|harmonica|harmônica/.test(lower)) {
    return hits.find((label) => /harmonica/i.test(label)) ?? hits[0];
  }
  if (/acorde[aã]o|accordion/.test(lower) && !/cumbia|teclado|synth\s*reed|synth\s*lead/.test(lower)) {
    return hits.find((label) => /accordion/i.test(label)) ?? hits[0];
  }
  if (/metais|brass|sopro|horn/.test(lower)) {
    return hits.find((label) => /^Brass\s*\d/i.test(label)) ?? hits[0];
  }
  if (/cumbia|teclado|synth\s*reed|synth\s*lead|cumbia\s*lead/.test(lower)) {
    return (
      hits.find((label) => /accordion/i.test(label)) ??
      hits.find((label) => /organ/i.test(label)) ??
      hits.find((label) => /lead/i.test(label)) ??
      hits[0]
    );
  }
  return hits[0];
}

function extractWriteSlot(query: string): string | undefined {
  const match = query.match(/(?:user\s*)?u?(\d{1,3})\s*[:-]\s*(\d+)/i);
  if (!match) return undefined;
  return `${match[1].padStart(2, '0')}-${match[2]}`;
}

function extractPatchName(query: string): string | undefined {
  const titled = query.match(
    /(?:patch\s+user\s*\d+\s*[:-]\s*\d+\s*:\s*|solo\s+de\s+|user\s*\d+\s*[:-]\s*\d+\s*:\s*)([^\n(+]+?)(?:\s*\+|configurado|$)/i,
  );
  if (titled?.[1]) {
    const name = titled[1].replace(/\s+/g, ' ').trim();
    if (name.length >= 3) return name.slice(0, 16);
  }
  const paren = query.match(/\(([^)]{3,40})\)/);
  if (paren?.[1] && /solo|gaita|metais|cumbia|acorde|accordion|brass/i.test(paren[1])) {
    return paren[1].trim().slice(0, 16);
  }
  return undefined;
}

export function buildSoloMixChanges(patchName: string, pcm1Tone: string): ChangeItem[] {
  return [
    change('patch/common/patchName', patchName, 'name the sounding patch'),
    // Fake/INIT patches often sit at patchLevel 0 — that is silent on the pedal.
    change('master/output/patchLevel', 100, 'audible master / patch level'),
    // Approximate INIT: kill the chain.
    change('amp/amp/ampSwitch', OFF, 'INIT — amp off'),
    change('mod/mod/modSwitch', OFF, 'INIT — mod off'),
    change('mfx/mfx/mfxSwitch', OFF, 'INIT — mfx off'),
    change('delay/delay/delaySwitch', OFF, 'INIT — delay off'),
    change('chorus/chorus/chorusSwitch', OFF, 'INIT — chorus off'),
    change('reverb/reverb/reverbSwitch', OFF, 'INIT — reverb off'),
    change('eq/eq/eqSwitch', OFF, 'INIT — eq off'),
    // Voices.
    change('pcm1/tone/toneSelect', pcm1Tone, 'solo PCM tone'),
    change('pcm1/tone/muteSwitch', SOUND, 'PCM1 available (CTL gates it)'),
    change('pcm1/tone/partLevel', 100, 'PCM1 level 100'),
    change('pcm2/tone/muteSwitch', MUTE, 'PCM2 off'),
    change('modeling/tone/muteSwitch', MUTE, 'modeling off'),
    change('normal-pickup/level/normalPuMute', SOUND, 'normal pickup on'),
    change('normal-pickup/level/normalPuLevel', 100, 'normal pickup level 100'),
    // CTL = synth on/off (pedal has TONE SW, not "PCM1 SW").
    change('pedal-gk/ctl/status', true, 'CTL enabled'),
    change('pedal-gk/ctl/function', 'TONE SW', 'CTL toggles tones'),
    change('pedal-gk/ctl/holdSwitchMode', 'LATCH', 'toggle each press'),
    change('pedal-gk/ctl/offPcmTone1Switch', false, 'CTL off → no PCM1'),
    change('pedal-gk/ctl/offPcmTone2Switch', false, 'CTL off → no PCM2'),
    change('pedal-gk/ctl/offModelingToneSwitch', false, 'CTL off → no modeling'),
    change('pedal-gk/ctl/offNormalPuSwitch', true, 'CTL off → guitar only'),
    change('pedal-gk/ctl/onPcmTone1Switch', true, 'CTL on → PCM1 with guitar'),
    change('pedal-gk/ctl/onPcmTone2Switch', false, 'CTL on → no PCM2'),
    change('pedal-gk/ctl/onModelingToneSwitch', false, 'CTL on → no modeling'),
    change('pedal-gk/ctl/onNormalPuSwitch', true, 'CTL on → guitar stays'),
  ];
}

function looksSoloMix(query: string): boolean {
  const lower = query.toLowerCase();
  return (
    (/50\s*\/\s*50|pcm\s*1|pcm1|normal\s*pickup|pickup|viol[aã]o|piezo/.test(lower) &&
      (/init|inicializ|zerar|do zero|tone select|ctl|write|initialized|latch|toggle/.test(lower) ||
        /gaita|metais|cumbia|harmonica|accordion|brass|acorde|synth\s*lead|synth\s*reed/.test(
          lower,
        ))) ||
    (/solo de (gaita|metais)|teclado de cumbia|accordion solo|brass section|cumbia synth/.test(
      lower,
    ) &&
      /pcm|ctl|pickup|init|zerar|write|tone/.test(lower))
  );
}

/**
 * Three-key bank architecture (USER 01-1 / 01-2 / 01-3) — accordion, brass, cumbia + piezo.
 * Each step selects that USER slot, then updates the temporary working copy.
 */
export function compileBankSoloSetRecipe(
  query: string,
  toneLabels: readonly string[],
): CompiledBankRecipe | undefined {
  const lower = query.toLowerCase();
  const hasThreeSlots =
    /user\s*0*1\s*[:-]\s*1/.test(lower) &&
    /user\s*0*1\s*[:-]\s*2/.test(lower) &&
    /user\s*0*1\s*[:-]\s*3/.test(lower);
  const hasThreeArch =
    /accordion/.test(lower) && /brass/.test(lower) && /cumbia/.test(lower);
  if (!hasThreeSlots && !hasThreeArch) return undefined;
  if (!looksSoloMix(query) && !hasThreeArch) return undefined;

  const specs: Array<{ slotLabel: string; patchName: string; toneQuery: string }> = [
    {
      slotLabel: '01-1',
      patchName: 'Accordion Solo',
      toneQuery: 'Accordion Harmonica Accordion Fr',
    },
    {
      slotLabel: '01-2',
      patchName: 'Brass Solo',
      toneQuery: 'Brass Section Horns Brass 1',
    },
    {
      slotLabel: '01-3',
      patchName: 'Cumbia Lead',
      toneQuery: 'Cumbia Lead Synth Reed Accordion',
    },
  ];

  const steps: BankRecipeStepSpec[] = [];
  for (const spec of specs) {
    const pcm1Tone = pickSoloTone(spec.toneQuery, toneLabels);
    if (!pcm1Tone) return undefined;
    steps.push({
      slotLabel: spec.slotLabel,
      patchName: spec.patchName,
      toneQuery: spec.toneQuery,
      pcm1Tone,
      changes: buildSoloMixChanges(spec.patchName, pcm1Tone),
    });
  }

  const summary = steps
    .map((step) => `USER ${step.slotLabel} “${step.patchName}” → PCM1 “${step.pcm1Tone}”`)
    .join('; ');

  return {
    steps,
    replyEn:
      `Bank set ready: ${summary}. ` +
      `I load each key onto the temporary patch (INIT-style chain, PCM1 + normal pickup 100/100, ` +
      `CTL = TONE SW latch — OFF piezo only, ON adds the solo). Press CTL to hear the synth. ` +
      `Nothing is stored in USER until you press WRITE.`,
    replyPt:
      `Bank pronto: ${summary}. ` +
      `Carrego cada tecla na cópia temporária (cadeia estilo INIT, PCM1 + captador normal 100/100, ` +
      `CTL = TONE SW LATCH — OFF só piezo, ON soma o solo). Aperte CTL pra ouvir o synth. ` +
      `Nada vai pro USER até você apertar WRITE.`,
  };
}

/**
 * Compile a "solo synth + violão 50/50 from INIT" recipe into working-copy writes.
 * When a USER slot is named, the UI should select that slot first, then apply.
 */
export function compileSoloGuitarRecipe(
  query: string,
  toneLabels: readonly string[],
): CompiledRecipe | undefined {
  // Prefer the three-key bank compiler when the prompt describes the whole set.
  if (compileBankSoloSetRecipe(query, toneLabels)) return undefined;

  if (!looksSoloMix(query)) return undefined;

  const pcm1Tone = pickSoloTone(query, toneLabels);
  if (!pcm1Tone) return undefined;

  const targetSlot = extractWriteSlot(query);
  const lower = query.toLowerCase();
  const patchName =
    extractPatchName(query) ??
    (/gaita/.test(lower)
      ? 'Solo de Gaita'
      : /metais/.test(lower)
        ? 'Solo de Metais'
        : /cumbia/.test(lower)
          ? 'Teclado Cumbia'
          : /accordion/.test(lower)
            ? 'Accordion Solo'
            : /brass/.test(lower)
              ? 'Brass Solo'
              : 'Solo Mix');

  const changes = buildSoloMixChanges(patchName, pcm1Tone);

  const slotHintEn = targetSlot
    ? ` Selecting USER ${targetSlot} and applying to the temporary patch — press WRITE when you like it.`
    : ' Applying to the sounding temporary patch — press WRITE if you want it in USER memory.';
  const slotHintPt = targetSlot
    ? ` Seleciono USER ${targetSlot} e aplico na cópia temporária — aperte WRITE quando gostar.`
    : ' Aplico no patch temporário que está soando — aperte WRITE se quiser gravar no USER.';

  return {
    patchName,
    targetSlot,
    writeSlot: targetSlot,
    pcm1Tone,
    changes,
    replyEn:
      `Configured “${patchName}”: INIT-style clean chain, ` +
      `PCM1 “${pcm1Tone}” + normal pickup at 100/100, CTL = TONE SW (latch) so OFF is guitar-only and ON adds the solo.` +
      slotHintEn,
    replyPt:
      `Configurei “${patchName}”: cadeia limpa (estilo INIT), ` +
      `PCM1 “${pcm1Tone}” + captador normal em 100/100, CTL = TONE SW (LATCH) — OFF só violão, ON soma o solo.` +
      slotHintPt,
  };
}

export function recipeReply(recipe: CompiledRecipe, locale: Locale): string {
  return locale === 'pt-BR' ? recipe.replyPt : recipe.replyEn;
}

export function bankRecipeReply(recipe: CompiledBankRecipe, locale: Locale): string {
  return locale === 'pt-BR' ? recipe.replyPt : recipe.replyEn;
}
