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

## Jugar

`npm install && npm run dev` → abre el Vite URL.

- **Título** → Enter.
- **Modo**: `VERSUS` (dos jugadores, un teclado) o `ARCADE`
  (escalera de 8 rivales contra la CPU, dificultad creciente,
  escenarios rotando, final "¡EL MÁS SABIO!").
- **Select**: grid 3×3 con retratos pixel generados en runtime.
  En versus cada jugador mueve su propio cursor
  (P1: WASD + F · P2: flechas + ,).
- **Escenario**: Ágora, Liceo o Escuela de Atenas.
- **Fin de match**: Enter revancha (o siguiente rival en arcade),
  Esc vuelve al título.

Deep links para probar sin menús:
`/?p1=kant&p2=nietzsche&stage=lyceum` · `/?cpu=1&d=0.9` (arcade directo)
· `/?test=1` (hook `window.__FIGHT__` para e2e).

## Diseño

Ver [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) — roster completo,
especiales signature, controles y reglas de combate.
