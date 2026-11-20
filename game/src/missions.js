// Solmar Bay — the story: five chained missions with dialogue, a taxi
// fare side job, and cash collectibles scattered over the city.
// Each mission is a small state machine driven by the player's
// position, the timer and the enemies left standing.

import { TUNE, REWARDS } from './config.js';
import { mulberry32, range, int, dist, clamp } from './random.js';
import { makeEnemy } from './combat.js';

export const MISSION_DEFS = [
  {
    id: 'first-fare',
    name: 'First Fare',
    reward: REWARDS[0],
    intro: [
      { speaker: 'DANNY', text: "Solmar Bay. Five jobs and I'm done. Let's get to work." },
      { speaker: 'MARCO', text: 'First one is easy: grab a car, pick up my fare at the taxi stand.' },
    ],
  },
  {
    id: 'package-run',
    name: 'Package Run',
    reward: REWARDS[1],
    intro: [
      { speaker: 'LENA', text: 'Three packages, three drops. No questions, no cops. You in?' },
      { speaker: 'DANNY', text: 'Three drops. Say less.' },
    ],
  },
  {
    id: 'dockside-shootout',
    name: 'Dockside Shootout',
    reward: REWARDS[2],
    intro: [
      { speaker: 'MARCO', text: 'The Vultures took our shipment at the docks. Go get it back.' },
      { speaker: 'DANNY', text: 'Four of them. I can count.' },
    ],
  },
  {
    id: 'hot-pursuit',
    name: 'Hot Pursuit',
    reward: REWARDS[3],
    intro: [
      { speaker: 'LENA', text: 'Cops are all over you. Lose them and get to the safehouse.' },
      { speaker: 'DANNY', text: 'I know every shortcut in this city.' },
    ],
  },
  {
    id: 'the-big-score',
    name: 'The Big Score',
    reward: REWARDS[4],
    intro: [
      { speaker: 'MARCO', text: 'Last job: the bank vault, then straight to the safehouse. No stopping.' },
      { speaker: 'DANNY', text: 'After this, Solmar Bay is mine.' },
    ],
  },
];

