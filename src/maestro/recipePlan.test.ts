import { describe, expect, it } from 'vitest';
import { buildFieldRegistry, registryIndex } from './fieldRegistry';
import {
  compileBankSoloSetRecipe,
  compileSoloGuitarRecipe,
  pickSoloTone,
} from './recipePlan';
import { validatePlan } from './validator';

const GAITA_PROMPT = `Patch USER 01-1: Solo de Gaita + Violão 50/50
Faça o patch atual ser USER 01-1 (Solo de Gaita) configurado do zero absoluto da seguinte forma:
Zerar e Limpar o Patch (Patch Initialize):
Pressione EDIT → navegue até a aba MASTER → selecione INIT (Initialize).
Confirme para resetar todo o patch. Isso desativa todos os efeitos (MOD, DELAY, REVERB, AMP, EQ) e zera as atribuições anteriores.
Configurar as Fontes de Som:
Vá em EDIT → TONE SELECT.
PCM1: Ligue (ON) e escolha o timbre de Gaita / Acordeão (Accordion / Harmonica).
PCM2: Mantenha Desligado (OFF).
MODELING (COSM): Mantenha Desligado (OFF).
NORMAL PICKUP: Ligue (ON).
Ajustar Níveis (Mix 50/50 do zero):
Normal Pickup Level: 100
PCM1 Level: 100 (ajuste para 85-90 se a gaita encobrir o som puro do violão).
Configurar o Botão CTL (Liga/Desliga do Synth):
Vá em EDIT → ASSIGN / CTL → CTL PEDAL.
FUNCTION: Defina como PCM1 SW (ou use TARGET: PCM1 SW se configurado via Assign).
MODE: TOGGLE.
Teste rápido: Com o CTL OFF, o LED apaga e sai apenas o violão. Com o CTL ON, o LED acende e a gaita entra 50/50.
Salvar:
Pressione WRITE, selecione a posição USER 01-1 e confirme com WRITE.`;

const BANK_EN_PROMPT = `The Roland GR-55 Owner's Manual defines patch architecture, sound generator routing (PCM1, PCM2, COSM Guitar, Normal Pickup), and system control assignments (CTL pedal) as follows:

### 1. Signal Routing Architecture & Sound Engine Allocation

When a patch is Initialized, the system resets the patch parameters to a blank state:
1. Tone Select: Multi-effects (MOD, Delay, Reverb), Amp Modeling, COSM Guitar, and EQ are turned off.
2. Audio Levels: Normal Pickup Level and PCM1 Level are assigned independent gain values (both set to 100).
3. Mute/Bypass Control: PCM2 and COSM Modeling are disabled (OFF), leaving only the piezo signal (Normal Pickup) and the designated synthesizer voice (PCM1).

### 2. Target Patch Architectures

#### USER 01-1: Accordion Solo + Piezo Acoustic
PCM1 is populated with a high-register Accordion / Harmonica PCM waveform. Normal Pickup at 100.
Default State (CTL OFF): PCM1 SW OFF — only Godin piezo.
Engaged State (CTL ON): PCM1 SW ON — 50/50 mix.

#### USER 01-2: Brass Section Solo + Piezo Acoustic
PCM1 Brass / Horns Section. CTL OFF mute PCM1; CTL ON blend brass over piezo.

#### USER 01-3: Cumbia Synth Lead + Piezo Acoustic
PCM1 Cumbia Lead / Synth Reed. CTL OFF piezo only; CTL ON layer synth lead.

### 3. Control Assignment & CTL Pedal Logic
Target Function: PCM1 SW. Latch Mode: TOGGLE. Initial Patch State: CTL OFF baseline.`;

