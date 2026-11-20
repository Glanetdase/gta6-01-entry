// Solmar Bay — cars: traffic that follows the road grid, parked cars
// the player can steal, and the physics for driving one. A car is a
// circle for collision and a rotated rectangle for drawing.

import { BLOCK, ROAD, GRID, TUNE, PALETTE } from './config.js';
import { mulberry32, range, int, pick, clamp, wrapAngle, turnToward, dist } from './random.js';
import { roadCenter, isOnRoad, resolveCircle, randomRoadPoint } from './world.js';

const CAR_COLORS = PALETTE.carColors;
const CAR_KINDS = ['sedan', 'sedan', 'sedan', 'hatch', 'truck', 'sports'];

// Lane offset from a road centre line: right-hand traffic.
export function laneOffset(axis, dir) {
  return axis === 'h' ? (dir > 0 ? 20 : -20) : (dir > 0 ? -20 : 20);
}

export function makeCar(x, y, kind, color) {
  return {
    x,
    y,
    angle: 0,
    speed: 0,
    kind: kind || 'sedan',
    color: color || pick(Math.random, CAR_COLORS),
    state: 'traffic', // traffic | parked | player | police
    axis: 'h',
    dir: 1,
    targetSpeed: TUNE.trafficSpeed,
    stopped: false,
    r: 17,
    maxSpeed: kind === 'sports' ? TUNE.sportsMaxSpeed : TUNE.carMaxSpeed,
  };
}

// Seed the parked cars along road edges, deterministic per world seed.
export function seedParkedCars(G) {
  const rng = mulberry32(G.seed + 77);
  G.cars = [];
  for (let i = 0; i < 30; i += 1) {
    const horizontal = rng() < 0.5;
    const road = int(rng, 0, GRID);
    const along = range(rng, ROAD + 60, G.world.width - ROAD - 60);
    const side = rng() < 0.5 ? -1 : 1;
    const x = horizontal ? along : roadCenter(road) + side * 30;
    const y = horizontal ? roadCenter(road) + side * 30 : along;
    const kind = pick(rng, CAR_KINDS);
    const car = makeCar(x, y, kind, pick(rng, CAR_COLORS));
    car.state = 'parked';
    car.angle = horizontal ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2);
    G.cars.push(car);
  }
  // One taxi waits at the taxi stand so mission 1 always has a car.
  const taxi = makeCar(G.world.landmarks.taxi.x + 40, G.world.landmarks.taxi.y + 30, 'taxi', PALETTE.taxi);
  taxi.state = 'parked';
  taxi.angle = 0;
  G.cars.push(taxi);
  // One sports car near the safehouse, for the play-test and for fun.
  const sports = makeCar(G.world.landmarks.safehouse.x + 60, G.world.landmarks.safehouse.y - 30, 'sports', PALETTE.sports);
  sports.state = 'parked';
  sports.angle = Math.PI / 2;
  G.cars.push(sports);
}

// Keep traffic around the camera: spawn ahead, remove far behind.
export function maintainTraffic(G, dt) {
  G.spawnTimer -= dt;
  const traffic = G.cars.filter((c) => c.state === 'traffic');
  if (traffic.length < 22 && G.spawnTimer <= 0) {
    G.spawnTimer = 0.7;
    const p = randomRoadPoint(G.rng, G.world);
    // Don't spawn on top of the player.
    if (dist(p.x, p.y, G.player.x, G.player.y) < 500) return;
    const horizontal = Math.abs(p.y - G.player.y) < Math.abs(p.x - G.player.x) ? false : G.rng() < 0.5;
    const car = makeCar(p.x, p.y, pick(G.rng, CAR_KINDS), pick(G.rng, CAR_COLORS));
    car.state = 'traffic';
    car.axis = horizontal ? 'h' : 'v';
    car.dir = G.rng() < 0.5 ? 1 : -1;
    car.speed = range(G.rng, 90, TUNE.trafficMax);
    car.angle = car.axis === 'h' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    G.cars.push(car);
  }
  // Remove traffic far from the player.
  for (let i = G.cars.length - 1; i >= 0; i -= 1) {
    const c = G.cars[i];
    if (c.state === 'traffic' && dist(c.x, c.y, G.player.x, G.player.y) > 1500) {
      G.cars.splice(i, 1);
    }
  }
}

// Heading (angle) for driving along an axis in a direction.
export function headingFor(axis, dir) {
  if (axis === 'h') return dir > 0 ? 0 : Math.PI;
  return dir > 0 ? Math.PI / 2 : -Math.PI / 2;
}

