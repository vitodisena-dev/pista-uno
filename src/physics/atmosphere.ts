/**
 * Modelo de Atmósfera Estándar Internacional (ISA - U.S. Standard Atmosphere 1976).
 * TypeScript puro sin dependencias externas (portable a C++/C#).
 *
 * Unidades SI internas:
 * - Altitud h: metros sobre el nivel del mar (m MSL)
 * - Temperatura T: Kelvin (K)
 * - Presión p: Pascales (Pa)
 * - Densidad ρ: kg/m³
 * - Velocidad del sonido a: m/s
 */

export const ISA_SEA_LEVEL_DENSITY = 1.225; // kg/m³
export const ISA_SEA_LEVEL_PRESSURE = 101325; // Pa
export const ISA_SEA_LEVEL_TEMP_K = 288.15; // K (15 °C)
export const TEMP_LAPSE_RATE = 0.0065; // K/m en la troposfera (h <= 11,000 m)
export const GAS_CONSTANT_AIR = 287.05287; // J/(kg·K)
export const GRAVITY_ACCEL = 9.80665; // m/s²
export const GAMMA_AIR = 1.4; // Relación de calores específicos

export interface AtmosphereState {
  altitudeMetersMSL: number;
  temperatureKelvin: number;
  pressurePascals: number;
  densityKgPerM3: number;
  speedOfSoundMps: number;
}

/**
 * Calcula las propiedades atmosféricas ISA a una altitud dada [m MSL].
 * Fórmulas (U.S. Standard Atmosphere 1976, troposfera h <= 11,000 m):
 *   T(h) = T0 - L * h
 *   p(h) = p0 * (T(h) / T0)^(g / (R * L))
 *   ρ(h) = p(h) / (R * T(h))
 */
export function getAtmosphereAtAltitude(altitudeMetersMSL: number): AtmosphereState {
  const h = Math.max(0, Math.min(altitudeMetersMSL, 11000));
  const temperatureKelvin = ISA_SEA_LEVEL_TEMP_K - TEMP_LAPSE_RATE * h;
  const exponent = GRAVITY_ACCEL / (GAS_CONSTANT_AIR * TEMP_LAPSE_RATE); // ~5.25588
  const pressurePascals =
    ISA_SEA_LEVEL_PRESSURE * Math.pow(temperatureKelvin / ISA_SEA_LEVEL_TEMP_K, exponent);
  const densityKgPerM3 = pressurePascals / (GAS_CONSTANT_AIR * temperatureKelvin);
  const speedOfSoundMps = Math.sqrt(GAMMA_AIR * GAS_CONSTANT_AIR * temperatureKelvin);

  return {
    altitudeMetersMSL: altitudeMetersMSL,
    temperatureKelvin,
    pressurePascals,
    densityKgPerM3,
    speedOfSoundMps
  };
}

/**
 * Convierte Velocidad Verdadera (TAS, m/s) a Velocidad Indicada equivalente (IAS, m/s)
 * usando la relación de densidades:
 *   V_IAS = V_TAS * sqrt(ρ / ρ_0)
 */
export function tasToIasMps(tasMps: number, densityKgPerM3: number): number {
  return tasMps * Math.sqrt(Math.max(0.05, densityKgPerM3) / ISA_SEA_LEVEL_DENSITY);
}

/** Conversión de m/s a nudos (kt): 1 kt = 0.514444 m/s */
export function mpsToKnots(mps: number): number {
  return mps / 0.514444444;
}

/** Conversión de nudos (kt) a m/s */
export function knotsToMps(knots: number): number {
  return knots * 0.514444444;
}

/** Conversión de metros a pies (ft) */
export function metersToFeet(meters: number): number {
  return meters * 3.280839895;
}

/** Conversión de m/s a pies por minuto (ft/min) */
export function mpsToFpm(mps: number): number {
  return mps * 196.8503937;
}
