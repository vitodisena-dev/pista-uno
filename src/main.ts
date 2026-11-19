import * as THREE from 'three';
import c172ConfigJson from './aircraft/c172.json';
import { createC172Mesh, updateC172RigVisuals } from './aircraft/c172Mesh';
import { createInitialFlightControls } from './controls/controlSmoothing';
import { XboxGamepadController } from './controls/gamepad';
import { KeyboardController } from './controls/keyboard';
import { DebugPanel } from './debug/debugPanel';
import { FlightInstrumentsHUD } from './hud/instruments';
import {
  AircraftConfig,
  FlightSimulationState,
  createInitialSimulationState,
  stepFlightSimulation
} from './physics/flightModel';
import { FIXED_DT, lerpVec3 } from './physics/integrator';
import { createRunway } from './world/runway';
import { TimeOfDayPreset, setupSkyAndLighting } from './world/sky';
import { createTerrain } from './world/terrain';

const c172Config = c172ConfigJson as unknown as AircraftConfig;

const canvas = document.getElementById('sim-canvas') as HTMLCanvasElement;
const instrumentsCanvas = document.getElementById('instruments-canvas') as HTMLCanvasElement;
const fpsEl = document.getElementById('fps-val') as HTMLElement;
const camEl = document.getElementById('cam-val') as HTMLElement;
const camBtn = document.getElementById('cam-btn') as HTMLButtonElement;
const todBtn = document.getElementById('tod-btn') as HTMLButtonElement;
const debugContainer = document.getElementById('debug-container') as HTMLElement;
const gamepadToast = document.getElementById('gamepad-toast') as HTMLElement;
const stallBanner = document.getElementById('stall-banner') as HTMLElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

// Indicadores Primarios Laterales (PFD)
const pfdIas = document.getElementById('pfd-ias') as HTMLElement;
const pfdVref = document.getElementById('pfd-vref') as HTMLElement;
const pfdAgl = document.getElementById('pfd-agl') as HTMLElement;
const pfdMsl = document.getElementById('pfd-msl') as HTMLElement;

// Controles del Pedestal (Acelerador, Flaps, Trim, Yoke, Freno)
const throttleTrack = document.getElementById('throttle-track') as HTMLElement;
const throttleFill = document.getElementById('throttle-fill') as HTMLElement;
const throttleKnob = document.getElementById('throttle-knob') as HTMLElement;
const throttleReadout = document.getElementById('throttle-readout') as HTMLElement;
const flapButtons = Array.from(document.querySelectorAll('.flap-btn')) as HTMLButtonElement[];
const flapsReadout = document.getElementById('flaps-readout') as HTMLElement;
const trimMarker = document.getElementById('trim-marker') as HTMLElement;
const trimReadout = document.getElementById('trim-readout') as HTMLElement;
const yokeDot = document.getElementById('yoke-dot') as HTMLElement;
const rudderDot = document.getElementById('rudder-dot') as HTMLElement;
const parkingBtn = document.getElementById('parking-btn') as HTMLButtonElement;

// 1. Renderizador WebGL2 con Tone Mapping ACES y Mapa de Entorno PBR
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
renderer.toneMappingExposure = 1.02;

// 2. Escena 3D, Cielo Físico Rayleigh/Mie + Nubes Cúmulos 3D, Paisaje de Mérida y Pista 10/28 de MMMD
const scene = new THREE.Scene();
const skyCtrl = setupSkyAndLighting(scene, renderer);
scene.add(createTerrain());

const { runwayGroup, runwayHeadingYawRad, threshold10WorldPos } = createRunway();
scene.add(runwayGroup);

// 3. Modelo 3D detallado del Cessna 172S Skyhawk
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

// 5. Instrumentos Analógicos ("Six Pack") y Panel de Debug (F3)
const instrumentsHud = new FlightInstrumentsHUD(instrumentsCanvas);
const debugPanel = new DebugPanel(scene, debugContainer);
// Arrancar con el panel F3 oculto para dejar limpia la vista de vuelo (se abre con F3)
debugPanel.toggle();

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

const TOD_PRESETS: TimeOfDayPreset[] = ['day', 'golden', 'dusk'];
const TOD_LABELS: Record<TimeOfDayPreset, string> = {
  day: '☀️ Hora: Día',
  golden: '🌅 Hora: Tarde Dorada',
  dusk: '🌇 Hora: Atardecer'
};
let todIdx = 0;

todBtn.addEventListener('click', () => {
  todIdx = (todIdx + 1) % TOD_PRESETS.length;
  const preset = TOD_PRESETS[todIdx];
  skyCtrl.setTimeOfDay(preset);
  todBtn.textContent = TOD_LABELS[preset];
  todBtn.blur();
});

camBtn.addEventListener('click', () => {
  toggleCamera();
  camBtn.blur();
});

resetBtn.addEventListener('click', () => {
  resetToRunway10();
  resetBtn.blur();
});

// Interacción con el mouse sobre el Acelerador, Flaps y Freno de Estacionamiento
let draggingThrottle = false;
function setThrottleFromPointer(clientY: number): void {
  const rect = throttleTrack.getBoundingClientRect();
  const rel = 1 - (clientY - rect.top) / rect.height;
  controls.throttle = Math.max(0, Math.min(1, rel));
}
throttleTrack.addEventListener('pointerdown', (e) => {
  draggingThrottle = true;
  setThrottleFromPointer(e.clientY);
});
window.addEventListener('pointermove', (e) => {
  if (draggingThrottle) setThrottleFromPointer(e.clientY);
});
window.addEventListener('pointerup', () => {
  draggingThrottle = false;
});

