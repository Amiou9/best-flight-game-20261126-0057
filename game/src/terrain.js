// The world you see: sea, islands, runway, clouds and sky. Everything is
// built from three.js primitives and procedural canvas textures — no loaded
// images — and the meshes follow the analytic ground in ground.js exactly.
import * as THREE from 'three';
import { ISLANDS, PALETTE, RUNWAY, WORLD } from './config.js';
import { groundHeight } from './ground.js';

function runwayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3a3f46';
  ctx.fillRect(0, 0, 128, 1024);
  ctx.fillStyle = '#e8e8e8';
  for (let y = 40; y < 1024; y += 96) ctx.fillRect(60, y, 8, 48);
  // Threshold stripes at both ends.
  for (let i = 0; i < 4; i += 1) {
    ctx.fillRect(12 + i * 28, 16, 16, 44);
    ctx.fillRect(12 + i * 28, 964, 16, 44);
  }
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('07', 64, 170);
  ctx.fillText('25', 64, 900);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makePalm(random) {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f8f3a, roughness: 0.8 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 6), trunkMat);
  trunk.position.y = 3.5;
  trunk.rotation.z = random.range(-0.12, 0.12);
  palm.add(trunk);
  for (let i = 0; i < 6; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 5.5, 4), leafMat);
    const angle = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(angle) * 1.8, 7.2, Math.sin(angle) * 1.8);
    leaf.rotation.set(Math.sin(angle) * 1.1, 0, -Math.cos(angle) * 1.1);
    palm.add(leaf);
  }
  return palm;
}

