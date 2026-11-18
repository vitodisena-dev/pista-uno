import * as THREE from 'three';
import c172Config from './aircraft/c172.json';
import { createC172Mesh } from './aircraft/c172Mesh';
import {
  FIXED_DT,
  RigidBodyState,
  createQuatFromYawRad,
  lerpVec3,
  stepRigidBody
} from './physics/integrator';
import { createRunway } from './world/runway';
import { setupSkyAndLighting } from './world/sky';
import { createTerrain } from './world/terrain';

const canvas = document.getElementById('sim-canvas') as HTMLCanvasElement;
const fpsEl = document.getElementById('fps-val') as HTMLElement;
const stepEl = document.getElementById('step-val') as HTMLElement;

// 1. Inicializar Renderizador WebGL2 optimizado para Apple Silicon
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 2. Escena, Cielo, Terreno de Yucatán y Pista 10/28 de MMMD
const scene = new THREE.Scene();
const { sunLight } = setupSkyAndLighting(scene);
scene.add(createTerrain());

const { runwayGroup, runwayHeadingYawRad, threshold10WorldPos } = createRunway();
scene.add(runwayGroup);

// 3. Avión Cessna 172 en cabecera 10
const { aircraftGroup, propellerMesh } = createC172Mesh();
scene.add(aircraftGroup);

// 4. Cámara de Persecución Suavizada (Chase Camera)
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.2,
  16000
);
const cameraPosSmooth = new THREE.Vector3();
const cameraLookSmooth = new THREE.Vector3();

// 5. Estado Físico Inicial (120 Hz determinista) en la Cabecera 10 de MMMD
let prevState: RigidBodyState = {
  position: {
    x: threshold10WorldPos.x,
    y: 1.28, // Altura del CG con el tren sobre el asfalto
    z: threshold10WorldPos.z
  },
  velocity: { x: 0, y: 0, z: 0 },
  orientation: createQuatFromYawRad(runwayHeadingYawRad),
  angularVelocityBody: { x: 0, y: 0, z: 0 },
  simTimeSeconds: 0,
  stepCount: 0
};
let currState: RigidBodyState = { ...prevState };

// Posicionar cámara inicialmente detrás del avión
const forwardInit = new THREE.Vector3(1, 0, 0).applyAxisAngle(
  new THREE.Vector3(0, 1, 0),
  runwayHeadingYawRad
);
cameraPosSmooth.set(
  currState.position.x - forwardInit.x * 14,
  currState.position.y + 3.4,
  currState.position.z - forwardInit.z * 14
);
cameraLookSmooth.set(
  currState.position.x + forwardInit.x * 8,
  currState.position.y + 0.6,
  currState.position.z + forwardInit.z * 8
);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 6. Loop Principal con Acumulador de Tiempo Fijo (120 Hz)
let accumulator = 0;
let lastFrameTimeMs = performance.now();
let fpsFrames = 0;
let fpsLastCheckMs = lastFrameTimeMs;

function updateChaseCamera(renderedPos: THREE.Vector3, renderedQuat: THREE.Quaternion, dtRender: number) {
  const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(renderedQuat);
  const up = new THREE.Vector3(0, 1, 0);

  const desiredCamPos = renderedPos
    .clone()
    .addScaledVector(forward, -13.5)
    .addScaledVector(up, 3.2);
  const desiredLookAt = renderedPos.clone().addScaledVector(forward, 10.0).addScaledVector(up, 0.5);

  const smoothFactor = 1 - Math.exp(-8.0 * dtRender);
  cameraPosSmooth.lerp(desiredCamPos, smoothFactor);
  cameraLookSmooth.lerp(desiredLookAt, smoothFactor);

  camera.position.copy(cameraPosSmooth);
  camera.lookAt(cameraLookSmooth);

  // Mantener shadow map centrado cerca del avión
  sunLight.target.position.copy(renderedPos);
  sunLight.target.updateMatrixWorld();
}

function animate(nowMs: number) {
  requestAnimationFrame(animate);

  const frameDt = Math.min((nowMs - lastFrameTimeMs) / 1000, 0.1);
  lastFrameTimeMs = nowMs;
  accumulator += frameDt;

  // Contador FPS
  fpsFrames++;
  if (nowMs - fpsLastCheckMs >= 500) {
    const currentFps = Math.round((fpsFrames * 1000) / (nowMs - fpsLastCheckMs));
    fpsEl.textContent = String(currentFps);
    stepEl.textContent = String(currState.stepCount);
    fpsFrames = 0;
    fpsLastCheckMs = nowMs;
  }

  // Paso fijo de física a 120 Hz
  while (accumulator >= FIXED_DT) {
    prevState = currState;
    // En Fase 1 el avión está en ralentí con freno de estacionamiento en la cabecera 10
    const weightN = -c172Config.mass.defaultMassKg * 9.80665;
    currState = stepRigidBody(
      currState,
      { x: 0, y: weightN, z: 0 },
      { x: 0, y: 0, z: 0 },
      c172Config.mass.defaultMassKg,
      c172Config.mass.inertia,
      FIXED_DT
    );
    accumulator -= FIXED_DT;
  }

  // Interpolación entre prevState y currState para renderizado suave
  const alpha = accumulator / FIXED_DT;
  const interpPos = lerpVec3(prevState.position, currState.position, alpha);

  aircraftGroup.position.set(interpPos.x, interpPos.y, interpPos.z);
  aircraftGroup.quaternion.set(
    currState.orientation.x,
    currState.orientation.y,
    currState.orientation.z,
    currState.orientation.w
  );

  // Giro de la hélice en ralentí (650 RPM = ~68 rad/s)
  propellerMesh.rotation.x += 68.0 * frameDt;

  updateChaseCamera(aircraftGroup.position, aircraftGroup.quaternion, frameDt);
  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
