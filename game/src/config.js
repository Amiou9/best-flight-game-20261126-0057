// Every tuning number, colour and island in one place. The world is a fixed
// Indonesian island chain (the "Kepulauan Elang" archipelago) so the terrain
// is recognisable from the air: a volcano, a lighthouse rock, palm islands and
// one flat runway island, Pulau Landasan, where every sortie starts and ends.
export const STEP = 1 / 60;

export const WORLD = {
  seaLevel: 0,
  worldRadius: 900,
  fogNear: 220,
  fogFar: 820,
};

export const PLANE = {
  cruiseSpeed: 46,
  minSpeed: 17,
  maxSpeed: 78,
  climbRate: 9,
  turnRate: 0.85,
  pitchRate: 0.55,
  rollRate: 2.4,
  stallSpeed: 19,
  fuelBurn: 0.55,
  fuelPerRing: 9,
  startFuel: 100,
};

export const RUNWAY = {
  // Pulau Landasan: flat strip along the Z axis, heading north (-Z).
  x: 0,
  z: -40,
  length: 190,
  width: 16,
  height: 2.2,
  heading: 0,
};

export const START = {
  x: 0,
  y: 3.4,
  z: 28,
  heading: 0,
  speed: 0,
  throttle: 0,
};

// Islands: x, z, radius, height, kind. Kinds: palm, volcano, lighthouse, runway, hill.
export const ISLANDS = [
  { x: 0, z: -40, radius: 95, height: 2.2, kind: 'runway' },
  { x: -190, z: -260, radius: 110, height: 26, kind: 'palm' },
  { x: 210, z: -330, radius: 130, height: 34, kind: 'palm' },
  { x: -60, z: -520, radius: 150, height: 58, kind: 'volcano' },
  { x: 260, z: -560, radius: 80, height: 18, kind: 'lighthouse' },
  { x: -300, z: -640, radius: 120, height: 30, kind: 'palm' },
  { x: 90, z: -760, radius: 140, height: 40, kind: 'hill' },
  { x: -180, z: -860, radius: 110, height: 24, kind: 'palm' },
  { x: 330, z: -180, radius: 90, height: 22, kind: 'hill' },
  { x: -340, z: -120, radius: 100, height: 20, kind: 'palm' },
];

// The ring course: each ring's x, z and altitude. It weaves the islands from
// Pulau Landasan out to the volcano and back to the runway for landing.
export const RING_COURSE = [
  { x: 0, z: -190, y: 34 },
  { x: -120, z: -320, y: 42 },
  { x: 120, z: -430, y: 48 },
  { x: 30, z: -560, y: 70 },
  { x: 190, z: -600, y: 44 },
  { x: 40, z: -720, y: 48 },
];

export const RING_RADIUS = 10;

export const MISSION = {
  name: 'SORTIE 1 — RING RUN',
  brief: 'Fly all 6 golden rings over the Kepulauan Elang, then land back on runway 07 at Pulau Landasan. Rings refill fuel. Gentle touchdown wins.',
  ringPoints: 100,
  landingPoints: 250,
  fuelBonusPerUnit: 2,
  timeParSeconds: 150,
};

export const PALETTE = {
  skyTop: 0x2f6fd0,
  skyHorizon: 0xbfd9ee,
  sea: 0x1d6f9e,
  seaDeep: 0x14557e,
  sand: 0xe8d49a,
  grass: 0x4d9e4a,
  grassDark: 0x2f7a33,
  rock: 0x8a7a66,
  volcano: 0x5d4a3a,
  lava: 0xff5a1f,
  planeWhite: 0xf4f1e8,
  planeRed: 0xd21f2b,
  planeGold: 0xf2b705,
  ringGold: 0xffc21c,
  runway: 0x3a3f46,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'nusantara-sky-run.best';
