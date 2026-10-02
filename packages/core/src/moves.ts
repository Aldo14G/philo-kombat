/**
 * Shared MK-lite moveset. Frame data is in ticks (60 Hz). `height` decides
 * how the move interacts with blocking: 'mid' is blocked standing or
 * crouching, 'high' whiffs against crouchers, 'low' must be crouch-blocked,
 * 'overhead' must be stand-blocked, 'unblockable' ignores blocking.
 */
export type MoveHeight = 'high' | 'mid' | 'low' | 'overhead' | 'unblockable';

export interface MoveDef {
  id: string;
  damage: number;
  /** Damage dealt through a successful block. */
  chip: number;
  startup: number;
  active: number;
  recovery: number;
  /** Horizontal reach from the fighter's edge, in pixels. */
  reach: number;
  height: MoveHeight;
  /** Push applied to the victim, sub-pixel units/tick. */
  knockback: number;
  hitstun: number;
  blockstun: number;
}

export const MOVES: Record<string, MoveDef> = {
  lp: {
    id: 'lp', damage: 40, chip: 0, startup: 4, active: 3, recovery: 9,
    reach: 14, height: 'mid', knockback: 60, hitstun: 12, blockstun: 8,
  },
  hp: {
    id: 'hp', damage: 90, chip: 10, startup: 9, active: 4, recovery: 16,
    reach: 18, height: 'mid', knockback: 140, hitstun: 20, blockstun: 12,
  },
  lk: {
    id: 'lk', damage: 55, chip: 0, startup: 6, active: 4, recovery: 11,
    reach: 20, height: 'low', knockback: 80, hitstun: 14, blockstun: 9,
  },
  hk: {
    id: 'hk', damage: 120, chip: 14, startup: 12, active: 5, recovery: 22,
    reach: 24, height: 'high', knockback: 200, hitstun: 26, blockstun: 14,
  },
};

export type SpecialKind =
  | 'counter'     // Sócrates: absorb a hit, reflect damage
  | 'projectile'  // Platón / Plotino: spawn a travelling hitbox
  | 'rush'        // Aristóteles: advancing multi-hit
  | 'unblockable' // Kant: slow, ignores block
  | 'overhead'    // Nietzsche: must be stand-blocked
  | 'empower'     // Hegel: absorb next hit, empower next attack
  | 'dash'        // Heidegger: fast lunge
  | 'teleport';   // Lacan: appear behind the opponent

export interface SpecialDef {
  id: string;
  name: string;
  kind: SpecialKind;
  damage: number;
  chip: number;
  startup: number;
  active: number;
  recovery: number;
  reach: number;
  height: MoveHeight;
  knockback: number;
  hitstun: number;
  blockstun: number;
}