for (const btn of flapButtons) {
  btn.addEventListener('click', () => {
    controls.flapIndex = Number(btn.dataset.flap ?? 0);
    btn.blur();
  });
}

parkingBtn.addEventListener('click', () => {
  controls.parkingBrake = !controls.parkingBrake;
  parkingBtn.blur();
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
    const eyeWorld = new THREE.Vector3();
    c172Rig.cockpitCameraAnchor.getWorldPosition(eyeWorld);
    camera.position.copy(eyeWorld);

    const lookDir = forward
      .clone()
      .applyAxisAngle(up, gamepad.lookYawRad)
      .addScaledVector(up, Math.sin(gamepad.lookPitchRad) - 0.06);
    camera.lookAt(eyeWorld.clone().addScaledVector(lookDir, 50));
  } else {
    camera.position.set(-1050, 26, -390);
    camera.lookAt(renderedPos);
  }
}

function updateCockpitUI(state: FlightSimulationState): void {
  const t = state.telemetry;
  const ias = Math.round(t.iasKnots);
  const agl = Math.round(t.altitudeFeetAGL);
  const msl = Math.round(t.altitudeFeetMSL);
  const vsi = Math.round(t.verticalSpeedFpm / 10) * 10;

  // Cintas laterales grandes de lectura rápida
  pfdIas.textContent = `${ias} KT`;
  pfdIas.style.color = t.isStalling ? '#ef4444' : ias >= 55 ? '#4ade80' : '#f8fafc';
  pfdVref.textContent = t.gear.anyWheelOnGround
    ? ias < 55
      ? `Acelera a Vr (55 kt)`
      : `¡LISTO PARA ROTAR (S / ↓)!`
    : `Vy: 74 kt · Vapp: 63 kt`;

  pfdAgl.textContent = `${agl} FT`;
  const vsiSign = vsi > 0 ? '+' : '';
  pfdMsl.textContent = `MSL: ${msl} ft · VSI: ${vsiSign}${vsi} fpm`;

  // Acelerador visual
  const thrPct = Math.round(controls.throttle * 100);
  throttleFill.style.height = `${thrPct}%`;
  throttleKnob.style.bottom = `${thrPct}%`;
  throttleReadout.textContent = `${thrPct}%`;

  // Flaps visual
  const flapDeg = [0, 10, 20, 30][controls.flapIndex] ?? 0;
  flapsReadout.textContent = `${flapDeg}°`;
  flapButtons.forEach((btn, idx) => {
    btn.classList.toggle('active', idx === controls.flapIndex);
  });

  // Trim visual
  const trimPct = Math.round(controls.elevatorTrim * 100);
  const trimTopPct = 50 - (controls.elevatorTrim / 0.4) * 42;
  trimMarker.style.top = `${Math.max(6, Math.min(94, trimTopPct))}%`;
  trimReadout.textContent = `${trimPct >= 0 ? '+' : ''}${trimPct}%`;

  // Posición del cuerno (Yoke) y pedales de timón
  const yokeX = 50 + controls.aileron * 40;
  const yokeY = 50 + controls.elevator * 40;
  yokeDot.style.left = `${yokeX}%`;
  yokeDot.style.top = `${yokeY}%`;

  const rudderX = 50 + controls.rudder * 42;
  rudderDot.style.left = `${rudderX}%`;

  // Freno de estacionamiento o freno de pedal
  const isBraking = controls.parkingBrake || controls.brakeLeft > 0 || controls.brakeRight > 0;
  parkingBtn.classList.toggle('engaged', isBraking);
  parkingBtn.textContent = controls.parkingBrake
    ? '🅿️ PARK: ACTIVO'
    : controls.brakeLeft > 0 || controls.brakeRight > 0
      ? '🛑 FRENANDO'
      : '🅿️ FRENO: LIBRE';

  stallBanner.style.display = t.stallWarning ? 'block' : 'none';

  // Renderizar los 6 instrumentos analógicos ("Six Pack")
  instrumentsHud.render(state, controls);
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

  keyboard.update(controls, frameDt);
  gamepad.update(controls, frameDt);

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

  const alpha = accumulator / FIXED_DT;
  const interpPos = lerpVec3(prevSimState.rigidBody.position, currSimState.rigidBody.position, alpha);

  c172Rig.aircraftGroup.position.set(interpPos.x, interpPos.y, interpPos.z);
  c172Rig.aircraftGroup.quaternion.set(
    currSimState.rigidBody.orientation.x,
    currSimState.rigidBody.orientation.y,
    currSimState.rigidBody.orientation.z,
    currSimState.rigidBody.orientation.w
  );

  updateC172RigVisuals(c172Rig, controls, currSimState.engine.rpm, frameDt);
  skyCtrl.updateClouds(frameDt, c172Rig.aircraftGroup.position);
  updateCamera(c172Rig.aircraftGroup.position, c172Rig.aircraftGroup.quaternion, frameDt);

  updateCockpitUI(currSimState);
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
