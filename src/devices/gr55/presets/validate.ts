import { modelingToneCatalog } from '../modelingTones';
import { ARCHITECTURES } from './architectures';
import { shippedPresets, type MusicalPreset } from './catalog';
import { isValidPcmTone } from './pcmCatalog';
import { ARTICULATION_PROFILES } from './profiles';
import {
  brazilianRhythms,
  cumbiaRhythms,
  ROLES,
  type RoleId,
} from './taxonomy';
import { TONE_LIBRARY } from './toneLibrary';
import { CTL_ACTIONS, EXP_ACTIONS, EXP_SW_ACTIONS } from './ctlExp';

export interface ValidationIssue {
  presetId?: string;
  code: string;
  message: string;
}

const ctlIds = new Set(CTL_ACTIONS.map((a) => a.id));
const expIds = new Set(EXP_ACTIONS.map((a) => a.id));
const expSwIds = new Set(EXP_SW_ACTIONS.map((a) => a.id));
const modelingLabels = new Set(
  modelingToneCatalog('GUITAR').map((pick) => `${pick.category}::${pick.tone}`),
);

function soundingSources(preset: MusicalPreset): number {
  let n = 0;
  if (preset.pcm1On && (preset.pcm1Level ?? 0) > 0) n++;
  if (preset.pcm2On && !preset.pcm2Standby && (preset.pcm2Level ?? 0) > 0) n++;
  if (preset.pcm2On && preset.pcm2Standby && preset.pcm2) n++; // installed layer counts as configured
  if (preset.modelingOn && (preset.modelingLevel ?? 0) > 0) n++;
  if (preset.normalPuOn && (preset.normalLevel ?? 0) > 0) n++;
  return n;
}

export function validatePreset(preset: MusicalPreset): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const id = preset.id;

  if (preset.pcm1 && !isValidPcmTone(preset.pcm1)) {
    issues.push({ presetId: id, code: 'pcm1', message: `Unknown PCM1 tone "${preset.pcm1}"` });
  }
  if (preset.pcm2 && !isValidPcmTone(preset.pcm2)) {
    issues.push({ presetId: id, code: 'pcm2', message: `Unknown PCM2 tone "${preset.pcm2}"` });
  }
  if (preset.modelingCategory && preset.modelingTone) {
    const key = `${preset.modelingCategory}::${preset.modelingTone}`;
    if (!modelingLabels.has(key)) {
      issues.push({
        presetId: id,
        code: 'modeling',
        message: `Unknown modeling tone ${key}`,
      });
    }
  }

  if (soundingSources(preset) < 1) {
    issues.push({ presetId: id, code: 'silent', message: 'No sounding source' });
  }

  for (const [label, level] of [
    ['pcm1Level', preset.pcm1Level],
    ['pcm2Level', preset.pcm2Level],
    ['modelingLevel', preset.modelingLevel],
    ['patchLevel', preset.patchLevel],
  ] as const) {
    if (level !== undefined && (level < 0 || level > 127)) {
      issues.push({ presetId: id, code: 'range', message: `${label}=${level} out of range` });
    }
  }

  if ((preset.pitchShift ?? 0) !== 0) {
    issues.push({
      presetId: id,
      code: 'pitch',
      message: 'Catalog pitchShift must be 0 (session owns transpose)',
    });
  }

  if (preset.validationStatus === 'hardware-tested') {
    issues.push({
      presetId: id,
      code: 'hardware',
      message: 'hardware-tested is not allowed without a hardware pass',
    });
  }

  if (!ctlIds.has(preset.ctlExp.ctl as never)) {
    issues.push({ presetId: id, code: 'ctl', message: `Unknown CTL ${preset.ctlExp.ctl}` });
  }
  if (!expIds.has(preset.ctlExp.exp as never)) {
    issues.push({ presetId: id, code: 'exp', message: `Unknown EXP ${preset.ctlExp.exp}` });
  }
  if (!expSwIds.has(preset.ctlExp.expSw as never)) {
    issues.push({
      presetId: id,
      code: 'expSw',
      message: `Unknown EXP SW ${preset.ctlExp.expSw}`,
    });
  }

  if (preset.architectureId && !ARCHITECTURES[preset.architectureId]) {
    issues.push({
      presetId: id,
      code: 'arch',
      message: `Unknown architecture ${preset.architectureId}`,
    });
  }
  if (preset.articulationProfile && !ARTICULATION_PROFILES[preset.articulationProfile]) {
    issues.push({
      presetId: id,
      code: 'profile',
      message: `Unknown profile ${preset.articulationProfile}`,
    });
  }

  return issues;
}

