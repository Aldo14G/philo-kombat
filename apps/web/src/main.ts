import Phaser from 'phaser';
import { CONFIG } from '@philo-kombat/core';

// Placeholder scene — the fight renderer lands in slice 3.
class BootScene extends Phaser.Scene {
  create(): void {
    this.add
      .text(CONFIG.stageWidth / 2, 90, 'PHILO KOMBAT', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#f2e6c9',
      })
      .setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  width: CONFIG.stageWidth,
  height: 180,
  backgroundColor: '#171c48',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: BootScene,
});
