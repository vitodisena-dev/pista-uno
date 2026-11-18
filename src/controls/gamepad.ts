/**
 * Soporte prioritario para Mando de Xbox en Mac (Apple Silicon + Google Chrome) vía Gamepad API.
 * Mapeo Estándar (W3C Standard Gamepad Mapping en Chrome macOS):
 * - Stick izquierdo (axes[0], axes[1]): Alabeo y Cabeceo
 * - Stick derecho (axes[2], axes[3]): Mirar alrededor en cabina · Botón 11 (R3): Centrar vista
 * - LB (buttons[4]) / RB (buttons[5]): Timón izquierda / derecha (y rueda de nariz en tierra)
 * - LT (buttons[6]) / RT (buttons[7]): Bajar / Subir acelerador (se queda donde lo dejas)
 * - A (buttons[0]): Frenos (mantener presionado)
 * - B (buttons[1]): Mostrar / ocultar ayudas
 * - X (buttons[2]): Freno de estacionamiento (toggle)
 * - Y (buttons[3]): Cambiar cámara
 * - Cruceta ↑/↓ (buttons[12]/buttons[13]): Trim de cabeceo
 * - Cruceta ←/→ (buttons[14]/buttons[15]): Subir / Bajar flaps
 * - Vibración (vibrationActuator): motor, toque de pista y sacudida de pérdida (stall buffet).
 */

import { FlightControlsInput } from '../physics/flightModel';
import { applyDeadzoneAndExpo } from './controlSmoothing';

export interface GamepadCallbacks {
  onStatusChange?: (connected: boolean, id: string) => void;
  onToggleCamera?: () => void;
  onToggleHelp?: () => void;
  onCenterView?: () => void;
}

export class XboxGamepadController {
  private gamepadIndex: number | null = null;
  private prevButtons: boolean[] = [];
  public lookYawRad = 0;
  public lookPitchRad = 0;

