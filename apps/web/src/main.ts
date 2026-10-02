import Phaser from 'phaser';
import { CONFIG } from '@philo-kombat/core';
import type { FighterId, StageId } from '@philo-kombat/core';
import { FightSession } from './session/FightSession.js';
import { DualKeyboardInput } from './input.js';
import { FightScene } from './scene/FightScene.js';
import { FLOOR_Y } from './pixel/stages.js';
import { Hud } from './ui/hud.js';
import { CpuInput } from './ai/cpu.js';

const params = new URLSearchParams(window.location.search);
const p1 = (params.get('p1') ?? 'socrates') as FighterId;
const p2 = (params.get('p2') ?? 'plato') as FighterId;
const stage = (params.get('stage') ?? 'agora') as StageId;
const cpu = params.get('cpu') === '1';
const difficulty = Math.min(1, Math.max(0, Number(params.get('d') ?? '0.5')));

const session = new FightSession(p1, p2, stage, 1);
const input = new DualKeyboardInput();
input.attach();
const hud = new Hud();

const scene = new FightScene(session, input, hud);
if (cpu) {
  scene.cpuSide = 'p2';
  scene.cpuInput = new CpuInput(difficulty);
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  width: CONFIG.stageWidth,
  height: FLOOR_Y + 28,
  backgroundColor: '#171c48',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene,
});

// Test hook (/?test=1): presentation-only read access for Playwright.
if (params.get('test') === '1') {
  (window as unknown as { __FIGHT__?: { snapshot: () => unknown } }).__FIGHT__ = {
    snapshot: () => session.snapshot(),
  };
}
