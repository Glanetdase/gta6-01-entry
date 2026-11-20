// Solmar Bay — a small seeded PRNG and the helpers built on it.
// Every random choice in the world comes from one of these, so the
// city, the traffic and the screenshots are the same every run.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A random number in [min, max).
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// A random integer in [min, max] inclusive.
export function int(rng, min, max) {
  return Math.floor(range(rng, min, max + 1));
}

// One element of an array, picked uniformly.
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// A Fisher-Yates shuffle that returns a new array.
export function shuffle(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// Clamp a value into [min, max].
export function clamp(v, min, max) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

// Linear interpolation.
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Wrap an angle into [-PI, PI].
export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Turn `current` toward `target` by at most `step` radians.
export function turnToward(current, target, step) {
  const d = wrapAngle(target - current);
  if (Math.abs(d) <= step) return target;
  return current + Math.sign(d) * step;
}

// Euclidean distance between two points.
export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}
