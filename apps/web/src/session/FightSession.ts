import { CONFIG, EMPTY_INPUT, createFight, stepFight } from '@philo-kombat/core';
import type { FightEvent, FightState, FighterId, FighterInput, StageId } from '@philo-kombat/core';

const TICK_MS = 1000 / CONFIG.tickRate;
const MAX_FRAME_MS = 250;

/**
 * Sole owner of fight-state advancement on the client. The renderer calls
 * `advance(frameDeltaMs)` each rAF; inputs are level-triggered so the latest
 * snapshot of each player's keys is enough.
 */
export class FightSession {
  private readonly state: FightState;
  private accumulatorMs = 0;
  private eventBacklog: FightEvent[] = [];

  constructor(p1: FighterId, p2: FighterId, stage: StageId, seed = 1) {
    this.state = createFight(p1, p2, stage, seed);
  }

  advance(frameDeltaMs: number, p1: FighterInput, p2: FighterInput): void {
    this.accumulatorMs += Math.min(frameDeltaMs, MAX_FRAME_MS);
    while (this.accumulatorMs >= TICK_MS) {
      this.accumulatorMs -= TICK_MS;
      this.eventBacklog.push(...stepFight(this.state, p1, p2));
    }
  }

  /** Detached snapshot: renderers can never mutate the sim. */
  snapshot(): FightState {
    return structuredClone(this.state);
  }

  drainEvents(): FightEvent[] {
    const out = this.eventBacklog;
    this.eventBacklog = [];
    return out;
  }
}

export { EMPTY_INPUT };
