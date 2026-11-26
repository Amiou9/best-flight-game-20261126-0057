// The golden ring course: torus gates the pilot flies through in order.
// The next ring pulses gold and carries a light pillar so it reads from far
// away; passed rings turn green and dim.
import * as THREE from 'three';
import { RING_COURSE, RING_RADIUS } from './config.js';
import { PALETTE } from './config.js';

export function createRings() {
  const group = new THREE.Group();
  group.name = 'ring-course';
  const meshes = RING_COURSE.map((ring, index) => {
    const gate = new THREE.Group();
    gate.position.set(ring.x, ring.y, ring.z);
    // Face the ring at the pilot flying in from the previous gate (from the
    // runway for the first one): a torus lies in the XY plane, facing
    // north-south, so without this the gates the course approaches from the
    // side read as a thin gold sliver instead of a circle to fly through.
    const prev = index === 0 ? { x: 0, z: 28 } : RING_COURSE[index - 1];
    gate.rotation.y = Math.atan2(ring.x - prev.x, ring.z - prev.z);
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(RING_RADIUS, 0.75, 12, 40),
      new THREE.MeshStandardMaterial({
        color: PALETTE.ringGold,
        emissive: PALETTE.ringGold,
        emissiveIntensity: 0.85,
        roughness: 0.35,
        metalness: 0.6,
      }),
    );
    gate.add(torus);
    const inner = new THREE.Mesh(
      new THREE.TorusGeometry(RING_RADIUS - 1.6, 0.16, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.55 }),
    );
    gate.add(inner);
    // A faint vertical pillar so the next ring is visible over the horizon.
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 90, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffc21c, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
    );
    pillar.position.y = -20;
    pillar.name = 'pillar';
    gate.add(pillar);
    // Number plate floating above the ring.
    const plate = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 20),
      new THREE.MeshBasicMaterial({ color: 0x10233a, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    plate.position.y = RING_RADIUS + 4;
    plate.name = 'plate';
    gate.add(plate);
    group.add(gate);
    return { gate, torus, pillar, index };
  });

  return {
    group,
    /** nextIndex: the ring the pilot is flying to; time: seconds, for the pulse. */
    update(nextIndex, time) {
      for (const mesh of meshes) {
        const isNext = mesh.index === nextIndex;
        const passed = mesh.index < nextIndex;
        mesh.torus.material.emissive.setHex(passed ? 0x2aff66 : PALETTE.ringGold);
        mesh.torus.material.color.setHex(passed ? 0x2aff66 : PALETTE.ringGold);
        mesh.torus.material.emissiveIntensity = isNext ? 0.85 + Math.sin(time * 4) * 0.35 : 0.35;
        mesh.pillar.visible = isNext;
        mesh.pillar.material.opacity = isNext ? 0.1 + Math.sin(time * 4) * 0.04 : 0;
        const scale = isNext ? 1 + Math.sin(time * 4) * 0.04 : 1;
        mesh.gate.scale.setScalar(scale);
      }
    },
  };
}
