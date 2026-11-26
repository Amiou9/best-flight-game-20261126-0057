// The renderer, sky, lights and fog: one gradient sky dome, a warm sun key
// light with soft shadows, a hemisphere fill, and a capped pixel ratio so
// the game stays smooth on a desktop Chrome window.
import * as THREE from 'three';
import { PALETTE, WORLD } from './config.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe0ee, WORLD.fogNear, WORLD.fogFar);

  // Gradient sky dome: deep blue overhead fading to pale horizon haze.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1400, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(PALETTE.skyTop) },
        horizon: { value: new THREE.Color(PALETTE.skyHorizon) },
      },
      vertexShader: 'varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vPos; uniform vec3 top; uniform vec3 horizon; void main() { float h = clamp(vPos.y / 1400.0, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.65)), 1.0); }',
    }),
  );
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xbbddff, 0x3a5a3a, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2cf, 2.6);
  sun.position.set(-180, 260, 120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -160;
  sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 700;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 3000);
  camera.position.set(0, 8, 30);

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);

  return {
    renderer,
    scene,
    camera,
    sun,
    /** Keeps the shadow frustum centred on the plane as it flies. */
    followSun(x, z) {
      sun.position.set(x - 180, 260, z + 120);
      sun.target.position.set(x, 0, z);
    },
    render() {
      renderer.render(scene, camera);
    },
  };
}
