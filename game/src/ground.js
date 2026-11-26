// The analytic ground: the one height function the flight model, the
// terrain meshes and the ring course all agree on. Sea is 0; each island is
// a smooth bump, except Pulau Landasan, which is a flat runway plateau.
import { ISLANDS, RUNWAY } from './config.js';

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Height of the ground (or sea, 0) at world x, z. */
export function groundHeight(x, z) {
  // The runway plateau wins over the island bump beneath it.
  const dx = Math.abs(x - RUNWAY.x);
  const dz = Math.abs(z - RUNWAY.z);
  if (dx < RUNWAY.width / 2 + 26 && dz < RUNWAY.length / 2 + 26) {
    const edgeX = smoothstep(RUNWAY.width / 2 + 26, RUNWAY.width / 2 + 6, dx);
    const edgeZ = smoothstep(RUNWAY.length / 2 + 26, RUNWAY.length / 2 + 6, dz);
    const plateau = Math.min(edgeX, edgeZ);
    if (plateau > 0) return RUNWAY.height * plateau;
  }
  let height = 0;
  for (const island of ISLANDS) {
    if (island.kind === 'runway') continue;
    const dist = Math.hypot(x - island.x, z - island.z) / island.radius;
    if (dist >= 1) continue;
    const fall = 1 - dist * dist;
    height = Math.max(height, island.height * fall * fall);
  }
  return height;
}

/** How flat the runway plateau is under x, z (0 = off the island, 1 = fully flat). */
export function plateauFactor(x, z) {
  const dx = Math.abs(x - RUNWAY.x);
  const dz = Math.abs(z - RUNWAY.z);
  if (dx >= RUNWAY.width / 2 + 26 || dz >= RUNWAY.length / 2 + 26) return 0;
  const edgeX = smoothstep(RUNWAY.width / 2 + 26, RUNWAY.width / 2 + 6, dx);
  const edgeZ = smoothstep(RUNWAY.length / 2 + 26, RUNWAY.length / 2 + 6, dz);
  return Math.min(edgeX, edgeZ);
}

/** True when x, z is over the runway strip itself (for landing checks). */
export function overRunway(x, z) {
  return (
    Math.abs(x - RUNWAY.x) < RUNWAY.width / 2 + 4 &&
    Math.abs(z - RUNWAY.z) < RUNWAY.length / 2
  );
}

/** True when the point is over dry land (any island above the sea). */
export function overLand(x, z) {
  return groundHeight(x, z) > 0.4;
}
