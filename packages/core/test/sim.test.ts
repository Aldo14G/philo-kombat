import { describe, expect, it } from 'vitest';
import {
  CONFIG,
  EMPTY_INPUT,
  ROSTER,
  STAGES,
  createFight,
  deserializeFight,
  serializeFight,
  stepFight,
} from '../src/index.js';
import type { FighterInput } from '../src/index.js';

const hold = (patch: Partial<FighterInput>): FighterInput => ({ ...EMPTY_INPUT, ...patch });

function toFighting(state: ReturnType<typeof createFight>): void {
  while (state.phase === 'intro') stepFight(state);
}

describe('roster data', () => {
  it('has all nine philosophers with a unique id, palette, and special', () => {
    expect(ROSTER).toHaveLength(9);
    expect(new Set(ROSTER.map((r) => r.id)).size).toBe(9);
    for (const r of ROSTER) {
      expect(r.special.name.length).toBeGreaterThan(0);
      expect(r.look.length).toBeGreaterThan(0);
    }
    expect(STAGES).toHaveLength(3);
  });
});

describe('fight phases', () => {
  it('intro → fighting with roundStarted/fight events, timer ticking', () => {
    const s = createFight('kant', 'hegel', 'athens', 7);
    const events = [];
    while (s.phase === 'intro') events.push(...stepFight(s));
    expect(s.phase).toBe('fighting');
    expect(s.phaseTicks).toBe(CONFIG.roundTicks);
    expect(events.map((e) => e.type)).toEqual(['roundStarted', 'fight']);
  });

  it('KO ends the round; two round wins end the match', () => {
    const s = createFight();
    toFighting(s);
    s.p2.health = 1;
    s.p1.status = 'hitstun'; // keep controls frozen; we just verify the KO path
    s.p2.status = 'hitstun';
    s.p2.health = 0;
    const events = stepFight(s);
    expect(events.map((e) => e.type)).toEqual(['ko', 'roundWon']);
    expect(s.phase).toBe('roundEnd');
    expect(s.p1.rounds).toBe(1);
  });

  it('a won match emits matchWon and stops the clock', () => {
    const s = createFight();
    s.p1.rounds = CONFIG.roundsToWin - 1;
    toFighting(s);
    s.p2.health = 0;
    const events = stepFight(s);
    expect(events.map((e) => e.type)).toEqual(['ko', 'roundWon', 'matchWon']);
    expect(s.phase).toBe('matchEnd');
  });
});

describe('movement', () => {
  it('walk moves the fighter, backward is slower, and clamping holds the stage edge', () => {
    const s = createFight();
    toFighting(s);
    const x0 = s.p1.x;
    for (let i = 0; i < 30; i++) stepFight(s, hold({ right: true }));
    const forward = s.p1.x - x0;
    expect(forward).toBe(30 * CONFIG.walkSpeed);
    const back0 = s.p1.x;
    for (let i = 0; i < 30; i++) stepFight(s, hold({ left: true }));
    expect(back0 - s.p1.x).toBe(30 * CONFIG.backWalkSpeed);
    s.p1.x = 0;
    stepFight(s, hold({ left: true }));
    expect(s.p1.x).toBe(CONFIG.fighterHalfWidth * CONFIG.unitsPerPixel);
  });

  it('bodies separate instead of overlapping', () => {
    const s = createFight();
    toFighting(s);
    s.p1.x = s.p2.x;
    stepFight(s);
    expect(s.p2.x - s.p1.x).toBeGreaterThanOrEqual(2 * CONFIG.fighterHalfWidth * CONFIG.unitsPerPixel);
  });

  it('facing tracks the opponent after a cross-up', () => {
    const s = createFight();
    toFighting(s);
    expect(s.p1.facing).toBe(1);
    s.p1.x = s.p2.x + 10 * CONFIG.unitsPerPixel;
    stepFight(s);
    expect(s.p1.facing).toBe(-1);
  });
});

describe('serialization', () => {
  it('round-trips exactly and replaying stays identical', () => {
    const a = createFight('lacan', 'nietzsche', 'lyceum', 42);
    const b = createFight('lacan', 'nietzsche', 'lyceum', 42);
    for (let i = 0; i < 400; i++) {
      const input = hold({ right: i % 4 === 0, up: i === 200 });
      stepFight(a, input, hold({ left: true }));
      stepFight(b, input, hold({ left: true }));
    }
    expect(serializeFight(a)).toBe(serializeFight(b));
    const restored = deserializeFight(serializeFight(a));
    for (let i = 0; i < 100; i++) {
      stepFight(a, hold({ right: true }));
      stepFight(restored, hold({ right: true }));
    }
    expect(serializeFight(restored)).toBe(serializeFight(a));
  });
});
