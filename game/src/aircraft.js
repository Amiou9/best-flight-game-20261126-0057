// The aircraft: "Elang Laut" PK-NUS, a red-and-white bush plane built from
// three.js primitives — fuselage, wings, tail, glass canopy, spinning prop,
// wingtip lights and landing gear. One group; the flight model drives it.
import * as THREE from 'three';
import { PALETTE } from './config.js';

export function createAircraft() {
  const group = new THREE.Group();
  group.name = 'elang-laut-pk-nus';

  const white = new THREE.MeshStandardMaterial({ color: PALETTE.planeWhite, roughness: 0.45, metalness: 0.15 });
  const red = new THREE.MeshStandardMaterial({ color: PALETTE.planeRed, roughness: 0.5, metalness: 0.15 });
  const gold = new THREE.MeshStandardMaterial({ color: PALETTE.planeGold, roughness: 0.4, metalness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.8 });

  // Fuselage: a white tube with a red nose and a gold cheatline stripe.
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.55, 7.4, 14), white);
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.02, 1.6, 14), red);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -4.4;
  group.add(nose);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.07, 1.07, 0.5, 14, 1, true), gold);
  stripe.rotation.x = Math.PI / 2;
  stripe.position.z = -1.2;
  group.add(stripe);

  // Canopy: glass bubble over the cockpit, ahead of the wing.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), glass);
  canopy.scale.set(0.95, 0.75, 1.7);
  canopy.position.set(0, 0.85, -1.6);
  group.add(canopy);

  // Main wing (red tips) and tailplane.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.22, 1.9), white);
  wing.position.set(0, 0.1, -0.6);
  group.add(wing);
  for (const side of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 1.9), red);
    tip.position.set(side * 5.3, 0.1, -0.6);
    group.add(tip);
    const navLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 6),
      new THREE.MeshBasicMaterial({ color: side < 0 ? 0xff2a2a : 0x2aff66 }),
    );
    navLight.position.set(side * 5.8, 0.1, -0.6);
    group.add(navLight);
  }
  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 1.3), white);
  tailplane.position.set(0, 0.35, 3.4);
  group.add(tailplane);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.1, 1.7), red);
  fin.position.set(0, 1.1, 3.4);
  group.add(fin);

  // Propeller: hub, two blades and a faint blur disc that appears at speed.
  const prop = new THREE.Group();
  prop.position.set(0, 0, -5.3);
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 10), gold);
  hub.rotation.x = -Math.PI / 2;
  prop.add(hub);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.5 });
  for (const angle of [0, Math.PI]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.4, 0.08), bladeMat);
    blade.rotation.z = angle;
    prop.add(blade);
  }
  const blur = new THREE.Mesh(
    new THREE.CircleGeometry(1.75, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  );
  blur.name = 'prop-blur';
  prop.add(blur);
  group.add(prop);

  // Fixed landing gear with little wheels.
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), dark);
    leg.position.set(side * 0.8, -0.95, -1.2);
    group.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 0.8, -1.5, -1.2);
    group.add(wheel);
  }

  group.traverse((mesh) => {
    if (mesh.isMesh) mesh.castShadow = true;
  });

  return {
    group,
    prop,
    blur,
    /** Copies the flight state onto the mesh: position, heading, pitch, roll. */
    sync(flightState) {
      group.position.set(flightState.x, flightState.y, flightState.z);
      group.rotation.order = 'YXZ';
      group.rotation.y = flightState.heading;
      group.rotation.x = -flightState.pitch;
      group.rotation.z = -flightState.roll;
      prop.rotation.z += 0.25 + flightState.throttle * 1.6;
      blur.material.opacity = 0.05 + flightState.throttle * 0.14;
    },
  };
}
