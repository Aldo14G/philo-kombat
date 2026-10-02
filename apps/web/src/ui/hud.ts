import { rosterEntry } from '@philo-kombat/core';
import type { FightEvent, FightState } from '@philo-kombat/core';

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
}

/** DOM HUD over the Phaser canvas — health bars, timer, pips, announcer. */
export class Hud {
  private readonly hp1 = el<HTMLDivElement>('hp1-fill');
  private readonly hp2 = el<HTMLDivElement>('hp2-fill');
  private readonly name1 = el<HTMLSpanElement>('name1');
  private readonly name2 = el<HTMLSpanElement>('name2');
  private readonly timer = el<HTMLDivElement>('hud-timer');
  private readonly pips1 = el<HTMLDivElement>('pips1');
  private readonly pips2 = el<HTMLDivElement>('pips2');
  private readonly announcer = el<HTMLDivElement>('announcer');
  private announceTimer: ReturnType<typeof setTimeout> | null = null;

  update(snap: FightState): void {
    const pct = (f: typeof snap.p1) => `${(f.health / snap.config.maxHealth) * 100}%`;
    this.hp1.style.width = pct(snap.p1);
    this.hp2.style.width = pct(snap.p2);
    this.name1.textContent = rosterEntry(snap.p1.rosterId).name;
    this.name2.textContent = rosterEntry(snap.p2.rosterId).name;
    this.timer.textContent =
      snap.phase === 'fighting' ? String(Math.ceil(snap.phaseTicks / snap.config.tickRate)) : '—';
    this.pips1.textContent = '●'.repeat(snap.p1.rounds) + '○'.repeat(snap.config.roundsToWin - snap.p1.rounds);
    this.pips2.textContent = '●'.repeat(snap.p2.rounds) + '○'.repeat(snap.config.roundsToWin - snap.p2.rounds);
  }

  /** Short-lived center-screen callouts driven by sim events. */
  announce(ev: FightEvent, snap: FightState): void {
    const text = (() => {
      switch (ev.type) {
        case 'roundStarted': return `RONDA ${ev.round}`;
        case 'fight': return '¡LUCHA!';
        case 'ko': return 'K.O.';
        case 'timeUp': return 'TIEMPO';
        case 'roundWon': return null;
        case 'matchWon':
          return `${rosterEntry(snap[ev.winner].rosterId).name.toUpperCase()} TRIUNFA`;
        case 'specialUsed':
          return rosterEntry(snap[ev.fighter].rosterId).special.name.toUpperCase();
        case 'countered': return '¡CONTRARREFUTADO!';
        default: return null;
      }
    })();
    if (!text) return;
    this.say(text, ev.type === 'matchWon' ? 0 : 1400);
    if (ev.type === 'ko') this.say('¡REFUTADO!', 900, () => this.say('K.O.', 0));
  }

  private say(text: string, ms: number, after?: () => void): void {
    if (this.announceTimer) clearTimeout(this.announceTimer);
    this.announcer.textContent = text;
    this.announcer.classList.add('show');
    if (ms > 0 || after) {
      this.announceTimer = setTimeout(() => {
        this.announcer.classList.remove('show');
        after?.();
      }, ms);
    }
  }
}