// Where the three package drops wait, on road intersections.
export const PACKAGE_SPOTS = [
  { x: 0, y: 0 }, // filled in by startMission from landmarks
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

// Show a line of dialogue; queued lines follow when the first ends.
export function showDialogue(G, line) {
  G.dialogueQueue.push(line);
  if (!G.dialogue) nextDialogue(G);
}

export function nextDialogue(G) {
  const line = G.dialogueQueue.shift();
  G.dialogue = line ? { speaker: line.speaker, text: line.text, t: 0, dur: 4.2 } : null;
  if (G.dialogue) G.audio.blip();
}

// Start mission `index` (0..4): reset its step, place its markers.
export function startMission(G, index) {
  const def = MISSION_DEFS[index];
  if (!def) return;
  const L = G.world.landmarks;
  const mission = {
    index,
    def,
    step: 0,
    timer: 0,
    target: null,
    delivered: 0,
    enemiesToKill: 0,
  };
  if (index === 0) {
    mission.target = { x: L.taxi.x, y: L.taxi.y };
  } else if (index === 1) {
    PACKAGE_SPOTS[0] = { x: L.police.x, y: L.police.y };
    PACKAGE_SPOTS[1] = { x: L.hospital.x, y: L.hospital.y };
    PACKAGE_SPOTS[2] = { x: L.beach.x, y: L.beach.y };
    mission.target = PACKAGE_SPOTS[0];
  } else if (index === 2) {
    mission.target = { x: L.docks.x, y: L.docks.y };
  } else if (index === 3) {
    mission.target = { x: L.safehouse.x, y: L.safehouse.y };
    G.wanted = 60;
    G.stars = 3;
    G.lastCrime = 0;
  } else if (index === 4) {
    mission.target = { x: L.bank.x, y: L.bank.y };
  }
  G.mission = mission;
  for (const line of def.intro) showDialogue(G, line);
}

// One step done: advance, or finish the mission with its reward.
export function stepDone(G, nextTarget) {
  const m = G.mission;
  if (!m) return;
  m.step += 1;
  if (nextTarget) m.target = nextTarget;
  G.audio.chime();
}

export function finishMission(G) {
  const m = G.mission;
  if (!m) return;
  G.player.money += m.def.reward;
  G.missionsDone[m.index] = true;
  showDialogue(G, { speaker: 'MARCO', text: `Job done. $${m.def.reward} is yours.` });
  G.mission = null;
  G.nextMissionAt = G.time + 2.5;
  if (m.index === 4) {
    G.storyComplete = true;
  }
}

// The per-frame mission logic: each mission advances on its own terms.
export function updateMission(G, dt) {
  if (!G.mission) {
    if (G.nextMissionAt > 0 && G.time >= G.nextMissionAt) {
      G.nextMissionAt = 0;
      const next = G.missionsDone.findIndex((d) => !d);
      if (next >= 0) startMission(G, next);
    }
    return;
  }
  const m = G.mission;
  const d = m.target ? dist(G.player.x, G.player.y, m.target.x, m.target.y) : 9999;

  if (m.index === 0) {
    updateFirstFare(G, m, d, dt);
  } else if (m.index === 1) {
    updatePackageRun(G, m, d);
  } else if (m.index === 2) {
    updateShootout(G, m, d);
  } else if (m.index === 3) {
    updateHotPursuit(G, m, d);
  } else if (m.index === 4) {
    updateBigScore(G, m, d);
  }
}

// Mission 1: get in a car, reach the pickup, then beat the clock to
// the drop-off.
export function updateFirstFare(G, m, d, dt) {
  if (m.step === 0) {
    if (G.playerCar) {
      stepDone(G, G.world.landmarks.taxi);
      showDialogue(G, { speaker: 'MARCO', text: 'Good. The fare is waiting at the stand.' });
    }
  } else if (m.step === 1) {
    if (d < 70) {
      stepDone(G, G.world.landmarks.beach);
      m.timer = TUNE.fareTime;
      G.fare = { state: 'toDest', timer: TUNE.fareTime };
      showDialogue(G, { speaker: 'FARE', text: 'Beach road, please. And step on it!' });
    }
  } else if (m.step === 2) {
    m.timer -= dt;
    if (G.fare) G.fare.timer = m.timer;
    if (d < 70) {
      G.fare = null;
      finishMission(G);
    } else if (m.timer <= 0) {
      G.fare = null;
      showDialogue(G, { speaker: 'FARE', text: 'Forget it, I will walk. You lost the fare.' });
      m.step = 1;
      m.target = G.world.landmarks.taxi;
    }
  }
}

// Mission 2: three drops, one after another.
export function updatePackageRun(G, m, d) {
  if (d < 70) {
    m.delivered += 1;
    if (m.delivered >= 3) {
      finishMission(G);
    } else {
      stepDone(G, PACKAGE_SPOTS[m.delivered]);
      showDialogue(G, { speaker: 'LENA', text: `Drop ${m.delivered + 1} of 3. Keep moving.` });
    }
  }
}

// Mission 3: reach the docks, then clear the four Vultures.
export function updateShootout(G, m, d) {
  if (m.step === 0) {
    if (d < 120) {
      m.step = 1;
      m.enemiesToKill = 4;
      const L = G.world.landmarks.docks;
      const spots = [
        { x: L.x - 90, y: L.y - 60 },
        { x: L.x + 80, y: L.y - 40 },
        { x: L.x - 40, y: L.y + 90 },
        { x: L.x + 110, y: L.y + 70 },
      ];
      for (const s of spots) G.enemies.push(makeEnemy(s.x, s.y));
      showDialogue(G, { speaker: 'DANNY', text: 'There they are. Four Vultures, one me.' });
    }
  } else if (m.step === 1) {
    if (G.enemies.length === 0) finishMission(G);
  }
}

// Mission 4: reach the safehouse while the heat is on.
export function updateHotPursuit(G, m, d) {
  if (d < 80) finishMission(G);
}

// Mission 5: grab the vault cash at the bank, then reach the
// safehouse with four stars on your tail.
export function updateBigScore(G, m, d) {
  if (m.step === 0) {
    if (d < 80) {
      m.step = 1;
      m.target = G.world.landmarks.safehouse;
      G.player.money += 200;
      G.wanted = 80;
      G.stars = 4;
      G.lastCrime = 0;
      showDialogue(G, { speaker: 'MARCO', text: 'Vault is open! Now run — every cop in the city is coming.' });
    }
  } else if (m.step === 1) {
    if (d < 80) finishMission(G);
  }
}

// The current objective line for the HUD.
export function missionObjective(G) {
  const m = G.mission;
  if (!m) return null;
  if (m.index === 0) {
    if (m.step === 0) return 'Get in a car';
    if (m.step === 1) return 'Pick up the fare at the taxi stand';
    return `Drop off the fare — ${Math.max(0, Math.ceil(m.timer))}s left`;
  }
  if (m.index === 1) return `Deliver package ${m.delivered + 1} of 3`;
  if (m.index === 2) {
    if (m.step === 0) return 'Get to the docks';
    return `Clear the Vultures — ${G.enemies.length} left`;
  }
  if (m.index === 3) return 'Reach the safehouse — lose the heat';
  if (m.index === 4) {
    if (m.step === 0) return 'Hit the bank vault';
    return 'Escape to the safehouse with the cash';
  }
  return null;
}

// Cash bundles scattered over the city, worth $50 each.
export function seedCollectibles(G) {
  const rng = mulberry32(G.seed + 55);
  G.collectibles = [];
  const spots = [];
  for (let i = 0; i < 12; i += 1) {
    const col = int(rng, 0, 9);
    const row = int(rng, 0, 9);
    const bx = 96 + col * 416 + 60;
    const by = 96 + row * 416 + 60;
    spots.push({ x: bx + range(rng, 0, 200), y: by + range(rng, 0, 200) });
  }
  for (const s of spots) {
    G.collectibles.push({ x: s.x, y: s.y, taken: false, value: TUNE.collectibleValue });
  }
}

export function updateCollectibles(G) {
  for (const c of G.collectibles) {
    if (c.taken) continue;
    if (dist(G.player.x, G.player.y, c.x, c.y) < 30) {
      c.taken = true;
      G.player.money += c.value;
      G.audio.chime();
    }
  }
}

// The taxi side job: after mission 1, fares appear now and then.
export function updateFare(G, dt) {
  if (G.mission && G.mission.index === 0) return; // mission 1 runs its own fare
  if (!G.missionsDone[0]) return;
  if (!G.fare) {
    G.fareTimer -= dt;
    if (G.fareTimer <= 0 && G.playerCar) {
      G.fareTimer = 45;
      const L = G.world.landmarks;
      const pickup = { x: L.police.x + 120, y: L.police.y - 80 };
      const dest = { x: L.hospital.x - 100, y: L.hospital.y + 90 };
      G.fare = { state: 'toPickup', pickup, dest, timer: 0 };
      showDialogue(G, { speaker: 'FARE', text: 'Taxi! Over here — I need a ride.' });
    }
    return;
  }
  const f = G.fare;
  if (f.state === 'toPickup') {
    if (dist(G.player.x, G.player.y, f.pickup.x, f.pickup.y) < 70) {
      f.state = 'toDest';
      f.timer = TUNE.fareTime;
      showDialogue(G, { speaker: 'FARE', text: 'Hospital, please. Quick!' });
    }
  } else if (f.state === 'toDest') {
    f.timer -= dt;
    if (dist(G.player.x, G.player.y, f.dest.x, f.dest.y) < 70) {
      const pay = int(Math.random, 40, 80);
      G.player.money += pay;
      showDialogue(G, { speaker: 'FARE', text: `Thanks! Keep the change — $${pay}.` });
      G.audio.chime();
      G.fare = null;
      G.fareTimer = 40;
    } else if (f.timer <= 0) {
      G.fare = null;
      G.fareTimer = 40;
    }
  }
}
