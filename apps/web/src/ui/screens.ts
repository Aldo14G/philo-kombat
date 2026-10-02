import { ROSTER, STAGES } from '@philo-kombat/core';
import type { FighterId, StageId } from '@philo-kombat/core';
import { composeSprite, rasterize, SPRITE_H, SPRITE_W } from '../pixel/sprites.js';
import { drawStage, FLOOR_Y, STAGE_W } from '../pixel/stages.js';

export type Mode = 'arcade' | 'versus';
export type Screen = 'title' | 'mode' | 'select' | 'stage' | 'fight' | 'end';

export interface FightConfig {
  mode: Mode;
  p1: FighterId;
  p2: FighterId;
  stage: StageId;
}

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
}

/** Portrait data-URL for a roster entry (idle pose, its palette). */
function portrait(id: FighterId): string {
  const r = ROSTER.find((e) => e.id === id)!;
  const data = rasterize(composeSprite('idle', r.look), { skin: r.palette.skin, robe: r.palette.robe, accent: r.palette.accent });
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H;
  canvas.getContext('2d')!.putImageData(new ImageData(data, SPRITE_W, SPRITE_H), 0, 0);
  const big = document.createElement('canvas');
  big.width = SPRITE_W * 4;
  big.height = SPRITE_H * 4;
  const ctx = big.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, 0, 0, big.width, big.height);
  return big.toDataURL();
}

export interface ScreenCallbacks {
  onFight: (cfg: FightConfig) => void;
  onRematch: () => void;
  onQuitToTitle: () => void;
}

/** DOM screens around the Phaser fight: title → mode → select → stage → fight → end. */
export class Screens {
  private readonly sections = new Map<Screen, HTMLElement>();
  private mode: Mode = 'versus';
  private pick: { p1?: FighterId; p2?: FighterId } = {};
  private stage: StageId = 'agora';
  private cursor = { p1: 0, p2: 1 };
  private stageCursor = 0;
  private picking: 'p1' | 'p2' | 'done' = 'p1';

  constructor(private readonly cb: ScreenCallbacks) {
    for (const s of ['title', 'mode', 'select', 'stage', 'fight', 'end'] as const) {
      this.sections.set(s, el(`screen-${s}`));
    }
    this.buildSelect();
    this.buildStages();
    el('mode-arcade').addEventListener('click', () => { this.mode = 'arcade'; this.syncMode(); this.show('select'); });
    el('mode-versus').addEventListener('click', () => { this.mode = 'versus'; this.syncMode(); this.show('select'); });
    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  show(s: Screen, detail?: string): void {
    for (const [name, node] of this.sections) node.hidden = name !== s;
    if (s === 'select') {
      this.pick = {};
      this.picking = 'p1';
      this.cursor = { p1: 0, p2: 1 };
      this.syncSelect();
    }
    if (s === 'end' && detail) el('end-title').textContent = detail;
    el('select-prompt').textContent =
      this.mode === 'arcade' ? 'Elige tu filósofo — P1: WASD + F' : 'Elige — P1: WASD+F · P2: flechas+,';
  }

  private buildSelect(): void {
    const grid = el('select-grid');
    for (const r of ROSTER) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'select-cell';
      cell.dataset.fighter = r.id;
      cell.innerHTML = `<img alt="" src="${portrait(r.id)}"><span class="px-display px-display--xs">${r.name}</span><small>${r.special.name}</small>`;
      cell.title = r.epithet;
      cell.addEventListener('click', () => this.confirm(this.picking === 'p1' ? 'p1' : 'p2', r.id));
      grid.append(cell);
    }
  }

