// Solmar Bay — cars: player physics, traffic AI, collisions.
// Traffic cars drive on road lanes and turn at intersections; the player's car
// is free physics with acceleration, steering, drag and a handbrake.

import {
  CAR_ACCEL, CAR_BRAKE, CAR_MAX_SPEED, CAR_REVERSE_MAX, CAR_TURN, CAR_DRAG,
  CAR_RADIUS, CAR_KINDS, PALETTE, PITCH, ROAD, GRID, WORLD, roadCenter,
} from './config.js';
import { clamp, angleDiff, dist, makeRng } from './random.js';
import { collideCircle, isRoad } from './world.js';

let nextCarId = 1;

export function makeCar(x, y, angle, kindIndex, color, opts = {}) {
  const kind = CAR_KINDS[kindIndex % CAR_KINDS.length];
  return {
    id: nextCarId++,
    x, y, angle, speed: 0,
    kindIndex, kind,
    color: color || PALETTE.car[kindIndex % PALETTE.car.length],
    isTaxi: !!opts.isTaxi,
    isCop: !!opts.isCop,
    isPlayer: !!opts.isPlayer,
    parked: !!opts.parked, // parked cars never move under traffic AI
    // Traffic AI state:
    axis: opts.axis || 'x',
    roadIdx: opts.roadIdx || 0,
    dir: opts.dir || 1,
    aiSpeed: opts.aiSpeed || 120,
    stuck: 0,
    spark: 0,
  };
}

export function spawnTrafficCar(rng, x, y, count, cars) {
  // Spawn on a road near (x, y): pick a random nearby road and lane.
  for (let tries = 0; tries < 12; tries++) {
    const axis = rng.chance(0.5) ? 'x' : 'y';
    const roadIdx = Math.max(0, Math.min(GRID, Math.round((rng.range(-500, 500) + (axis === 'x' ? x : y) - ROAD / 2) / PITCH)));
    const along = rng.range(200, WORLD - 200);
    const cx = axis === 'x' ? along : roadCenter(roadIdx) + (rng.chance(0.5) ? 20 : -20);
    const cy = axis === 'x' ? roadCenter(roadIdx) + (rng.chance(0.5) ? 20 : -20) : along;
    if (dist(cx, cy, x, y) < 260) continue;
    const dir = rng.chance(0.5) ? 1 : -1;
    const angle = axis === 'x' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    const car = makeCar(cx, cy, angle, rng.int(0, CAR_KINDS.length - 1), null, {
      axis, roadIdx, dir, aiSpeed: rng.range(95, 150),
    });
    car.speed = car.aiSpeed;
    cars.push(car);
    return car;
  }
  return null;
}

export function spawnParkedCars(rng, world, cars, count) {
  let made = 0;
  for (let tries = 0; tries < count * 8 && made < count; tries++) {
    const axis = rng.chance(0.5) ? 'x' : 'y';
    const roadIdx = rng.int(0, GRID);
    const along = rng.range(120, WORLD - 120);
    const edge = rng.chance(0.5) ? 34 : -34;
    const cx = axis === 'x' ? along : roadCenter(roadIdx) + edge;
    const cy = axis === 'x' ? roadCenter(roadIdx) + edge : along;
    if (dist(cx, cy, 1800, 1800) < 200) continue;
    let ok = true;
    for (const c of cars) if (dist(cx, cy, c.x, c.y) < 70) { ok = false; break; }
    if (!ok) continue;
    const angle = axis === 'x' ? (edge > 0 ? 0 : Math.PI) : (edge > 0 ? Math.PI / 2 : -Math.PI / 2);
    const car = makeCar(cx, cy, angle, rng.int(0, CAR_KINDS.length - 1), null, {
      axis, roadIdx, dir: 1, aiSpeed: 0, parked: true,
    });
    cars.push(car);
    made++;
  }
  return made;
}

// Drive the player's car with input axes: ax = steering (-1..1), ay = throttle (-1..1).
export function drivePlayerCar(car, ax, ay, handbrake, dt) {
  const top = CAR_MAX_SPEED * car.kind.top;
  const accel = CAR_ACCEL * car.kind.accel;
  if (ay > 0) car.speed += accel * ay * dt;
  else if (ay < 0) car.speed -= (car.speed > 0 ? CAR_BRAKE : accel * 0.6) * dt;
  else car.speed -= car.speed * CAR_DRAG * dt;
  if (handbrake) car.speed -= car.speed * 2.4 * dt;
  car.speed = clamp(car.speed, -CAR_REVERSE_MAX, top);
  if (Math.abs(car.speed) > 4) {
    const steer = ax * CAR_TURN * dt * clamp(Math.abs(car.speed) / 140, 0.25, 1);
    car.angle += steer * (car.speed >= 0 ? 1 : -1);
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 24, WORLD - 24);
  car.y = clamp(car.y, 24, WORLD - 24);
}