export function validateToneLibrary(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const voice of Object.values(TONE_LIBRARY)) {
    if (voice.kind === 'pcm' && voice.pcm && !isValidPcmTone(voice.pcm)) {
      issues.push({ code: 'library-pcm', message: `${voice.id}: bad PCM ${voice.pcm}` });
    }
    if (voice.kind === 'modeling' && voice.modelingCategory && voice.modelingTone) {
      const key = `${voice.modelingCategory}::${voice.modelingTone}`;
      if (!modelingLabels.has(key)) {
        issues.push({ code: 'library-model', message: `${voice.id}: bad modeling ${key}` });
      }
    }
  }
  return issues;
}

export function validateCatalogIntegrity(): ValidationIssue[] {
  const issues: ValidationIssue[] = [...validateToneLibrary()];
  const presets = shippedPresets();

  for (const preset of presets) {
    issues.push(...validatePreset(preset));
  }

  const byRhythm = new Map<string, MusicalPreset[]>();
  for (const preset of presets) {
    const list = byRhythm.get(preset.rhythmId) ?? [];
    list.push(preset);
    byRhythm.set(preset.rhythmId, list);
  }

  for (const rhythm of brazilianRhythms()) {
    const list = byRhythm.get(rhythm.id) ?? [];
    if (list.length < 4) {
      issues.push({
        code: 'rhythm-count',
        message: `Brazilian rhythm ${rhythm.id} has ${list.length} presets (need ≥4)`,
      });
    }
    for (const role of ROLES) {
      if (!list.some((preset) => preset.role === role)) {
        issues.push({
          code: 'role-missing',
          message: `${rhythm.id} missing role ${role}`,
        });
      }
    }
  }

  if (brazilianRhythms().length < 40) {
    issues.push({
      code: 'br-40',
      message: `Expected ≥40 Brazilian rhythms, got ${brazilianRhythms().length}`,
    });
  }

  for (const rhythm of cumbiaRhythms()) {
    const list = byRhythm.get(rhythm.id) ?? [];
    if (list.length < 4) {
      issues.push({
        code: 'cumbia-count',
        message: `Cumbia rhythm ${rhythm.id} has ${list.length} presets (need ≥4)`,
      });
    }
  }

  if (presets.length < 160) {
    issues.push({
      code: 'total',
      message: `Expected ≥160 presets, got ${presets.length}`,
    });
  }

  // Same rhythm must not ship name-only clones (identical arch + voices + levels + CTL).
  for (const [rhythmId, list] of byRhythm) {
    const sigCounts = new Map<string, string[]>();
    for (const preset of list) {
      const sig = [
        preset.architectureId ?? '',
        preset.pcm1 ?? '',
        preset.pcm2 ?? '',
        preset.modelingTone ?? '',
        String(preset.pcm1Level ?? 0),
        String(preset.pcm2Level ?? 0),
        String(preset.modelingLevel ?? 0),
        preset.ctlExp.ctl,
        preset.ctlExp.exp,
        preset.articulationProfile ?? '',
      ].join('|');
      const ids = sigCounts.get(sig) ?? [];
      ids.push(preset.id);
      sigCounts.set(sig, ids);
    }
    for (const [, ids] of sigCounts) {
      if (ids.length > 1) {
        issues.push({
          code: 'duplicate-arch',
          message: `${rhythmId}: identical architecture for ${ids.join(', ')}`,
        });
      }
    }
  }

  return issues;
}

export function assertCatalogValid(): void {
  const issues = validateCatalogIntegrity();
  if (issues.length > 0) {
    const sample = issues
      .slice(0, 12)
      .map((issue) => `${issue.code}: ${issue.message}`)
      .join('\n');
    throw new Error(`Catalog validation failed (${issues.length} issues):\n${sample}`);
  }
}

export type { RoleId };
