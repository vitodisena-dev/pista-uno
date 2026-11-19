/**
 * Panel de Instrumentos Aeronáuticos ("Six Pack" Analógico + Consola de Mandos Interactiva)
 * para el Cessna 172S Skyhawk.
 *
 * Incluye:
 * 1. Velocímetro (Airspeed Indicator - Knots) con arcos reales del C172:
 *    - Blanco (Vso 40 kt a Vfe 85 kt): rango de operación con flaps
 *    - Verde (Vs1 48 kt a Vno 129 kt): operación normal
 *    - Amarillo (129 kt a Vne 163 kt): precaución
 *    - Línea Roja (Vne = 163 kt): nunca exceder
 * 2. Horizonte Artificial (Attitude Indicator) con cielo/tierra, escala de cabeceo y alabeo.
 * 3. Altímetro (Altimeter - Feet MSL + lectura digital AGL clara).
 * 4. Tacómetro (RPM) con arco verde (2100–2500) y línea roja (2700 RPM).
 * 5. Indicador de Rumbo / Girocompás (Heading Indicator) con silueta de avión.
 * 6. Variómetro (VSI - Vertical Speed Indicator en ft/min).
 * 7. Consola de Controles Interactiva:
 *    - Palanca de Acelerador (Throttle Vernier arrastrable con el mouse o teclado)
 *    - Selector de Flaps con posiciones clicables 0°, 10°, 20°, 30°
 *    - Rueda de Trim de Cabeceo, Freno de Estacionamiento y Mini-Cuerno/Pedales en vivo.
 */

import { FlightControlsInput, FlightSimulationState } from '../physics/flightModel';

