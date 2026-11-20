// Solmar Bay — tuning, palette and city geometry.
// A fictional coastal city. Every name, place and piece of art is original.

export const WORLD_W = 3150;
export const WORLD_H = 3400;
export const BEACH_Y = 3150; // sand begins here; the water from WATER_Y down
export const WATER_Y = 3270;
export const BLOCK = 210;
export const ROAD = 70;
export const N = 11; // blocks per side; streets are numbered 0..N

// Centre line of street i (i = 0..N). Streets form the road grid.
export const streetPos = (i) => ROAD / 2 + i * (BLOCK + ROAD);

// Top-left corner of block (i, j), with its size.
export const blockRect = (i, j) => ({
  x: ROAD + i * (BLOCK + ROAD),
  y: ROAD + j * (BLOCK + ROAD),
  w: BLOCK,
  h: BLOCK,
});

export const PALETTE = {
  grass: '#5d8a4a',
  grassDark: '#4c753d',
  sand: '#d9b380',
  water: '#2e6f8e',
  waterDeep: '#245a75',
  road: '#3b4048',
  roadLine: '#c8b25a',
  sidewalk: '#8d9299',
  crosswalk: '#d8d8d8',
  building: ['#c98a5e', '#8fa3b8', '#b56a6a', '#7d9b7a', '#a88bc0', '#d9a441', '#6a8caf', '#c47f4e'],
  roof: ['#7a5a44', '#5d6b7a', '#8a4f4f', '#5f705c', '#6f5a86', '#a87c2e', '#4f6480', '#96603a'],
  parkTree: ['#3e6b2f', '#4c7a35', '#5d8a3a'],
  windowLit: '#ffd98a',
  windowDark: '#2c3440',
};

export const TUNE = {
  // On foot
  walkSpeed: 210,
  runSpeed: 330,
  playerRadius: 13,
  playerHealth: 100,
  punchDamage: 30,
  punchRange: 34,
  punchArc: 1.1,
  shootCooldown: 0.22,
  bulletSpeed: 780,
  bulletDamage: 34,
  enemyHealth: 100,
  // Cars
  carAccel: 560,
  carReverseAccel: 340,
  carMaxSpeed: 540,
  carMaxReverse: 210,
  carBrake: 700,
  carDrag: 0.55,
  carSteer: 2.5,
  carRadius: 16,
  trafficSpeed: 150,
  trafficMax: 3,
  // Wanted
  starThresholds: [100, 250, 450, 700, 950],
  wantedMax: 1000,
  stealOccupied: 120,
  stealParked: 45,
  hitPed: 150,
  shootCrime: 60,
  killCop: 200,
  wantedDecay: 26,
  // Police
  copFootSpeed: 235,
  policeCarSpeed: 470,
  // Money
  startMoney: 50,
  bustFine: 100,
  collectibleValue: 50,
};

export const CAR_COLORS = [
  '#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#2c3e50', '#e67e22',
  '#9b59b6', '#1abc9c', '#7f8c8d', '#d35400', '#16a085', '#bdc3c7',
];
export const TAXI_COLOR = '#f7c948';
export const POLICE_COLOR = '#1f3a93';
export const SPORTS_COLOR = '#d7263d';

export const MISSION_REWARDS = [150, 250, 300, 500, 1000];
