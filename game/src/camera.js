// The chase camera (and the cockpit view): it trails the plane smoothly,
// never snaps, widens its field of view with speed, and takes a trauma-based
// shake on hard events — the shake moves only the camera, never the plane.
export function createCameraRig(camera) {
  let trauma = 0;
  let shakeTime = 0;
  let mode = 'chase';
  const chasePos = { x: 0, y: 8, z: 30 };
  const lookAt = { x: 0, y: 4, z: -20 };

  function addTrauma(amount) {
    trauma = Math.min(1, trauma + amount);
  }

  function toggleMode() {
    mode = mode === 'chase' ? 'cockpit' : 'chase';
    return mode;
  }

  function update(flightState, dt, time) {
    const fwdX = Math.sin(flightState.heading);
    const fwdZ = -Math.cos(flightState.heading);
    let targetX;
    let targetY;
    let targetZ;
    let lookX;
    let lookY;
    let lookZ;
    if (mode === 'cockpit') {
      // Perched above the canopy, looking forward over the red nose: the
      // nose and the wingtips frame the bottom of the view, and the sky,
      // the sea and the next ring fill the rest. (Any lower and the nose
      // cone fills the frame; any further forward and the camera sits in
      // the prop disc.)
      targetX = flightState.x + fwdX * 1.6;
      targetY = flightState.y + 2.35;
      targetZ = flightState.z + fwdZ * 1.6;
      lookX = flightState.x + fwdX * 60;
      lookY = flightState.y + Math.sin(flightState.pitch) * 40;
      lookZ = flightState.z + fwdZ * 60;
      camera.fov = 68;
    } else {
      const behind = 15.5;
      const above = 5.2;
      targetX = flightState.x - fwdX * behind;
      targetY = flightState.y + above;
      targetZ = flightState.z - fwdZ * behind;
      lookX = flightState.x + fwdX * 24;
      lookY = flightState.y + 1.5;
      lookZ = flightState.z + fwdZ * 24;
      camera.fov = 58 + Math.min(14, flightState.speed * 0.16);
    }
    const ease = Math.min(1, dt * (mode === 'cockpit' ? 18 : 5.5));
    chasePos.x += (targetX - chasePos.x) * ease;
    chasePos.y += (targetY - chasePos.y) * ease;
    chasePos.z += (targetZ - chasePos.z) * ease;
    lookAt.x += (lookX - lookAt.x) * Math.min(1, dt * 8);
    lookAt.y += (lookY - lookAt.y) * Math.min(1, dt * 8);
    lookAt.z += (lookZ - lookAt.z) * Math.min(1, dt * 8);

    // Trauma shake: summed sines under a decaying square, real-time decay.
    let shakeX = 0;
    let shakeY = 0;
    if (trauma > 0) {
      trauma = Math.max(0, trauma - dt * 1.4);
      shakeTime += dt * 30;
      const shake = trauma * trauma;
      shakeX = shake * 0.9 * Math.sin(shakeTime * 1.7);
      shakeY = shake * 0.6 * Math.sin(shakeTime * 2.3);
    }
    camera.position.set(chasePos.x + shakeX, chasePos.y + shakeY, chasePos.z);
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    camera.rotation.z += -flightState.roll * 0.12;
    camera.updateProjectionMatrix();
  }

  return { update, addTrauma, toggleMode, get mode() { return mode; } };
}
