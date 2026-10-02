import Phaser from 'phaser';
import { CONFIG, rosterEntry } from '@philo-kombat/core';
import type { FightState, FighterState } from '@philo-kombat/core';
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

  constructor(
    private readonly fight: FightSession,
    private readonly keys: DualKeyboardInput,
    private readonly ui: Hud,
  ) {
    super('fight');
  }

  create(): void {
    const snap = this.fight.snapshot();
    this.textures.addCanvas('stage', drawStage(snap.stage));
    this.add.image(0, 0, 'stage').setOrigin(0);

    const mk = (f: FighterState) => {
      this.registerAllPoses(f.rosterId, rosterEntry(f.rosterId).look);
      return this.add.image(0, 0, `${f.rosterId}:idle`).setOrigin(0.5, 1).setScale(3);
    };
    this.fighters = { p1: mk(snap.p1), p2: mk(snap.p2) };
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
    const [i1, i2] = this.keys.current();
    this.fight.advance(delta, i1, i2);
    const snap = this.fight.snapshot();
    this.renderFighter(this.fighters.p1, snap.p1, snap.tick);
    this.renderFighter(this.fighters.p2, snap.p2, snap.tick);
    this.ui.update(snap);
    for (const ev of this.fight.drainEvents()) this.ui.announce(ev, snap);
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
