import { describe, expect, it } from 'vitest';
import {
  CONFIG,
  EMPTY_INPUT,
  MOVES,
  createFight,
  stepFight,
} from '../src/index.js';
import type { FightState, FighterInput } from '../src/index.js';

const hold = (patch: Partial<FighterInput>): FighterInput => ({ ...EMPTY_INPUT, ...patch });

function toFighting(state: FightState): void {
  while (state.phase === 'intro') stepFight(state);
}

const U = CONFIG.unitsPerPixel;

/** Put the fighters at a given edge-to-edge gap, both idle. */
function closeGap(s: FightState, gapPx: number): void {
  const gap = gapPx * U + 2 * CONFIG.fighterHalfWidth * U;
  s.p2.x = s.p1.x + gap;
}

/** Same gap, but p2 is cornered: holding "back" can't retreat out of range. */
function cornerGap(s: FightState, gapPx: number): void {
  s.p2.x = (CONFIG.stageWidth - CONFIG.fighterHalfWidth) * U;
  s.p1.x = s.p2.x - gapPx * U - 2 * CONFIG.fighterHalfWidth * U;
}

describe('attacks', () => {
  it('LP in range deals damage, applies hitstun, and emits attackStarted + hit', () => {
    const s = createFight();
    toFighting(s);
    closeGap(s, 4);
    const events = stepFight(s, hold({ lp: true }));
    expect(events.map((e) => e.type)).toContain('attackStarted');
    expect(s.p1.status).toBe('attack');
    expect(s.p1.moveId).toBe('lp');
    // land during the active window
    for (let i = 0; i < MOVES.lp.startup + MOVES.lp.active; i++) {
      events.push(...stepFight(s));
    }
    expect(s.p2.health).toBe(CONFIG.maxHealth - MOVES.lp.damage);
    expect(s.p2.status).toBe('hitstun');
    expect(events.some((e) => e.type === 'hit' && e.damage === MOVES.lp.damage)).toBe(true);
  });

  it('attacks out of range whiff and holding the button does not retrigger', () => {
    const s = createFight();
    toFighting(s);
    const health = s.p2.health;
    stepFight(s, hold({ lp: true })); // far away — whiff
    const ticksHeld = MOVES.lp.startup + MOVES.lp.active + MOVES.lp.recovery + 10;
    for (let i = 0; i < ticksHeld; i++) stepFight(s, hold({ lp: true }));
    expect(s.p2.health).toBe(health);
    expect(s.p1.status).toBe('idle'); // recovered, no retrigger while held
  });

  it('one attack instance hits at most once', () => {
    const s = createFight();
    toFighting(s);
    closeGap(s, 4);
    stepFight(s, hold({ lp: true }));
    for (let i = 0; i < MOVES.lp.startup + MOVES.lp.active + 2; i++) stepFight(s);
    expect(s.p2.health).toBe(CONFIG.maxHealth - MOVES.lp.damage);
  });

  it('knockback pushes the victim away from the attacker', () => {
    const s = createFight();
    toFighting(s);
    closeGap(s, 4);
    const x0 = s.p2.x;
    stepFight(s, hold({ hp: true }));
    for (let i = 0; i < MOVES.hp.startup + MOVES.hp.active + 4; i++) stepFight(s);
    expect(s.p2.health).toBe(CONFIG.maxHealth - MOVES.hp.damage);
    expect(s.p2.x).toBeGreaterThan(x0);
  });
});

describe('blocking', () => {
  it('standing block negates mid damage and takes chip on heavies', () => {
    const s = createFight();
    toFighting(s);
    cornerGap(s, 4);
    // p2 holds back (away from p1, who is to the left → holds right? p2 faces -1, back = right)
    const block = hold({ right: true });
    stepFight(s, hold({ hp: true }), block);
    for (let i = 0; i < MOVES.hp.startup + MOVES.hp.active + 2; i++) stepFight(s, EMPTY_INPUT, block);
    expect(s.p2.health).toBe(CONFIG.maxHealth - MOVES.hp.chip);
    expect(s.p2.status).toBe('blockstun');
  });

  it('a low kick hits through a standing block but is crouch-blockable', () => {
    const s = createFight();
    toFighting(s);
    cornerGap(s, 6);
    const standBlock = hold({ right: true });
    stepFight(s, hold({ lk: true }), standBlock);
    for (let i = 0; i < MOVES.lk.startup + MOVES.lk.active + 2; i++) stepFight(s, EMPTY_INPUT, standBlock);
    expect(s.p2.health).toBe(CONFIG.maxHealth - MOVES.lk.damage); // legs swept

    const s2 = createFight();
    toFighting(s2);
    cornerGap(s2, 6);
    const crouchBlock = hold({ right: true, down: true });
    stepFight(s2, hold({ lk: true }), crouchBlock);
    for (let i = 0; i < MOVES.lk.startup + MOVES.lk.active + 2; i++) stepFight(s2, EMPTY_INPUT, crouchBlock);
    expect(s2.p2.health).toBe(CONFIG.maxHealth - MOVES.lk.chip);
  });

  it('a high kick whiffs entirely against a crouching opponent', () => {
    const s = createFight();
    toFighting(s);
    closeGap(s, 4);
    const crouch = hold({ down: true });
    stepFight(s, hold({ hk: true }), crouch);
    for (let i = 0; i < MOVES.hk.startup + MOVES.hk.active + 2; i++) stepFight(s, EMPTY_INPUT, crouch);
    expect(s.p2.health).toBe(CONFIG.maxHealth);
  });
});
