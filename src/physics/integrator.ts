/**
 * Integrador 6-DOF y tipos de estado físico en TypeScript puro.
 * Sin dependencias de Three.js ni del DOM (portable a C++/C# en Unreal Engine 5).
 *
 * Sistema de coordenadas del mundo (Y-up, mano derecha):
 * - X: Este (+X m)
 * - Y: Altitud sobre el suelo de la pista (+Y m AGL)
 * - Z: Sur (+Z m), Norte (-Z m)
 *
 * Ejes cuerpo del avión (convención aeronáutica adaptada a escena):
 * - +X_b: Hacia adelante (nariz)
 * - +Y_b: Hacia arriba (techo de cabina)
 * - +Z_b: Ala derecha
 */

export interface Vec3 {
  x: number; // m o m/s o N
  y: number; // m o m/s o N
  z: number; // m o m/s o N
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface RigidBodyState {
  /** Posición en el mundo [m] */
  position: Vec3;
  /** Velocidad lineal en ejes mundo [m/s] */
  velocity: Vec3;
  /** Orientación como cuaternión unitario (cuerpo -> mundo) */
  orientation: Quat;
  /** Velocidad angular en ejes cuerpo [rad/s]: x=roll (p), y=yaw (r), z=pitch (q) */
  angularVelocityBody: Vec3;
  /** Tiempo acumulado de simulación [s] */
  simTimeSeconds: number;
  /** Contador de pasos de física ejecutados (120 Hz) */
  stepCount: number;
}

export const FIXED_DT = 1 / 120; // 120 Hz paso fijo [s]

export function createQuatFromYawRad(yawRad: number): Quat {
  const half = yawRad * 0.5;
  return {
    x: 0,
    y: Math.sin(half),
    z: 0,
    w: Math.cos(half)
  };
}

export function normalizeQuat(q: Quat): Quat {
  const len = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return {
    x: q.x / len,
    y: q.y / len,
    z: q.z / len,
    w: q.w / len
  };
}

export function multiplyQuat(a: Quat, b: Quat): Quat {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w
  };
}

export function lerpVec3(a: Vec3, b: Vec3, alpha: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * alpha,
    y: a.y + (b.y - a.y) * alpha,
    z: a.z + (b.z - a.z) * alpha
  };
}

/**
 * Integra un paso fijo dt (1/120 s) usando Euler semi-implícito con cuaterniones.
 * Fórmulas (MIT 16.333 Clase 3):
 *   v(t + dt) = v(t) + (F / m) * dt
 *   x(t + dt) = x(t) + v(t + dt) * dt
 *   dq/dt = 0.5 * q ⊗ [0, ω_x, ω_y, ω_z]
 */
export function stepRigidBody(
  state: RigidBodyState,
  totalForceWorldN: Vec3,
  totalTorqueBodyNm: Vec3,
  massKg: number,
  inertia: { Ixx: number; Iyy: number; Izz: number },
  dt: number = FIXED_DT
): RigidBodyState {
  const invMass = 1 / massKg;

  // Velocidad lineal [m/s] y posición [m]
  const vx = state.velocity.x + totalForceWorldN.x * invMass * dt;
  const vy = state.velocity.y + totalForceWorldN.y * invMass * dt;
  const vz = state.velocity.z + totalForceWorldN.z * invMass * dt;

  const px = state.position.x + vx * dt;
  const py = Math.max(1.28, state.position.y + vy * dt); // Contacto base de pista en Fase 1
  const pz = state.position.z + vz * dt;

  // Velocidades angulares en ejes cuerpo [rad/s]
  const wx = state.angularVelocityBody.x + (totalTorqueBodyNm.x / inertia.Ixx) * dt;
  const wy = state.angularVelocityBody.y + (totalTorqueBodyNm.y / inertia.Izz) * dt;
  const wz = state.angularVelocityBody.z + (totalTorqueBodyNm.z / inertia.Iyy) * dt;

  // Derivada de cuaternión: q_dot = 0.5 * q * omega_quat
  const omegaQuat: Quat = { x: wx, y: wy, z: wz, w: 0 };
  const qDot = multiplyQuat(state.orientation, omegaQuat);
  const nextQuat = normalizeQuat({
    x: state.orientation.x + 0.5 * qDot.x * dt,
    y: state.orientation.y + 0.5 * qDot.y * dt,
    z: state.orientation.z + 0.5 * qDot.z * dt,
    w: state.orientation.w + 0.5 * qDot.w * dt
  });

  return {
    position: { x: px, y: py, z: pz },
    velocity: { x: vx, y: py === 1.28 && vy < 0 ? 0 : vy, z: vz },
    orientation: nextQuat,
    angularVelocityBody: { x: wx, y: wy, z: wz },
    simTimeSeconds: state.simTimeSeconds + dt,
    stepCount: state.stepCount + 1
  };
}
