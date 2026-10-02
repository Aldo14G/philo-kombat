import { CONFIG } from './config.js';
import { EMPTY_INPUT } from './types.js';
import type { FightEvent, FightEventBody, FightState, FighterInput, FighterState, FighterId, Phase, StageId } from './types.js';

const U = CONFIG.unitsPerPixel;

/** Deterministic 32-bit RNG (mulberry32 over integer state). */
export function nextRng(state: number): number {
  let a = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) % 2147483647;
}

function fighter(rosterId: FighterId, x: number, facing: 1 | -1): FighterState {
  return {
    rosterId,
    x,
    y: 0,
    vy: 0,
    facing,
    health: CONFIG.maxHealth,
    status: 'idle',
    statusTicks: 0,
    moveId: null,
    blocking: false,
    rounds: 0,
    specialCooldown: 0,
    pendingEdge: 0,
    lastInputMask: 0,
    lastHitBy: null,
    empowered: false,
  };
}

export function createFight(
  p1Id: FighterId = 'socrates',
  p2Id: FighterId = 'plato',
  stage: StageId = 'agora',
  seed = 1,
): FightState {
  const margin = CONFIG.stageWidth * 0.25 * U;
  return {
    tick: 0,
    phase: 'intro',
    phaseTicks: CONFIG.introTicks,
    round: 1,
    stage,
    p1: fighter(p1Id, margin, 1),
    p2: fighter(p2Id, CONFIG.stageWidth * U - margin, -1),
    nextEventSeq: 1,
    config: CONFIG,
    seed,
    rngState: seed,
  };
}

function emit(state: FightState, events: FightEvent[], ev: FightEventBody): void {
  events.push({ ...ev, seq: state.nextEventSeq++, tick: state.tick } as FightEvent);
}

/** Bitmask of the attack/special buttons, used to consume only press edges. */
function inputMask(input: FighterInput): number {
  return (input.lp ? 1 : 0) | (input.hp ? 2 : 0) | (input.lk ? 4 : 0) | (input.hk ? 8 : 0) | (input.special ? 16 : 0);
}

/** True only on the tick a button edge was first registered. */
export function inputPressed(f: FighterState, bit: number): boolean {
  return (f.pendingEdge & bit) !== 0;
}

const FREE: ReadonlySet<FighterState['status']> = new Set(['idle', 'walk', 'crouch']);

function applyMovement(state: FightState, f: FighterState, input: FighterInput): void {
  if (!FREE.has(f.status)) {
    f.blocking = false;
    return;
  }
  const forward = f.facing === 1 ? input.right : input.left;
  const backward = f.facing === 1 ? input.left : input.right;
  const onGround = f.y === 0;

  f.blocking = onGround && backward && !input.down && state.phase === 'fighting';

  if (onGround && input.down) {
    f.status = 'crouch';
    return;
  }
  if (onGround && input.up) {
    f.status = 'jump';
    f.vy = CONFIG.jumpVelocity;
    return;
  }
  if (onGround && (forward || backward)) {
    f.status = 'walk';
    const dir = forward ? f.facing : -f.facing;
    const speed = forward ? CONFIG.walkSpeed : CONFIG.backWalkSpeed;
    f.x += dir * speed;
    return;
  }
  f.status = onGround ? 'idle' : 'jump';
}

function applyPhysics(f: FighterState): void {
  if (f.status === 'jump' || f.y > 0) {
    f.y += f.vy;
    f.vy -= CONFIG.gravity;
    if (f.y <= 0) {
      f.y = 0;
      f.vy = 0;
      if (f.status === 'jump') f.status = 'idle';
    }
  }
  const lo = CONFIG.fighterHalfWidth * U;
  const hi = (CONFIG.stageWidth - CONFIG.fighterHalfWidth) * U;
  f.x = Math.max(lo, Math.min(hi, f.x));
}

/** Bodies can't overlap: push both apart symmetrically. */
function separateBodies(state: FightState): void {
  const minDist = CONFIG.fighterHalfWidth * 2 * U;
  const dx = state.p2.x - state.p1.x;
  const overlap = minDist - Math.abs(dx);
  if (overlap <= 0) return;
  const push = overlap / 2;
  const dir = dx >= 0 ? 1 : -1;
  state.p1.x -= push * dir;
  state.p2.x += push * dir;
  const lo = CONFIG.fighterHalfWidth * U;
  const hi = (CONFIG.stageWidth - CONFIG.fighterHalfWidth) * U;
  state.p1.x = Math.max(lo, Math.min(hi, state.p1.x));
  state.p2.x = Math.max(lo, Math.min(hi, state.p2.x));
}

