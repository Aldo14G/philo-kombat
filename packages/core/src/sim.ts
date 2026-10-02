import { CONFIG } from './config.js';
import { EMPTY_INPUT } from './types.js';
import { MOVES } from './moves.js';
import { rosterEntry } from './roster.js';
import type { MoveDef, SpecialDef } from './moves.js';
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
    vx: 0,
    facing,
    health: CONFIG.maxHealth,
    status: 'idle',
    statusTicks: 0,
    moveId: null,
    blocking: false,
    rounds: 0,
    specialCooldown: 0,
    attackSeq: 0,
    pendingEdge: 0,
    lastInputMask: 0,
    lastHitBy: null,
    empowered: false,
    absorbUntil: 0,
    teleportPending: false,
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
    projectiles: [],
    nextProjectileId: 1,
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

const ATTACK_BITS: ReadonlyArray<[number, string]> = [
  [1, 'lp'],
  [2, 'hp'],
  [4, 'lk'],
  [8, 'hk'],
];

function moveTotal(m: { startup: number; active: number; recovery: number }): number {
  return m.startup + m.active + m.recovery;
}

/** Frame-data lookup covering shared moves and the fighter's signature special. */
function moveFor(f: FighterState, moveId: string): MoveDef | SpecialDef | undefined {
  return MOVES[moveId] ?? (rosterEntry(f.rosterId).special.id === moveId ? rosterEntry(f.rosterId).special : undefined);
}

/** Special edge: cooldown-gated, grounded, in control. Sets up kind-specific state. */
function tryStartSpecial(state: FightState, events: FightEvent[], side: 'p1' | 'p2', f: FighterState): void {
  if (!inputPressed(f, 16) || f.specialCooldown > 0 || f.y !== 0 || !FREE.has(f.status)) return;
  const spec = rosterEntry(f.rosterId).special;
  f.status = 'special';
  f.moveId = spec.id;
  f.statusTicks = moveTotal(spec);
  f.attackSeq += 1;
  f.blocking = false;
  f.specialCooldown = CONFIG.specialCooldownTicks;
  switch (spec.kind) {
    case 'counter':
    case 'empower':
      f.absorbUntil = state.tick + spec.startup + spec.active;
      if (spec.kind === 'empower') f.empowered = true;
      break;
    case 'teleport':
      f.teleportPending = true;
      break;
    default:
      break;
  }
  emit(state, events, { type: 'specialUsed', fighter: side, moveId: spec.id });
}

/** Grounded fighters in control can start an attack on a fresh button edge. */
function tryStartAttack(state: FightState, events: FightEvent[], side: 'p1' | 'p2', f: FighterState): void {
  if (f.y !== 0 || !FREE.has(f.status)) return;
  for (const [bit, id] of ATTACK_BITS) {
    if (inputPressed(f, bit)) {
      const move = MOVES[id]!;
      f.status = 'attack';
      f.moveId = id;
      f.statusTicks = moveTotal(move);
      f.attackSeq += 1;
      f.blocking = false;
      emit(state, events, { type: 'attackStarted', fighter: side, moveId: id });
      return;
    }
  }
}