// Drive one traffic car along the grid: follow its lane, turn at
// intersections sometimes, slow down for the car ahead.
export function updateTrafficCar(G, car, dt) {
  const ahead = carAhead(G, car);
  const target = ahead ? Math.max(0, car.targetSpeed * 0.25) : car.targetSpeed;
  car.speed += clamp(target - car.speed, -260 * dt, 180 * dt);
  const wantAngle = headingFor(car.axis, car.dir);
  car.angle = turnToward(car.angle, wantAngle, 3.2 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;

  // At an intersection, sometimes turn onto the crossing road.
  if (isOnRoad(car.x, car.y) && G.rng() < dt * 0.35) {
    const otherAxis = car.axis === 'h' ? 'v' : 'h';
    const newDir = G.rng() < 0.5 ? 1 : -1;
    car.axis = otherAxis;
    car.dir = newDir;
    if (otherAxis === 'h') car.y = nearestLaneY(car.y);
    else car.x = nearestLaneX(car.x);
  }
  // Keep the car on its lane.
  if (car.axis === 'h') {
    const laneY = roadCenter(Math.round((car.y - ROAD / 2) / (BLOCK + ROAD))) + laneOffset('h', car.dir);
    car.y += clamp(laneY - car.y, -90 * dt, 90 * dt);
  } else {
    const laneX = roadCenter(Math.round((car.x - ROAD / 2) / (BLOCK + ROAD))) + laneOffset('v', car.dir);
    car.x += clamp(laneX - car.x, -90 * dt, 90 * dt);
  }
  const fixed = resolveCircle(G.world, car.x, car.y, car.r);
  car.x = fixed.x;
  car.y = fixed.y;
}

function nearestLaneY(y) {
  const step = BLOCK + ROAD;
  const i = Math.round((y - ROAD / 2) / step);
  return roadCenter(Math.max(0, Math.min(GRID, i)));
}

function nearestLaneX(x) {
  const step = BLOCK + ROAD;
  const i = Math.round((x - ROAD / 2) / step);
  return roadCenter(Math.max(0, Math.min(GRID, i)));
}

// The car directly ahead of `car` in its lane, if one is close.
export function carAhead(G, car) {
  let best = null;
  let bestD = 90;
  for (const other of G.cars) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const forward = Math.cos(car.angle) * dx + Math.sin(car.angle) * dy;
    if (forward < 0 || forward > 90) continue;
    const side = Math.abs(-Math.sin(car.angle) * dx + Math.cos(car.angle) * dy);
    if (side > 26) continue;
    if (forward < bestD) {
      bestD = forward;
      best = other;
    }
  }
  return best;
}

// Push overlapping cars apart (circle collision), with a thud and a
// little shake when the player is involved.
export function collideCars(G) {
  const cars = G.cars;
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = a.r + b.r - 4;
      if (d >= min || d === 0) continue;
      const push = (min - d) / 2;
      const nx = dx / d;
      const ny = dy / d;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      if (a === G.playerCar || b === G.playerCar) {
        const other = a === G.playerCar ? b : a;
        if (other.state === 'traffic' || other.state === 'parked') {
          other.speed = Math.max(other.speed, 40);
        }
        G.shake = Math.max(G.shake, 5);
        G.audio.thud();
        if (other.state === 'traffic') {
          G.playerCar.speed *= 0.55;
        }
      }
    }
  }
}

// Drive the player's car: arcade physics with building collision.
export function updatePlayerCar(G, dt) {
  const car = G.playerCar;
  if (!car) return;
  const input = G.input;
  // A staged screenshot scene can drive itself; the first manual
  // driving key hands the wheel back to the player.
  if (input.isDown('KeyW') || input.isDown('KeyS') || input.isDown('KeyA') || input.isDown('KeyD')
    || input.isDown('ArrowUp') || input.isDown('ArrowDown') || input.isDown('ArrowLeft') || input.isDown('ArrowRight')) {
    G.autoDrive = false;
  }
  const forward = input.isDown('KeyW') || input.isDown('ArrowUp') || G.autoDrive;
  const back = input.isDown('KeyS') || input.isDown('ArrowDown');
  const left = input.isDown('KeyA') || input.isDown('ArrowLeft');
  const right = input.isDown('KeyD') || input.isDown('ArrowRight');

  if (forward) car.speed += TUNE.carAccel * dt;
  else if (back) car.speed -= (car.speed > 0 ? TUNE.carBrake : TUNE.carAccel * 0.6) * dt;
  else {
    // Rolling resistance.
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 140 * dt);
  }
  car.speed = clamp(car.speed, -TUNE.carReverseMax, car.maxSpeed);

  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const driveDir = car.speed >= 0 ? 1 : -1;
  if (steer !== 0 && Math.abs(car.speed) > 12) {
    car.angle += steer * driveDir * TUNE.carTurn * dt * clamp(Math.abs(car.speed) / 160, 0.35, 1);
  }

  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const fixed = resolveCircle(G.world, car.x, car.y, car.r);
  if (fixed.x !== car.x || fixed.y !== car.y) {
    // Scraped a wall: lose speed, shake, small thud.
    if (Math.abs(car.speed) > 90) {
      G.shake = Math.max(G.shake, 4);
      G.audio.thud();
    }
    car.speed *= 0.45;
    car.x = fixed.x;
    car.y = fixed.y;
  }

  // The player rides inside the car.
  G.player.x = car.x;
  G.player.y = car.y;
  G.player.angle = car.angle;
  G.audio.engine(true, Math.abs(car.speed) / car.maxSpeed);
}

// The nearest car the player could steal, within reach.
export function nearestCar(G, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    if (car.state === 'player') continue;
    const d = dist(car.x, car.y, G.player.x, G.player.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}
