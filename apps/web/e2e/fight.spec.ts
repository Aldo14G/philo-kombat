import { test, expect, type Page } from '@playwright/test';

interface Snap {
  tick: number;
  phase: string;
  p1: { x: number; health: number; status: string };
  p2: { x: number; health: number };
}

const snap = (page: Page): Promise<Snap> =>
  page.evaluate(() => (window as never as { __FIGHT__: { snapshot(): Snap } }).__FIGHT__.snapshot());

test.beforeEach(async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.locator('canvas')).toBeVisible();
});

test('fight boots, intro plays out, and P1 walks right on D', async ({ page }) => {
  await page.waitForFunction(
    () => (window as never as { __FIGHT__: { snapshot(): Snap } }).__FIGHT__.snapshot().phase === 'fighting',
  );
  const s0 = await snap(page);
  await page.keyboard.down('d');
  await page.waitForTimeout(700);
  await page.keyboard.up('d');
  const s1 = await snap(page);
  expect(s1.p1.x).toBeGreaterThan(s0.p1.x);
});

test('HUD shows both names and a ticking timer', async ({ page }) => {
  await expect(page.locator('#name1')).toHaveText('Sócrates');
  await expect(page.locator('#name2')).toHaveText('Platón');
  await page.waitForFunction(
    () => (window as never as { __FIGHT__: { snapshot(): Snap } }).__FIGHT__.snapshot().phase === 'fighting',
  );
  const t = await page.locator('#hud-timer').textContent();
  expect(Number(t)).toBeGreaterThan(0);
});

test('a punch in range drains the opponent health bar', async ({ page }) => {
  await page.waitForFunction(
    () => (window as never as { __FIGHT__: { snapshot(): Snap } }).__FIGHT__.snapshot().phase === 'fighting',
  );
  // walk P2 left toward P1 until in range, then P1 punches
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(2500);
  await page.keyboard.up('ArrowLeft');
  // hold the key long enough for a headless frame to sample it
  await page.keyboard.down('f');
  await page.waitForTimeout(300);
  await page.keyboard.up('f');
  await page.waitForTimeout(900);
  const s = await snap(page);
  expect(s.p2.health).toBeLessThan(1000);
});
