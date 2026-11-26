// The screenshot scenes behind ?shot=start|play|ring|end. Each one flies the
// real flight model forward from a fresh sortie with a simple autopilot —
// steer toward the next ring, hold its altitude, throttle back for the
// landing — so the frame is what a real flight looks like and the same seed
// always gives the same frame.
import { RING_COURSE, RUNWAY, STEP } from './config.js';
import { groundHeight } from './ground.js';

function wrapAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

/** Roll that turns toward `desiredHeading` at a rate proportional to the
 * heading error — so the turn dies away as the error closes, instead of
 * saturating the bank and orbiting the target forever. */
function steerToHeading(state, desiredHeading) {
  const error = wrapAngle(desiredHeading - state.heading);
  const turnFactor = 0.85 * (0.35 + 0.65 * (state.speed / 46));
  const desiredTurnRate = Math.max(-0.7, Math.min(0.7, error * 1.1));
  return Math.max(-1, Math.min(1, -desiredTurnRate / turnFactor));
}

/** Steering toward a point at a target altitude, from the flight state.
 * Full-bank steering: right for chasing rings far apart at speed. */
function autopilotControl(state, targetX, targetY, targetZ, throttle) {
  const dx = targetX - state.x;
  const dz = targetZ - state.z;
  const desiredHeading = Math.atan2(dx, -dz);
  const headingError = wrapAngle(desiredHeading - state.heading);
  const altitudeError = targetY - state.y;
  return {
    roll: Math.max(-1, Math.min(1, -headingError * 1.6)),
    pitch: Math.max(-1, Math.min(1, altitudeError * 0.06 - state.verticalSpeed * 0.09)),
    throttle,
    brake: false,
  };
}

/** The same steering with the proportional turn from steerToHeading: for
 * the slow fix leg, where full bank would orbit the fix point forever. */
function gentleControl(state, targetX, targetY, targetZ, throttle) {
  const dx = targetX - state.x;
  const dz = targetZ - state.z;
  const desiredHeading = Math.atan2(dx, -dz);
  const altitudeError = targetY - state.y;
  return {
    roll: steerToHeading(state, desiredHeading),
    pitch: Math.max(-1, Math.min(1, altitudeError * 0.06 - state.verticalSpeed * 0.09)),
    throttle,
    brake: false,
  };
}

/** The flight home: fly the runway axis, not a point. A point target makes
 * a fast plane orbit it forever; a line target (heading south down the strip,
 * correcting the lateral offset) converges. Altitude follows the ground
 * 12–20 m below the plane, so it climbs over the volcano instead of into
 * it, then settles onto the glide slope for the last 200 m. */
let goingAround = false;

function returnControl(state) {
  if (state.z > 80) goingAround = true;
  if (state.z < -200) goingAround = false;
  if (goingAround) {
    // Overshot to the south: go around, back north for another pass.
    return autopilotControl(state, 0, 40, -300, 0.4);
  }
  const ground = groundHeight(state.x, state.z);
  const desiredHeading = Math.PI + Math.max(-0.7, Math.min(0.7, state.x * 0.015));
  const floor = state.z > -200 ? 0.9 : 12;
  const glide = Math.max(floor, Math.min(20, (-100 - state.z) * 0.09));
  // Hold altitude until the plane is on the centreline: descending while
  // still 100 m off-line puts it down on the grass past the strip's end.
  const targetY = ground + (Math.abs(state.x) < 30 ? glide : Math.max(20, glide));
  const slopeRate = state.z < -100 ? 0.09 * state.speed : 0;
  const desiredVs = Math.max(-5, Math.min(2, (targetY - state.y) * 0.5 - slopeRate));
  // Pitch holds the desired descent rate: a feedforward term for the pitch
  // that descent needs, plus a correction on the rate error. Without the
  // feedforward the loop settles a third short of the rate it asks for, and
  // the plane floats over the strip forever.
  const pitchFeedforward = desiredVs / Math.max(8, state.speed * 0.85 * 0.42);
  const pitch = Math.max(-0.8, Math.min(0.8, pitchFeedforward + (desiredVs - state.verticalSpeed) * 0.3));
  return {
    roll: steerToHeading(state, desiredHeading),
    pitch,
    throttle: state.z < -400 ? 0.4 : 0.22,
    brake: state.z > -180 && state.speed > 24,
  };
}

function controlFor(flight) {
  const state = flight.state;
  const ring = flight.nextRing();
  if (ring) {
    return autopilotControl(state, ring.x, ring.y, ring.z, 0.72);
  }
  if (state.y < 62 && state.z < -500) {
    // Rings done, still out by the far rings: climb to 65 m first — above
    // the volcano's western slope — while turning toward (80, -480), east of
    // the volcano, so the turn home never sweeps the plane across the
    // volcano's western slope at ring altitude. (Only out here: once the
    // plane is homeward, the return profile owns the descent and must not be
    // interrupted by a re-climb.)
    return autopilotControl(state, 80, 65, -480, 0.5);
  }
  return returnControl(state);
}

/** Fly the sortie forward until `stopWhen(state)` is true or time runs out. */
function flyUntil(flight, stopWhen, maxSeconds) {
  const steps = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    flight.step(controlFor(flight));
    if (stopWhen(flight.state)) break;
    if (flight.state.status === 'landed' || flight.state.status === 'crashed') break;
  }
}

/**
 * Set `flight` to the named scene (start, play, ring or end; any other name
 * is start) and return the screen to draw over it.
 */
export function stageShot(name, flight) {
  flight.reset();
  if (name === 'play') {
    flyUntil(flight, (state) => state.time >= 26, 30);
    flight.state.status = 'flying';
    return { screen: 'play' };
  }
  if (name === 'ring') {
    const target = RING_COURSE[2];
    flyUntil(
      flight,
      (state) => Math.hypot(state.x - target.x, state.y - target.y, state.z - target.z) < 65,
      90,
    );
    flight.state.status = 'flying';
    return { screen: 'play' };
  }
  if (name === 'end') {
    flyUntil(flight, (state) => state.status === 'landed', 600);
    return { screen: 'over' };
  }
  // start: parked on the strip, engine off, title over the runway.
  flight.state.status = 'ready';
  return { screen: 'title' };
}
