import * as THREE from 'three';
import { FlightControlsInput } from '../physics/flightModel';

export interface C172Rig {
  aircraftGroup: THREE.Group;
  propellerGroup: THREE.Group;
  propDiscMesh: THREE.Mesh;
  leftAileronPivot: THREE.Group;
  rightAileronPivot: THREE.Group;
  leftFlapPivot: THREE.Group;
  rightFlapPivot: THREE.Group;
  elevatorPivot: THREE.Group;
  rudderPivot: THREE.Group;
  noseGearPivot: THREE.Group;
  yokeWheelPivot: THREE.Group;
  cockpitCameraAnchor: THREE.Object3D;
}

/**
 * Construye una malla de perfil aerodinámico NACA 2412 extruido para el ala del Cessna 172,
 * con borde de ataque curvado, extradós arqueado y punta biselada.
 */
function createAirfoilGeometry(chord: number, span: number, thicknessRatio: number = 0.12): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const steps = 24;

  // Extradós (superficie superior desde borde de ataque x = +chord/2 hasta borde de salida x = -chord/2)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 en nariz, 1 en cola
    const x = (0.5 - t) * chord;
    // Distribución NACA de espesor + curvatura (camber)
    const yt =
      5 *
      thicknessRatio *
      chord *
      (0.2969 * Math.sqrt(t) - 0.126 * t - 0.3516 * t * t + 0.2843 * t * t * t - 0.1015 * Math.pow(t, 4));
    const yc = 0.024 * chord * 4 * t * (1 - t);
    const y = yc + yt;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }

  // Intradós (superficie inferior desde cola hasta nariz)
  for (let i = steps - 1; i >= 1; i--) {
    const t = i / steps;
    const x = (0.5 - t) * chord;
    const yt =
      5 *
      thicknessRatio *
      chord *
      (0.2969 * Math.sqrt(t) - 0.126 * t - 0.3516 * t * t + 0.2843 * t * t * t - 0.1015 * Math.pow(t, 4));
    const yc = 0.024 * chord * 4 * t * (1 - t);
    const y = yc - yt * 0.72;
    shape.lineTo(x, y);
  }
  shape.closePath();

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    steps: 1,
    depth: span,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.04,
    bevelSegments: 4
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Centrar a lo largo del eje Z (envergadura)
  geo.translate(0, 0, -span / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Genera una textura radial con anillos de motion-blur para el disco de la hélice a altas RPM.
 */
function createPropBlurTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const cx = 128;
  const cy = 128;

  // Sombra suave circular de las palas
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    const intensity = Math.pow(Math.abs(Math.sin(a * 2)), 3) * 0.38 + 0.06;
    ctx.strokeStyle = `rgba(30, 41, 59, ${intensity})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18);
    ctx.lineTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120);
    ctx.stroke();
  }

  // Anillo exterior blanco de seguridad en la punta de la hélice
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.55)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, 114, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Genera la textura de matrícula aeronáutica ("XB-MID" / SKYHAWK) para el costado del fuselaje.
 */
function createRegistrationDecalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 128);

  // Franjas aerodinámicas Skyhawk SP (Azul Marino + Azul Cielo + Dorado)
  ctx.fillStyle = '#0369a1';
  ctx.beginPath();
  ctx.moveTo(10, 62);
  ctx.lineTo(500, 38);
  ctx.lineTo(500, 66);
  ctx.lineTo(10, 82);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.moveTo(25, 88);
  ctx.lineTo(495, 72);
  ctx.lineTo(495, 82);
  ctx.lineTo(25, 96);
  ctx.closePath();
  ctx.fill();

  // Matrícula mexicana de Yucatán: XB-MID
  ctx.fillStyle = '#0f172a';
  ctx.font = 'italic bold 36px "Arial", sans-serif';
  ctx.fillText('XB-MID', 165, 52);

  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 16px "Arial", sans-serif';
  ctx.fillText('CESSNA 172S SKYHAWK', 165, 115);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Construye un modelo 3D de alta calidad con materiales PBR (Clearcoat, Metalness, EnvMap, Physical Glass)
 * del Cessna 172S Skyhawk, incluyendo cabina interior con cuerno (yoke) animado, perfil alar NACA 2412
 * y superficies de control articuladas.
 */
export function createC172Mesh(): C172Rig {
  const group = new THREE.Group();

  // Materiales PBR con barniz automotriz/aeronáutico (Clearcoat) que refleja el cielo de Mérida
  const paintWhitePBR = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    roughness: 0.18,
    metalness: 0.06,
    clearcoat: 0.92,
    clearcoatRoughness: 0.12
  });

  const paintBluePBR = new THREE.MeshPhysicalMaterial({
    color: 0x0284c7,
    roughness: 0.22,
    metalness: 0.25,
    clearcoat: 0.85,
    clearcoatRoughness: 0.15
  });

  const paintRedPBR = new THREE.MeshPhysicalMaterial({
    color: 0xdc2626,
    roughness: 0.22,
    metalness: 0.15,
    clearcoat: 0.85
  });

  const paintGoldPBR = new THREE.MeshPhysicalMaterial({
    color: 0xd97706,
    roughness: 0.28,
    metalness: 0.45,
    clearcoat: 0.7
  });

  const chromePBR = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.08,
    metalness: 0.95
  });

  const darkCarbonPBR = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.42,
    metalness: 0.35
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.72,
    metalness: 0.05
  });

  const tireRubberMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.88,
    metalness: 0.05
  });

  const glassPBR = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.06,
    metalness: 0.05,
    transmission: 0.72,
    transparent: true,
    opacity: 0.55,
    ior: 1.48,
    reflectivity: 0.9
  });

  // 1. Fuselaje Esculpido (Secciones elípticas suaves desde el spinner hasta la cola)
  // Capó del motor (Nose Cowling) esculpido con 24 segmentos
  const noseCowlGeo = new THREE.CylinderGeometry(0.36, 0.56, 1.45, 24);
  noseCowlGeo.rotateZ(-Math.PI / 2);
  const noseCowl = new THREE.Mesh(noseCowlGeo, paintWhitePBR);
  noseCowl.position.set(1.52, -0.02, 0);
  noseCowl.scale.set(1, 0.86, 1.06);
  noseCowl.castShadow = true;
  noseCowl.receiveShadow = true;
  group.add(noseCowl);

  // Tomas de aire duales del Lycoming IO-360 y faro de aterrizaje LED
  for (const side of [-1, 1]) {
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.15, 0.22), darkCarbonPBR);
    intake.position.set(2.19, -0.08, side * 0.19);
    group.add(intake);
  }
  const landingLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xfef08a })
  );
  landingLight.position.set(2.21, -0.22, 0);
  group.add(landingLight);

  // Tubo de escape cromado inferior
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.42, 12), chromePBR);
  exhaust.position.set(1.22, -0.5, 0.22);
  exhaust.rotation.z = 0.42;
  group.add(exhaust);

  // Sección de cabina inferior redondeada
  const cabinHullGeo = new THREE.CylinderGeometry(0.62, 0.62, 2.25, 24);
  cabinHullGeo.rotateZ(-Math.PI / 2);
  const cabinHull = new THREE.Mesh(cabinHullGeo, paintWhitePBR);
  cabinHull.position.set(0.02, -0.06, 0);
  cabinHull.scale.set(1, 0.84, 1.02);
  cabinHull.castShadow = true;
  cabinHull.receiveShadow = true;
  group.add(cabinHull);

  // Cono de cola ahusado (Tailcone elíptico suave de 24 caras)
  const tailConeGeo = new THREE.CylinderGeometry(0.16, 0.58, 3.75, 24);
  tailConeGeo.rotateZ(Math.PI / 2);
  const tailCone = new THREE.Mesh(tailConeGeo, paintWhitePBR);
  tailCone.position.set(-2.72, 0.08, 0);
  tailCone.scale.set(1, 0.9, 0.86);
  tailCone.castShadow = true;
  tailCone.receiveShadow = true;
  group.add(tailCone);

  // Calcomanías laterales con matrícula "XB-MID" y franjas Skyhawk
  const decalMat = new THREE.MeshBasicMaterial({
    map: createRegistrationDecalTexture(),
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -1
  });
  const leftDecal = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.72), decalMat);
  leftDecal.position.set(-1.35, 0.08, -0.52);
  leftDecal.rotation.y = -Math.PI / 2 + 0.095;
  group.add(leftDecal);

  const rightDecal = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.72), decalMat);
  rightDecal.position.set(-1.35, 0.08, 0.52);
  rightDecal.rotation.y = Math.PI / 2 - 0.095;
  group.add(rightDecal);

  // 2. Cabina Interior 3D Modelada (Tablero, Glareshield, Yoke Animado y Asientos)
  const glareshield = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 1.08), darkCarbonPBR);
  glareshield.position.set(0.68, 0.48, 0);
  group.add(glareshield);

  const instrumentPanelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 1.04), darkCarbonPBR);
  instrumentPanelMesh.position.set(0.55, 0.3, 0);
  group.add(instrumentPanelMesh);

  // Cuerno de mando (Yoke 3D animado en cabina)
  const yokeWheelPivot = new THREE.Group();
  yokeWheelPivot.position.set(0.38, 0.28, -0.24);
  const yokeShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.28, 10).rotateZ(Math.PI / 2),
    chromePBR
  );
  yokeShaft.position.x = 0.1;
  const yokeGripLeft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, 0.03), darkCarbonPBR);
  yokeGripLeft.position.set(0, 0.04, -0.12);
  const yokeGripRight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, 0.03), darkCarbonPBR);
  yokeGripRight.position.set(0, 0.04, 0.12);
  const yokeCross = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.26), darkCarbonPBR);
  yokeWheelPivot.add(yokeShaft, yokeGripLeft, yokeGripRight, yokeCross);
  group.add(yokeWheelPivot);

  // Asientos de cuero de piloto y copiloto con cabeceras
  for (const seatZ of [-0.25, 0.25]) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.44), leatherMat);
    cushion.position.set(0.08, -0.02, seatZ);
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.56, 0.42), leatherMat);
    backrest.position.set(-0.14, 0.28, seatZ);
    backrest.rotation.z = 0.12;
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.24), leatherMat);
    headrest.position.set(-0.18, 0.62, seatZ);
    group.add(cushion, backrest, headrest);
  }

  // Parabrisas panorámico curvado y ventanas laterales de cristal físico PBR
  const windshieldGeo = new THREE.CylinderGeometry(0.52, 0.58, 1.9, 20, 1, false, 0, Math.PI);
  windshieldGeo.rotateZ(-Math.PI / 2);
  const windshield = new THREE.Mesh(windshieldGeo, glassPBR);
  windshield.position.set(0.02, 0.42, 0);
  windshield.scale.set(1, 0.95, 0.98);
  group.add(windshield);

  // Marcos estructurales de cabina y techo aerodinámico
  for (const side of [-1, 1]) {
    const aPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.92, 8), paintWhitePBR);
    aPillar.position.set(0.65, 0.58, side * 0.48);
    aPillar.rotation.z = -0.78;
    group.add(aPillar);
  }

  const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.1, 1.08), paintWhitePBR);
  cabinRoof.position.set(-0.05, 0.94, 0);
  cabinRoof.castShadow = true;
  group.add(cabinRoof);

  // 3. Ala Alta con Perfil Aerodinámico Real NACA 2412 (Envergadura 11.0 m)
  const mainWingGeo = createAirfoilGeometry(1.18, 10.75, 0.13);
  const mainWing = new THREE.Mesh(mainWingGeo, paintWhitePBR);
  mainWing.position.set(0.22, 0.96, 0);
  mainWing.castShadow = true;
  mainWing.receiveShadow = true;
  group.add(mainWing);

  // Puntas de ala Horner (Wingtips curvados) + Luces estroboscópicas y de navegación
  for (const side of [-1, 1]) {
    const tipFairing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.04, 1.42, 12).rotateZ(Math.PI / 2),
      paintRedPBR
    );
    tipFairing.position.set(0.08, 0.96, side * 5.48);
    tipFairing.scale.set(1, 0.75, 1.4);
    group.add(tipFairing);

    // Luz de navegación (Roja en ala izquierda -Z, Verde en ala derecha +Z)
    const navColor = side < 0 ? 0xff2222 : 0x22ff44;
    const navBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 10, 10),
      new THREE.MeshBasicMaterial({ color: navColor })
    );
    navBulb.position.set(0.62, 0.96, side * 5.58);
    group.add(navBulb);
  }

  // Tubo Pitot bajo el ala izquierda
  const pitot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.28, 8).rotateZ(Math.PI / 2),
    chromePBR
  );
  pitot.position.set(0.65, 0.86, -2.15);
  group.add(pitot);

  // Flaps ranurados articulados (Fowler Slotted Flaps)
  const flapGeo = createAirfoilGeometry(0.38, 2.18, 0.1);
  flapGeo.translate(-0.19, 0, 0);

  const leftFlapPivot = new THREE.Group();
  leftFlapPivot.position.set(-0.34, 0.94, -1.72);
  const leftFlap = new THREE.Mesh(flapGeo, paintWhitePBR);
  leftFlap.castShadow = true;
  leftFlapPivot.add(leftFlap);
  group.add(leftFlapPivot);

  const rightFlapPivot = new THREE.Group();
  rightFlapPivot.position.set(-0.34, 0.94, 1.72);
  const rightFlap = new THREE.Mesh(flapGeo, paintWhitePBR);
  rightFlap.castShadow = true;
  rightFlapPivot.add(rightFlap);
  group.add(rightFlapPivot);

  // Alerones Frise articulados
  const aileronGeo = createAirfoilGeometry(0.36, 2.38, 0.1);
  aileronGeo.translate(-0.18, 0, 0);

  const leftAileronPivot = new THREE.Group();
  leftAileronPivot.position.set(-0.34, 0.94, -4.12);
  const leftAileron = new THREE.Mesh(aileronGeo, paintBluePBR);
  leftAileron.castShadow = true;
  leftAileronPivot.add(leftAileron);
  group.add(leftAileronPivot);

  const rightAileronPivot = new THREE.Group();
  rightAileronPivot.position.set(-0.34, 0.94, 4.12);
  const rightAileron = new THREE.Mesh(aileronGeo, paintBluePBR);
  rightAileron.castShadow = true;
  rightAileronPivot.add(rightAileron);
  group.add(rightAileronPivot);

  // Montantes aerodinámicos del ala (Streamlined Wing Struts con carenados)
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 2.58, 12), paintWhitePBR);
    strut.position.set(0.18, 0.28, side * 1.48);
    strut.scale.set(1.6, 1, 0.65);
    strut.rotation.x = side * 0.84;
    strut.castShadow = true;
    group.add(strut);
  }

  // 4. Empenaje de Cola Perfilado con Aleta Dorsal, Elevador y Timón Móviles
  const hStabGeo = createAirfoilGeometry(0.68, 3.4, 0.09);
  const hStab = new THREE.Mesh(hStabGeo, paintWhitePBR);
  hStab.position.set(-4.15, 0.24, 0);
  hStab.castShadow = true;
  group.add(hStab);

  const elevatorPivot = new THREE.Group();
  elevatorPivot.position.set(-4.48, 0.24, 0);
  const elevatorGeo = createAirfoilGeometry(0.42, 3.35, 0.08);
  elevatorGeo.translate(-0.21, 0, 0);
  const elevatorMesh = new THREE.Mesh(elevatorGeo, paintBluePBR);
  elevatorMesh.castShadow = true;
  elevatorPivot.add(elevatorMesh);
  group.add(elevatorPivot);

  // Deriva vertical barrida (Swept Vertical Fin) + Dorsal Fin
  const dorsalShape = new THREE.Shape();
  dorsalShape.moveTo(-2.4, 0.32);
  dorsalShape.lineTo(-3.8, 0.56);
  dorsalShape.lineTo(-4.15, 1.62);
  dorsalShape.lineTo(-4.58, 1.62);
  dorsalShape.lineTo(-4.55, 0.24);
  dorsalShape.closePath();

  const vFinGeo = new THREE.ExtrudeGeometry(dorsalShape, {
    steps: 1,
    depth: 0.09,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 3
  });
  vFinGeo.translate(0, 0, -0.045);
  const vFin = new THREE.Mesh(vFinGeo, paintWhitePBR);
  vFin.castShadow = true;
  group.add(vFin);

  // Franjas decorativas en la deriva vertical
  const finStripe = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.16, 0.12), paintRedPBR);
  finStripe.position.set(-4.35, 1.54, 0);
  group.add(finStripe);

  const finGold = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.125), paintGoldPBR);
  finGold.position.set(-4.3, 1.38, 0);
  group.add(finGold);

  // Luz Beacon roja en la cima de la cola
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xff1111 })
  );
  beacon.position.set(-4.38, 1.68, 0);
  group.add(beacon);

  // Timón de dirección articulado (Rudder)
  const rudderPivot = new THREE.Group();
  rudderPivot.position.set(-4.56, 0.92, 0);
  const rudderGeo = new THREE.BoxGeometry(0.44, 1.34, 0.08);
  rudderGeo.translate(-0.22, 0, 0);
  const rudderMesh = new THREE.Mesh(rudderGeo, paintBluePBR);
  rudderMesh.castShadow = true;
  rudderPivot.add(rudderMesh);
  group.add(rudderPivot);

  // 5. Hélice McCauley con Spinner Cromado y Disco Motion-Blur
  const propellerGroup = new THREE.Group();
  propellerGroup.position.set(2.26, -0.02, 0);

  const spinnerGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, 0.36),
      new THREE.Vector2(0.09, 0.26),
      new THREE.Vector2(0.17, 0.12),
      new THREE.Vector2(0.22, 0.0)
    ],
    24
  );
  spinnerGeo.rotateZ(-Math.PI / 2);
  const spinner = new THREE.Mesh(spinnerGeo, chromePBR);
  propellerGroup.add(spinner);

  // Palas perfiladas con torsión (pitch twist)
  const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.96, 0.145), darkCarbonPBR);
  blade1.position.y = 0.48;
  blade1.rotation.y = 0.24;
  const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.96, 0.145), darkCarbonPBR);
  blade2.position.y = -0.48;
  blade2.rotation.y = -0.24;
  propellerGroup.add(blade1, blade2);

  for (const tipY of [-0.9, 0.9]) {
    const propTip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.1, 0.146), paintWhitePBR);
    propTip.position.set(0, tipY, 0);
    propTip.rotation.y = tipY > 0 ? 0.24 : -0.24;
    propellerGroup.add(propTip);
  }

  const propDiscGeo = new THREE.CircleGeometry(0.96, 32);
  propDiscGeo.rotateY(Math.PI / 2);
  const propDiscMat = new THREE.MeshBasicMaterial({
    map: createPropBlurTexture(),
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const propDiscMesh = new THREE.Mesh(propDiscGeo, propDiscMat);
  propDiscMesh.position.x = 0.03;
  propellerGroup.add(propDiscMesh);
  group.add(propellerGroup);

  // 6. Tren de Aterrizaje Triciclo con Carenados Esculpidos (Teardrop Wheel Pants)
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.15, 20);
  wheelGeo.rotateX(Math.PI / 2);
  const pantGeo = new THREE.SphereGeometry(0.38, 20, 14);
  pantGeo.scale(1.05, 0.44, 0.36);

  const noseGearPivot = new THREE.Group();
  noseGearPivot.position.set(1.35, -0.42, 0);

  const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.72, 12), chromePBR);
  noseStrut.position.set(0, -0.25, 0);
  noseStrut.rotation.z = 0.14;
  const noseWheel = new THREE.Mesh(wheelGeo, tireRubberMat);
  noseWheel.position.set(0.04, -0.62, 0);
  const nosePant = new THREE.Mesh(pantGeo, paintWhitePBR);
  nosePant.position.set(0.0, -0.56, 0);
  nosePant.castShadow = true;
  noseGearPivot.add(noseStrut, noseWheel, nosePant);
  group.add(noseGearPivot);

  for (const side of [-1, 1]) {
    // Ballesta tubular de acero del tren principal
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 1.15, 12), paintWhitePBR);
    leg.position.set(-0.08, -0.56, side * 0.76);
    leg.rotation.x = side * 0.56;
    leg.castShadow = true;

    const wheel = new THREE.Mesh(wheelGeo, tireRubberMat);
    wheel.position.set(-0.08, -1.04, side * 1.25);
    wheel.castShadow = true;

    const pant = new THREE.Mesh(pantGeo, paintWhitePBR);
    pant.position.set(-0.11, -0.96, side * 1.25);
    pant.castShadow = true;

    const pantAccent = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.045, 0.28),
      paintBluePBR
    );
    pantAccent.position.set(-0.11, -0.95, side * 1.25);

    group.add(leg, wheel, pant, pantAccent);
  }

  // 7. Ancla de Cámara de Cabina (Asiento izquierdo de piloto)
  const cockpitCameraAnchor = new THREE.Object3D();
  cockpitCameraAnchor.position.set(0.14, 0.62, -0.24);
  group.add(cockpitCameraAnchor);

  return {
    aircraftGroup: group,
    propellerGroup,
    propDiscMesh,
    leftAileronPivot,
    rightAileronPivot,
    leftFlapPivot,
    rightFlapPivot,
    elevatorPivot,
    rudderPivot,
    noseGearPivot,
    yokeWheelPivot,
    cockpitCameraAnchor
  };
}

const FLAP_ANGLES_RAD = [0, (10 * Math.PI) / 180, (20 * Math.PI) / 180, (30 * Math.PI) / 180];

/**
 * Actualiza en cada frame la hélice, el disco motion-blur, el cuerno de cabina (yoke)
 * y todas las superficies de control exteriores.
 */
export function updateC172RigVisuals(
  rig: C172Rig,
  controls: FlightControlsInput,
  rpm: number,
  dt: number
): void {
  const omegaProp = (rpm * Math.PI * 2) / 60;
  rig.propellerGroup.rotation.x += omegaProp * dt;

  const mat = rig.propDiscMesh.material as THREE.MeshBasicMaterial;
  mat.opacity = Math.min(0.75, Math.max(0.14, (rpm - 550) / 2800));

  // Alerones diferenciales
  const maxAileronRad = 0.38;
  rig.leftAileronPivot.rotation.z = controls.aileron * maxAileronRad;
  rig.rightAileronPivot.rotation.z = -controls.aileron * maxAileronRad;

  // Flaps
  const targetFlapRad = FLAP_ANGLES_RAD[controls.flapIndex] ?? 0;
  rig.leftFlapPivot.rotation.z +=
    (targetFlapRad - rig.leftFlapPivot.rotation.z) * Math.min(1, dt * 6);
  rig.rightFlapPivot.rotation.z = rig.leftFlapPivot.rotation.z;

  // Elevador
  const elevTotal = Math.max(-1, Math.min(1, controls.elevator + controls.elevatorTrim));
  rig.elevatorPivot.rotation.z = -elevTotal * 0.42;

  // Timón y rueda de nariz
  rig.rudderPivot.rotation.y = -controls.rudder * 0.45;
  rig.noseGearPivot.rotation.y = -controls.rudder * 0.32;

  // Cuerno 3D (Yoke) dentro de la cabina: gira con alerones y entra/sale con elevador
  rig.yokeWheelPivot.rotation.x = -controls.aileron * 0.85;
  rig.yokeWheelPivot.position.x = 0.38 - controls.elevator * 0.08;
}
