// Solmar Bay — screenshot scenes: ?shot=chase|drive|shootout|walk&seed=N.
// Each scene stages a moment of the game (a chase, a taxi fare, a shootout, a
// walk in the plaza) so the screenshots show the systems at their best.

import { LANDMARKS, WORLD } from './config.js';
import { landmarkCenter, randomRoadPoint } from './world.js';
import { makeCar } from './vehicles.js';
import { makeGang } from './combat.js';
import { spawnCopCar } from './police.js';
import { makePed } from './pedestrians.js';

export const SHOT_NAMES = ['chase', 'drive', 'shootout', 'walk', 'start'];

// Stage a scene into the game state G. Called once, before the first frame.
export function setupShot(G, name) {
  const p = G.player;
  G.state = 'play';
  G.mission.dialog = null;
  if (name === 'start') {
    G.state = 'title';
    return;
  }
  if (name === 'chase') {
    // Three stars, two cop cars closing in, Danny in a coupe mid-city.
    const c = landmarkCenter('park');
    p.x = c.x; p.y = c.y;
    const car = makeCar(c.x + 40, c.y, 0, 4, '#d94f3d', { isPlayer: true });
    car.speed = 380;
    G.cars.push(car);
    p.inCar = car;
    G.heat = 56; G.wanted = 3; G.lastCrime = G.time;
    for (let i = 0; i < 2; i++) {
      const cop = spawnCopCar(G.rng, p.x, p.y);
      cop.x = c.x - 260 - i * 160;
      cop.y = c.y + (i === 0 ? 40 : -40);
      cop.mode = 'ram';
      G.copCars.push(cop);
    }
    G.mission.index = 4;
    G.mission.stage = 1;
    G.mission.objective = 'Cash grabbed! Lose the cops — reach the safehouse';
    G.mission.dialog = { who: 'LENA', text: 'Grab the cash, lose the cops, get home. Then we are free.' };
    return;
  }
  if (name === 'drive') {
    // Taxi fare on the beach road (road 10, the asphalt strip above the sand).
    const beach = landmarkCenter('beach');
    const roadY = 3240; // centre of road 10
    p.x = beach.x - 1400; p.y = roadY;
    const taxi = makeCar(p.x, p.y, 0, 3, '#f2c230', { isTaxi: true, isPlayer: true });
    taxi.speed = 460;
    G.cars.push(taxi);
    G.taxi = taxi;
    p.inCar = taxi;
    G.mission.index = 0;
    G.mission.stage = 2;
    G.mission.timer = 17;
    G.mission.fare = { px: p.x - 300, py: p.y, dx: beach.x + 700, dy: roadY, t: 17 };
    G.mission.objective = 'Drop the passenger off — 17s';
    G.autoDrive = true; // keep the taxi rolling for the shot
    G.mission.dialog = { who: 'MARCO', text: 'Get in the yellow taxi, pick up the fare, and be quick about it. 24 seconds!' };
    return;
  }
  if (name === 'shootout') {
    // Two stars, four gang members at the docks, Danny on foot with a gun.
    const docks = landmarkCenter('docks');
    p.x = docks.x - 260; p.y = docks.y + 40;
    p.aim = 0;
    G.heat = 36; G.wanted = 2; G.lastCrime = G.time;
    for (let i = 0; i < 4; i++) {
      G.enemies.push(makeGang(docks.x + G.rng.range(-140, 140), docks.y + G.rng.range(-140, 140), G.rng));
    }
    G.mission.index = 2;
    G.mission.stage = 1;
    G.mission.enemiesLeft = 4;
    G.mission.objective = 'Take down the dock crew (4 left)';
    G.mission.dialog = { who: 'LENA', text: 'The dock crew took my shipment. Four of them, armed, at the containers.' };
    return;
  }
  // walk: on foot in the plaza, peds strolling, no wanted level.
  const plaza = landmarkCenter('park');
  p.x = plaza.x; p.y = plaza.y;
  G.wanted = 0; G.heat = 0;
  for (let i = 0; i < 5; i++) {
    G.peds.push(makePed(G.rng, plaza.x + G.rng.range(-200, 200), plaza.y + G.rng.range(-200, 200)));
  }
  G.mission.index = 0;
  G.mission.stage = 0;
  G.mission.objective = 'Get in the yellow taxi';
  G.mission.dialog = { who: 'DANNY', text: 'One fare. Then I am done driving for you, Marco.' };
}

// Read the ?shot= and ?seed= query params (empty object when absent).
export function readShotParams() {
  const q = new URLSearchParams(window.location.search);
  return {
    shot: q.get('shot') || null,
    seed: q.get('seed') ? Number(q.get('seed')) : null,
  };
}
