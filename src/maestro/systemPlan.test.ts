import { describe, expect, it, vi } from 'vitest';
import { SYSTEM, gkSet, SCALE_BASE_MM } from '../devices/gr55/systemMap';
import type { Gr55System } from '../devices/gr55/systemState';
import {
  compileNylonPiezoGkRecipe,
  isGlobalGkRecipeQuery,
  validateSystemPlan,
} from './systemPlan';

function fakeSystem(): Gr55System {
  const values = new Map<number, unknown>();
  values.set(SYSTEM.common.gkSetSelect.address, 0);
  return {
    read: (field: { address: number }) => {
      if (values.has(field.address)) {
        return { ok: true as const, value: values.get(field.address) };
      }
      return { ok: true as const, value: 0 };
    },
    write: vi.fn((field: { address: number }, value: unknown) => {
      values.set(field.address, value);
    }),
  } as unknown as Gr55System;
}

const CAIMBE_PROMPT = `
eu tenho um violao caimbe, que é tipo o godin, é de nylon e tem piezo embutido.
procure online e encontre a melhor configuração para ele e aplique.
so vou tocar nele, entao pode escrever na pedaleira.
so trabalhe nas configurações gerais de gk, sensibilidade, speed, cut,
para ter nao ther ghost note e sensibilidade adequada.
a configura nao deve ocorrer no patch, deve ser global
`;

describe('systemPlan nylon/piezo GK', () => {
  it('detects Caimbé / Godin global prompts', () => {
    expect(isGlobalGkRecipeQuery(CAIMBE_PROMPT)).toBe(true);
    expect(isGlobalGkRecipeQuery('mais reverb no patch')).toBe(false);
  });

  it('compiles PIEZO R + 648 mm + moderate SEN for the active GK set', () => {
    const recipe = compileNylonPiezoGkRecipe(CAIMBE_PROMPT);
    expect(recipe).toBeDefined();
    const byRef = Object.fromEntries(recipe!.changes.map((c) => [c.ref, c.value]));
    expect(byRef['gkSet.active.puType']).toBe('PIEZO R');
    expect(byRef['gkSet.active.scale']).toBe(648 - SCALE_BASE_MM);
    expect(byRef['gkSet.active.string1Sens']).toBe(42);
    expect(byRef['gkSet.active.name']).toBe('Caimbe');

    const system = fakeSystem();
    const plan = validateSystemPlan(recipe!.changes, system);
    expect(plan.rejected).toEqual([]);
    expect(plan.accepted.length).toBe(recipe!.changes.length);
    // Active set resolves to GK set 1 when select = 0.
    expect(gkSet(1).puType.address).toBeGreaterThan(0);
  });
});
