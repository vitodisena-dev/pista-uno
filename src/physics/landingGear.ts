/**
 * Modelo de Tren de Aterrizaje Triciclo (Resorte + Amortiguador + Fricción + Rueda de Nariz).
 * Basado en la formulación de contacto de NASA TM-1999-209531 adaptada a avioneta ligera.
 * TypeScript puro sin dependencias de Three.js ni DOM.
 */

import { Quat, Vec3 } from './integrator';

export interface WheelSpec {
  offsetBodyMeters: Vec3;
  springStiffnessNPerM: number;
  dampingNsPerM: number;
  maxSteerAngleRad?: number;
}

export interface LandingGearConfig {
  nose: WheelSpec;
  mainLeft: WheelSpec;
  mainRight: WheelSpec;
  rollingFrictionAsphalt: number;
  rollingFrictionGrass: number;
  maxBrakeFriction: number;
}

export interface WheelTelemetry {
  onGround: boolean;
  compressionMeters: number;
  normalForceN: number;
  onAsphalt: boolean;
}

export interface GearStepResult {
  totalForceWorldN: Vec3;
  totalTorqueBodyNm: Vec3;
  noseWheel: WheelTelemetry;
  leftWheel: WheelTelemetry;
  rightWheel: WheelTelemetry;
  anyWheelOnGround: boolean;
  touchdownVerticalSpeedFpm: number | null;
  crashedReason: string | null;
}

/** Rota un vector del espacio cuerpo al espacio mundo usando el cuaternión q */
export function rotateBodyToWorld(v: Vec3, q: Quat): Vec3 {
  // v' = q * v * q^-1
  const ix = q.w * v.x + q.y * v.z - q.z * v.y;
  const iy = q.w * v.y + q.z * v.x - q.x * v.z;
  const iz = q.w * v.z + q.x * v.y - q.y * v.x;
  const iw = -q.x * v.x - q.y * v.y - q.z * v.z;

  return {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x
  };
}

/** Rota un vector del espacio mundo al espacio cuerpo usando el conjugado de q */
export function rotateWorldToBody(v: Vec3, q: Quat): Vec3 {
  const qc: Quat = { x: -q.x, y: -q.y, z: -q.z, w: q.w };
  return rotateBodyToWorld(v, qc);
}

/** Producto cruz a × b */
export function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

/**
 * Verifica si una coordenada mundial (x, z) cae dentro del rectángulo asfaltado de la pista 10/28.
 */
export function isPointOnRunwayAsphalt(
  worldX: number,
  worldZ: number,
  runwayHeadingYawRad: number = -((108 - 90) * Math.PI) / 180
): boolean {
  const cos = Math.cos(-runwayHeadingYawRad);
  const sin = Math.sin(-runwayHeadingYawRad);
  const localX = worldX * cos + worldZ * sin;
  const localZ = -worldX * sin + worldZ * cos;
  return Math.abs(localX) <= 1605 && Math.abs(localZ) <= 23.0;
}

/**
 * Calcula las fuerzas y momentos de las 3 ruedas sobre el terreno (y = 0).
 */
