import * as THREE from 'three';
import c172ConfigJson from './aircraft/c172.json';
import { createC172Mesh, updateC172RigVisuals } from './aircraft/c172Mesh';
import { createInitialFlightControls } from './controls/controlSmoothing';
import { XboxGamepadController } from './controls/gamepad';
import { KeyboardController } from './controls/keyboard';
import { DebugPanel } from './debug/debugPanel';
import {
  AircraftConfig,
  FlightSimulationState,
  createInitialSimulationState,
  stepFlightSimulation
} from './physics/flightModel';
import { FIXED_DT, lerpVec3 } from './physics/integrator';
import { createRunway } from './world/runway';
import { setupSkyAndLighting } from './world/sky';
import { createTerrain } from './world/terrain';

const c172Config = c172ConfigJson as unknown as AircraftConfig;

const canvas = document.getElementById('sim-canvas') as HTMLCanvasElement;
const fpsEl = document.getElementById('fps-val') as HTMLElement;
const camEl = document.getElementById('cam-val') as HTMLElement;
const debugContainer = document.getElementById('debug-container') as HTMLElement;
const gamepadToast = document.getElementById('gamepad-toast') as HTMLElement;
const stallBanner = document.getElementById('stall-banner') as HTMLElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

// Elementos del HUD rápido inferior
const hudIas = document.getElementById('hud-ias') as HTMLElement;
const hudAlt = document.getElementById('hud-alt') as HTMLElement;
const hudVsi = document.getElementById('hud-vsi') as HTMLElement;
const hudAtt = document.getElementById('hud-att') as HTMLElement;
const hudHdg = document.getElementById('hud-hdg') as HTMLElement;
const hudRpm = document.getElementById('hud-rpm') as HTMLElement;
const hudCfg = document.getElementById('hud-cfg') as HTMLElement;

// 1. Renderizador WebGL2 con Tone Mapping ACES para iluminación realista
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

// 2. Escena 3D, Cielo, Terreno de Yucatán y Pista 10/28 de Mérida (MMMD)
const scene = new THREE.Scene();
const { sunLight } = setupSkyAndLighting(scene);
scene.add(createTerrain());

const { runwayGroup, runwayHeadingYawRad, threshold10WorldPos } = createRunway();
scene.add(runwayGroup);

// 3. Modelo 3D detallado del Cessna 172S Skyhawk con superficies móviles
const c172Rig = createC172Mesh();
scene.add(c172Rig.aircraftGroup);

// 4. Cámaras: 0 = Persecución, 1 = Cabina, 2 = Torre MMMD
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.15,
  18000
);
let cameraMode: 0 | 1 | 2 = 0;
const CAMERA_NAMES = ['Persecución', 'Cabina', 'Torre MMMD'];
const cameraPosSmooth = new THREE.Vector3();
const cameraLookSmooth = new THREE.Vector3();

// 5. Panel de Debug (F3) y Vectores 3D de Fuerza
const debugPanel = new DebugPanel(scene, debugContainer);

// 6. Estado de Simulación y Controles
let controls = createInitialFlightControls();
let prevSimState: FlightSimulationState;
let currSimState: FlightSimulationState;

function resetToRunway10(): void {
  controls = createInitialFlightControls();
  currSimState = createInitialSimulationState(c172Config, {
    position: {
      x: threshold10WorldPos.x,
      y: 1.24,
      z: threshold10WorldPos.z
    },
    yawRad: runwayHeadingYawRad
  });
  prevSimState = currSimState;

  const forwardInit = new THREE.Vector3(1, 0, 0).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    runwayHeadingYawRad
  );
  cameraPosSmooth.set(
    currSimState.rigidBody.position.x - forwardInit.x * 13.5,
    currSimState.rigidBody.position.y + 3.1,
    currSimState.rigidBody.position.z - forwardInit.z * 13.5
  );
  cameraLookSmooth.set(
    currSimState.rigidBody.position.x + forwardInit.x * 8,
    currSimState.rigidBody.position.y + 0.6,
    currSimState.rigidBody.position.z + forwardInit.z * 8
  );
}

resetToRunway10();

function toggleCamera(): void {
  cameraMode = ((cameraMode + 1) % 3) as 0 | 1 | 2;
  camEl.textContent = CAMERA_NAMES[cameraMode];
}

resetBtn.addEventListener('click', () => {
  resetToRunway10();
  resetBtn.blur();
});

const keyboard = new KeyboardController({
  onToggleCamera: toggleCamera,
  onToggleDebug: () => debugPanel.toggle(),
  onResetSim: resetToRunway10
});

