import type { FighterId, StageId } from './types.js';
import type { SpecialDef } from './moves.js';

export interface RosterEntry {
  id: FighterId;
  name: string;
  /** One-liner shown on the select screen. */
  epithet: string;
  /** Sprite palette: robe, skin, accent. */
  palette: { robe: string; skin: string; accent: string };
  /** Pixel overlay key used by the renderer (beard, wig, moustache…). */
  look: string;
  special: SpecialDef;
}

const special = (p: Pick<SpecialDef, 'id' | 'name' | 'kind'> & Partial<SpecialDef>): SpecialDef => ({
  startup: 14,
  active: 6,
  recovery: 24,
  height: 'mid',
  knockback: 160,
  hitstun: 22,
  blockstun: 12,
  reach: 20,
  damage: 0,
  chip: 0,
  ...p,
});

/** The nine playable philosophers, in select-screen order. */
export const ROSTER: RosterEntry[] = [
  {
    id: 'socrates',
    name: 'Sócrates',
    epithet: 'El que no sabe nada — y lo demuestra',
    palette: { robe: '#e8d9b0', skin: '#d9a06b', accent: '#8a5a2b' },
    look: 'bald-beard',
    special: special({ id: 'maieutics', name: 'Mayéutica', kind: 'counter', damage: 0 }),
  },
  {
    id: 'plato',
    name: 'Platón',
    epithet: 'Golpea con la Forma, no con la sombra',
    palette: { robe: '#c9584a', skin: '#d9a06b', accent: '#f2e6c9' },
    look: 'beard-noble',
    special: special({ id: 'ideal-form', name: 'Forma Ideal', kind: 'projectile', damage: 80, reach: 0 }),
  },
  {
    id: 'aristotle',
    name: 'Aristóteles',
    epithet: 'Premisa mayor: vas a perder',
    palette: { robe: '#3f6ea8', skin: '#d9a06b', accent: '#e8d9b0' },
    look: 'scroll-beard',
    special: special({ id: 'syllogism', name: 'Silogismo', kind: 'rush', damage: 30, reach: 16 }),
  },
  {
    id: 'plotinus',
    name: 'Plotino',
    epithet: 'Todo emana de Uno; todo vuelve a Uno',
    palette: { robe: '#7a4fa3', skin: '#c98f5e', accent: '#e8d9b0' },
    look: 'mystic-hood',
    special: special({ id: 'emanation', name: 'Emanación', kind: 'projectile', damage: 70, reach: 0 }),
  },
  {
    id: 'kant',
    name: 'Kant',
    epithet: 'Obra de modo que tu puño sea ley universal',
    palette: { robe: '#4a5a6e', skin: '#e0b48a', accent: '#f2e6c9' },
    look: 'wig-prussian',
    special: special({ id: 'categorical', name: 'Imperativo Categórico', kind: 'unblockable', damage: 140, startup: 22, height: 'unblockable' }),
  },
  {
    id: 'hegel',
    name: 'Hegel',
    epithet: 'Tesis. Antítesis. Uppercut.',
    palette: { robe: '#37503a', skin: '#e0b48a', accent: '#c9b458' },
    look: 'hair-flat',
    special: special({ id: 'dialectic', name: 'Dialéctica', kind: 'empower', damage: 0 }),
  },
  {
    id: 'nietzsche',
    name: 'Nietzsche',
    epithet: 'Filosofar — literalmente — a martillazos',
    palette: { robe: '#3a3a3a', skin: '#e0b48a', accent: '#c9584a' },
    look: 'moustache-hammer',
    special: special({ id: 'hammer', name: 'El Martillo', kind: 'overhead', damage: 110, height: 'overhead' }),
  },
  {
    id: 'heidegger',
    name: 'Heidegger',
    epithet: 'Arrojado al mundo… y a tu cara',
    palette: { robe: '#2e3238', skin: '#e0b48a', accent: '#8a5a2b' },
    look: 'suit-stern',
    special: special({ id: 'being-toward-death', name: 'Ser-para-la-muerte', kind: 'dash', damage: 85, reach: 26 }),
  },
  {
    id: 'lacan',
    name: 'Lacan',
    epithet: 'Tu deseo es el deseo del Otro',
    palette: { robe: '#20242e', skin: '#e0b48a', accent: '#d9d9d9' },
    look: 'tie-cigar',
    special: special({ id: 'the-other', name: 'El Otro', kind: 'teleport', damage: 60, reach: 24 }),
  },
];

export interface StageDef {
  id: StageId;
  name: string;
  blurb: string;
}

export const STAGES: StageDef[] = [
  { id: 'agora', name: 'El Ágora', blurb: 'Donde Sócrates interrogaba a todo el que pasaba' },
  { id: 'lyceum', name: 'El Liceo', blurb: 'La escuela peripatética de Aristóteles' },
  { id: 'athens', name: 'La Escuela de Atenas', blurb: 'El fresco de Rafael — el olimpo filosófico' },
];

export function rosterEntry(id: FighterId): RosterEntry {
  const entry = ROSTER.find((r) => r.id === id);
  if (!entry) throw new Error(`unknown fighter: ${id}`);
  return entry;
}
