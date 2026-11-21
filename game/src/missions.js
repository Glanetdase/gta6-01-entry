// Solmar Bay — the story: five chained missions with dialogue and objectives.
// Each mission is a small state machine of stages. A stage names what the player
// must do; this module checks it every frame, advances the story, pays the
// reward and lines up the next mission's dialogue.

import { MISSION_REWARDS, PICKUP_VALUE } from './config.js';
import { dist } from './random.js';
import { landmarkCenter, randomRoadPoint } from './world.js';
import { makeGang } from './combat.js';

export const MISSION_TITLES = [
  'First Fare',
  'Package Run',
  'Dock Shootout',
  'Hot Pursuit',
  'The Big Score',
];

function dialog(who, text) { return { who, text }; }

// Dialogue scripts per mission (Danny is the player; Marco runs the taxi firm,
// Lena is Danny's contact, Fare is the passenger).
export const MISSION_DIALOG = [
  [
    dialog('MARCO', 'Danny! You owe me two weeks of cab rent. One fare, and we call it even.'),
    dialog('DANNY', 'One fare. Then I am done driving for you, Marco.'),
    dialog('MARCO', 'Get in the yellow taxi, pick up the fare, and be quick about it. 24 seconds!'),
  ],
  [
    dialog('LENA', 'Three packages, three corners of the bay. No questions, no stops.'),
    dialog('DANNY', 'Packages for who?'),
    dialog('LENA', 'For people who pay. Drive, Danny.'),
  ],
  [
    dialog('LENA', 'The dock crew took my shipment. Four of them, armed, at the containers.'),
    dialog('DANNY', 'Then the docks are about to get loud.'),
    dialog('LENA', 'Take them down and bring the crates back.'),
  ],
  [
    dialog('MARCO', 'The cops know your plate now, Danny. Three stars and climbing!'),
    dialog('DANNY', 'Then I drive until they lose me.'),
    dialog('MARCO', 'Lose them at the safehouse. Do not get caught.'),
  ],
  [
    dialog('LENA', 'Bay Trust Bank. One guard, one vault, one getaway car. This is the big score.'),
    dialog('DANNY', 'Five hundred thousand reasons to run.'),
    dialog('LENA', 'Grab the cash, lose the cops, get home. Then we are free.'),
  ],
];

export function makeMissionState() {
  return {
    index: 0,          // which mission (0..4); 5 = story done
    stage: 0,
    timer: 0,
    fare: null,        // { px, py, dx, dy, t } for mission 1
    deliveries: [],    // points for mission 2
    delivered: 0,
    enemiesLeft: 0,
    checkpoints: [],
    checkpointIndex: 0,
    objective: 'Talk to Marco',
    dialogQueue: [],
    dialog: null,      // currently shown line
    dialogTimer: 0,
    done: false,
  };
}

export function startMission(G, index) {
  const m = G.mission;
  m.index = index;
  m.stage = 0;
  m.timer = 0;
  m.fare = null;
  m.deliveries = [];
  m.delivered = 0;
  m.enemiesLeft = 0;
  m.checkpoints = [];
  m.checkpointIndex = 0;
  m.dialogQueue = (MISSION_DIALOG[index] || []).slice();
  m.dialog = null;
  m.dialogTimer = 0;
  m.done = false;
  if (index === 0) m.objective = 'Get in the yellow taxi';
  else if (index === 1) m.objective = 'Pick up the packages';
  else if (index === 2) m.objective = 'Head to the docks';
  else if (index === 3) m.objective = 'Get in a car and run';
  else if (index === 4) m.objective = 'Reach Bay Trust Bank';
  else m.objective = 'Story complete';
  nextDialog(G);
}

export function nextDialog(G) {
  const m = G.mission;
  if (m.dialogQueue.length > 0) {
    m.dialog = m.dialogQueue.shift();
    m.dialogTimer = 0;
  } else {
    m.dialog = null;
  }
}

// Advance dialogue on E / click, or automatically after a few seconds.
export function updateDialog(G, dt, advance) {
  const m = G.mission;
  if (!m.dialog) return;
  m.dialogTimer += dt;
  if (advance || m.dialogTimer > 4.5) {
    nextDialog(G);
  }
}

function completeMission(G) {
  const m = G.mission;
  const reward = MISSION_REWARDS[m.index] || 0;
  G.player.money += reward;
  G.moneyPopups.push({ x: G.player.x, y: G.player.y - 30, text: '+' + '$' + reward, t: 0, life: 1.6 });
  G.audio.chime(true);
  if (m.index >= 4) {
    m.done = true;
    m.index = 5;
    m.objective = 'Story complete';
    G.state = 'complete';
    return;
  }
  startMission(G, m.index + 1);
}