// One traffic car step: follow its road, turn at intersections, slow for cars ahead.
export function stepTrafficCar(car, cars, rng, dt) {
  if (car.isPlayer || car.isCop) return;
  const laneOff = car.dir > 0 ? 20 : -20;
  // Where the car is along its road:
  let along = car.axis === 'x' ? car.x : car.y;
  const centre = roadCenter(car.roadIdx);
  // Slow down if a car is close ahead.
  let target = car.aiSpeed;
  for (const other of cars) {
    if (other === car) continue;
    const d = dist(car.x, car.y, other.x, other.y);
    if (d < 64) {
      const ahead = car.axis === 'x'
        ? (other.x - car.x) * car.dir > 0 && Math.abs(other.y - car.y) < 34
        : (other.y - car.y) * car.dir > 0 && Math.abs(other.x - car.x) < 34;
      if (ahead) target = 0;
    }
  }
  car.speed += (target - car.speed) * Math.min(1, dt * 2);
  along += car.speed * car.dir * dt;
  // At an intersection (near a cross-road centre), maybe turn.
  const cross = Math.round((along - ROAD / 2) / PITCH);
  const crossCenter = roadCenter(cross);
  if (cross >= 0 && cross <= GRID && Math.abs(along - crossCenter) < 6 && car.speed > 0) {
    if (rng.chance(0.32)) {
      // Turn onto the crossing road.
      const newAxis = car.axis === 'x' ? 'y' : 'x';
      const newDir = rng.chance(0.5) ? 1 : -1;
      car.axis = newAxis;
      car.roadIdx = cross;
      car.dir = newDir;
      car.angle = newAxis === 'x' ? (newDir > 0 ? 0 : Math.PI) : (newDir > 0 ? Math.PI / 2 : -Math.PI / 2);
      along = crossCenter;
    } else if (along > WORLD - 100 || along < 100) {
      car.dir *= -1;
      car.angle += Math.PI;
    }
  }
  // Wrap around the world edges by turning around.
  if (along > WORLD - 60) { car.dir = -1; car.angle = car.axis === 'x' ? Math.PI : -Math.PI / 2; }
  if (along < 60) { car.dir = 1; car.angle = car.axis === 'x' ? 0 : Math.PI / 2; }
  if (car.axis === 'x') {
    car.x = clamp(along, 40, WORLD - 40);
    car.y = centre + laneOff;
    car.angle = car.dir > 0 ? 0 : Math.PI;
  } else {
    car.y = clamp(along, 40, WORLD - 40);
    car.x = centre + laneOff;
    car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
}

// Resolve car-vs-car overlap: push apart and spark.
export function resolveCarCollisions(cars, onCrash) {
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      const d = dist(a.x, a.y, b.x, b.y);
      const min = 44;
      if (d < min && d > 0.01) {
        const nx = (b.x - a.x) / d;
        const ny = (b.y - a.y) / d;
        const push = (min - d) / 2;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        const rel = Math.abs(a.speed - b.speed);
        if (rel > 120) {
          a.spark = 0.3; b.spark = 0.3;
          if (a.isPlayer || b.isPlayer) onCrash && onCrash(rel);
          a.speed *= 0.55; b.speed *= 0.55;
        }
      }
    }
  }
}

// Keep cars out of buildings (traffic cars stay on roads; the player's car can
// scrape a building and slow down).
export function collideCarsWithWorld(world, cars) {
  for (const car of cars) {
    const fixed = collideCircle(world, car.x, car.y, CAR_RADIUS);
    if (fixed.x !== car.x || fixed.y !== car.y) {
      car.x = fixed.x; car.y = fixed.y;
      if (car.isPlayer) car.speed *= 0.5;
      else if (car.isCop) car.speed *= 0.7;
      else { car.dir *= -1; car.angle += Math.PI; }
    }
  }
}

export function carSpeedMph(car) { return Math.abs(car.speed) * 0.09; }
