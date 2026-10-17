/**
 * Musician discovery: Rhythm → Role → Preset.
 * Brazilian catalog (40) + expanded cumbia subgenres as rhythms.
 */

export type RoleId = 'base' | 'solo' | 'fills' | 'layer';

/** @deprecated Prefer RhythmId — kept for gradual migration aliases. */
export type GenreId = string;

export type RhythmFamilyId =
  | 'samba'
  | 'pagode'
  | 'choro-bossa'
  | 'mpb'
  | 'nordeste'
  | 'forro-moderno'
  | 'sertanejo'
  | 'sul'
  | 'pernambuco'
  | 'bahia-norte'
  | 'eletronico'
  | 'cumbia';

export interface Rhythm {
  id: string;
  family: RhythmFamilyId;
  index?: number;
  labelEn: string;
  labelPt: string;
  /** Brazilian research catalog entry (1–40) vs cumbia expansion. */
  brazilianCatalog: boolean;
}

export const ROLE_LABELS: Record<RoleId, { en: string; pt: string }> = {
  base: { en: 'Accompaniment / base', pt: 'Acompanhamento / base' },
  solo: { en: 'Solo / lead', pt: 'Solo / lead' },
  fills: { en: 'Intro / response / fills', pt: 'Introdução / resposta / fills' },
  layer: { en: 'Layer / texture', pt: 'Camada / textura' },
};

export const ROLES: readonly RoleId[] = ['base', 'solo', 'fills', 'layer'];

/** 40 Brazilian rhythms + 5 cumbia subgenres (each is a selectable rhythm). */
export const RHYTHMS: readonly Rhythm[] = [
  { id: 'samba-raiz', family: 'samba', index: 1, labelEn: 'Samba de raiz', labelPt: 'Samba de raiz', brazilianCatalog: true },
  { id: 'partido-alto', family: 'samba', index: 2, labelEn: 'Partido-alto', labelPt: 'Partido-alto', brazilianCatalog: true },
  { id: 'samba-enredo', family: 'samba', index: 3, labelEn: 'Samba-enredo', labelPt: 'Samba-enredo', brazilianCatalog: true },
  { id: 'samba-roda', family: 'samba', index: 4, labelEn: 'Samba de roda', labelPt: 'Samba de roda', brazilianCatalog: true },
  { id: 'pagode-roda', family: 'pagode', index: 5, labelEn: 'Pagode de roda', labelPt: 'Pagode de roda', brazilianCatalog: true },
  { id: 'pagode-romantico', family: 'pagode', index: 6, labelEn: 'Pagode romântico', labelPt: 'Pagode romântico', brazilianCatalog: true },
  { id: 'pagode-90s', family: 'pagode', index: 7, labelEn: 'Pagode anos 90', labelPt: 'Pagode anos 90', brazilianCatalog: true },
  { id: 'choro', family: 'choro-bossa', index: 8, labelEn: 'Choro', labelPt: 'Choro', brazilianCatalog: true },
  { id: 'bossa-nova', family: 'choro-bossa', index: 9, labelEn: 'Bossa nova', labelPt: 'Bossa nova', brazilianCatalog: true },
  { id: 'samba-cancao', family: 'choro-bossa', index: 10, labelEn: 'Samba-canção', labelPt: 'Samba-canção', brazilianCatalog: true },
  { id: 'mpb-acustica', family: 'mpb', index: 11, labelEn: 'MPB acústica', labelPt: 'MPB acústica', brazilianCatalog: true },
  { id: 'baiao', family: 'nordeste', index: 12, labelEn: 'Baião', labelPt: 'Baião', brazilianCatalog: true },
  { id: 'xote', family: 'nordeste', index: 13, labelEn: 'Xote', labelPt: 'Xote', brazilianCatalog: true },
  { id: 'xaxado', family: 'nordeste', index: 14, labelEn: 'Xaxado', labelPt: 'Xaxado', brazilianCatalog: true },
  { id: 'arrasta-pe', family: 'nordeste', index: 15, labelEn: 'Arrasta-pé', labelPt: 'Arrasta-pé', brazilianCatalog: true },
  { id: 'forro-pe-de-serra', family: 'nordeste', index: 16, labelEn: 'Forró pé de serra', labelPt: 'Forró pé de serra', brazilianCatalog: true },
  { id: 'forro-eletronico', family: 'forro-moderno', index: 17, labelEn: 'Forró eletrônico', labelPt: 'Forró eletrônico', brazilianCatalog: true },
  { id: 'piseiro', family: 'forro-moderno', index: 18, labelEn: 'Piseiro', labelPt: 'Piseiro', brazilianCatalog: true },
  { id: 'pisadinha', family: 'forro-moderno', index: 19, labelEn: 'Pisadinha', labelPt: 'Pisadinha', brazilianCatalog: true },
  { id: 'arrocha', family: 'forro-moderno', index: 20, labelEn: 'Arrocha', labelPt: 'Arrocha', brazilianCatalog: true },
  { id: 'sertanejo-raiz', family: 'sertanejo', index: 21, labelEn: 'Sertanejo raiz', labelPt: 'Sertanejo raiz', brazilianCatalog: true },
  { id: 'moda-de-viola', family: 'sertanejo', index: 22, labelEn: 'Moda de viola', labelPt: 'Moda de viola', brazilianCatalog: true },
  { id: 'sertanejo-romantico', family: 'sertanejo', index: 23, labelEn: 'Sertanejo romântico', labelPt: 'Sertanejo romântico', brazilianCatalog: true },
  { id: 'sertanejo-universitario', family: 'sertanejo', index: 24, labelEn: 'Sertanejo universitário', labelPt: 'Sertanejo universitário', brazilianCatalog: true },
  { id: 'sertanejo-pop', family: 'sertanejo', index: 25, labelEn: 'Sertanejo pop', labelPt: 'Sertanejo pop', brazilianCatalog: true },
  { id: 'vaneira', family: 'sul', index: 26, labelEn: 'Vaneira', labelPt: 'Vaneira', brazilianCatalog: true },
  { id: 'vaneirao', family: 'sul', index: 27, labelEn: 'Vaneirão', labelPt: 'Vaneirão', brazilianCatalog: true },
  { id: 'chamame', family: 'sul', index: 28, labelEn: 'Chamamé', labelPt: 'Chamamé', brazilianCatalog: true },
  { id: 'milonga-gaucha', family: 'sul', index: 29, labelEn: 'Milonga gaúcha', labelPt: 'Milonga gaúcha', brazilianCatalog: true },
  { id: 'frevo', family: 'pernambuco', index: 30, labelEn: 'Frevo', labelPt: 'Frevo', brazilianCatalog: true },
  { id: 'maracatu', family: 'pernambuco', index: 31, labelEn: 'Maracatu', labelPt: 'Maracatu', brazilianCatalog: true },
  { id: 'coco-roda', family: 'pernambuco', index: 32, labelEn: 'Coco de roda', labelPt: 'Coco de roda', brazilianCatalog: true },
  { id: 'ciranda', family: 'pernambuco', index: 33, labelEn: 'Ciranda', labelPt: 'Ciranda', brazilianCatalog: true },
  { id: 'axe', family: 'bahia-norte', index: 34, labelEn: 'Axé', labelPt: 'Axé', brazilianCatalog: true },
  { id: 'ijexa', family: 'bahia-norte', index: 35, labelEn: 'Ijexá', labelPt: 'Ijexá', brazilianCatalog: true },
  { id: 'carimbo', family: 'bahia-norte', index: 36, labelEn: 'Carimbó', labelPt: 'Carimbó', brazilianCatalog: true },
  { id: 'lambada', family: 'bahia-norte', index: 37, labelEn: 'Lambada', labelPt: 'Lambada', brazilianCatalog: true },
  { id: 'tecnobrega', family: 'eletronico', index: 38, labelEn: 'Tecnobrega', labelPt: 'Tecnobrega', brazilianCatalog: true },
  { id: 'funk-carioca', family: 'eletronico', index: 39, labelEn: 'Funk carioca', labelPt: 'Funk carioca', brazilianCatalog: true },
  { id: 'manguebeat', family: 'eletronico', index: 40, labelEn: 'Manguebeat', labelPt: 'Manguebeat', brazilianCatalog: true },
  // Cumbia expansion (not a single generic rhythm)
  { id: 'cumbia-colombian', family: 'cumbia', labelEn: 'Cumbia colombiana', labelPt: 'Cumbia colombiana', brazilianCatalog: false },
  { id: 'cumbia-nortena', family: 'cumbia', labelEn: 'Cumbia norteña', labelPt: 'Cumbia norteña', brazilianCatalog: false },
  { id: 'cumbia-mexican', family: 'cumbia', labelEn: 'Cumbia mexicana', labelPt: 'Cumbia mexicana', brazilianCatalog: false },
  { id: 'cumbia-chicha', family: 'cumbia', labelEn: 'Chicha peruana', labelPt: 'Chicha peruana', brazilianCatalog: false },
  { id: 'cumbia-tecno', family: 'cumbia', labelEn: 'Tecnocumbia', labelPt: 'Tecnocumbia', brazilianCatalog: false },
];

