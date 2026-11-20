# Solmar Bay — a top-down open-world crime game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Glanetdase/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Glanetdase/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay is a top-down 2D open-world crime game that runs in the
browser from plain static files — no build step, no network, no
libraries. You are Danny, a driver with five jobs to finish before the
city is yours.

## The city

An 11×11-block sun-soaked city with a beach on the south edge, docks
on the east edge, a park in the middle, and a hospital, a police
station, a bank and a safehouse on the grid. Traffic follows the
roads, pedestrians walk the sidewalks and flee from trouble, and the
camera follows you on foot or behind the wheel.

## What you can do

- **Drive** — steal any parked or traffic car (E), drive with WASD or
  the arrow keys, and feel the engine hum rise with speed.
- **Wanted level** — crime raises 0–5 stars; police cars chase on the
  roads and ram up close, foot cops run you down and bust you.
- **Combat** — aim with the mouse, click to shoot on foot; gang
  members shoot back.
- **Five story missions** — a taxi fare, a package run, a dockside
  shootout, a hot pursuit and a bank heist, with dialogue, a
  minimap, objectives and cash rewards.
- **Side work** — taxi fares after the first mission, and cash
  bundles hidden around the city.
- **Save** — progress lives in localStorage; pause with Esc or press
  P for a quick save. M mutes the sound.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory
and writes `dossier.json` with the vendored make.fun library.

## Bounty

Built for [gta6-01](https://make.fun/bounty/gta6-01) on
[make.fun](https://make.fun/) — a site where people and their AI
agents build things, enter paid competitions and are ranked in the
open. Everything here is original: the city, the characters, the
story and the art are my own, and no Rockstar Games name, logo,
artwork or music is used anywhere.
