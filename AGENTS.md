# Philo Kombat — agent contract

Fighting game MK-lite: nine philosophers, three classical stages, versus
local + arcade vs CPU. Same harness philosophy as sibling projects:
deterministic pure core, thin renderer, evidence before merge.

## Scope & constraints

- `packages/core` owns every gameplay rule. Phaser and the DOM only render
  snapshots and produce input intent. No DOM/Phaser/browser APIs in core.
- `FightState` is JSON-serializable end to end; `serializeFight`/
  `deserializeFight` must round-trip exactly (config is re-attached, not
  serialized).
- Fixed step: 60 ticks/s, integer sub-pixel units (`unitsPerPixel = 64`).
  No floating point in the sim.
- One owner per surface; independent tests per slice.
- PUXEL `0.1.3` pinned exactly for UI chrome; `data-theme="arcade"`,
  `.px-*` classes only — do not fork the design system.
- Sprites are code (string matrices), never binary assets. Do not add
  image/font binaries to the repo.

## Verification (run before every merge)

```
npm run typecheck
npm test
npm run smoke
npm run validate
npm run test:e2e   # once e2e exists (slice 3+)
```

## Slices

1. Scaffold + core skeleton (this PR)
2. Combat sim: attacks, blocking, hitstun, chip, rounds, specials data
3. Renderer + procedural stages + versus local
4. Pixel sprites: shared pose bodies + per-philosopher overlays
5. Signature specials + CPU AI + arcade ladder
6. PUXEL UI: title/select/HUD/announcer + impeccable pass
7. Hardening: e2e, determinism, README

## Stop conditions

- Any change that breaks determinism (unseeded RNG, wall-clock reads,
  float math in core) — stop and escalate.
- Art direction conflicts (non-pixel aesthetics) — escalate.