function makeIsland(island, random) {
  const group = new THREE.Group();
  group.position.set(island.x, 0, island.z);
  const sand = new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 });
  const grass = new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 1 });
  const grassDark = new THREE.MeshStandardMaterial({ color: PALETTE.grassDark, roughness: 1 });

  if (island.kind === 'runway') {
    const plateau = new THREE.Mesh(
      new THREE.CylinderGeometry(island.radius, island.radius * 1.15, RUNWAY.height, 40),
      grass,
    );
    plateau.position.y = RUNWAY.height / 2;
    group.add(plateau);
    const beach = new THREE.Mesh(
      new THREE.CylinderGeometry(island.radius * 1.18, island.radius * 1.3, 0.8, 40),
      sand,
    );
    beach.position.y = 0.2;
    group.add(beach);
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(RUNWAY.width, RUNWAY.length),
      new THREE.MeshStandardMaterial({ map: runwayTexture(), roughness: 0.9 }),
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(RUNWAY.x - island.x, RUNWAY.height + 0.06, RUNWAY.z - island.z);
    group.add(strip);
    // Hangar, windsock and a little terminal hut beside the strip.
    const hangar = new THREE.Mesh(
      new THREE.BoxGeometry(18, 8, 14),
      new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.6 }),
    );
    hangar.position.set(26, RUNWAY.height + 4, -20);
    group.add(hangar);
    const hut = new THREE.Mesh(
      new THREE.BoxGeometry(10, 5, 8),
      new THREE.MeshStandardMaterial({ color: 0xf2b705, roughness: 0.7 }),
    );
    hut.position.set(-26, RUNWAY.height + 2.5, 30);
    group.add(hut);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 9, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    );
    pole.position.set(-22, RUNWAY.height + 4.5, -70);
    group.add(pole);
    const sock = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xd21f2b, roughness: 0.7 }),
    );
    sock.rotation.z = Math.PI / 2;
    sock.position.set(-20.5, RUNWAY.height + 8.4, -70);
    group.add(sock);
    return group;
  }

  const hill = new THREE.Mesh(
    new THREE.SphereGeometry(island.radius, 28, 14),
    island.kind === 'volcano'
      ? new THREE.MeshStandardMaterial({ color: PALETTE.volcano, roughness: 1 })
      : grass,
  );
  hill.scale.y = island.height / island.radius;
  hill.position.y = -island.radius * 0.12;
  group.add(hill);
  const beach = new THREE.Mesh(
    new THREE.CylinderGeometry(island.radius * 1.06, island.radius * 1.18, 1.2, 28),
    sand,
  );
  beach.position.y = 0.1;
  group.add(beach);
  // White surf ring where the island meets the sea.
  const surf = new THREE.Mesh(
    new THREE.RingGeometry(island.radius * 1.12, island.radius * 1.3, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  surf.rotation.x = -Math.PI / 2;
  surf.position.y = 0.25;
  group.add(surf);

  if (island.kind === 'volcano') {
    const crater = new THREE.Mesh(
      new THREE.ConeGeometry(island.radius * 0.22, 10, 12),
      new THREE.MeshStandardMaterial({ color: 0x2a2019, roughness: 1 }),
    );
    crater.position.y = island.height - 2;
    group.add(crater);
    const lava = new THREE.Mesh(
      new THREE.CircleGeometry(island.radius * 0.1, 12),
      new THREE.MeshBasicMaterial({ color: PALETTE.lava }),
    );
    lava.rotation.x = -Math.PI / 2;
    lava.position.y = island.height + 3.2;
    group.add(lava);
    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(9, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xcfcfcf, transparent: true, opacity: 0.75 }),
    );
    smoke.position.y = island.height + 12;
    smoke.name = 'volcano-smoke';
    group.add(smoke);
  }

  if (island.kind === 'lighthouse') {
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 3, 16, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
    );
    tower.position.y = island.height + 6;
    group.add(tower);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.5, 3, 10),
      new THREE.MeshStandardMaterial({ color: 0xd21f2b, roughness: 0.6 }),
    );
    band.position.y = island.height + 10;
    group.add(band);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe27a }),
    );
    lamp.position.y = island.height + 15;
    lamp.name = 'lighthouse-lamp';
    group.add(lamp);
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(7, 60, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.rotation.z = Math.PI / 2;
    beam.position.set(30, island.height + 15, 0);
    beam.name = 'lighthouse-beam';
    group.add(beam);
  }

  // Palms and hill trees, planted where the analytic ground is high enough.
  const treeCount = island.kind === 'palm' ? 14 : 8;
  for (let i = 0; i < treeCount; i += 1) {
    const angle = random.next() * Math.PI * 2;
    const dist = random.range(0.15, 0.75) * island.radius;
    const tx = Math.cos(angle) * dist;
    const tz = Math.sin(angle) * dist;
    const gy = groundHeight(island.x + tx, island.z + tz);
    if (gy < 1) continue;
    const palm = makePalm(random);
    palm.position.set(tx, gy - 0.3, tz);
    const scale = random.range(0.8, 1.4);
    palm.scale.setScalar(scale);
    group.add(palm);
  }
  return group;
}

/** Builds the whole static world and returns it with its animated bits. */
export function createTerrain(random) {
  const group = new THREE.Group();
  group.name = 'kepulauan-elang';

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.worldRadius * 2.4, WORLD.worldRadius * 2.4, 1, 1),
    new THREE.MeshStandardMaterial({ color: PALETTE.sea, roughness: 0.35, metalness: 0.1 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0, -450);
  sea.receiveShadow = true;
  group.add(sea);

  for (const island of ISLANDS) group.add(makeIsland(island, random));

  // Drifting cloud puffs, flat white clusters high above the sea.
  const clouds = [];
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 16; i += 1) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(random.next() * 3);
    for (let p = 0; p < puffs; p += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(random.range(7, 15), 10, 8), cloudMat);
      puff.position.set(p * random.range(8, 13) - puffs * 5, random.range(-2, 2), random.range(-6, 6));
      puff.scale.y = 0.45;
      cloud.add(puff);
    }
    cloud.position.set(random.range(-600, 600), random.range(95, 150), random.range(-900, 100));
    clouds.push(cloud);
    group.add(cloud);
  }

  // The sun disc, low in the west, so the light has somewhere to come from.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(34, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, fog: false }),
  );
  sun.position.set(-620, 210, -700);
  sun.lookAt(0, 40, -450);
  group.add(sun);

  return { group, clouds };
}
