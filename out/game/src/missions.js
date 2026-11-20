// Story missions, taxi fares and hidden packages for Solmar Bay.
// Five missions chain into one story: a driver who comes home, takes a fare,
// runs a package, earns heat, settles a dockside score and pulls one big job.

import { MISSION_REWARDS, blockRect, streetPos } from './config.js';
import { landmarkPos } from './world.js';
import { makeEnemy } from './combat.js';
import { starsFor } from './police.js';

const D = (speaker, text) => ({ speaker, text });

function missionDefs(G) {
  const bank = landmarkPos(G.world, 'bank');
  const docks = landmarkPos(G.world, 'docks');
  const safe = landmarkPos(G.world, 'safehouse');
  const hosp = landmarkPos(G.world, 'hospital');
  const beach = { x: 900, y: 3220 };
  return [
    {
      id: 1, name: 'First Fare',
      intro: [D('DANNY', "Back in Solmar. One last fare, then I'm done driving for other people."), D('DISPATCH', 'Client waiting at St. Marina. Pick them up, drop them at the beach hotel.')],
      steps: [
        { type: 'car', label: 'Get in a car' },
        { type: 'goto', x: hosp.x, y: hosp.y + 130, r: 55, label: 'Pick up the client at St. Marina Hospital' },
        { type: 'goto', x: beach.x, y: beach.y - 60, r: 60, label: 'Drop the client at the beach hotel' },
      ],
    },
    {
      id: 2, name: 'Package Run',
      intro: [D('MARA', "Three parcels, no questions. Docks, the alley by the PD, and the park. Then bring them to Port Solmar."), D('DANNY', 'Three stops. Easy money.')],
      steps: [
        {
          type: 'packages', label: 'Collect the three parcels',
          points: [
            { x: streetPos(8) + 40, y: streetPos(9) - 40 },
            { x: blockRect(2, 2).x + 30, y: blockRect(2, 2).y + 150 },
            { x: blockRect(6, 7).x + 100, y: blockRect(6, 7).y + 100 },
          ],
        },
        { type: 'goto', x: docks.x, y: docks.y - 120, r: 60, label: 'Deliver the parcels to Port Solmar' },
      ],
    },
    {
      id: 3, name: 'Heat',
      intro: [D('MARA', "The crew needs a clean car and the cops need a distraction. Take one off the street, get the heat on you, then shake it."), D('DANNY', 'Steal a car, make some noise, disappear. Got it.')],
      steps: [
        { type: 'steal', label: 'Steal a car off the street (E near a car)' },
        { type: 'wanted', stars: 2, label: 'Get the heat up to 2 stars' },
        { type: 'lose-heat', label: 'Lose the cops — wanted back to 0' },
      ],
    },
    {
      id: 4, name: 'Dockside Trouble',
      intro: [D('MARA', "The Vultures are leaning on our dock crew. Go down there and make it clear Port Solmar is ours."), D('DANNY', 'Four of them. Say less.')],
      steps: [
        { type: 'goto', x: docks.x, y: docks.y - 40, r: 90, label: 'Get to the docks' },
        { type: 'kill', count: 4, label: 'Deal with the Vultures (4 left)' },
      ],
    },
    {
      id: 5, name: 'The Big One',
      intro: [D('MARA', "Solmar National. One vault, one window, one way out. Grab the cash and bring it home."), D('DANNY', "After tonight, we're out. All of us.")],
      steps: [
        { type: 'goto', x: bank.x, y: bank.y + 110, r: 60, label: 'Reach Solmar National Bank' },
        { type: 'grab', x: bank.x, y: bank.y, seconds: 3, label: 'Grab the cash — stay in the vault' },
        { type: 'escape', x: safe.x, y: safe.y + 120, r: 60, minStars: 3, label: 'Escape to the safehouse with the cash' },
      ],
    },
  ];
}

