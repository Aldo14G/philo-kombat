import { describe, expect, test } from 'vitest';
import { createFight, stepFight } from '@philo-kombat/core';
import type { FighterInput } from '@philo-kombat/core';
import { CpuInput } from '../src/ai/cpu.js';

const IDLE: FighterInput = {
  left: false, right: false, up: false, down: false,
  lp: false, hp: false, lk: false, hk: false, special: false,
};

function fightToFighting() {
  const s = createFight('socrates', 'plato', 'agora', 1);
  for (let i = 0; i < 400 && s.phase !== 'fighting'; i++) stepFight(s, IDLE, IDLE);
  return s;
}

describe('CpuInput', () => {
  test('is inert outside the fighting phase', () => {
    const s = createFight('socrates', 'plato', 'agora', 1); // intro phase
    const inp = new CpuInput(0.9).current(s, 'p2');
    expect(Object.values(inp).every((v) => v === false)).toBe(true);
  });

  test('closes distance on a far opponent', () => {
    const s = fightToFighting();
    const x0 = s.p2.x;
    const cpu = new CpuInput(0.9);
    let moved = false;
    for (let i = 0; i < 60; i++) {
      const inp = cpu.current(s, 'p2');
      if (inp.left || inp.right || inp.lp || inp.hp || inp.lk || inp.hk || inp.special) moved = true;
      stepFight(s, IDLE, inp);
    }
    expect(moved).toBe(true);
    // it approached P1 (P2 starts right of P1, so net displacement is leftward)
    expect(s.p2.x).toBeLessThan(x0);
  });
});
