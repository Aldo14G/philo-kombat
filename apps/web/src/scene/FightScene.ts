import Phaser from 'phaser';
import { CONFIG, rosterEntry } from '@philo-kombat/core';
import type { FightState, FighterInput, FighterState } from '@philo-kombat/core';
import { FightSession } from '../session/FightSession.js';
import { DualKeyboardInput } from '../input.js';
import { FLOOR_Y, drawStage } from '../pixel/stages.js';
import { composeSprite, rasterize, SPRITE_H, SPRITE_W } from '../pixel/sprites.js';
import type { PoseName } from '../pixel/sprites.js';
import type { Hud } from '../ui/hud.js';

const U = CONFIG.unitsPerPixel;

const ATTACK_POSES = new Set(['lp', 'hp', 'lk', 'hk']);

function poseFor(f: FighterState, tick: number): PoseName {
  switch (f.status) {
    case 'attack': return ATTACK_POSES.has(f.moveId ?? '') ? (f.moveId as PoseName) : 'hp';
    case 'special': return 'special';
    case 'hitstun': return 'hitstun';
    case 'blockstun': return 'blockstun';
    case 'ko': return 'ko';
    case 'win': return 'win';
    case 'jump': return 'jump';
    case 'crouch': return 'crouch';
    case 'walk': return Math.floor(tick / 10) % 2 === 0 ? 'walk' : 'walk2';
    default: return f.blocking ? 'block' : Math.floor(tick / 30) % 2 === 0 ? 'idle' : 'idle2';
  }
}

export class FightScene extends Phaser.Scene {
  private fighters!: { p1: Phaser.GameObjects.Image; p2: Phaser.GameObjects.Image };
  private projectiles = new Map<number, Phaser.GameObjects.Image>();
  /** When set, side's input comes from the CPU instead of the keyboard. */
  cpuSide: 'p1' | 'p2' | null = null;
  cpuInput: { current(snap: FightState, side: 'p1' | 'p2'): FighterInput } | undefined;
  onMatchEnd?: (winner: 'p1' | 'p2', snap: FightState) => void;
  private ended = false;

  constructor(
    private fight: FightSession,
    private readonly keys: DualKeyboardInput,
    private readonly ui: Hud,
  ) {
    super('fight');
  }

  /** Swap in a fresh match and rebuild stage/fighters. */
  setSession(session: FightSession): void {
    this.fight = session;
    this.ended = false;
    this.projectiles.forEach((img) => img.destroy());
    this.projectiles.clear();
    this.scene?.restart();
  }

  create(): void {
    const snap = this.fight.snapshot();
    const stageKey = `stage-${snap.stage}`;
    if (!this.textures.exists(stageKey)) this.textures.addCanvas(stageKey, drawStage(snap.stage));
    this.add.image(0, 0, stageKey).setOrigin(0);

    const mk = (f: FighterState) => {
      this.registerAllPoses(f.rosterId, rosterEntry(f.rosterId).look);
      return this.add.image(0, 0, `${f.rosterId}:idle`).setOrigin(0.5, 1).setScale(3);
    };
    this.fighters = { p1: mk(snap.p1), p2: mk(snap.p2) };

    // projectile orb texture
    const orb = document.createElement('canvas');
    orb.width = 6;
    orb.height = 6;
    const c = orb.getContext('2d')!;
    c.fillStyle = '#c9b458';
    c.fillRect(1, 0, 4, 6);
    c.fillRect(0, 1, 6, 4);
    c.fillStyle = '#f2e6c9';
    c.fillRect(2, 2, 2, 2);
    if (!this.textures.exists('projectile')) this.textures.addCanvas('projectile', orb);
  }

  private registerAllPoses(rosterId: string, look: string): void {
    for (const pose of ['idle', 'idle2', 'walk', 'walk2', 'crouch', 'jump', 'lp', 'hp', 'lk', 'hk', 'special', 'block', 'blockstun', 'hitstun', 'ko', 'win'] as const) {
      this.ensurePose(rosterId, pose, look);
    }
  }

  private ensurePose(rosterId: string, pose: PoseName, look?: string): string {
    const key = `${rosterId}:${pose}`;
    if (!this.textures.exists(key)) {
      const data = rasterize(composeSprite(pose, look ?? rosterEntry(rosterId).look), paletteFor(rosterId));
      const canvas = document.createElement('canvas');
      canvas.width = SPRITE_W;
      canvas.height = SPRITE_H;
      canvas.getContext('2d')!.putImageData(new ImageData(data, SPRITE_W, SPRITE_H), 0, 0);
      this.textures.addCanvas(key, canvas);
    }
    return key;
  }

  override update(_time: number, delta: number): void {
    const [k1, k2] = this.keys.current();
    let i1 = k1;
    let i2 = k2;
    if (this.cpuSide && this.cpuInput) {
      const cpu = this.cpuInput.current(this.fight.snapshot(), this.cpuSide);
      if (this.cpuSide === 'p1') i1 = cpu; else i2 = cpu;
    }
    this.fight.advance(delta, i1, i2);
    const snap = this.fight.snapshot();
    this.renderFighter(this.fighters.p1, snap.p1, snap.tick);
    this.renderFighter(this.fighters.p2, snap.p2, snap.tick);
    this.renderProjectiles(snap);
    this.ui.update(snap);
    for (const ev of this.fight.drainEvents()) {
      this.ui.announce(ev, snap);
      if (ev.type === 'matchWon' && !this.ended) {
        this.ended = true;
        this.onMatchEnd?.(ev.winner, snap);
      }
    }
  }

  private renderProjectiles(snap: FightState): void {
    const seen = new Set<number>();
    for (const p of snap.projectiles) {
      seen.add(p.id);
      let img = this.projectiles.get(p.id);
      if (!img) {
        img = this.add.image(0, 0, 'projectile').setScale(3).setOrigin(0.5);
        this.projectiles.set(p.id, img);
      }
      img.setPosition(p.x / U, FLOOR_Y - 14);
      img.setAngle((snap.tick * 12) % 360);
    }
    for (const [id, img] of this.projectiles) {
      if (!seen.has(id)) {
        img.destroy();
        this.projectiles.delete(id);
      }
    }
  }

  private renderFighter(sprite: Phaser.GameObjects.Image, f: FighterState, tick: number): void {
    const pose = poseFor(f, tick);
    sprite.setTexture(this.ensurePose(f.rosterId, pose));
    sprite.setPosition(f.x / U, FLOOR_Y - f.y / U);
    sprite.setFlipX(f.facing === -1);
  }
}

function paletteFor(rosterId: string) {
  const r = rosterEntry(rosterId);
  return { skin: r.palette.skin, robe: r.palette.robe, accent: r.palette.accent };
}