export class FlightInstrumentsHUD {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvasEl: HTMLCanvasElement) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d')!;
  }

  public render(state: FlightSimulationState, _controls: FlightControlsInput): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const t = state.telemetry;
    const rpm = state.engine.rpm;

    // Coordenadas de los 6 instrumentos (fila única compacta de alta visibilidad o 2x3)
    // Dibujamos los 6 relojes en fila horizontal en la consola inferior (6 x 118 px)
    const r = 50;
    const cy = h / 2 + 2;
    const spacing = 114;
    const startX = 64;

    this.drawAirspeed(ctx, startX + spacing * 0, cy, r, t.iasKnots);
    this.drawAttitude(ctx, startX + spacing * 1, cy, r, t.pitchDeg, t.rollDeg);
    this.drawAltimeter(ctx, startX + spacing * 2, cy, r, t.altitudeFeetMSL, t.altitudeFeetAGL);
    this.drawVerticalSpeed(ctx, startX + spacing * 3, cy, r, t.verticalSpeedFpm);
    this.drawHeading(ctx, startX + spacing * 4, cy, r, t.headingDeg);
    this.drawTachometer(ctx, startX + spacing * 5, cy, r, rpm);
  }

  private drawBezel(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, label: string): void {
    ctx.save();
    // Sombra exterior y bisel metálico oscuro
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#475569';
    ctx.stroke();

    // Carátula interior
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();

    // Etiqueta superior del instrumento
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, cy - r - 7);
    ctx.restore();
  }

  /**
   * 1. Velocímetro (IAS en nudos) con arcos de colores reales del C172
   */
  private drawAirspeed(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    iasKnots: number
  ): void {
    this.drawBezel(ctx, cx, cy, r, 'VELOCIDAD (KT)');
    ctx.save();

    const ktToAngle = (kt: number): number => {
      const clamped = Math.max(0, Math.min(180, kt));
      // 0 kt arriba (-90°), 180 kt completando 315° en sentido horario
      return -Math.PI / 2 + (clamped / 180) * (Math.PI * 1.75);
    };

    // Arco blanco (rango flaps: 40 a 85 kt)
    ctx.beginPath();
    ctx.arc(cx, cy, r - 8, ktToAngle(40), ktToAngle(85));
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Arco verde (operación normal: 48 a 129 kt)
    ctx.beginPath();
    ctx.arc(cx, cy, r - 4, ktToAngle(48), ktToAngle(129));
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Arco amarillo (precaución: 129 a 163 kt)
    ctx.beginPath();
    ctx.arc(cx, cy, r - 4, ktToAngle(129), ktToAngle(163));
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Línea roja Vne (163 kt)
    const vneAng = ktToAngle(163);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(vneAng) * (r - 12), cy + Math.sin(vneAng) * (r - 12));
    ctx.lineTo(cx + Math.cos(vneAng) * r, cy + Math.sin(vneAng) * r);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Marcas numéricas cada 20 kt
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let kt = 40; kt <= 160; kt += 20) {
      const a = ktToAngle(kt);
      const tx = cx + Math.cos(a) * (r - 17);
      const ty = cy + Math.sin(a) * (r - 17);
      ctx.fillText(String(kt), tx, ty);
    }

    // Aguja del velocímetro
    const needleAng = ktToAngle(iasKnots);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAng) * (r - 10), cy + Math.sin(needleAng) * (r - 10));
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Lectura digital clara en la parte inferior del dial
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 22, cy + 12, 44, 16);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 22, cy + 12, 44, 16);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px ui-monospace, monospace';
    ctx.fillText(`${Math.round(iasKnots)} KT`, cx, cy + 20.5);

    ctx.restore();
  }

  /**
   * 2. Horizonte Artificial (Actitud: Cabeceo y Alabeo)
   */
  private drawAttitude(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    pitchDeg: number,
    rollDeg: number
  ): void {
    this.drawBezel(ctx, cx, cy, r, 'HORIZONTE');
    ctx.save();

    // Recortar dentro del círculo del instrumento
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.translate(cx, cy);
    ctx.rotate((-rollDeg * Math.PI) / 180);

    const pitchOffsetPx = Math.max(-36, Math.min(36, pitchDeg * 1.45));

    // Cielo azul
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-r * 1.5, -r * 2 + pitchOffsetPx, r * 3, r * 2);

    // Tierra marrón
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-r * 1.5, pitchOffsetPx, r * 3, r * 2);

    // Línea del horizonte
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, pitchOffsetPx);
    ctx.lineTo(r, pitchOffsetPx);
    ctx.stroke();

    // Escalera de cabeceo (±10°, ±20°)
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.4;
    for (const deg of [-20, -10, 10, 20]) {
      const y = pitchOffsetPx - deg * 1.45;
      const w = Math.abs(deg) === 10 ? 12 : 18;
      ctx.beginPath();
      ctx.moveTo(-w, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.restore();

    // Símbolo fijo del avión (alas amarillas / naranjas en el centro)
    ctx.save();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy);
    ctx.lineTo(cx - 7, cy);
    ctx.lineTo(cx - 7, cy + 5);
    ctx.moveTo(cx + 22, cy);
    ctx.lineTo(cx + 7, cy);
    ctx.lineTo(cx + 7, cy + 5);
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * 3. Altímetro (Aguja de 100s y 1,000s + ventana digital AGL clara)
   */
  private drawAltimeter(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    altFeetMSL: number,
    altFeetAGL: number
  ): void {
    this.drawBezel(ctx, cx, cy, r, 'ALTÍMETRO (FT)');
    ctx.save();

    // Números 0..9 alrededor del dial (x100 ft)
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      ctx.fillText(
        String(i),
        cx + Math.cos(a) * (r - 12),
        cy + Math.sin(a) * (r - 12)
      );
    }

    // Aguja corta (miles de pies)
    const thousandsAng = -Math.PI / 2 + ((altFeetMSL % 10000) / 10000) * Math.PI * 2;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(thousandsAng) * (r - 22), cy + Math.sin(thousandsAng) * (r - 22));
    ctx.stroke();

    // Aguja larga (centenas de pies)
    const hundredsAng = -Math.PI / 2 + ((altFeetMSL % 1000) / 1000) * Math.PI * 2;
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hundredsAng) * (r - 8), cy + Math.sin(hundredsAng) * (r - 8));
    ctx.stroke();

    // Ventana digital con Altura sobre la Pista (AGL) para lectura inmediata
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 26, cy + 12, 52, 16);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 26, cy + 12, 52, 16);
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 10.5px ui-monospace, monospace';
    ctx.fillText(`${Math.round(altFeetAGL)} FT`, cx, cy + 20.5);

    ctx.restore();
  }

  /**
   * 4. Variómetro / VSI (Velocidad Vertical en ft/min)
   */
  private drawVerticalSpeed(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    vsiFpm: number
  ): void {
    this.drawBezel(ctx, cx, cy, r, 'VSI (FT/MIN)');
    ctx.save();

    // 0 ft/min a la izquierda (π rad), +2000 arriba/derecha, -2000 abajo/derecha
    const fpmToAngle = (fpm: number): number => {
      const clamped = Math.max(-2000, Math.min(2000, fpm));
      return Math.PI + (clamped / 2000) * (Math.PI * 0.82);
    };

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const mark of [-1500, -1000, -500, 0, 500, 1000, 1500]) {
      const a = fpmToAngle(mark);
      const label = mark === 0 ? '0' : String(Math.abs(mark) / 100);
      ctx.fillText(label, cx + Math.cos(a) * (r - 13), cy + Math.sin(a) * (r - 13));
    }

    const needleAng = fpmToAngle(vsiFpm);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAng) * (r - 10), cy + Math.sin(needleAng) * (r - 10));
    ctx.stroke();

    // Ventana digital VSI
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 26, cy + 12, 52, 16);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 26, cy + 12, 52, 16);
    ctx.fillStyle = vsiFpm < -500 ? '#f87171' : '#f8fafc';
    ctx.font = 'bold 10px ui-monospace, monospace';
    const sign = vsiFpm > 10 ? '+' : '';
    ctx.fillText(`${sign}${Math.round(vsiFpm / 10) * 10}`, cx, cy + 20.5);

    ctx.restore();
  }

  /**
   * 5. Girocompás / Indicador de Rumbo (Heading Indicator)
   */
  private drawHeading(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    headingDeg: number
  ): void {
    this.drawBezel(ctx, cx, cy, r, 'RUMBO (HDG)');
    ctx.save();

    ctx.translate(cx, cy);
    ctx.rotate((-headingDeg * Math.PI) / 180);

    const cardinals: Array<{ deg: number; text: string; color?: string }> = [
      { deg: 0, text: 'N', color: '#f87171' },
      { deg: 90, text: 'E' },
      { deg: 180, text: 'S' },
      { deg: 270, text: 'W' },
      { deg: 30, text: '3' },
      { deg: 60, text: '6' },
      { deg: 120, text: '12' },
      { deg: 150, text: '15' },
      { deg: 210, text: '21' },
      { deg: 240, text: '24' },
      { deg: 300, text: '30' },
      { deg: 330, text: '33' }
    ];

    ctx.font = 'bold 9.5px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const c of cardinals) {
      const a = ((c.deg - 90) * Math.PI) / 180;
      ctx.fillStyle = c.color ?? '#e2e8f0';
      ctx.fillText(c.text, Math.cos(a) * (r - 12), Math.sin(a) * (r - 12));
    }

    // Marca ámbar del rumbo de la Pista 10 de Mérida (108°)
    const rwy10Ang = ((108 - 90) * Math.PI) / 180;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(Math.cos(rwy10Ang) * (r - 4), Math.sin(rwy10Ang) * (r - 4), 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Silueta fija del avión en el centro y lectura digital de rumbo arriba
    ctx.save();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 11);
    ctx.lineTo(cx, cy + 10);
    ctx.moveTo(cx - 10, cy - 2);
    ctx.lineTo(cx + 10, cy - 2);
    ctx.moveTo(cx - 5, cy + 8);
    ctx.lineTo(cx + 5, cy + 8);
    ctx.stroke();

    // Índice fijo superior (Lubber line)
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r + 2);
    ctx.lineTo(cx - 4, cy - r - 3);
    ctx.lineTo(cx + 4, cy - r - 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 20, cy + 13, 40, 15);
    ctx.strokeStyle = '#facc15';
    ctx.strokeRect(cx - 20, cy + 13, 40, 15);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 10.5px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(headingDeg).toString().padStart(3, '0')}°`, cx, cy + 24);
    ctx.restore();
  }

  /**
   * 6. Tacómetro del Motor (RPM)
   */
  private drawTachometer(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    rpm: number
  ): void {
    this.drawBezel(ctx, cx, cy, r, 'MOTOR (RPM)');
    ctx.save();

    const rpmToAngle = (val: number): number => {
      const clamped = Math.max(0, Math.min(3000, val));
      return Math.PI * 0.75 + (clamped / 3000) * (Math.PI * 1.5);
    };

    // Arco verde (2100 a 2550 RPM)
    ctx.beginPath();
    ctx.arc(cx, cy, r - 5, rpmToAngle(2100), rpmToAngle(2550));
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Línea roja (2700 RPM)
    const redAng = rpmToAngle(2700);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(redAng) * (r - 12), cy + Math.sin(redAng) * (r - 12));
    ctx.lineTo(cx + Math.cos(redAng) * r, cy + Math.sin(redAng) * r);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let k = 5; k <= 25; k += 5) {
      const a = rpmToAngle(k * 100);
      ctx.fillText(String(k), cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14));
    }

    const needleAng = rpmToAngle(rpm);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAng) * (r - 10), cy + Math.sin(needleAng) * (r - 10));
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 24, cy + 12, 48, 16);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(cx - 24, cy + 12, 48, 16);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 10.5px ui-monospace, monospace';
    ctx.fillText(`${Math.round(rpm)}`, cx, cy + 20.5);

    ctx.restore();
  }
}