// Mission stage checks, run every frame while playing.
export function updateMission(G, dt) {
  const m = G.mission;
  if (m.index >= 5 || m.done) return;
  const p = G.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;

  if (m.index === 0) {
    // First Fare: 0 = get in the taxi, 1 = drive to the passenger,
    // 2 = drive the passenger to the destination before the timer runs out.
    if (m.stage === 0) {
      if (p.inCar && p.inCar.isTaxi) {
        m.stage = 1;
        const spot = randomRoadPoint(G.rng, px, py, 500);
        m.fare = { px: spot.x, py: spot.y, dx: 0, dy: 0, t: 24 };
        const dest = randomRoadPoint(G.rng, spot.x, spot.y, 700);
        m.fare.dx = dest.x; m.fare.dy = dest.y;
        m.objective = 'Pick up the passenger';
      }
    } else if (m.stage === 1) {
      if (dist(px, py, m.fare.px, m.fare.py) < 70) {
        m.stage = 2;
        m.timer = 24;
        m.objective = 'Drop the passenger off — 24 seconds!';
        G.audio.chime(true);
      }
    } else if (m.stage === 2) {
      m.timer -= dt;
      m.objective = 'Drop the passenger off — ' + Math.max(0, Math.ceil(m.timer)) + 's';
      if (dist(px, py, m.fare.dx, m.fare.dy) < 70) {
        completeMission(G);
      } else if (m.timer <= 0) {
        // Fare failed: the passenger walks away; try again from the pickup.
        m.stage = 1;
        m.objective = 'The fare left! Pick up the passenger';
        G.audio.chime(false);
      }
    }
  } else if (m.index === 1) {
    // Package Run: 3 delivery points, in order.
    if (m.stage === 0) {
      m.deliveries = [
        randomRoadPoint(G.rng, px, py, 600),
        randomRoadPoint(G.rng, px, py, 900),
        randomRoadPoint(G.rng, px, py, 1200),
      ];
      m.delivered = 0;
      m.stage = 1;
      m.objective = 'Deliver package 1 of 3';
    } else if (m.stage === 1) {
      const target = m.deliveries[m.delivered];
      if (target && dist(px, py, target.x, target.y) < 70) {
        m.delivered++;
        G.player.money += 20;
        G.audio.chime(true);
        if (m.delivered >= 3) completeMission(G);
        else m.objective = 'Deliver package ' + (m.delivered + 1) + ' of 3';
      }
    }
  } else if (m.index === 2) {
    // Dock Shootout: reach the docks, then defeat 4 gang members.
    const docks = landmarkCenter('docks');
    if (m.stage === 0) {
      if (dist(px, py, docks.x, docks.y) < 260) {
        m.stage = 1;
        m.enemiesLeft = 4;
        for (let i = 0; i < 4; i++) {
          G.enemies.push(makeGang(docks.x + G.rng.range(-160, 160), docks.y + G.rng.range(-160, 160), G.rng));
        }
        m.objective = 'Take down the dock crew (4 left)';
      }
    } else if (m.stage === 1) {
      m.enemiesLeft = G.enemies.length;
      m.objective = 'Take down the dock crew (' + m.enemiesLeft + ' left)';
      if (m.enemiesLeft === 0) completeMission(G);
    }
  } else if (m.index === 3) {
    // Hot Pursuit: escape to the safehouse while the heat is on.
    const safe = landmarkCenter('safehouse');
    if (m.stage === 0) {
      if (p.inCar) {
        m.stage = 1;
        G.heat = Math.max(G.heat, 56); // 3 stars
        G.wanted = 3;
        G.lastCrime = G.time;
        m.objective = 'Lose the cops — reach the safehouse';
      }
    } else if (m.stage === 1) {
      if (dist(px, py, safe.x, safe.y) < 130) {
        G.heat = 0; G.wanted = 0;
        completeMission(G);
      }
    }
  } else if (m.index === 4) {
    // The Big Score: reach the bank, grab the cash, escape to the safehouse.
    const bank = landmarkCenter('bank');
    const safe = landmarkCenter('safehouse');
    if (m.stage === 0) {
      if (dist(px, py, bank.x, bank.y) < 130) {
        m.stage = 1;
        m.timer = 0;
        G.player.money += 100;
        G.heat = Math.max(G.heat, 74); // 4 stars
        G.wanted = 4;
        G.lastCrime = G.time;
        m.objective = 'Cash grabbed! Lose the cops — reach the safehouse';
        G.audio.chime(true);
      }
    } else if (m.stage === 1) {
      if (dist(px, py, safe.x, safe.y) < 130) {
        G.heat = 0; G.wanted = 0;
        completeMission(G);
      }
    }
  }
}

// Current mission marker position (for the minimap + arrow), or null.
export function missionMarker(G) {
  const m = G.mission;
  if (m.index >= 5 || m.done) return null;
  if (m.index === 0) {
    if (m.stage === 0) return G.taxi ? { x: G.taxi.x, y: G.taxi.y } : null;
    if (m.stage === 1 && m.fare) return { x: m.fare.px, y: m.fare.py };
    if (m.stage === 2 && m.fare) return { x: m.fare.dx, y: m.fare.dy };
  }
  if (m.index === 1 && m.deliveries.length > 0 && m.delivered < m.deliveries.length) {
    return m.deliveries[m.delivered];
  }
  if (m.index === 2) return landmarkCenter('docks');
  if (m.index === 3) return landmarkCenter('safehouse');
  if (m.index === 4) {
    return m.stage === 0 ? landmarkCenter('bank') : landmarkCenter('safehouse');
  }
  return null;
}

export { PICKUP_VALUE };