const gamepad = new XboxGamepadController({
  onStatusChange: (connected, id) => {
    gamepadToast.style.display = 'block';
    gamepadToast.style.background = connected
      ? 'rgba(22, 163, 74, 0.92)'
      : 'rgba(220, 38, 38, 0.92)';
    gamepadToast.textContent = connected
      ? `🎮 Mando conectado: ${id.slice(0, 28)}`
      : '🎮 Mando desconectado';
    setTimeout(() => {
      gamepadToast.style.display = 'none';
    }, 3500);
  },
  onToggleCamera: toggleCamera,
  onToggleHelp: () => debugPanel.toggle()
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function updateCamera(
  renderedPos: THREE.Vector3,
  renderedQuat: THREE.Quaternion,
  dtRender: number
): void {
  const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(renderedQuat);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(renderedQuat);
  const worldUp = new THREE.Vector3(0, 1, 0);

  if (cameraMode === 0) {
    // Cámara de Persecución Suavizada
    const desiredCamPos = renderedPos
      .clone()
      .addScaledVector(forward, -12.8)
      .addScaledVector(worldUp, 2.9);
    const desiredLookAt = renderedPos
      .clone()
      .addScaledVector(forward, 9.0)
      .addScaledVector(worldUp, 0.5);

    const smoothFactor = 1 - Math.exp(-9.0 * dtRender);
    cameraPosSmooth.lerp(desiredCamPos, smoothFactor);
    cameraLookSmooth.lerp(desiredLookAt, smoothFactor);

    camera.position.copy(cameraPosSmooth);
    camera.lookAt(cameraLookSmooth);
  } else if (cameraMode === 1) {
    // Cámara de Cabina desde el asiento del piloto + rotación de mirada libre (stick derecho)
    const eyeWorld = new THREE.Vector3();
    c172Rig.cockpitCameraAnchor.getWorldPosition(eyeWorld);
    camera.position.copy(eyeWorld);

    const lookDir = forward
      .clone()
      .applyAxisAngle(up, gamepad.lookYawRad)
      .addScaledVector(up, Math.sin(gamepad.lookPitchRad) - 0.06);
    camera.lookAt(eyeWorld.clone().addScaledVector(lookDir, 50));
  } else {
    // Cámara de Torre Fija junto a la pista 10/28
    camera.position.set(-1050, 26, -390);
    camera.lookAt(renderedPos);
  }

  sunLight.target.position.copy(renderedPos);
  sunLight.target.updateMatrixWorld();
}

function updateBottomHud(state: FlightSimulationState): void {
  const t = state.telemetry;
  hudIas.textContent = `${Math.round(t.iasKnots)} kt`;
  hudAlt.textContent = `${Math.round(t.altitudeFeetMSL)} / ${Math.round(t.altitudeFeetAGL)} ft`;
  hudVsi.textContent = `${Math.round(t.verticalSpeedFpm)} ft/min`;
  hudAtt.textContent = `${t.pitchDeg.toFixed(1)}° / ${t.rollDeg.toFixed(1)}°`;
  hudHdg.textContent = `${Math.round(t.headingDeg).toString().padStart(3, '0')}°`;
  hudRpm.textContent = `${Math.round(state.engine.rpm)} RPM (${Math.round(controls.throttle * 100)}%)`;

  const flapDeg = [0, 10, 20, 30][controls.flapIndex] ?? 0;
  const brakeLabel = controls.parkingBrake
    ? '🅿️ PARK'
    : controls.brakeLeft > 0 || controls.brakeRight > 0
      ? '🛑 FRENO'
      : 'LIBRE';
  hudCfg.textContent = `${flapDeg}° · ${brakeLabel}`;

  stallBanner.style.display = t.stallWarning ? 'block' : 'none';
}

// 7. Loop Principal con Acumulador a 120 Hz
let accumulator = 0;
let lastFrameTimeMs = performance.now();
let fpsFrames = 0;
let fpsLastCheckMs = lastFrameTimeMs;

function animate(nowMs: number): void {
  requestAnimationFrame(animate);

  const frameDt = Math.min((nowMs - lastFrameTimeMs) / 1000, 0.1);
  lastFrameTimeMs = nowMs;
  accumulator += frameDt;

  // Actualizar entradas de teclado y mando de Xbox
  keyboard.update(controls, frameDt);
  gamepad.update(controls, frameDt);

  // Vibración háptica en pérdida o toque de pista
  if (currSimState.telemetry.stallBuffetIntensity > 0.1) {
    gamepad.pulseVibration(
      currSimState.telemetry.stallBuffetIntensity * 0.5,
      currSimState.telemetry.stallBuffetIntensity * 0.8,
      60
    );
  } else if (currSimState.telemetry.gear.touchdownVerticalSpeedFpm !== null) {
    const impact = Math.min(1, currSimState.telemetry.gear.touchdownVerticalSpeedFpm / 500);
    gamepad.pulseVibration(impact * 0.6, impact, 140);
  }

  // Paso fijo de física a 120 Hz
  while (accumulator >= FIXED_DT) {
    prevSimState = currSimState;
    currSimState = stepFlightSimulation(
      currSimState,
      controls,
      c172Config,
      { x: 0, y: 0, z: 0 },
      FIXED_DT
    );
    accumulator -= FIXED_DT;
  }

  // Interpolación visual entre prevSimState y currSimState
  const alpha = accumulator / FIXED_DT;
  const interpPos = lerpVec3(prevSimState.rigidBody.position, currSimState.rigidBody.position, alpha);

  c172Rig.aircraftGroup.position.set(interpPos.x, interpPos.y, interpPos.z);
  c172Rig.aircraftGroup.quaternion.set(
    currSimState.rigidBody.orientation.x,
    currSimState.rigidBody.orientation.y,
    currSimState.rigidBody.orientation.z,
    currSimState.rigidBody.orientation.w
  );

  // Animar hélice, alerones, flaps, elevador y timón en el modelo 3D
  updateC172RigVisuals(c172Rig, controls, currSimState.engine.rpm, frameDt);
  updateCamera(c172Rig.aircraftGroup.position, c172Rig.aircraftGroup.quaternion, frameDt);

  // Actualizar HUD y panel de Debug F3
  updateBottomHud(currSimState);
  debugPanel.update(currSimState, controls, c172Rig.aircraftGroup.position);

  fpsFrames++;
  if (nowMs - fpsLastCheckMs >= 500) {
    fpsEl.textContent = String(Math.round((fpsFrames * 1000) / (nowMs - fpsLastCheckMs)));
    fpsFrames = 0;
    fpsLastCheckMs = nowMs;
  }

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
