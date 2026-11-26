// The sortie: objectives, the running message line and the end-of-sortie
// summary. One sortie, three acts — take off, fly the rings, land — so the
// score is always a decision about fuel, speed and how gently you land.
import { BEST_KEY, MISSION, RING_COURSE } from './config.js';

export function createMission() {
  function objective(state) {
    if (state.status === 'landed') return 'SORTIE COMPLETE — parked on runway 07.';
    if (state.status === 'crashed') return state.message;
    if (state.ringsPassed >= RING_COURSE.length) {
      return 'ALL RINGS FLOWN — land on runway 07 at Pulau Landasan (slow, level, on the strip).';
    }
    const next = state.ringsPassed + 1;
    return `RING ${next} OF ${RING_COURSE.length} — follow the gold pillar, then land on runway 07.`;
  }

  function summary(state, elapsedSeconds) {
    const timeBonus = Math.max(0, Math.round((MISSION.timeParSeconds - elapsedSeconds) * 2));
    const lines = [
      `Rings flown: ${state.ringsPassed} / ${RING_COURSE.length}`,
      `Fuel left: ${Math.round(state.fuel)}%`,
      `Time: ${Math.floor(elapsedSeconds / 60)}:${String(Math.floor(elapsedSeconds % 60)).padStart(2, '0')} (par ${Math.floor(MISSION.timeParSeconds / 60)}:${String(MISSION.timeParSeconds % 60).padStart(2, '0')})`,
      `Time bonus: +${timeBonus}`,
    ];
    return { lines, timeBonus };
  }

  function readBest() {
    try {
      return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      window.localStorage.setItem(BEST_KEY, String(value));
    } catch {
      // Storage can be off: the best score then lasts this visit only.
    }
  }

  return { name: MISSION.name, brief: MISSION.brief, objective, summary, readBest, saveBest };
}
