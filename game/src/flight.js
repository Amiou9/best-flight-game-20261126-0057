// The arcade flight model: pure numbers, no three.js, so the autopilot in
// shots.js can fly the exact same physics a player flies. Heading 0 points
// north (-Z). Roll banks the turn, pitch climbs and dives, throttle sets the
// target speed, and lift falls away below stall speed.
import { PLANE, RING_COURSE, RING_RADIUS, RUNWAY, START } from './config.js';
import { groundHeight, overRunway, plateauFactor } from './ground.js';
import { STEP } from './config.js';

export const EVENT_NONE = 0;
export const EVENT_RING = 1;
export const EVENT_LANDED = 2;
export const EVENT_CRASHED = 4;
export const EVENT_FUEL_EMPTY = 8;

export function createFlight() {
  const state = freshState();
  function freshState() {
    return {
      x: START.x,
      y: START.y,
      z: START.z,
      heading: START.heading,
      pitch: 0,
      roll: 0,
      speed: START.speed,
      throttle: START.throttle,
      fuel: PLANE.startFuel,
      damage: 0,
      score: 0,
      ringsPassed: 0,
      time: 0,
      verticalSpeed: 0,
      status: 'ready',
      message: '',
    };
  }

  function reset() {
    Object.assign(state, freshState());
  }

  function nextRing() {
    return state.ringsPassed < RING_COURSE.length
      ? RING_COURSE[state.ringsPassed]
      : null;
  }

  function forward() {
    return { x: Math.sin(state.heading), z: -Math.cos(state.heading) };
  }

  /**
   * One fixed step. `control` is { pitch: -1..1, roll: -1..1, throttle: 0..1,
   * brake: boolean }. Returns an EVENT_* bitmask.
   */
  function step(control) {
    if (state.status === 'landed' || state.status === 'crashed') return EVENT_NONE;
    const dt = STEP;
    state.time += dt;

    // Throttle eases toward the lever; speed chases the throttle's target.
    const targetThrottle = Math.min(1, Math.max(0, control.throttle));
    state.throttle += (targetThrottle - state.throttle) * Math.min(1, dt * 2.2);
    const targetSpeed = PLANE.minSpeed + state.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
    const limitedSpeed = control.brake ? Math.min(targetSpeed, 22) : targetSpeed;
    const accel = control.brake ? 26 : 9;
    state.speed += Math.min(Math.abs(limitedSpeed - state.speed), accel * dt) * Math.sign(limitedSpeed - state.speed);

    // Roll and pitch ease toward the stick; banking turns the heading.
    const targetRoll = control.roll * 0.95;
    state.roll += (targetRoll - state.roll) * Math.min(1, dt * 3.2);
    const targetPitch = control.pitch * 0.42;
    state.pitch += (targetPitch - state.pitch) * Math.min(1, dt * 2.6);
    const turnRate = -state.roll * PLANE.turnRate * (0.35 + 0.65 * (state.speed / PLANE.cruiseSpeed));
    state.heading += turnRate * dt;

    // Lift: climb follows pitch while there is airspeed; below stall speed
    // the nose drops and the plane sinks — except while she is still on her
    // wheels rolling down the strip, where lift simply has not arrived yet.
    // The wheels case must only cover a stalled roll: if it also clamped a
    // flying plane's descent, she could never sink the last metre to the
    // runway and would float over the strip forever.
    const groundBelow = groundHeight(state.x, state.z);
    const onWheels = state.y <= groundBelow + 1.6;
    const stalled = state.speed < PLANE.stallSpeed;
    let climb;
    if (onWheels && stalled) {
      climb = Math.max(0, Math.sin(state.pitch) * state.speed * 0.85);
    } else if (stalled) {
      climb = -3.0;
    } else {
      climb = Math.sin(state.pitch) * state.speed * 0.85;
    }
    const fwd = forward();
    state.x += fwd.x * state.speed * Math.cos(state.pitch) * dt;
    state.z += fwd.z * state.speed * Math.cos(state.pitch) * dt;
    state.y += climb * dt;
    state.verticalSpeed = climb;

    // Fuel burns with throttle; running dry ends the sortie in the air.
    state.fuel -= PLANE.fuelBurn * (0.35 + state.throttle) * dt;
    if (state.fuel <= 0) {
      state.fuel = 0;
      state.status = 'crashed';
      state.message = 'OUT OF FUEL — the Elang Laut ditched in the sea.';
      return EVENT_FUEL_EMPTY | EVENT_CRASHED;
    }

    // Ring pass: close to the centre of the next ring counts.
    const ring = nextRing();
    if (ring) {
      const d = Math.hypot(state.x - ring.x, state.y - ring.y, state.z - ring.z);
      if (d < RING_RADIUS) {
        state.ringsPassed += 1;
        state.score += 100;
        state.fuel = Math.min(100, state.fuel + PLANE.fuelPerRing);
        state.message = `RING ${state.ringsPassed} OF ${RING_COURSE.length} — +100, fuel topped up`;
        return EVENT_RING;
      }
    }

    // Ground contact: a gentle touchdown on the runway lands; anything
    // else — sea, hillside, a hard slam — is a crash.
    const ground = groundHeight(state.x, state.z);
    if (state.y <= ground + 1.1) {
      state.y = ground + 1.1;
      const onStrip = overRunway(state.x, state.z) || plateauFactor(state.x, state.z) > 0.5;
      const gentle = state.speed < 34 && Math.abs(state.verticalSpeed) < 4.0 && Math.abs(state.roll) < 0.35;
      const aligned = Math.abs(Math.sin(state.heading - RUNWAY.heading)) < 0.45;
      if (onStrip && gentle && aligned && state.ringsPassed >= RING_COURSE.length) {
        state.status = 'landed';
        state.score += 250 + Math.round(state.fuel) * 2;
        state.message = 'TOUCHDOWN ON RUNWAY 07 — sortie complete!';
        return EVENT_LANDED;
      }
      if (onStrip && gentle && aligned) {
        if (state.speed < 25) {
          // Still on the take-off roll: stay on the strip, keep accelerating.
          state.y = ground + 1.1;
          return EVENT_NONE;
        }
        // Touch-and-go on the strip before the rings are done: bounce back up.
        state.y = ground + 1.4;
        state.speed *= 0.94;
        return EVENT_NONE;
      }
      state.status = 'crashed';
      state.damage = 100;
      state.message = overRunway(state.x, state.z)
        ? 'HARD LANDING ON THE STRIP — come in slower and flatter.'
        : ground > 0.4
          ? 'CRASHED INTO THE HILLSIDE — watch your altitude over land.'
          : 'DITCHED IN THE SEA — keep her above the waves.';
      return EVENT_CRASHED;
    }

    // Soft world edge: steer back in with a message rather than a wall.
    if (Math.hypot(state.x, state.z + 450) > 950) {
      state.message = 'Turn back — you are leaving the Kepulauan Elang.';
    }
    return EVENT_NONE;
  }

  return { state, reset, step, nextRing, forward };
}
