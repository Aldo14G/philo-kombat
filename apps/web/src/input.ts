import type { FighterInput } from '@philo-kombat/core';

/**
 * Two players on one keyboard. P1: WASD + F/G/H/J + T.
 * P2: arrows + , . / RightShift + RightControl.
 */
type KeyMap = Record<keyof FighterInput, string>;

const P1_KEYS: KeyMap = {
  left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS',
  lp: 'KeyF', hp: 'KeyG', lk: 'KeyH', hk: 'KeyJ', special: 'KeyT',
};

const P2_KEYS: KeyMap = {
  left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown',
  lp: 'Comma', hp: 'Period', lk: 'Slash', hk: 'ShiftRight', special: 'ControlRight',
};

export class DualKeyboardInput {
  private readonly pressed = new Set<string>();

  attach(): void {
    window.addEventListener('keydown', (e) => {
      if (ALL_CODES.has(e.code)) e.preventDefault();
      this.pressed.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.pressed.delete(e.code));
    window.addEventListener('blur', () => this.pressed.clear());
  }

  private read(map: KeyMap): FighterInput {
    const p = this.pressed;
    return {
      left: p.has(map.left),
      right: p.has(map.right),
      up: p.has(map.up),
      down: p.has(map.down),
      lp: p.has(map.lp),
      hp: p.has(map.hp),
      lk: p.has(map.lk),
      hk: p.has(map.hk),
      special: p.has(map.special),
    };
  }

  current(): [FighterInput, FighterInput] {
    return [this.read(P1_KEYS), this.read(P2_KEYS)];
  }
}

const ALL_CODES = new Set<string>([...Object.values(P1_KEYS), ...Object.values(P2_KEYS)]);
