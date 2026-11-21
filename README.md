# Vice Tide

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Xipli69/vice-tide/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Xipli69/vice-tide/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original top-down open-world crime game for the make.fun **Make GTA 6**
(gta6-01) bounty — [make.fun/bounty/gta6-01](https://make.fun/bounty/gta6-01).
Not affiliated with Rockstar Games or Grand Theft Auto;
every name, place and line of code here is new.

Jax Marlowe owes fixer Delia Cross **$8,000** in the harbour city of Port
Vesper. Six jobs across one dusk pay it off: a dock pickup, a stolen gold
coupe, three cash drops against the clock, an informant run, a warehouse
shoot-out, and a four-star ferry getaway.

## Play it

```sh
node serve.ts            # then open http://localhost:8080
```

- **WASD / arrows** — walk and drive
- **E / F** — enter or steal a car, exit a car
- **Shift** — sprint on foot
- **Mouse** — aim; **click / Space** — shoot (warehouse job)
- **P / Esc** — pause

Port Vesper is a full city: road grid with moving traffic, pedestrians who
flee danger, parked cars to steal, a five-star wanted system with police
who chase, ram and bust you, a HUD with minimap, health and objective
markers, procedural Web-Audio sound (engine, sirens, shots), and a save in
`localStorage` so a night can be continued.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to the output directory and writes `dossier.json` with the
vendored `buildDossier` from `vendor/makefun-game.ts`.

## Screenshots

The four images in `screenshots/` are real renders of this game in a
browser, taken through its own screenshot scenes (`game/src/shots.js`):
open the game with `?shot=start|chase|mission|end&seed=7` (see
`shots.json`) and capture the canvas.

## Layout

- `game/index.html` — the page
- `game/src/config.js` — world, physics and story constants
- `game/src/world.js` — the city: blocks, roads, docks, park, collision
- `game/src/entities.js` — traffic, pedestrians, police, thugs, parked cars
- `game/src/missions.js` — the six-job story as data
- `game/src/render.js` — city and actor drawing
- `game/src/main.js` — player, wanted system, combat, HUD, screens, saves
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/input.js`, `game/src/audio.js`, `game/src/random.js` — support

Licensed under the MIT License (see `LICENSE`).
