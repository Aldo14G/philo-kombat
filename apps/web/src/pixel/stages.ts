/**
 * Procedural stage backgrounds drawn on a canvas at boot — no assets.
 * Each stage paints into a 360×200 canvas; the floor line is FLOOR_Y.
 */
import type { StageId } from '@philo-kombat/core';

export const STAGE_W = 360;
export const STAGE_H = 200;
export const FLOOR_Y = 172;

type Ctx = CanvasRenderingContext2D;

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

/** Checker/dither fill. */
function dither(ctx: Ctx, x: number, y: number, w: number, h: number, c: string, step = 2): void {
  ctx.fillStyle = c;
  for (let yy = y; yy < y + h; yy += step) {
    for (let xx = x + ((yy / step) % 2) * (step / 2); xx < x + w; xx += step) {
      ctx.fillRect(xx, yy, step / 2, step / 2);
    }
  }
}

function column(ctx: Ctx, x: number, base: number, w: number, h: number, c: string, shade: string): void {
  rect(ctx, x, base - h, w, h, c);
  rect(ctx, x, base - h, 1, h, shade);
  rect(ctx, x - 1, base - h - 2, w + 2, 2, c); // capital
  rect(ctx, x - 1, base, w + 2, 2, shade); // base
}

function ground(ctx: Ctx, c1: string, c2: string): void {
  rect(ctx, 0, FLOOR_Y, STAGE_W, STAGE_H - FLOOR_Y, c1);
  dither(ctx, 0, FLOOR_Y + 2, STAGE_W, STAGE_H - FLOOR_Y - 2, c2, 4);
}

function agora(ctx: Ctx): void {
  // warm dusk sky
  for (let y = 0; y < FLOOR_Y; y += 4) {
    const t = y / FLOOR_Y;
    rect(ctx, 0, y, STAGE_W, 4, `rgb(${Math.round(46 + 60 * t)},${Math.round(30 + 50 * t)},${Math.round(70 + 30 * t)})`);
  }
  rect(ctx, 290, 18, 22, 22, '#e8b45a'); // low sun
  dither(ctx, 290, 18, 22, 22, '#f2d488', 3);
  // distant colonnade
  for (let x = 8; x < STAGE_W; x += 44) column(ctx, x, FLOOR_Y - 8, 5, 78, '#7a6a8a', '#5a4e68');
  rect(ctx, 0, FLOOR_Y - 92, STAGE_W, 6, '#6a5a7a');
  // market stall canopies
  rect(ctx, 40, FLOOR_Y - 40, 46, 3, '#c9584a');
  rect(ctx, 40, FLOOR_Y - 40, 46, 3, '#c9584a');
  for (let x = 40; x < 86; x += 8) rect(ctx, x, FLOOR_Y - 37, 4, 8, x % 16 === 8 ? '#e8d9b0' : '#c9584a');
  rect(ctx, 44, FLOOR_Y - 29, 2, 29, '#5a4e68');
  rect(ctx, 82, FLOOR_Y - 29, 2, 29, '#5a4e68');
  rect(ctx, 250, FLOOR_Y - 34, 40, 3, '#3f6ea8');
  for (let x = 250; x < 290; x += 8) rect(ctx, x, FLOOR_Y - 31, 4, 7, x % 16 === 10 ? '#e8d9b0' : '#3f6ea8');
  rect(ctx, 254, FLOOR_Y - 24, 2, 24, '#5a4e68');
  rect(ctx, 286, FLOOR_Y - 24, 2, 24, '#5a4e68');
  ground(ctx, '#8a6a4e', '#a8845e');
}

function lyceum(ctx: Ctx): void {
  // afternoon light
  for (let y = 0; y < FLOOR_Y; y += 4) {
    const t = y / FLOOR_Y;
    rect(ctx, 0, y, STAGE_W, 4, `rgb(${Math.round(58 + 70 * t)},${Math.round(70 + 60 * t)},${Math.round(60 + 40 * t)})`);
  }
  // colonnade back wall
  rect(ctx, 0, FLOOR_Y - 70, STAGE_W, 70, '#9a8a72');
  for (let x = 14; x < STAGE_W; x += 52) column(ctx, x, FLOOR_Y - 4, 6, 64, '#e8d9b0', '#b8a888');
  rect(ctx, 0, FLOOR_Y - 70, STAGE_W, 5, '#7a6a52');
  // olive trees
  for (const x of [60, 180, 300]) {
    rect(ctx, x + 8, FLOOR_Y - 42, 4, 42, '#6a4e32');
    rect(ctx, x, FLOOR_Y - 66, 22, 14, '#5a7a42');
    rect(ctx, x + 3, FLOOR_Y - 72, 16, 10, '#6a8a4e');
    dither(ctx, x, FLOOR_Y - 66, 22, 14, '#4a6a38', 3);
  }
  ground(ctx, '#a89478', '#c4b090');
}

function athens(ctx: Ctx): void {
  // interior: deep warm stone
  rect(ctx, 0, 0, STAGE_W, FLOOR_Y, '#8a7458');
  // great arch
  rect(ctx, 60, 20, 240, FLOOR_Y - 20, '#e8d9b0');
  rect(ctx, 90, 46, 180, FLOOR_Y - 46, '#4a3e58'); // inner darkness
  // arch ring
  for (let i = 0; i < 22; i++) {
    const t = Math.PI * (i / 21);
    const x = Math.round(180 + Math.cos(t) * 92);
    const y = Math.round(FLOOR_Y - 46 - Math.sin(t) * 92);
    rect(ctx, x - 2, y - 2, 5, 5, '#c9b458');
  }
  // niche statues (Platón pointing up / Aristóteles palm down — as silhouettes)
  for (const [x, c] of [[36, '#c9584a'], [316, '#3f6ea8']] as const) {
    rect(ctx, x, FLOOR_Y - 96, 18, 4, '#b8a888');
    rect(ctx, x + 5, FLOOR_Y - 88, 8, 88, '#d8cbb2');
    rect(ctx, x + 7, FLOOR_Y - 84, 4, 8, c);
  }
  // perspective floor
  ground(ctx, '#b09a78', '#8a7458');
  for (let i = 0; i < 8; i++) {
    const y = FLOOR_Y + i * 4;
    rect(ctx, 0, y, STAGE_W, 1, i % 2 ? '#8a7458' : '#b09a78');
  }
  ctx.strokeStyle = '#8a7458';
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(180 + i * 14, FLOOR_Y);
    ctx.lineTo(180 + i * 60, STAGE_H);
    ctx.stroke();
  }
}

const PAINTERS: Record<StageId, (ctx: Ctx) => void> = { agora, lyceum, athens };

export function drawStage(id: StageId): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = STAGE_W;
  canvas.height = STAGE_H;
  PAINTERS[id](canvas.getContext('2d')!);
  return canvas;
}
