// Boot and the one loop: input is read every frame, the flight model advances
// in fixed 1/60 s steps, and the scene, camera and HUD paint what is there.
// The game moves between four screens: title, play, paused and over.
//
// ?seed=N fixes the clouds and palms. ?shot=start|play|ring|end (with
// &seed=N) stages that scene instead of running the loop, paints it until the
// camera settles and sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createFlight, EVENT_CRASHED, EVENT_LANDED, EVENT_RING } from './flight.js';
import { createScene } from './scene.js';
import { createTerrain } from './terrain.js';
import { createAircraft } from './aircraft.js';
import { createRings } from './rings.js';
import { createMission } from './missions.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { ACTION_CAMERA, ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createCameraRig } from './camera.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const view = createScene(canvas);
const terrain = createTerrain(random);
view.scene.add(terrain.group);
const rings = createRings();
view.scene.add(rings.group);
const aircraft = createAircraft();
view.scene.add(aircraft.group);
const flight = createFlight();
const mission = createMission();
const hud = createHud();
const audio = createAudio();
const input = createInput(canvas);
const rig = createCameraRig(view.camera);

let best = mission.readBest();
let screen = 'title';
let elapsed = 0;
let titleAngle = 0.55;

/** The title camera: a slow 3/4 orbit around the parked plane on the strip. */
function positionTitleCamera(dt) {
  titleAngle += dt * 0.12;
  const state = flight.state;
  view.camera.position.set(
    state.x + Math.sin(titleAngle) * 30,
    state.y + 9,
    state.z + Math.cos(titleAngle) * 30,
  );
  view.camera.lookAt(state.x, state.y + 1, state.z);
  view.camera.fov = 58;
  view.camera.updateProjectionMatrix();
}

function announce(message) {
  status.textContent = message;
}

/** One painted frame: sync the meshes, move the camera, refresh the HUD. */
function paint(dt, now) {
  const state = flight.state;
  aircraft.sync(state);
  rings.update(state.ringsPassed, now / 1000);
  view.followSun(state.x, state.z);
  for (const cloud of terrain.clouds) {
    cloud.position.x += dt * 1.6;
    if (cloud.position.x > 700) cloud.position.x = -700;
  }
  const smoke = terrain.group.getObjectByName('volcano-smoke');
  if (smoke) smoke.scale.setScalar(1 + Math.sin(now / 700) * 0.12);
  const beam = terrain.group.getObjectByName('lighthouse-beam');
  if (beam) beam.rotation.y += dt * 0.6;
  const lamp = terrain.group.getObjectByName('lighthouse-lamp');
  if (lamp) lamp.material.color.setHex(Math.floor(now / 500) % 2 ? 0xffe27a : 0xff9a3c);
  hud.setObjective(mission.objective(state));
  hud.update(state, screen, rig.mode, now / 1000);
  view.render();
}

function endGame(landed) {
  screen = 'over';
  const state = flight.state;
  const summary = mission.summary(state, elapsed);
  let title = landed ? 'SORTIE COMPLETE' : 'SORTIE LOST';
  if (landed) state.score += summary.timeBonus;
  if (state.score > best) {
    best = state.score;
    mission.saveBest(best);
    title += ' — NEW BEST';
  }
  hud.showEnd(title, [...summary.lines, state.message], state.score, best);
  announce(`${title}. Score ${state.score}. Best ${best}. Press Enter to fly again.`);
  audio.setEngine(0, 0, false);
}

function startGame() {
  flight.reset();
  elapsed = 0;
  screen = 'play';
  input.setThrottle(0.6);
  audio.start();
  announce('Flying. Fly the gold rings, then land on runway 07.');
}

function runShot(name) {
  const staged = stageShot(name, flight);
  screen = staged.screen;
  if (screen === 'over') {
    const state = flight.state;
    const summary = mission.summary(state, state.time);
    const landed = state.status === 'landed';
    if (landed) state.score += summary.timeBonus;
    hud.showEnd(
      landed ? 'SORTIE COMPLETE' : 'SORTIE LOST',
      [...summary.lines, state.message],
      state.score,
      Math.max(best, state.score),
    );
  }
  // Settle the camera with pure maths first (no rendering), then paint a
  // few real frames before the screenshot. The title shot uses the orbit
  // camera; flight shots use the chase camera — except the ring shot, which
  // switches to the cockpit: from the chase camera the next ring sits
  // exactly behind the plane, but from the cockpit it fills the view ahead.
  if (name === 'ring') rig.toggleMode();
  if (screen === 'title') {
    titleAngle = 0.55;
    for (let i = 0; i < 120; i += 1) positionTitleCamera(0);
  } else {
    for (let i = 0; i < 120; i += 1) rig.update(flight.state, 1 / 60, i / 60);
  }
  let painted = 0;
  function paintShot(now) {
    if (screen === 'title') positionTitleCamera(1 / 60);
    else rig.update(flight.state, 1 / 60, now / 1000);
    paint(1 / 60, now);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paintShot);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paintShot);
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();
  let titleTime = 0;

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === 'title' || screen === 'over')) startGame();
    else if (actions & ACTION_PAUSE && screen === 'play') {
      screen = 'paused';
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === 'paused') {
      screen = 'play';
      announce('Flying.');
    }
    if (actions & ACTION_CAMERA && screen === 'play') {
      const mode = rig.toggleMode();
      announce(mode === 'cockpit' ? 'Cockpit view.' : 'Chase view.');
    }
  }

  function stepGame(dt) {
    const control = input.control(dt);
    const events = flight.step(control);
    if (events & EVENT_RING) {
      audio.ring();
      rig.addTrauma(0.18);
      announce(flight.state.message);
    }
    if (events & EVENT_LANDED) {
      audio.thud(false);
      endGame(true);
    } else if (events & EVENT_CRASHED) {
      audio.thud(true);
      rig.addTrauma(1);
      endGame(false);
    }
    elapsed = flight.state.time;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === 'title') {
      titleTime += dt;
      positionTitleCamera(dt);
      paint(dt, now);
      audio.setEngine(0, 0, false);
      return;
    }
    if (screen === 'play') {
      accumulator += dt;
      while (accumulator >= STEP) {
        stepGame(STEP);
        accumulator -= STEP;
        if (screen !== 'play') break;
      }
      rig.update(flight.state, dt, now / 1000);
      audio.setEngine(flight.state.throttle, flight.state.speed, true);
    }
    if (screen === 'paused' || screen === 'over') {
      audio.setEngine(0, 0, false);
    }
    paint(dt, now);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') {
      screen = 'paused';
      announce('Paused.');
    }
  });

  announce('Nusantara Sky Run. Press Enter or click to fly.');
  requestAnimationFrame(frame);
}

window.__flightState = flight.state;

if (shot) runShot(shot);
else runGame();