export const FAMILY_LABELS: Record<RhythmFamilyId, { en: string; pt: string }> = {
  samba: { en: 'Samba', pt: 'Samba' },
  pagode: { en: 'Pagode', pt: 'Pagode' },
  'choro-bossa': { en: 'Choro / Bossa', pt: 'Choro / Bossa' },
  mpb: { en: 'MPB', pt: 'MPB' },
  nordeste: { en: 'Nordeste tradicional', pt: 'Nordeste tradicional' },
  'forro-moderno': { en: 'Forró moderno', pt: 'Forró moderno' },
  sertanejo: { en: 'Sertanejo', pt: 'Sertanejo' },
  sul: { en: 'Sul / gaúcho', pt: 'Sul / gaúcho' },
  pernambuco: { en: 'Pernambuco', pt: 'Pernambuco' },
  'bahia-norte': { en: 'Bahia / Norte', pt: 'Bahia / Norte' },
  eletronico: { en: 'Eletrônico BR', pt: 'Eletrônico BR' },
  cumbia: { en: 'Cumbia', pt: 'Cumbia' },
};

export function rhythmOf(id: string): Rhythm | undefined {
  return RHYTHMS.find((rhythm) => rhythm.id === id);
}

export function brazilianRhythms(): readonly Rhythm[] {
  return RHYTHMS.filter((rhythm) => rhythm.brazilianCatalog);
}

export function cumbiaRhythms(): readonly Rhythm[] {
  return RHYTHMS.filter((rhythm) => rhythm.family === 'cumbia');
}

/** @deprecated Use RHYTHMS — shim for older imports. */
export const GENRES = RHYTHMS;
