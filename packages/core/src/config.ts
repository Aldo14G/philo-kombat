/**
 * Fixed-step tuning. All positions are integer sub-pixel units
 * (`unitsPerPixel` per logical pixel) so the sim never touches floats.
 */
export const CONFIG = {
  tickRate: 60,
  /** Logical playfield, in pixels. Fighters clamp to [0, stageWidth]. */
  stageWidth: 360,
  /** Sub-pixel resolution: positions/velocities are multiples of 1/64 px. */
  unitsPerPixel: 64,
  /** Horizontal walk speed, units/tick (~2.2 px/s at 60 Hz). */
  walkSpeed: 140,
  /** Backward walk is slower than forward walk. */
  backWalkSpeed: 110,
  /** Vertical launch velocity for a jump, units/tick. */
  jumpVelocity: 560,
  /** Gravity, units/tick². */
  gravity: 44,
  /** Horizontal drift while airborne, units/tick. */
  airSpeed: 120,
  /** Half-width of a fighter's body box, in pixels. */
  fighterHalfWidth: 8,
  fighterHeight: 24,
  crouchHeight: 16,
  maxHealth: 1000,
  roundTicks: 60 * 60, // 60 s
  introTicks: 110, // "ROUND n — FIGHT!"
  roundEndTicks: 150, // KO freeze + verdict before the next round
  roundsToWin: 2,
  /** Ticks a signature special stays unavailable after use. */
  specialCooldownTicks: 240,
} as const;
