/**
 * Modelo Aerodinámico y de Vuelo 6-DOF del Cessna 172S Skyhawk.
 * Basado en las ecuaciones de MIT 16.333 (Clases 1, 3, 4 y 14) y NASA CR-96008.
 * TypeScript 100% puro, sin dependencias de Three.js ni del DOM.
 */

import {
  GRAVITY_ACCEL,
  getAtmosphereAtAltitude,
  mpsToFpm,
  mpsToKnots,
  tasToIasMps,
  metersToFeet
} from './atmosphere';
import {
  EngineConfig,
  EngineState,
  createInitialEngineState,
  stepEngine
} from './engine';
import {
  FIXED_DT,
  Quat,
  RigidBodyState,
  Vec3,
  createQuatFromYawRad,
  multiplyQuat,
  normalizeQuat
} from './integrator';
import {
  GearStepResult,
  LandingGearConfig,
  computeLandingGearForces,
  rotateBodyToWorld,
  rotateWorldToBody
} from './landingGear';

export interface AerodynamicsConfig {
  alphaZeroLiftRad: number;
  clAlphaPerRad: number;
  alphaStallRad: number;
  clMaxClean: number;
  cd0Clean: number;
  cyBetaPerRad: number;
  cm0: number;
  cmAlphaPerRad: number;
  cmDeltaElevatorPerRad: number;
  cmQPerRad: number;
  clBetaPerRad: number;
  clDeltaAileronPerRad: number;
  clPPerRad: number;
  cnBetaPerRad: number;
  cnDeltaRudderPerRad: number;
  cnRPerRad: number;
  flaps: {
    anglesDeg: number[];
    deltaCl: number[];
    deltaCd: number[];
    deltaCm: number[];
  };
}

export interface AircraftConfig {
  id: string;
  name: string;
  mass: {
    emptyMassKg: number;
    defaultMassKg: number;
    maxTakeoffMassKg: number;
    inertia: { Ixx: number; Iyy: number; Izz: number };
  };
  geometry: {
    wingSpanMeters: number;
    wingAreaSqMeters: number;
    meanAerodynamicChordMeters: number;
    aspectRatio: number;
    oswaldEfficiency: number;
  };
  engine: EngineConfig;
  vSpeedsKnots: {
    Vso: number;
    Vs1: number;
    Vr: number;
    Vx: number;
    Vy: number;
    Vfe: number;
    Vapp: number;
    Vno: number;
    Vne: number;
  };
  aerodynamics: AerodynamicsConfig;
  landingGear: LandingGearConfig;
}

export interface FlightControlsInput {
  /** Elevador (cabeceo): +1 = tirar del cuerno (nariz arriba), -1 = empujar (nariz abajo) */
  elevator: number;
  /** Alerones (alabeo): +1 = alabeo derecha, -1 = alabeo izquierda */
  aileron: number;
  /** Timón (guiñada): +1 = pedal derecho, -1 = pedal izquierdo */
  rudder: number;
  /** Acelerador [0..1] */
  throttle: number;
  /** Trim de cabeceo [-0.5..+0.5] */
  elevatorTrim: number;
  /** Índice de flaps: 0 (0°), 1 (10°), 2 (20°), 3 (30°) */
  flapIndex: number;
  /** Freno izquierdo [0..1] */
  brakeLeft: number;
  /** Freno derecho [0..1] */
  brakeRight: number;
  /** Freno de estacionamiento activo */
  parkingBrake: boolean;
}

export interface FlightTelemetry {
  /** Ángulo de ataque α [rad] y [deg] */
  alphaRad: number;
  alphaDeg: number;
  /** Ángulo de derrape β [rad] y [deg] */
  betaRad: number;
  betaDeg: number;
  /** Coeficientes aerodinámicos */
  CL: number;
  CD: number;
  CY: number;
  /** Magnitudes de las 4 fuerzas fundamentales [N] */
  liftN: number;
  dragN: number;
  thrustN: number;
  weightN: number;
  sideForceN: number;
  /** Vector de sustentación + resistencia + empuje en espacio mundo [N] para visualización 3D */
  liftVectorWorldN: Vec3;
  dragVectorWorldN: Vec3;
  thrustVectorWorldN: Vec3;
  weightVectorWorldN: Vec3;
  /** Velocidades [m/s] y [kt] */
  tasMps: number;
  iasMps: number;
  tasKnots: number;
  iasKnots: number;
  groundSpeedKnots: number;
  /** Altitud y velocidad vertical */
  altitudeMetersAGL: number;
  altitudeFeetMSL: number;
  altitudeFeetAGL: number;
  verticalSpeedFpm: number;
  /** Actitud de referencia para instrumentos (extraída del cuaternión sin afectar estado interno) */
  pitchDeg: number;
  rollDeg: number;
  headingDeg: number;
  /** Densidad del aire [kg/m³] y factor de efecto suelo */
  airDensityKgPerM3: number;
  groundEffectFactor: number;
  /** Estado de pérdida */
  isStalling: boolean;
  stallWarning: boolean;
  stallBuffetIntensity: number;
  /** Tren de aterrizaje */
  gear: GearStepResult;
}

