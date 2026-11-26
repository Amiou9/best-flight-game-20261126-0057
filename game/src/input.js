// Keyboard and mouse input. Arrow keys (or A/D) bank and pitch, W/S work the
// throttle lever, the mouse steers toward where it points, Space is the air
// brake, Enter starts, P pauses and C switches chase / cockpit camera.
// One-shot presses are queued as bit flags and taken once by the loop.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_CAMERA = 4;

const ROLL_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD']);
const PITCH_KEYS = new Set(['ArrowUp', 'ArrowDown']);
const THROTTLE_KEYS = new Set(['KeyW', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const CAMERA = new Set(['KeyC']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let throttle = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseActive = false;
  let mouseTimer = 0;

  window.addEventListener('keydown', (event) => {
    if (ROLL_KEYS.has(event.code) || PITCH_KEYS.has(event.code) || THROTTLE_KEYS.has(event.code)) {
      keys.add(event.code);
      event.preventDefault();
      return;
    }
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
      event.preventDefault();
    } else if (CAMERA.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CAMERA;
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    mouseActive = true;
    mouseTimer = 2.5;
  });

  return {
    /** The control the flight model reads this frame. */
    control(dt) {
      if (keys.has('KeyW')) throttle = Math.min(1, throttle + dt * 0.55);
      if (keys.has('KeyS')) throttle = Math.max(0, throttle - dt * 0.55);
      let roll = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) roll -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) roll += 1;
      let pitch = 0;
      if (keys.has('ArrowUp')) pitch += 1;
      if (keys.has('ArrowDown')) pitch -= 1;
      // Mouse steering fades in while the mouse is moving and out after.
      if (mouseActive) {
        mouseTimer -= dt;
        if (mouseTimer <= 0) mouseActive = false;
      }
      if (mouseActive) {
        roll += Math.max(-1, Math.min(1, mouseX * 1.1));
        pitch += Math.max(-1, Math.min(1, -mouseY * 0.8));
      }
      return {
        pitch: Math.max(-1, Math.min(1, pitch)),
        roll: Math.max(-1, Math.min(1, roll)),
        throttle,
        brake: keys.has('Space'),
      };
    },
    setThrottle(value) {
      throttle = value;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
