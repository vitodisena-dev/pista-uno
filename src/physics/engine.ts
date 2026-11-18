/**
 * Modelo de Motor Lycoming IO-360-L2A (180 HP) y Hélice de Paso Fijo (McCauley 1.93 m).
 * TypeScript puro sin dependencias externas.
 *
 * Incluye:
 * 1. Inercia del acelerador y régimen RPM (filtro de primer orden con tau = throttleTauSeconds).
 * 2. Empuje de la hélice en función de RPM, densidad del aire y relación de avance J = V / (n * D).
 *    La eficiencia de la hélice disminuye a medida que aumenta la velocidad de avance.
 * 3. Efecto de la hélice (P-factor / estela espiral): momento de guiñada a la izquierda y par de reacción.
 */

export interface EngineConfig {
  maxPowerHp: number;
  maxPowerWatts: number;
  idleRpm: number;
  maxRpm: number;
  propDiameterMeters: number;
  throttleTauSeconds: number;
  pFactorYawCoeff: number;
}

export interface EngineState {
  /** Posición efectiva del acelerador con inercia [0..1] */
  effectiveThrottle: number;
  /** Revoluciones por minuto actuales [RPM] */
  rpm: number;
  /** Empuje generado en el eje +X_b del avión [N] */
  thrustNewtons: number;
  /** Momento de guiñada inducido por la estela espiral / P-factor [N·m] */
  propYawMomentNm: number;
  /** Par de alabeo por reacción de la hélice [N·m] */
  propRollMomentNm: number;
}

export function createInitialEngineState(config: EngineConfig): EngineState {
  return {
    effectiveThrottle: 0,
    rpm: config.idleRpm,
    thrustNewtons: 0,
    propYawMomentNm: 0,
    propRollMomentNm: 0
  };
}

/**
 * Avanza un paso dt [s] del motor y la hélice.
 *
 * @param prev Estado previo del motor
 * @param throttleInput Comando del jugador [0..1]
 * @param airspeedMps Velocidad verdadera de avance (TAS) [m/s]
 * @param densityKgPerM3 Densidad del aire actual [kg/m³]
 * @param config Configuración del motor desde c172.json
 * @param dt Paso de tiempo [s]
 */
export function stepEngine(
  prev: EngineState,
  throttleInput: number,
  airspeedMps: number,
  densityKgPerM3: number,
  config: EngineConfig,
  dt: number
): EngineState {
  const clampedTarget = Math.max(0, Math.min(1, throttleInput));

  // 1. Inercia del acelerador (respuesta de primer orden: dT/dt = (Target - T) / tau)
  const alpha = Math.min(1, dt / Math.max(0.05, config.throttleTauSeconds));
  const effectiveThrottle = prev.effectiveThrottle + (clampedTarget - prev.effectiveThrottle) * alpha;

  // 2. Régimen RPM: depende del acelerador y ligeramente de la velocidad de avance (hélice de paso fijo)
  const ramRpmBonus = Math.min(220, Math.max(0, airspeedMps * 3.2)) * effectiveThrottle;
  const baseRpm = config.idleRpm + (config.maxRpm - config.idleRpm - 180) * Math.pow(effectiveThrottle, 0.85);
  const rpm = Math.min(config.maxRpm, baseRpm + ramRpmBonus);

  // 3. Potencia disponible ajustada por densidad (motor atmosférico: P ~ P_max * (ρ / ρ0))
  const densityRatio = Math.max(0.2, densityKgPerM3 / 1.225);
  const availablePowerWatts = config.maxPowerWatts * Math.pow(effectiveThrottle, 1.15) * densityRatio;

  // 4. Relación de avance J = V / (n * D) y curva de empuje de hélice de paso fijo
  // A velocidad 0 (estático en cabecera), el empuje estático de un C172 de 180 hp es ~2,250 N.
  // Al aumentar la velocidad, T = min(T_static, eta(J) * P / V).
  const rps = Math.max(5, rpm / 60);
  const J = Math.max(0, airspeedMps) / (rps * config.propDiameterMeters);

  // Empuje estático escalado por (RPM / maxRPM)² y densidad
  const rpmRatio = (rpm - config.idleRpm * 0.5) / (config.maxRpm - config.idleRpm * 0.5);
  const staticThrustMaxN = 2650 * densityRatio * Math.max(0, rpmRatio * rpmRatio);

  // Caída de empuje con el avance J (eficiencia de hélice de paso fijo disminuye a alta J)
  const advanceDecay = Math.max(0.0, 1.0 - 0.36 * J - 0.14 * J * J);
  const thrustFromStaticModel = staticThrustMaxN * advanceDecay;

  // Límite energético a velocidades medias/altas: T <= eta_prop * P / max(V, 18)
  const propEfficiency = 0.82 * Math.max(0.25, 1.0 - 0.25 * Math.pow(J - 0.65, 2));
  const thrustFromPower = (propEfficiency * availablePowerWatts) / Math.max(15.0, airspeedMps);

  const thrustNewtons = Math.max(0, Math.min(thrustFromStaticModel, thrustFromPower + 140 * effectiveThrottle));

  // 5. Efecto de la hélice (estela espiral y P-factor): tiende a desviar la nariz a la izquierda (+Yaw rad/s en cuerpo)
  // Más notorio a alta potencia y baja/media velocidad (durante la carrera de despegue y ascenso).
  const lowSpeedFactor = Math.max(0.25, 1.0 - Math.min(1.0, airspeedMps / 55.0) * 0.65);
  const propYawMomentNm = thrustNewtons * config.pFactorYawCoeff * lowSpeedFactor * 8.5;
  const propRollMomentNm = -thrustNewtons * 0.018 * effectiveThrottle;

  return {
    effectiveThrottle,
    rpm,
    thrustNewtons,
    propYawMomentNm,
    propRollMomentNm
  };
}
