/**
 * Suavizado de entradas de control, zonas muertas y curvas exponenciales.
 * TypeScript puro sin dependencias externas.
 */

import { FlightControlsInput } from '../physics/flightModel';

export interface SmoothingSettings {
  deadzone: number;
  expoCurve: number;
  keyboardSlewRatePerSec: number;
}

export const DEFAULT_SMOOTHING: SmoothingSettings = {
  deadzone: 0.08,
  expoCurve: 1.65,
  keyboardSlewRatePerSec: 2.8
};

/**
 * Aplica zona muerta y curva de respuesta exponencial a un eje analógico [-1..1].
 */
export function applyDeadzoneAndExpo(
  rawValue: number,
  deadzone: number = DEFAULT_SMOOTHING.deadzone,
  expo: number = DEFAULT_SMOOTHING.expoCurve
): number {
  const abs = Math.abs(rawValue);
  if (abs <= deadzone) return 0;
  const normalized = (abs - deadzone) / (1 - deadzone);
  const curved = Math.pow(Math.min(1, normalized), expo);
  return Math.sign(rawValue) * curved;
}

/**
 * Avanza un valor suavizado hacia un objetivo con velocidad máxima de cambio.
 */
export function moveTowards(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

export function createInitialFlightControls(): FlightControlsInput {
  return {
    elevator: 0,
    aileron: 0,
    rudder: 0,
    throttle: 0,
    elevatorTrim: 0.02, // Ligero trim de despegue neutral
    flapIndex: 0,
    brakeLeft: 0,
    brakeRight: 0,
    parkingBrake: false
  };
}