function faceEachOther(state: FightState): void {
  for (const f of [state.p1, state.p2]) {
    if (f.y !== 0 || !FREE.has(f.status)) continue;
    const other = f === state.p1 ? state.p2 : state.p1;
    f.facing = other.x >= f.x ? 1 : -1;
  }
}

function setPhase(state: FightState, phase: Phase, ticks: number): void {
  state.phase = phase;
  state.phaseTicks = ticks;
}

function resetRoundPositions(state: FightState): void {
  const margin = CONFIG.stageWidth * 0.25 * U;
  const spots: Array<[FighterState, number, 1 | -1]> = [
    [state.p1, margin, 1],
    [state.p2, CONFIG.stageWidth * U - margin, -1],
  ];
  for (const [f, x, facing] of spots) {
    f.x = x;
    f.y = 0;
    f.vy = 0;
    f.facing = facing;
    f.health = CONFIG.maxHealth;
    f.status = 'idle';
    f.statusTicks = 0;
    f.moveId = null;
    f.blocking = false;
    f.lastHitBy = null;
    f.empowered = false;
  }
}

function endRound(state: FightState, events: FightEvent[], winner: 'p1' | 'p2'): void {
  const w = state[winner];
  w.rounds += 1;
  const loser = winner === 'p1' ? state.p2 : state.p1;
  loser.status = 'ko';
  if (w.status !== 'ko') w.status = 'win';
  emit(state, events, { type: 'roundWon', winner });
  if (w.rounds >= CONFIG.roundsToWin) {
    emit(state, events, { type: 'matchWon', winner });
    setPhase(state, 'matchEnd', 0);
  } else {
    setPhase(state, 'roundEnd', CONFIG.roundEndTicks);
  }
}

/**
 * Advances one deterministic tick. `commands` may be empty — intent is
 * level-triggered so the latest input per fighter is all the sim needs.
 */
export function stepFight(state: FightState, p1Input: FighterInput = EMPTY_INPUT, p2Input: FighterInput = EMPTY_INPUT): FightEvent[] {
  const events: FightEvent[] = [];
  state.tick += 1;

  for (const [f, input] of [[state.p1, p1Input], [state.p2, p2Input]] as const) {
    const mask = inputMask(input);
    f.pendingEdge = mask & ~f.lastInputMask;
    f.lastInputMask = mask;
    if (f.specialCooldown > 0) f.specialCooldown -= 1;
    if (f.statusTicks > 0) f.statusTicks -= 1;
  }

  switch (state.phase) {
    case 'intro': {
      if (state.phaseTicks === CONFIG.introTicks) emit(state, events, { type: 'roundStarted', round: state.round });
      state.phaseTicks -= 1;
      if (state.phaseTicks === 20) emit(state, events, { type: 'fight' });
      if (state.phaseTicks <= 0) setPhase(state, 'fighting', CONFIG.roundTicks);
      break;
    }
    case 'fighting': {
      applyMovement(state, state.p1, p1Input);
      applyMovement(state, state.p2, p2Input);
      state.phaseTicks -= 1;
      if (state.p1.health <= 0 || state.p2.health <= 0) {
        const loser = state.p1.health <= 0 ? 'p1' : 'p2';
        emit(state, events, { type: 'ko', loser });
        endRound(state, events, loser === 'p1' ? 'p2' : 'p1');
      } else if (state.phaseTicks <= 0) {
        const winner = state.p1.health === state.p2.health ? null : state.p1.health > state.p2.health ? 'p1' : 'p2';
        emit(state, events, { type: 'timeUp', winner });
        if (winner) endRound(state, events, winner);
        else setPhase(state, 'roundEnd', CONFIG.roundEndTicks);
      }
      break;
    }
    case 'roundEnd': {
      state.phaseTicks -= 1;
      if (state.phaseTicks <= 0) {
        state.round += 1;
        resetRoundPositions(state);
        setPhase(state, 'intro', CONFIG.introTicks);
      }
      break;
    }
    case 'matchEnd':
      break;
  }

  applyPhysics(state.p1);
  applyPhysics(state.p2);
  separateBodies(state);
  faceEachOther(state);
  return events;
}

export function serializeFight(state: FightState): string {
  const { config: _config, ...rest } = state;
  return JSON.stringify(rest);
}

export function deserializeFight(json: string): FightState {
  const state = JSON.parse(json) as Omit<FightState, 'config'>;
  return { ...state, config: CONFIG };
}
