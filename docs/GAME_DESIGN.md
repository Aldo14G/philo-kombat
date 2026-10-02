# Philo Kombat — game design

Nueve filósofos se disputan la verdad a golpes. Mortal Kombat-lite:
rondas al mejor de 3, 60 s por ronda, un especial signature por filósofo,
y al KO el perdedor queda **¡REFUTADO!** — convertido en estatua de mármol.

## Roster

| Filósofo | Especial | Tipo |
|---|---|---|
| Sócrates | Mayéutica | Counter: absorbe un golpe y lo devuelve |
| Platón | Forma Ideal | Proyectil (su sombra golpea por él) |
| Aristóteles | Silogismo | Combo avanzante de 3 hits |
| Plotino | Emanación | Proyectil de onda |
| Kant | Imperativo Categórico | Golpe lento imbloqueable |
| Hegel | Dialéctica | Absorbe el próximo hit; su próximo ataque pega doble |
| Nietzsche | El Martillo | Overhead (rompe bloqueo bajo) |
| Heidegger | Ser-para-la-muerte | Dash lunge |
| Lacan | El Otro | Teleporte detrás del rival |

## Escenarios

- **El Ágora** — columnas dóricas, puestos de mercado, atardecer cálido.
- **El Liceo** — gimnasio peripatético, olivos, columnata.
- **La Escuela de Atenas** — el arco de Rafael, estatuas, suelo geométrico.

## Controles

| | P1 | P2 |
|---|---|---|
| Moverse | A / D | ← / → |
| Saltar | W | ↑ |
| Agacharse / bloquear bajo | S | ↓ |
| Bloquear | mantener atrás | mantener atrás |
| Puño flojo / fuerte | F / G | , / . |
| Patada floja / fuerte | H / J | / / RShift |
| Especial | ↓→+G (o T) | ↓→+. (o RCtrl) |

## Sistema

- Compartido: LP 40, HP 90, LK 55 (baja), HK 120 (alta — whiffa vs agachado).
- Bloqueo alto: mantener atrás. Bajo: ↓+atrás. Chip damage en golpes fuertes.
- Vida 1000; timer 60 s; KO o timeout decide ronda; 2 rondas ganan el match.
- Especial con cooldown de 4 s tras usarlo.
- CPU: FSM (approach → poke → block probabilístico → especial en cooldown)
  con dificultad creciente en la escalera arcade.
