// Solmar Bay — screenshot scenes: four staged moments the maker
// shoots for the entry (?shot=chase|drive|shootout|walk). Each one
// sets up the world, a mission and the actors, then raises the
// shot-ready flag the capture script waits for.

import { startMission, showDialogue } from './missions.js';
import { makeEnemy } from './combat.js';
import { makeCar } from './vehicles.js';
import { PALETTE } from './config.js';

// Stage one of the four scenes. `shot` is the ?shot= value.
export function setupShot(G, shot) {
  const L = G.world.landmarks;
  if (shot === 'chase') stageChase(G, L);
  else if (shot === 'drive') stageDrive(G, L);
  else if (shot === 'shootout') stageShootout(G, L);
  else if (shot === 'walk') stageWalk(G, L);
  // A staged scene is a live play moment: the title overlay must not
  // cover it, and the HUD (minimap, stars, objective) must show.
  G.state = 'play';
  G.shotReady = true;
}

// A three-star chase on mission 5: Danny in a sports car, two police
// cars closing in, the bank job behind him.
export function stageChase(G, L) {
  startMission(G, 4);
  G.mission.step = 1;
  G.mission.target = { x: L.safehouse.x, y: L.safehouse.y };
  G.wanted = 60;
  G.stars = 3;
  const car = makeCar(L.bank.x + 30, L.bank.y + 40, 'sports', PALETTE.sports);
  car.state = 'player';
  car.speed = 300;
  car.angle = -Math.PI / 2;
  G.cars.push(car);
  G.playerCar = car;
  G.player.x = car.x;
  G.player.y = car.y;
  for (const [dx, dy] of [[-260, 180], [300, -160]]) {
    const cop = makeCar(G.player.x + dx, G.player.y + dy, 'police', PALETTE.police);
    cop.state = 'police';
    cop.speed = 320;
    G.cars.push(cop);
  }
  G.player.money = 1250;
  // A fresh crime timestamp keeps the 3-star heat on through the shot
  // (the wanted level only decays after a 6 s grace with no new crime).
  G.lastCrime = G.time;
  // The chase car keeps driving itself so the shot shows motion.
  G.autoDrive = true;
  showDialogue(G, { speaker: 'MARCO', text: 'Vault is open! Now run — every cop in the city is coming.' });
}

// A fare on the beach road: Danny driving the taxi at sunset.
export function stageDrive(G, L) {
  startMission(G, 0);
  G.mission.step = 2;
  G.mission.target = { x: L.beach.x, y: L.beach.y };
  G.mission.timer = 18;
  G.fare = { state: 'toDest', timer: 18, pickup: { x: L.beach.x - 1400, y: L.beach.y - 20 }, dest: { x: L.beach.x, y: L.beach.y } };
  const car = makeCar(L.beach.x - 1400, L.beach.y - 20, 'taxi', PALETTE.taxi);
  car.state = 'player';
  car.speed = 240;
  car.angle = 0;
  G.cars.push(car);
  G.playerCar = car;
  G.player.x = car.x;
  G.player.y = car.y;
  G.player.money = 340;
  G.clockMinutes = 18 * 60 + 5;
  // The staged taxi keeps driving itself so the shot shows motion.
  G.autoDrive = true;
  showDialogue(G, { speaker: 'FARE', text: 'Beach road, please. And step on it!' });
}

// The dockside shootout: four Vultures, two stars, Danny on foot.
export function stageShootout(G, L) {
  startMission(G, 2);
  G.mission.step = 1;
  G.mission.target = { x: L.docks.x, y: L.docks.y };
  G.wanted = 40;
  G.stars = 2;
  // A fresh crime timestamp keeps the 2-star heat on through the shot
  // (the wanted level only decays after a 6 s grace with no new crime).
  G.lastCrime = 0;
  G.player.x = L.docks.x - 180;
  G.player.y = L.docks.y + 120;
  G.player.angle = Math.PI / 4;
  G.player.health = 82;
  G.player.money = 860;
  const spots = [
    { x: L.docks.x - 90, y: L.docks.y - 60 },
    { x: L.docks.x + 80, y: L.docks.y - 40 },
    { x: L.docks.x - 40, y: L.docks.y + 90 },
    { x: L.docks.x + 110, y: L.docks.y + 70 },
  ];
  for (const s of spots) G.enemies.push(makeEnemy(s.x, s.y));
  showDialogue(G, { speaker: 'DANNY', text: 'There they are. Four Vultures, one me.' });
}

// On foot in the park plaza: the city at rest, no heat.
export function stageWalk(G, L) {
  G.player.x = L.park.x;
  G.player.y = L.park.y + 40;
  G.player.angle = -Math.PI / 2;
  G.player.money = 120;
  G.clockMinutes = 10 * 60 + 20;
  showDialogue(G, { speaker: 'DANNY', text: 'Solmar Bay. Five jobs and I am done.' });
}