export function startMission(G, index) {
  const defs = missionDefs(G);
  const def = defs[index];
  if (!def) return;
  G.mission = { def, index, step: 0, stepState: {}, startedAt: G.time };
  showDialogue(G, def.intro[0]);
  G.dialogueQueue = def.intro.slice(1);
  if (def.id === 4) {
    // The Vultures are waiting at the docks.
    const docks = landmarkPos(G.world, 'docks');
    for (let k = 0; k < 4; k++) {
      G.enemies.push(makeEnemy(docks.x - 120 + k * 80, docks.y - 60 + (k % 2) * 90));
    }
  }
  if (def.id === 5) {
    G.enemies.push(makeEnemy(landmarkPos(G.world, 'bank').x - 80, landmarkPos(G.world, 'bank').y + 40));
    G.enemies.push(makeEnemy(landmarkPos(G.world, 'bank').x + 80, landmarkPos(G.world, 'bank').y + 40));
  }
}

export function showDialogue(G, line) {
  G.dialogue = { speaker: line.speaker, text: line.text, t: 0, dur: 4.2 };
}

function currentStep(G) {
  return G.mission ? G.mission.def.steps[G.mission.step] : null;
}

export function missionMarker(G) {
  const s = currentStep(G);
  if (!s) return null;
  if (s.type === 'goto' || s.type === 'grab' || s.type === 'escape') return { x: s.x, y: s.y, label: s.label };
  if (s.type === 'packages') {
    const next = s.points.find((pt) => !G.mission.stepState['pkg_' + pt.x + '_' + pt.y]);
    return next ? { x: next.x, y: next.y, label: s.label } : null;
  }
  if (s.type === 'kill') return { x: landmarkPos(G.world, 'docks').x, y: landmarkPos(G.world, 'docks').y, label: s.label };
  return null;
}

export function missionObjective(G) {
  const s = currentStep(G);
  if (!s) return G.missionsDone.every(Boolean) ? 'Story complete — Solmar Bay is yours.' : 'Drive to the yellow M to start the next job.';
  if (s.type === 'kill') {
    const left = s.count - (G.mission.stepState.kills || 0);
    return `Deal with the Vultures (${left} left)`;
  }
  if (s.type === 'wanted') return `Get the heat up to ${s.stars} stars (now ${starsFor(G.wanted)})`;
  return s.label;
}

function advanceStep(G) {
  G.mission.step++;
  G.mission.stepState = {};
  G.audio.blip(990, 0.12);
  if (G.mission.step >= G.mission.def.steps.length) completeMission(G);
}

function completeMission(G) {
  const idx = G.mission.index;
  const reward = MISSION_REWARDS[idx];
  G.player.money += reward;
  G.missionsDone[idx] = true;
  G.audio.missionDone();
  showDialogue(G, D('SOLMAR BAY', `${G.mission.def.name} complete — $${reward} earned.`));
  G.flash = { text: `MISSION PASSED — ${G.mission.def.name}  +$${reward}`, t: 3.2 };
  G.mission = null;
  G.wanted = 0;
  G.cops = [];
  G.policeCars = [];
  G.saveGame();
  if (idx + 1 < 5) {
    G.nextMissionAt = G.time + 3.5;
  } else {
    G.storyComplete = true;
  }
}

export function updateMission(G, dt) {
  if (G.nextMissionAt && G.time >= G.nextMissionAt) {
    G.nextMissionAt = 0;
    startMission(G, G.missionsDone.findIndex((d) => !d));
  }
  const m = G.mission;
  if (!m) return;
  const s = currentStep(G);
  if (!s) return;
  const p = G.player;
  const pos = G.playerCar || p;
  switch (s.type) {
    case 'car':
      if (G.playerCar) advanceStep(G);
      break;
    case 'goto': {
      const d = Math.hypot(pos.x - s.x, pos.y - s.y);
      if (d < s.r) advanceStep(G);
      break;
    }
    case 'packages': {
      for (const pt of s.points) {
        const key = 'pkg_' + pt.x + '_' + pt.y;
        if (!m.stepState[key] && Math.hypot(pos.x - pt.x, pos.y - pt.y) < 46) {
          m.stepState[key] = true;
          G.audio.pickup();
          G.player.money += 20;
        }
      }
      if (s.points.every((pt) => m.stepState['pkg_' + pt.x + '_' + pt.y])) advanceStep(G);
      break;
    }
    case 'steal':
      if (G.stoleCar) { G.stoleCar = false; advanceStep(G); }
      break;
    case 'wanted':
      if (starsFor(G.wanted) >= s.stars) advanceStep(G);
      break;
    case 'lose-heat':
      if (starsFor(G.wanted) === 0) advanceStep(G);
      break;
    case 'kill': {
      const kills = G.enemiesKilled - (m.stepState.baseKills ?? (m.stepState.baseKills = G.enemiesKilled));
      m.stepState.kills = kills;
      if (kills >= s.count) advanceStep(G);
      break;
    }
    case 'grab': {
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if (d < 70 && !G.playerCar) {
        m.stepState.t = (m.stepState.t || 0) + dt;
        if (m.stepState.t >= s.seconds) {
          // Grabbing the vault trips every alarm in the city.
          G.wanted = 720;
          G.lastCrime = 0;
          advanceStep(G);
        }
      } else {
        m.stepState.t = 0;
      }
      break;
    }
    case 'escape': {
      const d = Math.hypot(pos.x - s.x, pos.y - s.y);
      if (d < s.r) advanceStep(G);
      break;
    }
  }
}