export function computeLandingGearForces(
  positionWorld: Vec3,
  velocityWorld: Vec3,
  orientation: Quat,
  angularVelocityBody: Vec3,
  gearConfig: LandingGearConfig,
  rudderInput: number, // [-1..1]
  leftBrakeInput: number, // [0..1]
  rightBrakeInput: number, // [0..1]
  parkingBrake: boolean,
  wasOnGroundPrevStep: boolean
): GearStepResult {
  const forwardSpeedMps = Math.hypot(velocityWorld.x, velocityWorld.z);
  const noseSteerSpeedScale = Math.max(0.22, 1.0 - Math.min(1.0, forwardSpeedMps / 28.0) * 0.78);

  const wheels: Array<{
    key: 'nose' | 'mainLeft' | 'mainRight';
    spec: WheelSpec;
    brake: number;
    steerAngleRad: number;
  }> = [
    {
      key: 'nose',
      spec: gearConfig.nose,
      brake: parkingBrake ? 0.5 : 0,
      steerAngleRad:
        -rudderInput * (gearConfig.nose.maxSteerAngleRad ?? 0.34) * noseSteerSpeedScale
    },
    {
      key: 'mainLeft',
      spec: gearConfig.mainLeft,
      brake: parkingBrake ? 1.0 : Math.max(0, Math.min(1, leftBrakeInput)),
      steerAngleRad: 0
    },
    {
      key: 'mainRight',
      spec: gearConfig.mainRight,
      brake: parkingBrake ? 1.0 : Math.max(0, Math.min(1, rightBrakeInput)),
      steerAngleRad: 0
    }
  ];

  let totalForceWorld: Vec3 = { x: 0, y: 0, z: 0 };
  let totalTorqueBody: Vec3 = { x: 0, y: 0, z: 0 };

  const telemetries: Record<'nose' | 'mainLeft' | 'mainRight', WheelTelemetry> = {
    nose: { onGround: false, compressionMeters: 0, normalForceN: 0, onAsphalt: true },
    mainLeft: { onGround: false, compressionMeters: 0, normalForceN: 0, onAsphalt: true },
    mainRight: { onGround: false, compressionMeters: 0, normalForceN: 0, onAsphalt: true }
  };

  for (const w of wheels) {
    const rWorld = rotateBodyToWorld(w.spec.offsetBodyMeters, orientation);
    const wheelWorldPos: Vec3 = {
      x: positionWorld.x + rWorld.x,
      y: positionWorld.y + rWorld.y,
      z: positionWorld.z + rWorld.z
    };

    const compression = -wheelWorldPos.y; // Suelo en y = 0
    const onAsphalt = isPointOnRunwayAsphalt(wheelWorldPos.x, wheelWorldPos.z);

    if (compression > 0) {
      // Velocidad del punto de contacto en ejes cuerpo: v_wheel = v_body + ω × r_body
      const vBody = rotateWorldToBody(velocityWorld, orientation);
      const omegaCrossR = crossVec3(angularVelocityBody, w.spec.offsetBodyMeters);
      const wheelVelBody: Vec3 = {
        x: vBody.x + omegaCrossR.x,
        y: vBody.y + omegaCrossR.y,
        z: vBody.z + omegaCrossR.z
      };
      const wheelVelWorld = rotateBodyToWorld(wheelVelBody, orientation);

      // Fuerza normal del resorte-amortiguador: Fn = max(0, k * compression - c * v_y)
      const springForce = w.spec.springStiffnessNPerM * Math.min(compression, 0.45);
      const damperForce = -w.spec.dampingNsPerM * wheelVelWorld.y;
      const normalForceN = Math.max(0, Math.min(45000, springForce + damperForce));

      // Fricción longitudinal y lateral en ejes de la rueda (rotada por steerAngleRad si es la rueda de nariz)
      const cosS = Math.cos(w.steerAngleRad);
      const sinS = Math.sin(w.steerAngleRad);
      const vWheelForward = wheelVelBody.x * cosS + wheelVelBody.z * sinS;
      const vWheelSide = -wheelVelBody.x * sinS + wheelVelBody.z * cosS;

      const baseRollingMu = onAsphalt
        ? gearConfig.rollingFrictionAsphalt
        : gearConfig.rollingFrictionGrass;
      const longitudinalMu = baseRollingMu + w.brake * gearConfig.maxBrakeFriction;

      // Suavizado cerca de velocidad cero para evitar oscilación numérica en reposo
      const forwardSmooth = Math.tanh(vWheelForward * 3.5);
      const forceWheelForward = -normalForceN * longitudinalMu * forwardSmooth;

      // Rigidez lateral del neumático (cornering force)
      const sideSmooth = Math.tanh(vWheelSide * 4.5);
      const lateralMu = onAsphalt ? 0.72 : 0.42;
      const forceWheelSide = -normalForceN * lateralMu * sideSmooth;

      // Pasar fuerzas de neumático a ejes cuerpo y luego a ejes mundo
      const tireForceBody: Vec3 = {
        x: forceWheelForward * cosS - forceWheelSide * sinS,
        y: 0,
        z: forceWheelForward * sinS + forceWheelSide * cosS
      };
      const tireForceWorld = rotateBodyToWorld(tireForceBody, orientation);

      const wheelForceWorld: Vec3 = {
        x: tireForceWorld.x,
        y: normalForceN,
        z: tireForceWorld.z
      };

      totalForceWorld.x += wheelForceWorld.x;
      totalForceWorld.y += wheelForceWorld.y;
      totalForceWorld.z += wheelForceWorld.z;

      const wheelForceBody = rotateWorldToBody(wheelForceWorld, orientation);
      // Para calcular el torque de actitud en el suelo sin que la fricción bajo el CG (y = -1.28 m)
      // bloquee artificialmente la rotación de despegue, evaluamos el brazo longitudinal/lateral
      // sobre el plano de los ejes de suspensión:
      const momentArmBody: Vec3 = {
        x: w.spec.offsetBodyMeters.x,
        y: -0.18,
        z: w.spec.offsetBodyMeters.z
      };
      const wheelTorqueBody = crossVec3(momentArmBody, wheelForceBody);
      totalTorqueBody.x += wheelTorqueBody.x;
      totalTorqueBody.y += wheelTorqueBody.y;
      totalTorqueBody.z += wheelTorqueBody.z;

      telemetries[w.key] = {
        onGround: true,
        compressionMeters: compression,
        normalForceN,
        onAsphalt
      };
    }
  }

  const anyWheelOnGround =
    telemetries.nose.onGround || telemetries.mainLeft.onGround || telemetries.mainRight.onGround;

  let touchdownVerticalSpeedFpm: number | null = null;
  let crashedReason: string | null = null;

  if (anyWheelOnGround && !wasOnGroundPrevStep) {
    touchdownVerticalSpeedFpm = Math.abs(Math.min(0, velocityWorld.y)) * 196.8503937;
    if (touchdownVerticalSpeedFpm > 650) {
      crashedReason = `Toque demasiado duro (${Math.round(touchdownVerticalSpeedFpm)} ft/min > 600 ft/min máx).`;
    } else if (
      telemetries.nose.onGround &&
      !telemetries.mainLeft.onGround &&
      !telemetries.mainRight.onGround &&
      touchdownVerticalSpeedFpm > 320
    ) {
      crashedReason = 'Golpe de hélice (Prop strike): tocaste primero con la rueda de nariz en descenso.';
    }
  }

  // Verificar tailstrike o impacto de ala
  const tailBodyPos: Vec3 = { x: -4.4, y: -0.45, z: 0 };
  const tailWorldOffset = rotateBodyToWorld(tailBodyPos, orientation);
  if (positionWorld.y + tailWorldOffset.y < 0.0 && Math.hypot(velocityWorld.x, velocityWorld.z) > 12) {
    crashedReason = 'Tailstrike: exceso de cabeceo golpeó la cola contra la pista.';
  }

  return {
    totalForceWorldN: totalForceWorld,
    totalTorqueBodyNm: totalTorqueBody,
    noseWheel: telemetries.nose,
    leftWheel: telemetries.mainLeft,
    rightWheel: telemetries.mainRight,
    anyWheelOnGround,
    touchdownVerticalSpeedFpm,
    crashedReason
  };
}
