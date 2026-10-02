import { describe, expect, it } from 'vitest';
import {
  CONFIG,
  EMPTY_INPUT,
  createFight,
  rosterEntry,
  stepFight,
} from '../src/index.js';
import type { FightState, FighterInput } from '../src/index.js';

const hold = (patch: Partial<FighterInput>): FighterInput => ({ ...EMPTY_INPUT, ...patch });

const U = CONFIG.unitsPerPixel;

function toFighting(state: FightState): void {
  while (state.phase === 'intro') stepFight(state);
}

function cornerGap(s: FightState, gapPx: number): void {
  s.p2.x = (CONFIG.stageWidth - CONFIG.fighterHalfWidth) * U;
  s.p1.x = s.p2.x - gapPx * U - 2 * CONFIG.fighterHalfWidth * U;
}

function run(s: FightState, ticks: number, i1: FighterInput = EMPTY_INPUT, i2: FighterInput = EMPTY_INPUT) {
  const events = [];
  for (let i = 0; i < ticks; i++) events.push(...stepFight(s, i1, i2));
  return events;
}

describe('signature specials', () => {
  it('Kant: Imperativo Categórico ignores blocking', () => {
    const s = createFight('kant', 'hegel');
    toFighting(s);
    cornerGap(s, 6);
    const block = hold({ right: true });
    stepFight(s, hold({ special: true }), block);
    const events = run(s, 40, EMPTY_INPUT, block);
    expect(s.p2.health).toBe(CONFIG.maxHealth - rosterEntry('kant').special.damage);
    expect(events.some((e) => e.type === 'hit')).toBe(true);
    expect(events.some((e) => e.type === 'blocked')).toBe(false);
  });

  it('Nietzsche: El Martillo breaks crouch-block', () => {
    const s = createFight('nietzsche', 'plato');
    toFighting(s);
    cornerGap(s, 6);
    const crouchBlock = hold({ right: true, down: true });
    stepFight(s, hold({ special: true }), crouchBlock);
    run(s, 40, EMPTY_INPUT, crouchBlock);
    expect(s.p2.health).toBe(CONFIG.maxHealth - rosterEntry('nietzsche').special.damage);
  });

  it('Platón: Forma Ideal spawns a projectile that hits at range', () => {
    const s = createFight('plato', 'aristotle');
    toFighting(s);
    const events = [];
    events.push(...stepFight(s, hold({ special: true }))); // spawn queued
    // projectile spawns at startup end
    for (let i = 0; i < rosterEntry('plato').special.startup; i++) events.push(...stepFight(s));
    expect(s.projectiles).toHaveLength(1);
    run(s, 60);
    expect(s.projectiles).toHaveLength(0); // hit or expired
    expect(s.p2.health).toBeLessThan(CONFIG.maxHealth);
    expect(events.some((e) => e.type === 'projectileSpawned')).toBe(true);
  });

  it('Lacan: El Otro teleports behind the opponent', () => {
    const s = createFight('lacan', 'kant');
    toFighting(s);
    const before = s.p1.x;
    stepFight(s, hold({ special: true }));
    run(s, rosterEntry('lacan').special.startup + 2);
    expect(s.p1.x).toBeGreaterThan(before);
    // behind p2 = right of p2 (p2 faces left)
    expect(s.p1.x).toBeGreaterThan(s.p2.x);
  });

  it('Hegel: Dialéctica empowers the next attack and absorbs one hit', () => {
    const s = createFight('hegel', 'plato');
    toFighting(s);
    stepFight(s, hold({ special: true }));
    expect(s.p1.empowered).toBe(true);
    run(s, 60);
    // LP after empower lands for double damage
    cornerGap(s, 4);
    s.p1.status = 'idle'; s.p1.moveId = null; s.p1.statusTicks = 0;
    stepFight(s, hold({ lp: true }));
    run(s, 20);
    expect(s.p2.health).toBe(CONFIG.maxHealth - 80); // lp 40 × 2
  });

  it('Sócrates: Mayéutica reflects an incoming hit', () => {
    const s = createFight('socrates', 'nietzsche');
    toFighting(s);
    cornerGap(s, 4);
    stepFight(s, hold({ special: true })); // socrates sets counter stance
    const events = [];
    stepFight(s, EMPTY_INPUT, hold({ hp: true })); // nietzsche punches into it
    for (let i = 0; i < 30; i++) events.push(...stepFight(s));
    expect(events.some((e) => e.type === 'countered')).toBe(true);
    expect(s.p1.health).toBe(CONFIG.maxHealth); // socrates untouched
    expect(s.p2.health).toBeLessThan(CONFIG.maxHealth); // nietzsche ate his own punch
  });

  it('Heidegger: Ser-para-la-muerte dashes forward', () => {
    const s = createFight('heidegger', 'plato');
    toFighting(s);
    const x0 = s.p1.x;
    stepFight(s, hold({ special: true }));
    run(s, rosterEntry('heidegger').special.startup + rosterEntry('heidegger').special.active + 2);
    expect(s.p1.x).toBeGreaterThan(x0 + 10 * U);
  });

  it('specials respect the cooldown', () => {
    const s = createFight('kant', 'hegel');
    toFighting(s);
    stepFight(s, hold({ special: true }));
    run(s, 50);
    const status1 = s.p1.status;
    s.p1.statusTicks = 0; s.p1.status = 'idle'; s.p1.moveId = null;
    expect(s.p1.specialCooldown).toBeGreaterThan(0);
    stepFight(s, hold({ special: true })); // still on cooldown → no new special
    expect(s.p1.moveId).toBeNull();
    void status1;
  });
});
