/**
 * Controlador de Teclado para "Pista Uno".
 * Mapeo completo:
 * - Cabeceo (Pitch): W/S o Flechas ↑/↓ (S o ↓ = tirar del cuerno / subir nariz; W o ↑ = bajar nariz)
 * - Alabeo (Roll): A/D o Flechas ←/→
 * - Timón (Yaw): Q/E
 * - Acelerador: Shift (subir) / Ctrl (bajar) o + / -
 * - Flaps: F (bajar un punto) / R (subir un punto)
 * - Frenos: B (ambos), , (izquierdo), . (derecho)
 * - Freno de estacionamiento: P
 * - Trim de cabeceo: T (nariz abajo) / G (nariz arriba)
 * - Cambiar cámara: C
 * - Panel Debug: F3
 * - Pausa / Reiniciar: Esc / Backspace
 */

import { FlightControlsInput } from '../physics/flightModel';
import { DEFAULT_SMOOTHING, moveTowards } from './controlSmoothing';

export interface KeyboardActions {
  onToggleCamera?: () => void;
  onToggleDebug?: () => void;
  onResetSim?: () => void;
}

export class KeyboardController {
  private pressed = new Set<string>();

  constructor(actions: KeyboardActions) {
    window.addEventListener('keydown', (e) => {
      this.pressed.add(e.code);

      if (e.code === 'KeyF' && !e.repeat) {
        this.flapDelta = 1;
      } else if (e.code === 'KeyR' && !e.repeat) {
        this.flapDelta = -1;
      } else if (e.code === 'KeyP' && !e.repeat) {
        this.toggleParkingBrake = true;
      } else if (e.code === 'KeyC' && !e.repeat) {
        actions.onToggleCamera?.();
      } else if (e.code === 'F3' && !e.repeat) {
        e.preventDefault();
        actions.onToggleDebug?.();
      } else if (e.code === 'Backspace' && !e.repeat) {
        actions.onResetSim?.();
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.pressed.delete(e.code);
    });
  }

  private flapDelta = 0;
  private toggleParkingBrake = false;

  public update(controls: FlightControlsInput, dt: number): void {
    // 1. Cabeceo: S / ArrowDown tira del cuerno (+elevator = subir nariz), W / ArrowUp empuja (-elevator = bajar nariz)
    // Limitamos el recorrido máximo de teclado a ±0.62 para que sea dócil y progresivo
    let pitchTarget = 0;
    if (this.pressed.has('KeyS') || this.pressed.has('ArrowDown')) pitchTarget += 0.62;
    if (this.pressed.has('KeyW') || this.pressed.has('ArrowUp')) pitchTarget -= 0.55;

    // 2. Alabeo: D / ArrowRight (+aileron = derecha), A / ArrowLeft (-aileron = izquierda)
    let rollTarget = 0;
    if (this.pressed.has('KeyD') || this.pressed.has('ArrowRight')) rollTarget += 0.58;
    if (this.pressed.has('KeyA') || this.pressed.has('ArrowLeft')) rollTarget -= 0.58;

    // 3. Timón: E (+rudder = derecha), Q (-rudder = izquierda)
    let yawTarget = 0;
    if (this.pressed.has('KeyE')) yawTarget += 0.55;
    if (this.pressed.has('KeyQ')) yawTarget -= 0.55;

    const slew = DEFAULT_SMOOTHING.keyboardSlewRatePerSec * dt;
    const returnSlew = slew * 1.85;

    controls.elevator = moveTowards(
      controls.elevator,
      pitchTarget,
      pitchTarget === 0 ? returnSlew : slew
    );
    controls.aileron = moveTowards(
      controls.aileron,
      rollTarget,
      rollTarget === 0 ? returnSlew : slew
    );
    controls.rudder = moveTowards(
      controls.rudder,
      yawTarget,
      yawTarget === 0 ? returnSlew : slew
    );

    // 4. Acelerador progresivo: Shift / Equal (+) sube, Control / Minus (-) baja
    if (
      this.pressed.has('ShiftLeft') ||
      this.pressed.has('ShiftRight') ||
      this.pressed.has('Equal') ||
      this.pressed.has('NumpadAdd')
    ) {
      controls.throttle = Math.min(1, controls.throttle + 0.42 * dt);
    }
    if (
      this.pressed.has('ControlLeft') ||
      this.pressed.has('ControlRight') ||
      this.pressed.has('Minus') ||
      this.pressed.has('NumpadSubtract')
    ) {
      controls.throttle = Math.max(0, controls.throttle - 0.42 * dt);
    }

    // 5. Trim de cabeceo: G sube nariz, T baja nariz
    if (this.pressed.has('KeyG')) {
      controls.elevatorTrim = Math.min(0.4, controls.elevatorTrim + 0.12 * dt);
    }
    if (this.pressed.has('KeyT')) {
      controls.elevatorTrim = Math.max(-0.4, controls.elevatorTrim - 0.12 * dt);
    }

    // 6. Flaps por pasos (0°, 10°, 20°, 30°)
    if (this.flapDelta !== 0) {
      controls.flapIndex = Math.max(0, Math.min(3, controls.flapIndex + this.flapDelta));
      this.flapDelta = 0;
    }

    // 7. Freno de estacionamiento y frenos de pedal
    if (this.toggleParkingBrake) {
      controls.parkingBrake = !controls.parkingBrake;
      this.toggleParkingBrake = false;
    }

    const bothBrakes = this.pressed.has('KeyB') ? 1 : 0;
    controls.brakeLeft = Math.max(bothBrakes, this.pressed.has('Comma') ? 1 : 0);
    controls.brakeRight = Math.max(bothBrakes, this.pressed.has('Period') ? 1 : 0);
  }
}
