import { EMPTY_INPUT } from '@philo-kombat/core';
import type { FightState, FighterInput } from '@philo-kombat/core';

/**
 * Lightweight CPU opponent: an FSM fed by snapshots. Difficulty 0–1 scales
 * aggression, blocking and special usage. Not part of the sim — it just
 * produces FighterInput like a keyboard would.
 */
export class CpuInput {
  constructor(private readonly difficulty = 0.5) {}

  current(snap: FightState, side: 'p1' | 'p2'): FighterInput {
    const input = { ...EMPTY_INPUT };
    if (snap.phase !== 'fighting') return input;
    const me = snap[side];
    const foe = snap[side === 'p1' ? 'p2' : 'p1'];
    if (me.status === 'hitstun' || me.status === 'blockstun' || me.status === 'ko' || me.status === 'win') {
      return input;
    }

    const U = snap.config.unitsPerPixel;
    const gapPx = Math.abs(foe.x - me.x) / U - 2 * snap.config.fighterHalfWidth;
    const toward = foe.x > me.x ? 'right' : 'left';
    const away = toward === 'right' ? 'left' : 'right';
    const r = Math.random();

    // blocking reflex when the opponent is attacking up close
    if ((foe.status === 'attack' || foe.status === 'special') && gapPx < 40 && r < this.difficulty * 0.45) {
      input[away] = true;
      return input;
    }
    if (gapPx > 30) {
      input[toward] = true;
      if (r < 0.015) input.up = true; // occasional hop-in
    } else {
      const pick = Math.random();
      const atk = pick < 0.3 ? 'lp' : pick < 0.55 ? 'lk' : pick < 0.8 ? 'hp' : 'hk';
      if (r < 0.05 + this.difficulty * 0.07) input[atk] = true;
      else if (r < 0.05 + this.difficulty * 0.07 + 0.04 && me.specialCooldown === 0) input.special = true;
      else if (r < 0.12) input[away] = true; // hold block a beat
    }
    return input;
  }
}
