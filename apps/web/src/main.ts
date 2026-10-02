import Phaser from 'phaser';
import { CONFIG, ROSTER, STAGES, rosterEntry } from '@philo-kombat/core';
import type { FighterId, StageId } from '@philo-kombat/core';
import { FightSession } from './session/FightSession.js';
import { DualKeyboardInput } from './input.js';
import { FightScene } from './scene/FightScene.js';
import { FLOOR_Y } from './pixel/stages.js';
import { Hud } from './ui/hud.js';
import { CpuInput } from './ai/cpu.js';
import { Screens } from './ui/screens.js';
import type { FightConfig } from './ui/screens.js';

const params = new URLSearchParams(window.location.search);

const input = new DualKeyboardInput();
input.attach();
const hud = new Hud();
let session = new FightSession('socrates', 'plato', 'agora', 1);
const scene = new FightScene(session, input, hud);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  width: CONFIG.stageWidth,
  height: FLOOR_Y + 28,
  backgroundColor: '#171c48',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene,
});

// --- match flow + arcade ladder -------------------------------------------

let lastCfg: FightConfig | null = null;
let lastWinner: 'p1' | 'p2' | null = null;
let ladder: FighterId[] = [];
let ladderIdx = 0;
let champion = false;

const difficulty = () => Math.min(1, 0.3 + ladderIdx * 0.09);

function startFight(cfg: FightConfig, rival?: FighterId, stage?: StageId): void {
  const seed = 1 + ladderIdx * 7;
  session = new FightSession(cfg.p1, rival ?? cfg.p2, stage ?? cfg.stage, seed);
  scene.cpuSide = cfg.mode === 'arcade' ? 'p2' : null;
  scene.cpuInput = cfg.mode === 'arcade' ? new CpuInput(difficulty()) : undefined;
  scene.setSession(session);
  screens.show('fight');
  game.scale.refresh(); // FIT measured while hidden → needs a nudge once visible
}

const screens = new Screens({
  onFight: (cfg) => {
    lastCfg = cfg;
    champion = false;
    if (cfg.mode === 'arcade') {
      ladder = ROSTER.filter((r) => r.id !== cfg.p1).map((r) => r.id);
      ladderIdx = 0;
      startFight(cfg, ladder[0]!, STAGES[0]!.id);
    } else {
      startFight(cfg);
    }
  },
  onRematch: () => {
    if (!lastCfg) return;
    if (champion) { screens.show('title'); return; }
    if (lastCfg.mode === 'versus') {
      startFight(lastCfg);
      return;
    }
    if (lastWinner === 'p1') ladderIdx += 1; // advance the ladder only on a win
    if (ladderIdx >= ladder.length) {
      champion = true;
      screens.show('end', '¡EL MÁS SABIO!');
      return;
    }
    startFight(lastCfg, ladder[ladderIdx]!, STAGES[ladderIdx % STAGES.length]!.id);
  },
  onQuitToTitle: () => screens.show('title'),
});

scene.onMatchEnd = (winner, snap) => {
  lastWinner = winner;
  const name = rosterEntry(snap[winner].rosterId).name;
  setTimeout(() => screens.show('end', `${name.toUpperCase()} TRIUNFA`), 1800);
};

// Direct-fight escape hatch for tests and deep links:
// ?test=1 | ?cpu=1 | ?p1=kant&p2=hegel — skips menus entirely.
const direct = params.get('test') === '1' || params.get('cpu') === '1' || params.has('p1');
if (direct) {
  const cfg: FightConfig = {
    mode: params.get('cpu') === '1' ? 'arcade' : 'versus',
    p1: (params.get('p1') ?? 'socrates') as FighterId,
    p2: (params.get('p2') ?? 'plato') as FighterId,
    stage: (params.get('stage') ?? 'agora') as StageId,
  };
  lastCfg = cfg;
  const d = Math.min(1, Math.max(0, Number(params.get('d') ?? '0.5')));
  session = new FightSession(cfg.p1, cfg.p2, cfg.stage, 1);
  scene.cpuSide = cfg.mode === 'arcade' ? 'p2' : null;
  scene.cpuInput = cfg.mode === 'arcade' ? new CpuInput(d) : undefined;
  scene.setSession(session);
  screens.show('fight');
  game.scale.refresh();
}

// Test hook: presentation-only read access for Playwright.
if (params.get('test') === '1') {
  (window as unknown as { __FIGHT__?: { snapshot: () => unknown } }).__FIGHT__ = {
    snapshot: () => session.snapshot(),
  };
}
