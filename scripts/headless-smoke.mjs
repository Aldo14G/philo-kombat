// Headless determinism check: run a fight in Node, replay it, compare states.
import {
  CONFIG,
  EMPTY_INPUT,
  ROSTER,
  createFight,
  deserializeFight,
  serializeFight,
  stepFight,
} from '@philo-kombat/core';

const TICKS = 1800;
const input = (i) => ({
  ...EMPTY_INPUT,
  right: i % 5 < 2,
  left: i % 5 >= 3,
  up: i % 120 === 0,
  down: i % 7 === 0,
});

function run(seed) {
  const state = createFight(ROSTER[0].id, ROSTER[4].id, 'agora', seed);
  let events = 0;
  for (let i = 0; i < TICKS; i++) {
    events += stepFight(state, input(i), EMPTY_INPUT).length;
    if (state.phase === 'matchEnd') break;
  }
  return { state, events };
}

const a = run(3);
const b = run(3);
if (serializeFight(a.state) !== serializeFight(b.state)) {
  console.error('smoke FAILED: replay diverged');
  process.exit(1);
}
const restored = deserializeFight(serializeFight(a.state));
for (let i = 0; i < 120; i++) {
  stepFight(a.state, input(TICKS + i), EMPTY_INPUT);
  stepFight(restored, input(TICKS + i), EMPTY_INPUT);
}
if (serializeFight(restored) !== serializeFight(a.state)) {
  console.error('smoke FAILED: snapshot round-trip diverged');
  process.exit(1);
}
console.log(
  `smoke OK: tick=${a.state.tick} phase=${a.state.phase} p1=${a.state.p1.health}hp p2=${a.state.p2.health}hp events=${a.events}`,
);
void CONFIG;
