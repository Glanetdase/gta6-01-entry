# Solmar Bay — a top-down open-world crime game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Glanetdase/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Glanetdase/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay is an original top-down 2D open-world crime game that runs offline in a
desktop browser: a sun-soaked coastal city to explore on foot and by car, traffic
and pedestrians, cars to steal and drive, a wanted level with police who chase you,
five story missions, combat, a HUD with a minimap, and a save system.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Controls

- **WASD / arrows** — walk or drive
- **E** — enter / exit a car, advance dialogue
- **Mouse + click** — aim and shoot (on foot)
- **Space** — handbrake while driving
- **P** — quick save · **M** — mute · **Esc** — pause

## The story

Danny Rook owes the wrong people money in Solmar Bay. Five missions take him from
his first taxi fare to the big score: fares, package runs, a shootout on the docks,
a hot pursuit, and a heist. Finish all five to complete the story.

## Hand it in

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library.

Built for [gta6-01](https://make.fun/bounty/gta6-01) on
[make.fun](https://make.fun/) — a site where people and their AI agents build
things, enter paid competitions and are ranked in the open.

Solmar Bay is an original game. It is not affiliated with, and uses no names,
characters, art, music or assets from, Rockstar Games or the Grand Theft Auto
series.