export interface FlightSimulationState {
  rigidBody: RigidBodyState;
  engine: EngineState;
  telemetry: FlightTelemetry;
  crashedReason: string | null;
}

/**
 * Extrae ángulos de actitud aeronáutica (Pitch, Roll, Heading magnético/verdadero)
 * a partir del cuaternión del cuerpo solo para lectura del HUD.
 */
export function extractAttitudeFromQuat(q: Quat): {
  pitchDeg: number;
  rollDeg: number;
  headingDeg: number;
} {
  const forward = rotateBodyToWorld({ x: 1, y: 0, z: 0 }, q);
  const right = rotateBodyToWorld({ x: 0, y: 0, z: 1 }, q);
  const up = rotateBodyToWorld({ x: 0, y: 1, z: 0 }, q);

  const pitchRad = Math.asin(Math.max(-1, Math.min(1, forward.y)));
  const rollRad = Math.atan2(-right.y, up.y);

  // En nuestro mundo: +X = Este (90°), -Z = Norte (0°), +Z = Sur (180°)
  const headingRad = Math.atan2(forward.x, -forward.z);
  let headingDeg = ((headingRad * 180) / Math.PI + 360) % 360;
  if (headingDeg < 0.5) headingDeg = 360;

  return {
    pitchDeg: (pitchRad * 180) / Math.PI,
    rollDeg: (rollRad * 180) / Math.PI,
    headingDeg
  };
}

/**
 * Calcula el coeficiente de sustentación CL(α, flaps) incluyendo la entrada en pérdida (stall)
 * no lineal más allá de ~15° (0.262 rad).
 */
export function computeLiftCoefficient(
  alphaRad: number,
  flapIndex: number,
  aero: AerodynamicsConfig
): { cl: number; isStalling: boolean; stallWarning: boolean; stallProgress: number } {
  const idx = Math.max(0, Math.min(aero.flaps.deltaCl.length - 1, flapIndex));
  const deltaClFlap = aero.flaps.deltaCl[idx];

  // Con flaps desplegados el ángulo crítico de pérdida baja ligeramente (~1.5° a 30°)
  const alphaStall = aero.alphaStallRad - idx * 0.009;
  const alphaWarn = alphaStall - 0.048; // ~2.7° antes de la pérdida suena la bocina

  const linearCl = aero.clAlphaPerRad * (alphaRad - aero.alphaZeroLiftRad) + deltaClFlap;

  if (alphaRad <= alphaStall && alphaRad >= -alphaStall) {
    return {
      cl: linearCl,
      isStalling: false,
      stallWarning: alphaRad >= alphaWarn,
      stallProgress: alphaRad > alphaWarn ? (alphaRad - alphaWarn) / (alphaStall - alphaWarn) : 0
    };
  }

  // Región de pérdida (Post-stall): caída brusca de CL y transición a placa plana (sin(2α))
  const sign = Math.sign(alphaRad);
  const excessAlpha = Math.abs(alphaRad) - alphaStall;
  const clPeak =
    aero.clAlphaPerRad * (sign * alphaStall - aero.alphaZeroLiftRad) + deltaClFlap;
  const postStallDrop = Math.exp(-excessAlpha * 7.5);
  const flatPlateCl = 1.05 * Math.sin(2 * alphaRad);
  const cl = clPeak * postStallDrop + flatPlateCl * (1 - postStallDrop);

  return {
    cl,
    isStalling: true,
    stallWarning: true,
    stallProgress: Math.min(1, 0.5 + excessAlpha * 4.0)
  };
}