function applyMovement(state: FightState, f: FighterState, input: FighterInput): void {
  if (!FREE.has(f.status)) {
    f.blocking = false;
    return;
  }
  const forward = f.facing === 1 ? input.right : input.left;
  const backward = f.facing === 1 ? input.left : input.right;
  const onGround = f.y === 0;

  // Blocking: holding "away" on the ground. Standing by default; adding
  // `down` makes it a low block (the crouch branch below still applies).
  f.blocking = onGround && backward && state.phase === 'fighting';

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

/** Does `move` land on `victim` right now, and is it blocked? */
function resolveHit(attacker: FighterState, victim: FighterState, move: MoveDef): 'hit' | 'blocked' | null {
  const edgeDist = Math.abs(victim.x - attacker.x) - 2 * CONFIG.fighterHalfWidth * U;
  if (edgeDist > move.reach * U) return null;
  if (move.height === 'high' && victim.status === 'crouch') return null;
  if (victim.blocking && move.height !== 'unblockable') {
    const lowBlock = victim.status === 'crouch';
    if (move.height === 'mid' || (move.height === 'low' && lowBlock) || (move.height === 'overhead' && !lowBlock) || move.height === 'high') {
      return 'blocked';
    }
  }
  return 'hit';
}

function resolveAttacks(state: FightState, events: FightEvent[]): void {
  for (const [side, attacker, victim] of [
    ['p1', state.p1, state.p2],
    ['p2', state.p2, state.p1],
  ] as const) {
    if ((attacker.status !== 'attack' && attacker.status !== 'special') || !attacker.moveId) continue;
    const move = moveFor(attacker, attacker.moveId);
    if (!move) continue;
    const elapsed = moveTotal(move) - attacker.statusTicks;
    const spec = 'kind' in move ? move : null;

    // --- signature behaviors keyed on elapsed frames
    if (spec) {
      if (elapsed === move.startup) {
        switch (spec.kind) {
          case 'teleport': {
            const behind = CONFIG.fighterHalfWidth * 2 * U + 4 * U;
            attacker.x = victim.x - victim.facing * behind;
            attacker.teleportPending = false;
            break;
          }
          case 'projectile': {
            state.projectiles.push({
              id: state.nextProjectileId++,
              owner: side,
              moveId: spec.id,
              x: attacker.x + attacker.facing * (CONFIG.fighterHalfWidth + 4) * U,
              y: 0,
              vx: attacker.facing * 220,
              ttl: 100,
            });
            emit(state, events, { type: 'projectileSpawned', fighter: side, moveId: spec.id });
            break;
          }
          default:
            break;
        }
      }
      if (elapsed >= move.startup && elapsed < move.startup + move.active) {
        if (spec.kind === 'dash' || spec.kind === 'rush') {
          attacker.x += attacker.facing * CONFIG.airSpeed * 2;
        }
      }
    }

    const inActive = elapsed >= move.startup && elapsed < move.startup + move.active;
    // rush hits multiple times: tag includes an active-window slice
    const slice = spec?.kind === 'rush' ? `:${Math.floor(elapsed / 4)}` : '';
    const attackTag = `${side}:${attacker.attackSeq}${slice}`;
    if (!inActive || victim.lastHitBy === attackTag) continue;

    switch (resolveHit(attacker, victim, move)) {
      case 'hit': {
        victim.lastHitBy = attackTag;
        // absorbed hits: counter reflects, empower shrugs it off
        if (victim.absorbUntil > state.tick) {
          victim.absorbUntil = 0;
          const victimSpec = rosterEntry(victim.rosterId).special;
          if (victimSpec.kind === 'counter') {
            attacker.health = Math.max(0, attacker.health - move.damage);
            attacker.status = 'hitstun';
            attacker.statusTicks = move.hitstun;
            attacker.moveId = null;
            attacker.vx = move.knockback * -attacker.facing;
            emit(state, events, { type: 'countered', fighter: side === 'p1' ? 'p2' : 'p1', moveId: victimSpec.id });
          } else {
            emit(state, events, { type: 'blocked', fighter: side, moveId: move.id });
          }
          break;
        }
        const damage = attacker.empowered ? move.damage * 2 : move.damage;
        attacker.empowered = false;
        victim.health = Math.max(0, victim.health - damage);
        victim.status = 'hitstun';
        victim.statusTicks = move.hitstun;
        victim.moveId = null;
        victim.blocking = false;
        victim.vx = move.knockback * attacker.facing;
        emit(state, events, { type: 'hit', fighter: side, moveId: move.id, damage });
        break;
      }
      case 'blocked': {
        victim.lastHitBy = attackTag;
        victim.health = Math.max(0, victim.health - move.chip);
        victim.status = 'blockstun';
        victim.statusTicks = move.blockstun;
        victim.vx = (move.knockback / 2) * attacker.facing;
        emit(state, events, { type: 'blocked', fighter: side, moveId: move.id });
        break;
      }
    }
  }
}

/** Step travelling hitboxes; they die on walls, expiry, or contact. */
function resolveProjectiles(state: FightState, events: FightEvent[]): void {
  const keep: typeof state.projectiles = [];
  for (const p of state.projectiles) {
    p.x += p.vx;
    p.ttl -= 1;
    const victim = p.owner === 'p1' ? state.p2 : state.p1;
    const spec = rosterEntry(state[p.owner].rosterId).special;
    const dist = Math.abs(victim.x - p.x) - CONFIG.fighterHalfWidth * U;
    if (dist <= 4 * U && victim.status !== 'ko') {
      if (victim.blocking) {
        victim.health = Math.max(0, victim.health - Math.floor(spec.damage * 0.15));
        victim.status = 'blockstun';
        victim.statusTicks = spec.hitstun / 2 | 0;
        victim.vx = (spec.knockback / 2) * Math.sign(p.vx) || 0;
        emit(state, events, { type: 'blocked', fighter: p.owner, moveId: p.moveId });
      } else {
        victim.health = Math.max(0, victim.health - spec.damage);
        victim.status = 'hitstun';
        victim.statusTicks = spec.hitstun;
        victim.moveId = null;
        victim.blocking = false;
        victim.vx = spec.knockback * Math.sign(p.vx);
        emit(state, events, { type: 'hit', fighter: p.owner, moveId: p.moveId, damage: spec.damage });
      }
      continue; // consumed
    }
    if (p.ttl > 0 && p.x > 0 && p.x < CONFIG.stageWidth * U) keep.push(p);
  }
  state.projectiles = keep;
}

function applyPhysics(f: FighterState): void {
  if (f.vx !== 0) {
    f.x += f.vx;
    f.vx -= Math.trunc(f.vx / 5) || Math.sign(f.vx);
  }
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
    f.vx = 0;
    f.specialCooldown = 0;
    f.facing = facing;
    f.health = CONFIG.maxHealth;
    f.status = 'idle';
    f.statusTicks = 0;
    f.moveId = null;
    f.blocking = false;
    f.lastHitBy = null;
    f.empowered = false;
    f.absorbUntil = 0;
    f.teleportPending = false;
  }
  state.projectiles = [];
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
    if (f.statusTicks > 0) {
      f.statusTicks -= 1;
      if (f.statusTicks === 0 && (f.status === 'attack' || f.status === 'hitstun' || f.status === 'blockstun' || f.status === 'special')) {
        f.status = 'idle';
        f.moveId = null;
      }
    }
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
      tryStartSpecial(state, events, 'p1', state.p1);
      tryStartSpecial(state, events, 'p2', state.p2);
      tryStartAttack(state, events, 'p1', state.p1);
      tryStartAttack(state, events, 'p2', state.p2);
      applyMovement(state, state.p1, p1Input);
      applyMovement(state, state.p2, p2Input);
      resolveAttacks(state, events);
      resolveProjectiles(state, events);
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
