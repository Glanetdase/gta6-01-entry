# gta6-01-entry

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Glanetdase/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Glanetdase/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmar Bay** — an open-world crime game in the spirit of GTA 6, playable offline in a desktop browser from its own files.

You are Danny Cole, a getaway driver back in the fictional coastal city of Solmar Bay. Steal cars, outrun the law, and run five story missions — from a first fare to the big bank job.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no libraries: pure Canvas 2D and Web Audio, all synthesized in code.

## What is in the game

- **A city to explore on foot and by car** — an 11×11-block grid with roads, crosswalks, parks, parking lots, a beach, docks, and named landmarks (Solmar National Bank, St. Marina Hospital, Solmar PD HQ, the safehouse).
- **Driving and car theft** — arcade car physics with braking, reversing and drifting; walk up to any car and press E to get in. Stealing an occupied car brings the heat.
- **Traffic and pedestrians** — AI cars drive the road grid in the right lane and turn at intersections; pedestrians stroll the sidewalks and flee from danger.
- **Wanted system and police** — 0–5 stars. Police cars chase on the roads and ram; foot cops chase and arrest. Lay low and the heat fades.
- **Missions and a story** — five chained jobs with dialogue, markers and rewards: First Fare, Package Run, Heat, Dockside Trouble, The Big One.
- **Combat** — mouse-aimed pistol, punches, armed enemies, and bullets stopped by buildings.
- **HUD with a minimap** — health, money, wanted stars, in-game clock, radio station, speed, mission objective, and an off-screen marker arrow.
- **Start and save** — title screen with New Game / Continue / How to Play, pause menu, and progress saved to localStorage (money, missions, packages, position).
- **Sound and polish** — synthesized engine hum, police sirens, gunshots, pickups, mission jingles, and a bass-led radio loop (M to mute).

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive the car |
| Shift | Run |
| E | Enter / exit a car (steal it if occupied) |
| F | Punch |
| Mouse + click | Aim and shoot |
| Esc | Pause |
| M | Mute |
| P | Save |

## Files

- `game/` — the playable game (`index.html` + ES modules under `src/`).
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `screenshots/` — four real renders of the game: a police chase, a beach drive, the dockside shootout, and a walk through the park.
- `serve.ts` — a tiny static server for local play-testing.

---

<sub>Entered on [make.fun](https://make.fun/?ref=4mdg9yw5&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