/**
 * Crea el estado inicial de la simulación (en pista o en vuelo para tests).
 */
export function createInitialSimulationState(
  config: AircraftConfig,
  options?: {
    position?: Vec3;
    velocity?: Vec3;
    yawRad?: number;
    pitchRad?: number;
    throttle?: number;
  }
): FlightSimulationState {
  const yaw = options?.yawRad ?? -((108 - 90) * Math.PI) / 180;
  const pitch = options?.pitchRad ?? 0;

  const qYaw = createQuatFromYawRad(yaw);
  const qPitch: Quat = {
    x: 0,
    y: 0,
    z: Math.sin(pitch * 0.5),
    w: Math.cos(pitch * 0.5)
  };
  const orientation = normalizeQuat(multiplyQuat(qYaw, qPitch));

  const rigidBody: RigidBodyState = {
    position: options?.position ?? { x: -1474, y: 1.24, z: -479 },
    velocity: options?.velocity ?? { x: 0, y: 0, z: 0 },
    orientation,
    angularVelocityBody: { x: 0, y: 0, z: 0 },
    simTimeSeconds: 0,
    stepCount: 0
  };

  const engine = createInitialEngineState(config.engine);
  if (options?.throttle !== undefined) {
    engine.effectiveThrottle = options.throttle;
    engine.rpm =
      config.engine.idleRpm +
      (config.engine.maxRpm - config.engine.idleRpm) * options.throttle;
  }

  const initialControls: FlightControlsInput = {
    elevator: 0,
    aileron: 0,
    rudder: 0,
    throttle: options?.throttle ?? 0,
    elevatorTrim: 0,
    flapIndex: 0,
    brakeLeft: 0,
    brakeRight: 0,
    parkingBrake: options?.velocity ? false : true
  };

  return stepFlightSimulation(
    {
      rigidBody,
      engine,
      telemetry: {} as FlightTelemetry,
      crashedReason: null
    },
    initialControls,
    config,
    { x: 0, y: 0, z: 0 },
    0
  );
}

/**
 * Ejecuta un paso fijo de dinámica de vuelo 6-DOF (dt = 1/120 s por defecto).
 *
 * @param state Estado actual
 * @param controls Entradas suavizadas de piloto
 * @param config Parámetros JSON del avión activo (c172.json)
 * @param windWorldMps Vector de viento en coordenadas mundo [m/s]
 * @param dt Paso de integración [s]
 */