  private buildStages(): void {
    const row = el('stage-grid');
    for (const st of STAGES) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'select-cell stage-cell';
      cell.dataset.stage = st.id;
      const c = drawStage(st.id);
      const small = document.createElement('canvas');
      small.width = STAGE_W / 2;
      small.height = FLOOR_Y / 2;
      const ctx = small.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(c, 0, 0, small.width, small.height);
      const img = document.createElement('img');
      img.alt = '';
      img.src = small.toDataURL();
      const name = document.createElement('span');
      name.className = 'px-display px-display--xs';
      name.textContent = st.name;
      const blurb = document.createElement('small');
      blurb.textContent = st.blurb;
      cell.append(img, name, blurb);
      cell.addEventListener('click', () => this.confirmStage(st.id));
      row.append(cell);
    }
  }

  private onKey(e: KeyboardEvent): void {
    const current = [...this.sections].find(([, n]) => !n.hidden)?.[0];
    if (!current) return;
    const p1Nav = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', ok: 'KeyF' };
    const p2Nav = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', ok: 'Comma' };

    if (current === 'title' && (e.code === 'Enter' || e.code === 'KeyF' || e.code === 'Comma')) {
      this.show('mode');
      return;
    }
    if (current === 'mode') {
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.mode = this.mode === 'versus' ? 'arcade' : 'versus';
        this.syncMode();
      }
      if (e.code === 'Enter' || e.code === 'KeyF' || e.code === 'Comma') this.show('select');
      return;
    }
    if (current === 'select') {
      if (e.code === 'Escape') { this.show('mode'); return; }
      for (const [who, nav] of [['p1', p1Nav], ['p2', p2Nav]] as const) {
        if (this.mode === 'arcade' && who === 'p2') continue;
        if (this.pick[who]) continue;
        const c = this.cursor[who];
        const cols = 3;
        let next = c;
        if (e.code === nav.left) next = c - 1;
        else if (e.code === nav.right) next = c + 1;
        else if (e.code === nav.up) next = c - cols;
        else if (e.code === nav.down) next = c + cols;
        else if (e.code === nav.ok) { this.confirm(who, ROSTER[c]!.id); return; }
        next = ((next % ROSTER.length) + ROSTER.length) % ROSTER.length;
        if (next !== c) {
          this.cursor[who] = next;
          this.syncSelect();
          return;
        }
      }
      return;
    }
    if (current === 'stage') {
      let next = this.stageCursor;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') next -= 1;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') next += 1;
      if (e.code === 'Enter' || e.code === 'KeyF' || e.code === 'Comma') {
        this.confirmStage(STAGES[this.stageCursor]!.id);
        return;
      }
      this.stageCursor = ((next % STAGES.length) + STAGES.length) % STAGES.length;
      this.syncStage();
      return;
    }
    if (current === 'end') {
      if (e.code === 'Enter' || e.code === 'KeyF') this.cb.onRematch();
      if (e.code === 'Escape') this.cb.onQuitToTitle();
    }
  }

  private confirm(who: 'p1' | 'p2', id: FighterId): void {
    if (this.pick[who]) return;
    this.pick[who] = id;
    if (this.mode === 'arcade' || (this.pick.p1 && this.pick.p2)) this.picking = 'done';
    else this.picking = 'p2';
    this.syncSelect();
    if (this.picking === 'done') this.show('stage');
  }

  private confirmStage(id: StageId): void {
    this.stage = id;
    const p2 = this.pick.p2 ?? ROSTER[(ROSTER.findIndex((r) => r.id === this.pick.p1) + 4) % ROSTER.length]!.id;
    this.cb.onFight({ mode: this.mode, p1: this.pick.p1!, p2, stage: this.stage });
  }

  private syncSelect(): void {
    const cells = el('select-grid').querySelectorAll<HTMLElement>('.select-cell');
    cells.forEach((cell, i) => {
      cell.classList.toggle('c1', i === this.cursor.p1 && !this.pick.p1);
      cell.classList.toggle('c2', i === this.cursor.p2 && this.mode === 'versus' && !this.pick.p2);
      cell.classList.toggle('picked1', this.pick.p1 === cell.dataset.fighter);
      cell.classList.toggle('picked2', this.pick.p2 === cell.dataset.fighter);
    });
  }

  private syncMode(): void {
    for (const id of ['mode-arcade', 'mode-versus']) {
      el(id).classList.toggle('active', id === `mode-${this.mode}`);
    }
  }

  private syncStage(): void {
    el('stage-grid').querySelectorAll<HTMLElement>('.select-cell').forEach((cell, i) => {
      cell.classList.toggle('c1', i === this.stageCursor);
    });
  }

  get currentMode(): Mode {
    return this.mode;
  }
}
