/**
 * Panel de Debug en tiempo real (Tecla F3) y Vectores 3D de Fuerza sobre el avión.
 * Muestra: α, β, CL, CD, sustentación, resistencia, empuje, peso, TAS vs IAS,
 * densidad del aire y fuerzas en cada rueda.
 */

import * as THREE from 'three';
import { FlightControlsInput, FlightSimulationState } from '../physics/flightModel';
import { Vec3 } from '../physics/integrator';

export class DebugPanel {
  private visible = true;
  private container: HTMLElement;
  private vectorGroup: THREE.Group;
  private liftArrow: THREE.ArrowHelper;
  private dragArrow: THREE.ArrowHelper;
  private thrustArrow: THREE.ArrowHelper;
  private weightArrow: THREE.ArrowHelper;

  constructor(scene: THREE.Scene, containerEl: HTMLElement) {
    this.container = containerEl;
    this.vectorGroup = new THREE.Group();

    const origin = new THREE.Vector3();
    // Verde = Sustentación (Lift), Rojo = Resistencia (Drag), Cian = Empuje (Thrust), Amarillo = Peso (Weight)
    this.liftArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), origin, 3, 0x22c55e, 0.5, 0.3);
    this.dragArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), origin, 2, 0xef4444, 0.4, 0.25);
    this.thrustArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), origin, 2, 0x38bdf8, 0.4, 0.25);
    this.weightArrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), origin, 3, 0xfacc15, 0.5, 0.3);

    this.vectorGroup.add(this.liftArrow, this.dragArrow, this.thrustArrow, this.weightArrow);
    scene.add(this.vectorGroup);
  }

  public toggle(): void {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? 'block' : 'none';
    this.vectorGroup.visible = this.visible;
  }

  public isVisible(): boolean {
    return this.visible;
  }

  private updateArrow(arrow: THREE.ArrowHelper, vec: Vec3, scale: number): void {
    const mag = Math.hypot(vec.x, vec.y, vec.z);
    if (mag < 5) {
      arrow.visible = false;
      return;
    }
    arrow.visible = true;
    const dir = new THREE.Vector3(vec.x / mag, vec.y / mag, vec.z / mag);
    arrow.setDirection(dir);
    const len = Math.min(8.5, Math.max(0.6, mag * scale));
    arrow.setLength(len, Math.min(0.6, len * 0.22), Math.min(0.35, len * 0.14));
  }

  public update(
    simState: FlightSimulationState,
    controls: FlightControlsInput,
    aircraftWorldPos: THREE.Vector3
  ): void {
    if (!this.visible) return;

    const t = simState.telemetry;
    const e = simState.engine;

    // Posicionar flechas 3D en el centro de gravedad del avión
    this.vectorGroup.position.copy(aircraftWorldPos);
    const forceScale = 1 / 2500; // 10,000 N -> 4.0 metros de flecha
    this.updateArrow(this.liftArrow, t.liftVectorWorldN, forceScale);
    this.updateArrow(this.dragArrow, t.dragVectorWorldN, forceScale);
    this.updateArrow(this.thrustArrow, t.thrustVectorWorldN, forceScale);
    this.updateArrow(this.weightArrow, t.weightVectorWorldN, forceScale);

    const flapDeg = [0, 10, 20, 30][controls.flapIndex] ?? 0;

    this.container.innerHTML = `
      <div style="font-weight:700;color:#38bdf8;margin-bottom:6px;display:flex;justify-content:space-between;">
        <span>🔬 TELEMETRÍA FÍSICA 6-DOF (F3)</span>
        <span style="color:${t.isStalling ? '#ef4444' : t.stallWarning ? '#f59e0b' : '#4ade80'}">
          ${t.isStalling ? '⚠️ STALL / PÉRDIDA' : t.stallWarning ? '⚠️ AVISO PÉRDIDA' : 'FLUJO ADHERIDO'}
        </span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 14px;font-family:ui-monospace,monospace;font-size:12px;">
        <div>α (AoA): <strong>${t.alphaDeg.toFixed(2)}°</strong></div>
        <div>β (Sideslip): <strong>${t.betaDeg.toFixed(2)}°</strong></div>
        <div>CL: <strong>${t.CL.toFixed(3)}</strong></div>
        <div>CD: <strong>${t.CD.toFixed(4)}</strong></div>
        <div>Sustentación (L): <strong style="color:#4ade80">${Math.round(t.liftN)} N</strong></div>
        <div>Resistencia (D): <strong style="color:#f87171">${Math.round(t.dragN)} N</strong></div>
        <div>Empuje (T): <strong style="color:#38bdf8">${Math.round(t.thrustN)} N</strong></div>
        <div>Peso (W): <strong style="color:#facc15">${Math.round(t.weightN)} N</strong></div>
        <div>IAS / TAS: <strong>${t.iasKnots.toFixed(1)} / ${t.tasKnots.toFixed(1)} kt</strong></div>
        <div>Altitud AGL: <strong>${Math.round(t.altitudeFeetAGL)} ft</strong></div>
        <div>VSI: <strong>${Math.round(t.verticalSpeedFpm)} ft/min</strong></div>
        <div>Densidad ρ: <strong>${t.airDensityKgPerM3.toFixed(3)} kg/m³</strong></div>
        <div>Motor RPM: <strong>${Math.round(e.rpm)} RPM</strong></div>
        <div>Acelerador: <strong>${Math.round(controls.throttle * 100)}%</strong></div>
        <div>Flaps / Trim: <strong>${flapDeg}° / ${(controls.elevatorTrim * 100).toFixed(0)}%</strong></div>
        <div>Efecto Suelo: <strong>${((1 - t.groundEffectFactor) * 100).toFixed(0)}% red. CDi</strong></div>
        <div>Rueda Nariz: <strong>${Math.round(t.gear.noseWheel.normalForceN)} N</strong></div>
        <div>Ruedas Ppal (I/D): <strong>${Math.round(t.gear.leftWheel.normalForceN)} / ${Math.round(t.gear.rightWheel.normalForceN)} N</strong></div>
      </div>
    `;
  }
}