// ---- Taxi fares (side activity) -----------------------------------------

export function updateFare(G, dt) {
  if (G.fare) {
    const f = G.fare;
    if (!G.playerCar) { // left the car: the fare walks off
      G.fare = null;
      return;
    }
    if (f.state === 'pickup') {
      if (Math.hypot(G.playerCar.x - f.ped.x, G.playerCar.y - f.ped.y) < 46) {
        f.state = 'riding';
        G.audio.pickup();
        showDialogue(G, D('FARE', `Take me to ${f.destName}, quick!`));
      }
    } else if (f.state === 'riding') {
      if (Math.hypot(G.playerCar.x - f.dest.x, G.playerCar.y - f.dest.y) < 55) {
        G.player.money += f.pay;
        G.audio.cash();
        G.flash = { text: `FARE COMPLETE  +$${f.pay}`, t: 2.4 };
        G.fare = null;
      }
    }
    return;
  }
  if (!G.playerCar || G.mission) return;
  G.fareTimer -= dt;
  if (G.fareTimer > 0) return;
  G.fareTimer = 26 + G.rng() * 20;
  // A waiting fare spawns on a nearby sidewalk.
  const dests = [
    { x: 900, y: 3220, name: 'the beach hotel' },
    { x: landmarkPos(G.world, 'hospital').x, y: landmarkPos(G.world, 'hospital').y + 130, name: 'St. Marina Hospital' },
    { x: landmarkPos(G.world, 'bank').x, y: landmarkPos(G.world, 'bank').y + 110, name: 'Solmar National Bank' },
    { x: landmarkPos(G.world, 'docks').x, y: landmarkPos(G.world, 'docks').y - 120, name: 'Port Solmar' },
  ];
  const dest = dests[Math.floor(G.rng() * dests.length)];
  const a = G.rng() * Math.PI * 2;
  const fx = G.player.x + Math.cos(a) * 260;
  const fy = G.player.y + Math.sin(a) * 260;
  if (fy > 3140) return;
  const ped = { x: fx, y: fy, angle: 0, speed: 0, color: '#e8b93e', state: 'walk', axis: 'h', dir: 1, fleeX: 0, fleeY: 0, dead: false, deadTimer: 0, taxiWait: true, turnCooldown: 0, stepPhase: 0 };
  G.peds.push(ped);
  G.fare = { ped, dest, destName: dest.name, pay: 40 + Math.floor(G.rng() * 5) * 10, state: 'pickup' };
}

// ---- Hidden packages ------------------------------------------------------

export function seedCollectibles(G) {
  const spots = [
    { x: 330, y: 330 }, { x: 1520, y: 260 }, { x: 2760, y: 420 },
    { x: 420, y: 1450 }, { x: 2380, y: 1180 }, { x: 900, y: 2350 },
    { x: 2050, y: 2620 }, { x: 2900, y: 2050 }, { x: 1500, y: 3060 },
    { x: 620, y: 2900 },
  ];
  G.collectibles = spots.map((s) => ({ ...s, taken: false }));
}

export function updateCollectibles(G) {
  const pos = G.playerCar || G.player;
  for (const c of G.collectibles) {
    if (!c.taken && Math.hypot(pos.x - c.x, pos.y - c.y) < 40) {
      c.taken = true;
      G.player.money += 50;
      G.audio.cash();
      G.flash = { text: 'HIDDEN PACKAGE  +$50', t: 2 };
    }
  }
}