describe('compileSoloGuitarRecipe', () => {
  const labels = buildFieldRegistry('GUITAR').find((entry) => entry.key === 'pcm1/tone/toneSelect')!
    .labels!;
  const index = registryIndex(buildFieldRegistry('GUITAR'));

  it('compiles the gaita + violão 50/50 recipe for a target USER slot', () => {
    const recipe = compileSoloGuitarRecipe(GAITA_PROMPT, labels);
    expect(recipe).toBeDefined();
    expect(recipe!.targetSlot ?? recipe!.writeSlot).toBe('01-1');
    expect(recipe!.pcm1Tone).toMatch(/Harmonica/i);
    expect(recipe!.patchName).toMatch(/Gaita/i);

    const byKey = Object.fromEntries(recipe!.changes.map((item) => [item.key, item.value]));
    expect(byKey['pcm1/tone/muteSwitch']).toBe(false);
    expect(byKey['pcm2/tone/muteSwitch']).toBe(true);
    expect(byKey['modeling/tone/muteSwitch']).toBe(true);
    expect(byKey['normal-pickup/level/normalPuMute']).toBe(false);
    expect(byKey['pcm1/tone/partLevel']).toBe(100);
    expect(byKey['normal-pickup/level/normalPuLevel']).toBe(100);
    expect(byKey['master/output/patchLevel']).toBe(100);
    expect(byKey['pedal-gk/ctl/function']).toBe('TONE SW');
    expect(byKey['pedal-gk/ctl/holdSwitchMode']).toBe('LATCH');
    expect(byKey['pedal-gk/ctl/offPcmTone1Switch']).toBe(false);
    expect(byKey['pedal-gk/ctl/offNormalPuSwitch']).toBe(true);
    expect(byKey['pedal-gk/ctl/onPcmTone1Switch']).toBe(true);
    expect(byKey['pedal-gk/ctl/onNormalPuSwitch']).toBe(true);
    expect(byKey['amp/amp/ampSwitch']).toBe(false);
    expect(byKey['reverb/reverb/reverbSwitch']).toBe(false);

    const plan = validatePlan(recipe!.changes, index, () => '0');
    expect(plan.rejected).toEqual([]);
    expect(plan.accepted.length + plan.clamped.length).toBe(recipe!.changes.length);
  });

  it('picks Brass 1 for metais recipes', () => {
    expect(pickSoloTone('Solo de Metais brass PCM1', labels)).toMatch(/^Brass/i);
  });
});

describe('compileBankSoloSetRecipe', () => {
  const labels = buildFieldRegistry('GUITAR').find((entry) => entry.key === 'pcm1/tone/toneSelect')!
    .labels!;
  const index = registryIndex(buildFieldRegistry('GUITAR'));

  it('compiles the EN three-key accordion/brass/cumbia bank set', () => {
    const bank = compileBankSoloSetRecipe(BANK_EN_PROMPT, labels);
    expect(bank).toBeDefined();
    expect(bank!.steps).toHaveLength(3);
    expect(bank!.steps[0]!.slotLabel).toBe('01-1');
    expect(bank!.steps[0]!.pcm1Tone).toMatch(/Accordion|Harmonica/i);
    expect(bank!.steps[1]!.slotLabel).toBe('01-2');
    expect(bank!.steps[1]!.pcm1Tone).toMatch(/^Brass/i);
    expect(bank!.steps[2]!.slotLabel).toBe('01-3');
    expect(bank!.steps[2]!.pcm1Tone).toMatch(/Accordion|Organ|Lead/i);

    for (const step of bank!.steps) {
      const byKey = Object.fromEntries(step.changes.map((item) => [item.key, item.value]));
      expect(byKey['pedal-gk/ctl/function']).toBe('TONE SW');
      expect(byKey['pedal-gk/ctl/offPcmTone1Switch']).toBe(false);
      expect(byKey['pedal-gk/ctl/offNormalPuSwitch']).toBe(true);
      expect(byKey['pedal-gk/ctl/onPcmTone1Switch']).toBe(true);
      const plan = validatePlan(step.changes, index, () => '0');
      expect(plan.rejected).toEqual([]);
    }

    // Whole-set prompt must not collapse into a single-slot recipe.
    expect(compileSoloGuitarRecipe(BANK_EN_PROMPT, labels)).toBeUndefined();
  });
});