  constructor(private callbacks: GamepadCallbacks) {
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadIndex = e.gamepad.index;
      this.callbacks.onStatusChange?.(true, e.gamepad.id);
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null;
        this.callbacks.onStatusChange?.(false, e.gamepad.id);
      }
    });
  }

  public isConnected(): boolean {
    return this.gamepadIndex !== null;
  }

  public update(controls: FlightControlsInput, dt: number): boolean {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = this.gamepadIndex !== null ? pads[this.gamepadIndex] : pads.find((p) => p !== null);
    if (!gp) return false;

    if (this.gamepadIndex === null) {
      this.gamepadIndex = gp.index;
      this.callbacks.onStatusChange?.(true, gp.id);
    }

    // 1. Stick Izquierdo: Alabeo (axes[0]) y Cabeceo (axes[1]: hacia atrás +1 = subir nariz)
    // Aplicamos curva exponencial suave y filtro de paso bajo para que no tenga tirones bruscos
    const rawRoll = gp.axes[0] ?? 0;
    const rawPitch = gp.axes[1] ?? 0;
    const stickAileron = applyDeadzoneAndExpo(rawRoll) * 0.78;
    const stickElevator = applyDeadzoneAndExpo(rawPitch) * 0.75;
    const smoothAlpha = Math.min(1, dt * 11.0);

    if (Math.abs(rawRoll) > 0.08) {
      controls.aileron += (stickAileron - controls.aileron) * smoothAlpha;
    }
    if (Math.abs(rawPitch) > 0.08) {
      controls.elevator += (stickElevator - controls.elevator) * smoothAlpha;
    }

    // 2. LB (4) / RB (5): Timón y rueda de nariz con curva suave
    const lb = gp.buttons[4]?.value ?? 0;
    const rb = gp.buttons[5]?.value ?? 0;
    if (lb > 0.05 || rb > 0.05) {
      const targetRudder = Math.sign(rb - lb) * Math.pow(Math.abs(rb - lb), 1.6) * 0.75;
      controls.rudder += (targetRudder - controls.rudder) * smoothAlpha;
    }

    // 3. LT (6) / RT (7): Acelerador incremental que conserva su posición
    const lt = gp.buttons[6]?.value ?? 0;
    const rt = gp.buttons[7]?.value ?? 0;
    if (rt > 0.05 || lt > 0.05) {
      controls.throttle = Math.max(0, Math.min(1, controls.throttle + (rt - lt) * 0.55 * dt));
    }

    // 4. Stick Derecho (axes[2], axes[3]): Mirar alrededor
    const lookX = applyDeadzoneAndExpo(gp.axes[2] ?? 0, 0.1, 1.4);
    const lookY = applyDeadzoneAndExpo(gp.axes[3] ?? 0, 0.1, 1.4);
    this.lookYawRad = Math.max(-1.6, Math.min(1.6, this.lookYawRad - lookX * 1.8 * dt));
    this.lookPitchRad = Math.max(-0.8, Math.min(0.8, this.lookPitchRad - lookY * 1.4 * dt));

    // Clic del stick derecho (R3 = botón 11): centrar vista
    if (this.wasJustPressed(gp, 11)) {
      this.lookYawRad = 0;
      this.lookPitchRad = 0;
      this.callbacks.onCenterView?.();
    }

    // 5. Botón A (0): Frenos (mantener presionado)
    if (gp.buttons[0]?.pressed) {
      controls.brakeLeft = 1;
      controls.brakeRight = 1;
    }

    // 6. Botón X (2): Freno de estacionamiento
    if (this.wasJustPressed(gp, 2)) {
      controls.parkingBrake = !controls.parkingBrake;
    }

    // 7. Botón Y (3): Cambiar cámara · Botón B (1): Mostrar/ocultar ayudas
    if (this.wasJustPressed(gp, 3)) {
      this.callbacks.onToggleCamera?.();
    }
    if (this.wasJustPressed(gp, 1)) {
      this.callbacks.onToggleHelp?.();
    }

    // 8. Cruceta ↑ (12) / ↓ (13): Trim de cabeceo
    if (gp.buttons[12]?.pressed) {
      controls.elevatorTrim = Math.min(0.4, controls.elevatorTrim + 0.12 * dt);
    }
    if (gp.buttons[13]?.pressed) {
      controls.elevatorTrim = Math.max(-0.4, controls.elevatorTrim - 0.12 * dt);
    }

    // 9. Cruceta ← (14) / → (15): Subir / bajar flaps
    if (this.wasJustPressed(gp, 14)) {
      controls.flapIndex = Math.max(0, controls.flapIndex - 1);
    }
    if (this.wasJustPressed(gp, 15)) {
      controls.flapIndex = Math.min(3, controls.flapIndex + 1);
    }

    // Guardar estado de botones para detección de flanco
    this.prevButtons = gp.buttons.map((b) => b.pressed);
    return true;
  }

  private wasJustPressed(gp: Gamepad, buttonIdx: number): boolean {
    const curr = gp.buttons[buttonIdx]?.pressed ?? false;
    const prev = this.prevButtons[buttonIdx] ?? false;
    return curr && !prev;
  }

  /**
   * Activa la vibración háptica del mando de Xbox en Chrome (vibrationActuator).
   */
  public pulseVibration(weakMagnitude: number, strongMagnitude: number, durationMs: number = 90): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = this.gamepadIndex !== null ? pads[this.gamepadIndex] : null;
    const actuator = (gp as unknown as {
      vibrationActuator?: {
        playEffect: (
          type: string,
          params: {
            startDelay: number;
            duration: number;
            weakMagnitude: number;
            strongMagnitude: number;
          }
        ) => Promise<void>;
      };
    })?.vibrationActuator;

    if (actuator && typeof actuator.playEffect === 'function') {
      actuator
        .playEffect('dual-rumble', {
          startDelay: 0,
          duration: durationMs,
          weakMagnitude: Math.max(0, Math.min(1, weakMagnitude)),
          strongMagnitude: Math.max(0, Math.min(1, strongMagnitude))
        })
        .catch(() => {
          // Ignorar si la pestaña aún no tiene gesto de usuario
        });
    }
  }
}