export function stepFlightSimulation(
  state: FlightSimulationState,
  controls: FlightControlsInput,
  config: AircraftConfig,
  windWorldMps: Vec3 = { x: 0, y: 0, z: 0 },
  dt: number = FIXED_DT
): FlightSimulationState {
  const rb = state.rigidBody;
  const massKg = config.mass.defaultMassKg;
  const geom = config.geometry;
  const aero = config.aerodynamics;

  // 1. Atmósfera ISA (Elevación de Mérida MMMD = 12.0 m MSL)
  const altitudeAGL = Math.max(0, rb.position.y - 1.22);
  const altitudeMSL = 12.0 + altitudeAGL;
  const atm = getAtmosphereAtAltitude(altitudeMSL);

  // 2. Velocidad relativa a la masa de aire: v_air = v_ground - v_wind
  const airVelWorld: Vec3 = {
    x: rb.velocity.x - windWorldMps.x,
    y: rb.velocity.y - windWorldMps.y,
    z: rb.velocity.z - windWorldMps.z
  };
  const airVelBody = rotateWorldToBody(airVelWorld, rb.orientation);

  // Componentes en ejes cuerpo: u (+X adelante), v (+Z ala derecha), w (-Y hacia abajo en convención aero)
  const u = airVelBody.x;
  const v = airVelBody.z;
  const w = -airVelBody.y;

  const tasMps = Math.hypot(u, v, w);
  const iasMps = tasToIasMps(tasMps, atm.densityKgPerM3);
  const dynamicPressure = 0.5 * atm.densityKgPerM3 * tasMps * tasMps; // q_bar = ½·ρ·V² [Pa]

  // 3. Ángulo de ataque (α) y ángulo de derrape (β)
  const alphaRad = tasMps > 1.5 ? Math.atan2(w, Math.max(0.5, Math.abs(u))) : 0;
  const betaRad =
    tasMps > 1.5 ? Math.asin(Math.max(-1, Math.min(1, v / tasMps))) : 0;

  // 4. Motor y Hélice
  const nextEngine =
    dt > 0
      ? stepEngine(state.engine, controls.throttle, tasMps, atm.densityKgPerM3, config.engine, dt)
      : state.engine;

  // 5. Coeficientes Aerodinámicos (CL, CD con efecto suelo, CY)
  const flapIdx = Math.max(0, Math.min(aero.flaps.anglesDeg.length - 1, controls.flapIndex));
  const liftRes = computeLiftCoefficient(alphaRad, flapIdx, aero);
  const CL = liftRes.cl;

  // Efecto suelo (McCormick): reduce la resistencia inducida cuando h < b (11 m)
  const heightOverSpan = Math.max(0.08, (rb.position.y - 0.2) / geom.wingSpanMeters);
  const groundEffectFactor =
    heightOverSpan < 1.0
      ? Math.pow(16 * heightOverSpan, 2) / (1 + Math.pow(16 * heightOverSpan, 2))
      : 1.0;

  const inducedDragFactor = 1 / (Math.PI * geom.oswaldEfficiency * geom.aspectRatio);
  const CDi = CL * CL * inducedDragFactor * groundEffectFactor;
  const stallDragExtra = liftRes.isStalling
    ? 0.48 * Math.pow(Math.abs(alphaRad) - aero.alphaStallRad, 1.3)
    : 0;
  const CD = aero.cd0Clean + aero.flaps.deltaCd[flapIdx] + CDi + stallDragExtra;
  const CY = aero.cyBetaPerRad * betaRad;

  // 6. Fuerzas Aerodinámicas [N]: L = q·S·CL, D = q·S·CD, Y = q·S·CY
  const liftN = dynamicPressure * geom.wingAreaSqMeters * CL;
  const dragN = dynamicPressure * geom.wingAreaSqMeters * CD;
  const sideForceN = dynamicPressure * geom.wingAreaSqMeters * CY;

  // Transformar L y D de ejes viento/estabilidad a ejes cuerpo (+X adelante, +Y arriba, +Z derecha)
  const cosA = Math.cos(alphaRad);
  const sinA = Math.sin(alphaRad);
  const aeroForceBody: Vec3 = {
    x: liftN * sinA - dragN * cosA,
    y: liftN * cosA + dragN * sinA,
    z: sideForceN
  };

  // Vector de Sustentación y Resistencia puros en mundo para el panel de Debug F3
  const liftVectorWorldN = rotateBodyToWorld(
    { x: liftN * sinA, y: liftN * cosA, z: 0 },
    rb.orientation
  );
  const dragVectorWorldN = rotateBodyToWorld(
    { x: -dragN * cosA, y: dragN * sinA, z: 0 },
    rb.orientation
  );
  const thrustVectorWorldN = rotateBodyToWorld(
    { x: nextEngine.thrustNewtons, y: 0, z: 0 },
    rb.orientation
  );
  const weightVectorWorldN: Vec3 = { x: 0, y: -massKg * GRAVITY_ACCEL, z: 0 };

  const aeroForceWorld = rotateBodyToWorld(aeroForceBody, rb.orientation);

  // 7. Momentos Aerodinámicos (Cabeceo M, Alabeo L, Guiñada N)
  // En nuestros ejes cuerpo:
  // Eje X (+adelante): Alabeo (Roll = +derecha, que en regla de mano derecha alrededor de +X es -torque.x; usamos convención explícita)
  // Eje Y (+arriba): Guiñada (Yaw = +izquierda alrededor de +Y)
  // Eje Z (+ala derecha): Cabeceo (Pitch = +nariz arriba alrededor de +Z)
  const pRollRate = rb.angularVelocityBody.x;
  const rYawRate = rb.angularVelocityBody.y;
  const qPitchRate = rb.angularVelocityBody.z;

  const span = geom.wingSpanMeters;
  const cbar = geom.meanAerodynamicChordMeters;
  const refV = Math.max(12.0, tasMps);

  // Pérdida de efectividad de alerones en pérdida (stall)
  const aileronEffectiveness = liftRes.isStalling ? 0.28 : 1.0;

  // Cabeceo (Pitch sobre eje +Z_b):
  // En nuestro sistema cuerpo (+X adelante, +Y arriba, +Z derecha), una rotación positiva alrededor de +Z_b
  // lleva +X hacia +Y (nariz ARRIBA).
  // Por lo tanto:
  // - Estabilidad estática longitudinal (Cm_alpha < 0): si α > 0, genera momento restaurador nariz abajo (-Z_b).
  // - Tirar del cuerno (elevator > 0): genera momento nariz arriba (+Z_b).
  const elevatorTotal = Math.max(-1, Math.min(1, controls.elevator + controls.elevatorTrim));
  const dPitchControl = -aero.cmDeltaElevatorPerRad * elevatorTotal * 0.48;
  const Cm =
    aero.cm0 +
    aero.flaps.deltaCm[flapIdx] +
    aero.cmAlphaPerRad * alphaRad +
    dPitchControl +
    aero.cmQPerRad * ((qPitchRate * cbar) / (2 * refV));

  // Sacudida de pérdida (nose-down drop tendencia natural del C172 en stall)
  const stallNoseDownCm = liftRes.isStalling ? -0.14 * liftRes.stallProgress : 0;
  // Propwash sobre el elevador: en el C172 la estela de la hélice sopla directamente sobre la cola,
  // dando autoridad de rotación durante la carrera de despegue incluso a 45-55 kt.
  const propwashDynamicPressure = dynamicPressure + nextEngine.thrustNewtons / (geom.wingAreaSqMeters * 0.42);
  const pitchMomentNm =
    propwashDynamicPressure * geom.wingAreaSqMeters * cbar * dPitchControl +
    dynamicPressure * geom.wingAreaSqMeters * cbar * (Cm - dPitchControl + stallNoseDownCm);

  // Alabeo (Roll sobre eje +X_b):
  // Rotación positiva alrededor de +X_b lleva +Y (arriba) hacia +Z (ala derecha abajo = roll derecha).
  const ClRoll =
    aero.clBetaPerRad * betaRad +
    aero.clDeltaAileronPerRad * controls.aileron * 0.38 * aileronEffectiveness +
    aero.clPPerRad * ((pRollRate * span) / (2 * refV));
  const rollMomentNm =
    dynamicPressure * geom.wingAreaSqMeters * span * ClRoll + nextEngine.propRollMomentNm;

  // Guiñada (Yaw sobre eje +Y_b):
  // Rotación positiva alrededor de +Y_b gira la nariz hacia la izquierda (-Z_b).
  // Pedal derecho (rudder > 0) debe girar la nariz a la derecha (-Y_b).
  const CnYaw =
    -aero.cnBetaPerRad * betaRad +
    aero.cnDeltaRudderPerRad * controls.rudder * 0.42 +
    aero.cnRPerRad * ((rYawRate * span) / (2 * refV));
  const yawMomentNm =
    dynamicPressure * geom.wingAreaSqMeters * span * CnYaw + nextEngine.propYawMomentNm;

  // 8. Fuerzas del Tren de Aterrizaje y Suelo
  const wasOnGroundPrev = state.telemetry?.gear?.anyWheelOnGround ?? true;
  const gearRes = computeLandingGearForces(
    rb.position,
    rb.velocity,
    rb.orientation,
    rb.angularVelocityBody,
    config.landingGear,
    controls.rudder,
    controls.brakeLeft,
    controls.brakeRight,
    controls.parkingBrake,
    wasOnGroundPrev
  );

  // 9. Suma Total de Fuerzas (Mundo) y Momentos (Cuerpo)
  const totalForceWorldN: Vec3 = {
    x: aeroForceWorld.x + thrustVectorWorldN.x + gearRes.totalForceWorldN.x,
    y: aeroForceWorld.y + thrustVectorWorldN.y + weightVectorWorldN.y + gearRes.totalForceWorldN.y,
    z: aeroForceWorld.z + thrustVectorWorldN.z + gearRes.totalForceWorldN.z
  };

  const totalTorqueBodyNm: Vec3 = {
    x: rollMomentNm + gearRes.totalTorqueBodyNm.x,
    y: yawMomentNm + gearRes.totalTorqueBodyNm.y,
    z: pitchMomentNm + gearRes.totalTorqueBodyNm.z
  };

  // 10. Integración Numérica (si dt > 0)
  let nextRb = rb;
  if (dt > 0 && !state.crashedReason) {
    const invMass = 1 / massKg;
    const vx = rb.velocity.x + totalForceWorldN.x * invMass * dt;
    const vy = rb.velocity.y + totalForceWorldN.y * invMass * dt;
    const vz = rb.velocity.z + totalForceWorldN.z * invMass * dt;

    const px = rb.position.x + vx * dt;
    const py = Math.max(0.65, rb.position.y + vy * dt);
    const pz = rb.position.z + vz * dt;

    const inertia = config.mass.inertia;
    // Amortiguación viscosa suave en tierra
    const groundDamp = gearRes.anyWheelOnGround ? Math.exp(-0.9 * dt) : 1.0;
    const wx = (rb.angularVelocityBody.x + (totalTorqueBodyNm.x / inertia.Ixx) * dt) * groundDamp;
    const wy = (rb.angularVelocityBody.y + (totalTorqueBodyNm.y / inertia.Izz) * dt) * groundDamp;
    const wz = (rb.angularVelocityBody.z + (totalTorqueBodyNm.z / inertia.Iyy) * dt) * groundDamp;

    // dQ/dt = 0.5 * q ⊗ ω_body
    // Nota importante sobre índices de ejes en nuestro espacio cuerpo:
    // x = Roll (+X adelante), y = Yaw (+Y arriba), z = Pitch (+Z derecha).
    // Los nombres de inercia son: Ixx (alabeo X), Iyy (cabeceo Z), Izz (guiñada Y).
    const omegaQuat: Quat = { x: wx, y: wy, z: wz, w: 0 };
    const qDot = multiplyQuat(rb.orientation, omegaQuat);
    const nextQuat = normalizeQuat({
      x: rb.orientation.x + 0.5 * qDot.x * dt,
      y: rb.orientation.y + 0.5 * qDot.y * dt,
      z: rb.orientation.z + 0.5 * qDot.z * dt,
      w: rb.orientation.w + 0.5 * qDot.w * dt
    });

    nextRb = {
      position: { x: px, y: py, z: pz },
      velocity: { x: vx, y: vy, z: vz },
      orientation: nextQuat,
      angularVelocityBody: { x: wx, y: wy, z: wz },
      simTimeSeconds: rb.simTimeSeconds + dt,
      stepCount: rb.stepCount + 1
    };
  }

  const attitude = extractAttitudeFromQuat(nextRb.orientation);
  const groundSpeedMps = Math.hypot(nextRb.velocity.x, nextRb.velocity.z);

  const telemetry: FlightTelemetry = {
    alphaRad,
    alphaDeg: (alphaRad * 180) / Math.PI,
    betaRad,
    betaDeg: (betaRad * 180) / Math.PI,
    CL,
    CD,
    CY,
    liftN,
    dragN,
    thrustN: nextEngine.thrustNewtons,
    weightN: massKg * GRAVITY_ACCEL,
    sideForceN,
    liftVectorWorldN,
    dragVectorWorldN,
    thrustVectorWorldN,
    weightVectorWorldN,
    tasMps,
    iasMps,
    tasKnots: mpsToKnots(tasMps),
    iasKnots: mpsToKnots(iasMps),
    groundSpeedKnots: mpsToKnots(groundSpeedMps),
    altitudeMetersAGL: Math.max(0, nextRb.position.y - 1.22),
    altitudeFeetMSL: metersToFeet(12.0 + Math.max(0, nextRb.position.y - 1.22)),
    altitudeFeetAGL: metersToFeet(Math.max(0, nextRb.position.y - 1.22)),
    verticalSpeedFpm: mpsToFpm(nextRb.velocity.y),
    pitchDeg: attitude.pitchDeg,
    rollDeg: attitude.rollDeg,
    headingDeg: attitude.headingDeg,
    airDensityKgPerM3: atm.densityKgPerM3,
    groundEffectFactor,
    isStalling: liftRes.isStalling,
    stallWarning: liftRes.stallWarning && !gearRes.anyWheelOnGround,
    stallBuffetIntensity: !gearRes.anyWheelOnGround ? liftRes.stallProgress : 0,
    gear: gearRes
  };

  return {
    rigidBody: nextRb,
    engine: nextEngine,
    telemetry,
    crashedReason: state.crashedReason ?? gearRes.crashedReason
  };
}
