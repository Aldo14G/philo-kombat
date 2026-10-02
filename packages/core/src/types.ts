import type { CONFIG } from './config.js';

/** Roster key — one per philosopher (see roster.ts). */
export type FighterId = string;

export type StageId = 'agora' | 'lyceum' | 'athens';

/** Fight-level phases. */
export type Phase = 'intro' | 'fighting' | 'roundEnd' | 'matchEnd';

/**
 * Per-tick input intent for one fighter. Booleans are level-triggered for
 * movement and edge-triggered (consumed once) for attacks; the sim keeps a
 * per-fighter `prevButtons` mask to detect the press edge.
 */
export interface FighterInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  lp: boolean;
  hp: boolean;
  lk: boolean;
  hk: boolean;
  /** Signature special (↓→+HP equivalent). */
  special: boolean;
}

export type FighterStatus =
  | 'idle'
  | 'walk'
  | 'jump'
  | 'crouch'
  | 'attack'
  | 'blockstun'
  | 'hitstun'
  | 'special'
  | 'ko'
  | 'win';

export interface FighterState {
  rosterId: FighterId;
  /** Feet position, sub-pixel units. y = 0 on the ground, grows upward. */
  x: number;
  y: number;
  vy: number;
  /** Knockback momentum, units/tick; decays toward 0. */
  vx: number;
  /** +1 faces right, −1 faces left (always toward the opponent). */
  facing: 1 | -1;
  health: number;
  status: FighterStatus;
  /** Ticks remaining in the current status before control returns. */
  statusTicks: number;
  /** Move id while status === 'attack' | 'special'. */
  moveId: string | null;
  /** True while the fighter is holding block (back input while standing). */
  blocking: boolean;
  /** Rounds won this match. */
  rounds: number;
  /** Ticks until the signature special is available again. */
  specialCooldown: number;
  /** Per-fighter counter incremented on each attack start; tags hits. */
  attackSeq: number;
  /** Button-edge bitmask consumed this tick (computed each step). */
  pendingEdge: number;
  /** seq of the last button edge already consumed, per button. */
  lastInputMask: number;
  /** Id of the last attack that landed on this fighter (anti multi-hit). */
  lastHitBy: string | null;
  /** Hegel-style charge: absorbs the next hit, then empowers the next attack. */
  empowered: boolean;
}

export interface FightState {
  tick: number;
  phase: Phase;
  /** Ticks left in the current phase (intro / roundEnd / round timer). */
  phaseTicks: number;
  round: number;
  stage: StageId;
  p1: FighterState;
  p2: FighterState;
  nextEventSeq: number;
  config: typeof CONFIG;
  seed: number;
  rngState: number;
}

export interface FightCommand {
  fighter: 'p1' | 'p2';
  input: FighterInput;
  seq: number;
  tick: number;
}

/** Omit that distributes over a discriminated union. */
export type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

export type FightEventBody = DistributiveOmit<FightEvent, 'seq' | 'tick'>;

export type FightEvent =
  | { seq: number; tick: number; type: 'roundStarted'; round: number }
  | { seq: number; tick: number; type: 'fight' }
  | { seq: number; tick: number; type: 'attackStarted'; fighter: 'p1' | 'p2'; moveId: string }
  | { seq: number; tick: number; type: 'hit'; fighter: 'p1' | 'p2'; moveId: string; damage: number }
  | { seq: number; tick: number; type: 'blocked'; fighter: 'p1' | 'p2'; moveId: string }
  | { seq: number; tick: number; type: 'ko'; loser: 'p1' | 'p2' }
  | { seq: number; tick: number; type: 'timeUp'; winner: 'p1' | 'p2' | null }
  | { seq: number; tick: number; type: 'roundWon'; winner: 'p1' | 'p2' }
  | { seq: number; tick: number; type: 'matchWon'; winner: 'p1' | 'p2' }
  | { seq: number; tick: number; type: 'specialUsed'; fighter: 'p1' | 'p2'; moveId: string };

export const EMPTY_INPUT: FighterInput = {
  left: false,
  right: false,
  up: false,
  down: false,
  lp: false,
  hp: false,
  lk: false,
  hk: false,
  special: false,
};
