# Philo Kombat

Nueve filósofos se disputan la verdad a golpes — un fighting game
Mortal Kombat-lite con estética pixel-art generada en código y UI PUXEL.

Sócrates, Platón, Aristóteles, Plotino, Kant, Hegel, Nietzsche, Heidegger
y Lacan pelean en el Ágora, el Liceo y la Escuela de Atenas.

## Requisitos

- **Node.js 24** (`engines >=22.12.0`; `.nvmrc` pin 24)
- npm ≥ 10 (workspaces)

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm install` | Instala todos los workspaces |
| `npm run dev` | Vite dev server (apps/web) |
| `npm run build` | Build core + web |
| `npm run typecheck` | `tsc --noEmit` en todos los workspaces |
| `npm test` | Vitest del core |
| `npm run validate` | Sanity check de roster/stages/moves |
| `npm run smoke` | Sim headless: determinismo + round-trip de snapshots |
| `npm run test:e2e` | Playwright (a partir del slice de renderer) |

## Estructura

```
packages/core   Sim de combate determinista (60 Hz, enteros sub-pixel,
                JSON state). Sin DOM, sin Phaser.
apps/web        Phaser + PUXEL: renderiza snapshots, UI chrome, e2e.
scripts/        validate-roster.mjs, headless-smoke.mjs
docs/           GAME_DESIGN.md — roster, especiales, controles, sistema.
```

## Diseño

Ver [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) — roster completo,
especiales signature, controles y reglas de combate.
