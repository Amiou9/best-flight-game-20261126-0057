// A small seeded random generator (mulberry32) so the same ?seed= always
// builds the same clouds, palms and gusts, and screenshots are reproducible.
export function createRandom(seed) {
  let state = (seed >>> 0) || 1;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range(min, max) {
      return min + (max - min) * next();
    },
    pick(list) {
      return list[Math.floor(next() * list.length) % list.length];
    },
  };
}
