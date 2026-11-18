import { describe, expect, it } from 'vitest';
import c172ConfigJson from '../src/aircraft/c172.json';
import { createInitialFlightControls } from '../src/controls/controlSmoothing';
import { knotsToMps } from '../src/physics/atmosphere';
import {
  AircraftConfig,
  createInitialSimulationState,
  stepFlightSimulation
} from '../src/physics/flightModel';
import { FIXED_DT } from '../src/physics/integrator';

const c172 = c172ConfigJson as unknown as AircraftConfig;

describe('Modelo de Vuelo 6-DOF Cessna 172S (Pista Uno)', () => {
  it('1. En vuelo recto y nivelado con potencia de crucero se estabiliza en una velocidad razonable (~100-128 kt)', () => {
    let state = createInitialSimulationState(c172, {
      position: { x: 0, y: 600, z: 0 }, // ~2,000 ft AGL
      velocity: { x: knotsToMps(110), y: 0, z: 0 },
      yawRad: 0,
      pitchRad: 0.025,
      throttle: 0.78
    });

    const controls = createInitialFlightControls();
    controls.throttle = 0.78;
    controls.parkingBrake = false;

    // Simular 35 segundos a 120 Hz con un piloto automático simple de mantenimiento de actitud nivelada
    for (let i = 0; i < 35 * 120; i++) {
      const vsError = -state.rigidBody.velocity.y;
      const pitchError = 0.02 - (state.telemetry.pitchDeg * Math.PI) / 180;
      controls.elevator = Math.max(-0.4, Math.min(0.4, vsError * 0.03 + pitchError * 1.8));
      controls.aileron = -state.telemetry.rollDeg * 0.04;
      controls.rudder = 0.04; // Compensar par de hélice
      state = stepFlightSimulation(state, controls, c172, { x: 0, y: 0, z: 0 }, FIXED_DT);
    }

    expect(state.telemetry.iasKnots).toBeGreaterThan(95);
    expect(state.telemetry.iasKnots).toBeLessThan(132);
    expect(state.telemetry.isStalling).toBe(false);
  });

  it('2. Con potencia en ralentí y manteniendo nariz arriba entra en pérdida cerca de Vs1 (~48 kt) sin flaps', () => {
    let state = createInitialSimulationState(c172, {
      position: { x: 0, y: 900, z: 0 },
      velocity: { x: knotsToMps(58), y: 0, z: 0 },
      yawRad: 0,
      pitchRad: 0.02,
      throttle: 0.0
    });

    const controls = createInitialFlightControls();
    controls.throttle = 0.0;
    controls.flapIndex = 0; // Flaps 0°
    controls.parkingBrake = false;

    let stallSpeedCleanKnots = 0;
    for (let i = 0; i < 35 * 120; i++) {
      const targetPitchDeg = Math.max(-5, Math.min(18, -state.rigidBody.velocity.y * 4.5 + 2.5));
      const pitchErrDeg = targetPitchDeg - state.telemetry.pitchDeg;
      controls.elevator = Math.max(-0.5, Math.min(1.0, pitchErrDeg * 0.08));
      state = stepFlightSimulation(state, controls, c172, { x: 0, y: 0, z: 0 }, FIXED_DT);
      if (state.telemetry.isStalling) {
        stallSpeedCleanKnots = state.telemetry.iasKnots;
        break;
      }
    }

    expect(stallSpeedCleanKnots).toBeGreaterThan(43);
    expect(stallSpeedCleanKnots).toBeLessThan(53);
  });

  it('3. Con flaps a 30° la velocidad de pérdida (Vso) es menor que con flaps a 0° (Vs1)', () => {
    const findStallSpeedForFlaps = (flapIndex: number): number => {
      let state = createInitialSimulationState(c172, {
        position: { x: 0, y: 900, z: 0 },
        velocity: { x: knotsToMps(58), y: 0, z: 0 },
        yawRad: 0,
        pitchRad: 0.02,
        throttle: 0.0
      });
      const controls = createInitialFlightControls();
      controls.throttle = 0;
      controls.flapIndex = flapIndex;
      controls.parkingBrake = false;

      for (let i = 0; i < 35 * 120; i++) {
        const targetPitchDeg = Math.max(-5, Math.min(18, -state.rigidBody.velocity.y * 4.5 + 2.5));
        const pitchErrDeg = targetPitchDeg - state.telemetry.pitchDeg;
        controls.elevator = Math.max(-0.5, Math.min(1.0, pitchErrDeg * 0.08));
        state = stepFlightSimulation(state, controls, c172, { x: 0, y: 0, z: 0 }, FIXED_DT);
        if (state.telemetry.isStalling) {
          return state.telemetry.iasKnots;
        }
      }
      return state.telemetry.iasKnots;
    };

    const vsClean = findStallSpeedForFlaps(0);
    const vsFlaps30 = findStallSpeedForFlaps(3);

    expect(vsFlaps30).toBeLessThan(vsClean - 3.5);
    expect(vsFlaps30).toBeGreaterThan(36);
    expect(vsFlaps30).toBeLessThan(46);
  });

  it('4. Carrera de despegue a nivel del mar sin viento está en un rango plausible (~230–420 m)', () => {
    const startPos = { x: -1400, y: 1.24, z: 0 };
    let state = createInitialSimulationState(c172, {
      position: startPos,
      velocity: { x: 0, y: 0, z: 0 },
      yawRad: 0,
      pitchRad: 0,
      throttle: 0
    });

    const controls = createInitialFlightControls();
    controls.throttle = 1.0; // Potencia completa
    controls.parkingBrake = false;
    controls.flapIndex = 1; // Flaps 10° para despegue

    let liftoffDistanceMeters = 0;
    for (let i = 0; i < 30 * 120; i++) {
      // Mantener eje de pista con timón y rotar suavemente al llegar a Vr (55 kt)
      controls.rudder = -state.rigidBody.angularVelocityBody.y * 0.8 + 0.08;
      if (state.telemetry.iasKnots >= c172.vSpeedsKnots.Vr) {
        controls.elevator = 0.75; // Rotar ~8-10°
      } else {
        controls.elevator = 0.0;
      }

      state = stepFlightSimulation(state, controls, c172, { x: 0, y: 0, z: 0 }, FIXED_DT);

      if (!state.telemetry.gear.anyWheelOnGround && state.telemetry.altitudeMetersAGL > 0.25) {
        liftoffDistanceMeters = Math.hypot(
          state.rigidBody.position.x - startPos.x,
          state.rigidBody.position.z - startPos.z
        );
        break;
      }
    }

    expect(liftoffDistanceMeters).toBeGreaterThan(210);
    expect(liftoffDistanceMeters).toBeLessThan(430);
  });

  it('5. La simulación es 100% determinista con el mismo input', () => {
    const runTrajectory = () => {
      let s = createInitialSimulationState(c172, {
        position: { x: -1000, y: 120, z: 0 },
        velocity: { x: 45, y: 1, z: 0 },
        yawRad: 0.1,
        throttle: 0.85
      });
      const c = createInitialFlightControls();
      c.throttle = 0.85;
      c.elevator = 0.12;
      c.aileron = 0.18;
      c.rudder = -0.05;
      c.parkingBrake = false;

      for (let i = 0; i < 600; i++) {
        s = stepFlightSimulation(s, c, c172, { x: 2.5, y: 0, z: -1.2 }, FIXED_DT);
      }
      return s;
    };

    const runA = runTrajectory();
    const runB = runTrajectory();

    expect(runA.rigidBody.position).toEqual(runB.rigidBody.position);
    expect(runA.rigidBody.velocity).toEqual(runB.rigidBody.velocity);
    expect(runA.rigidBody.orientation).toEqual(runB.rigidBody.orientation);
    expect(runA.telemetry.CL).toBe(runB.telemetry.CL);
  });
});
