// Startup-style sanity check of the shipped roster/stage/move data.
import { MOVES, ROSTER, STAGES } from '@philo-kombat/core';

const errors = [];

const ids = new Set();
for (const r of ROSTER) {
  if (ids.has(r.id)) errors.push(`duplicate fighter id: ${r.id}`);
  ids.add(r.id);
  for (const k of ['robe', 'skin', 'accent']) {
    if (!/^#[0-9a-f]{6}$/i.test(r.palette[k])) errors.push(`${r.id}: bad palette.${k}`);
  }
  const s = r.special;
  if (s.damage < 0 || s.startup <= 0 || s.active <= 0 || s.recovery <= 0) {
    errors.push(`${r.id}: invalid special frame data`);
  }
}
if (ROSTER.length !== 9) errors.push(`expected 9 fighters, got ${ROSTER.length}`);
if (STAGES.length !== 3) errors.push(`expected 3 stages, got ${STAGES.length}`);
for (const [id, m] of Object.entries(MOVES)) {
  if (m.id !== id) errors.push(`move key mismatch: ${id}`);
  if (m.damage <= 0) errors.push(`move ${id} must deal damage`);
}

if (errors.length) {
  console.error('validate-roster FAILED');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`roster: OK (${ROSTER.length} fighters, ${STAGES.length} stages, ${Object.keys(MOVES).length} shared moves)`);
