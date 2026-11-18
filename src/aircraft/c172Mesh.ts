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
  cockpitCameraAnchor: THREE.Object3D;
}

/**
 * Crea un modelo 3D detallado del Cessna 172S Skyhawk con superficies de control articuladas,
 * fuselaje perfilado, carenados de rueda (wheel pants), luces de navegación y cabina con asientos.
 */
export function createC172Mesh(): C172Rig {
  const group = new THREE.Group();

  // Materiales PBR limpios
  const paintWhite = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.26,
    metalness: 0.08
  });
  const stripeBlue = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.3,
    metalness: 0.2
  });
  const accentGold = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.35,
    metalness: 0.3
  });
  const accentRed = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.35
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.65,
    transparent: true,
    opacity: 0.72
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.15,
    metalness: 0.85
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.5,
    metalness: 0.5
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.9
  });
  const interiorMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.85
  });

  // 1. Capó del motor (Engine Cowling) con tomas de aire frontales
  const cowlGeo = new THREE.CylinderGeometry(0.46, 0.56, 1.35, 16);
  cowlGeo.rotateZ(-Math.PI / 2);
  const cowl = new THREE.Mesh(cowlGeo, paintWhite);
  cowl.position.set(1.48, 0.04, 0);
  cowl.scale.set(1, 0.92, 1.05);
  cowl.castShadow = true;
  group.add(cowl);

  // Tomas de aire bajo el spinner
  const intakeGeo = new THREE.BoxGeometry(0.12, 0.16, 0.56);
  const intake = new THREE.Mesh(intakeGeo, darkMetalMat);
  intake.position.set(2.12, -0.08, 0);
  group.add(intake);

  // Tubo de escape inferior
  const exhaustGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.35, 8);
  const exhaust = new THREE.Mesh(exhaustGeo, chromeMat);
  exhaust.position.set(1.25, -0.48, 0.18);
  exhaust.rotation.z = 0.35;
  group.add(exhaust);

  // 2. Cabina central y fuselaje inferior
  const lowerCabinGeo = new THREE.BoxGeometry(2.15, 0.78, 1.16);
  const lowerCabin = new THREE.Mesh(lowerCabinGeo, paintWhite);
  lowerCabin.position.set(0.05, -0.08, 0);
  lowerCabin.castShadow = true;
  lowerCabin.receiveShadow = true;
  group.add(lowerCabin);

  // Franjas laterales Skyhawk (Azul + Dorado)
  const blueStripeGeo = new THREE.BoxGeometry(3.4, 0.14, 1.18);
  const blueStripe = new THREE.Mesh(blueStripeGeo, stripeBlue);
  blueStripe.position.set(0.42, 0.02, 0);
  group.add(blueStripe);

  const goldStripeGeo = new THREE.BoxGeometry(3.2, 0.05, 1.19);
  const goldStripe = new THREE.Mesh(goldStripeGeo, accentGold);
  goldStripe.position.set(0.35, -0.09, 0);
  group.add(goldStripe);

  // Interior de cabina visible a través del parabrisas (Tablero + 2 asientos)
  const dashGeo = new THREE.BoxGeometry(0.45, 0.42, 1.06);
  const dash = new THREE.Mesh(dashGeo, darkMetalMat);
  dash.position.set(0.68, 0.36, 0);
  group.add(dash);

  for (const seatZ of [-0.26, 0.26]) {
    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.42), interiorMat);
    seatBase.position.set(0.12, 0.05, seatZ);
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.58, 0.4), interiorMat);
    seatBack.position.set(-0.08, 0.36, seatZ);
    group.add(seatBase, seatBack);
  }

  // Parabrisas inclinado y ventanillas laterales
  const windshieldGeo = new THREE.BoxGeometry(1.78, 0.62, 1.1);
  const windshield = new THREE.Mesh(windshieldGeo, glassMat);
  windshield.position.set(0.05, 0.58, 0);
  group.add(windshield);

  // Pilares del parabrisas (A-pillars)
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.05), paintWhite);
    pillar.position.set(0.68, 0.56, side * 0.53);
    pillar.rotation.z = -0.58;
    group.add(pillar);
  }

  // Techo de cabina (une con el ala alta)
  const roofGeo = new THREE.BoxGeometry(1.85, 0.12, 1.12);
  const roof = new THREE.Mesh(roofGeo, paintWhite);
  roof.position.set(0.0, 0.92, 0);
  group.add(roof);

  // 3. Cono de cola ahusado (Tapered Tailcone)
  const tailConeGeo = new THREE.CylinderGeometry(0.18, 0.54, 3.65, 12);
  tailConeGeo.rotateZ(Math.PI / 2);
  const tailCone = new THREE.Mesh(tailConeGeo, paintWhite);
  tailCone.position.set(-2.65, 0.12, 0);
  tailCone.scale.set(1, 0.95, 0.85);
  tailCone.castShadow = true;
  group.add(tailCone);

  // 4. Ala Alta con perfil aerodinámico (Envergadura 11.0 m, Cuerda 1.49 m)
  // Dividimos el borde de salida en: Flaps interiores y Alerones exteriores móviles
  const mainWingSparGeo = new THREE.BoxGeometry(1.08, 0.14, 10.8);
  const mainWingSpar = new THREE.Mesh(mainWingSparGeo, paintWhite);
  mainWingSpar.position.set(0.18, 0.96, 0);
  mainWingSpar.castShadow = true;
  mainWingSpar.receiveShadow = true;
  group.add(mainWingSpar);

  // Borde de ataque redondeado (Leading Edge)
  const leadingEdgeGeo = new THREE.CylinderGeometry(0.07, 0.07, 10.8, 12);
  leadingEdgeGeo.rotateX(Math.PI / 2);
  const leadingEdge = new THREE.Mesh(leadingEdgeGeo, paintWhite);
  leadingEdge.position.set(0.72, 0.96, 0);
  group.add(leadingEdge);

  // Puntas de ala carenadas con luces de navegación (Roja babor -Z, Verde estribor +Z)
  for (const side of [-1, 1]) {
    const wingTip = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.13, 0.28), accentRed);
    wingTip.position.set(0.04, 0.96, side * 5.52);
    group.add(wingTip);

    const navColor = side < 0 ? 0xef4444 : 0x22c55e;
    const navLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshBasicMaterial({ color: navColor })
    );
    navLight.position.set(0.65, 0.96, side * 5.66);
    group.add(navLight);
  }

  // Flaps articulados (interior: z de 0.65 a 2.85 m en cada lado)
  const flapGeo = new THREE.BoxGeometry(0.38, 0.06, 2.2);
  flapGeo.translate(-0.19, 0, 0); // Pivote en la bisagra delantera

  const leftFlapPivot = new THREE.Group();
  leftFlapPivot.position.set(-0.34, 0.95, -1.75);
  const leftFlapMesh = new THREE.Mesh(flapGeo, paintWhite);
  leftFlapMesh.castShadow = true;
  leftFlapPivot.add(leftFlapMesh);
  group.add(leftFlapPivot);

  const rightFlapPivot = new THREE.Group();
  rightFlapPivot.position.set(-0.34, 0.95, 1.75);
  const rightFlapMesh = new THREE.Mesh(flapGeo, paintWhite);
  rightFlapMesh.castShadow = true;
  rightFlapPivot.add(rightFlapMesh);
  group.add(rightFlapPivot);

  // Alerones articulados (exterior: z de 2.95 a 5.35 m en cada lado)
  const aileronGeo = new THREE.BoxGeometry(0.36, 0.06, 2.35);
  aileronGeo.translate(-0.18, 0, 0);

  const leftAileronPivot = new THREE.Group();
  leftAileronPivot.position.set(-0.34, 0.95, -4.15);
  const leftAileronMesh = new THREE.Mesh(aileronGeo, stripeBlue);
  leftAileronPivot.add(leftAileronMesh);
  group.add(leftAileronPivot);

  const rightAileronPivot = new THREE.Group();
  rightAileronPivot.position.set(-0.34, 0.95, 4.15);
  const rightAileronMesh = new THREE.Mesh(aileronGeo, stripeBlue);
  rightAileronPivot.add(rightAileronMesh);
  group.add(rightAileronPivot);

  // Montantes de las alas (Struts aerodinámicos)
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 2.55, 8), paintWhite);
    strut.position.set(0.15, 0.28, side * 1.48);
    strut.rotation.x = side * 0.84;
    strut.castShadow = true;
    group.add(strut);
  }

  // 5. Empenaje de Cola con Elevador y Timón Articulados
  // Estabilizador horizontal fijo
  const hStabGeo = new THREE.BoxGeometry(0.65, 0.08, 3.35);
  const hStab = new THREE.Mesh(hStabGeo, paintWhite);
  hStab.position.set(-4.15, 0.26, 0);
  hStab.castShadow = true;
  group.add(hStab);

  // Elevador móvil (pivota sobre Z)
  const elevatorPivot = new THREE.Group();
  elevatorPivot.position.set(-4.48, 0.26, 0);
  const elevatorGeo = new THREE.BoxGeometry(0.38, 0.06, 3.3);
  elevatorGeo.translate(-0.19, 0, 0);
  const elevatorMesh = new THREE.Mesh(elevatorGeo, stripeBlue);
  elevatorPivot.add(elevatorMesh);
  group.add(elevatorPivot);

  // Deriva vertical con dorsal fin inclinada (típica del C172)
  const dorsalFinGeo = new THREE.BoxGeometry(1.4, 0.45, 0.08);
  const dorsalFin = new THREE.Mesh(dorsalFinGeo, paintWhite);
  dorsalFin.position.set(-3.55, 0.52, 0);
  dorsalFin.rotation.z = -0.32;
  group.add(dorsalFin);

  const vFinGeo = new THREE.BoxGeometry(0.88, 1.38, 0.1);
  const vFin = new THREE.Mesh(vFinGeo, paintWhite);
  vFin.position.set(-4.18, 0.92, 0);
  vFin.rotation.z = -0.22;
  vFin.castShadow = true;
  group.add(vFin);

  const vFinCap = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.22, 0.11), accentRed);
  vFinCap.position.set(-4.32, 1.56, 0);
  group.add(vFinCap);

  // Luz anticolisión roja superior (Beacon)
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2222 })
  );
  beacon.position.set(-4.35, 1.7, 0);
  group.add(beacon);

  // Timón de dirección móvil (Rudder pivota sobre Y)
  const rudderPivot = new THREE.Group();
  rudderPivot.position.set(-4.55, 0.92, 0);
  const rudderGeo = new THREE.BoxGeometry(0.42, 1.32, 0.08);
  rudderGeo.translate(-0.21, 0, 0);
  const rudderMesh = new THREE.Mesh(rudderGeo, stripeBlue);
  rudderPivot.add(rudderMesh);
  group.add(rudderPivot);

  // 6. Hélice McCauley + Disco de desenfoque a altas RPM
  const propellerGroup = new THREE.Group();
  propellerGroup.position.set(2.22, 0.04, 0);

  const spinnerGeo = new THREE.ConeGeometry(0.22, 0.46, 16);
  spinnerGeo.rotateZ(-Math.PI / 2);
  const spinner = new THREE.Mesh(spinnerGeo, chromeMat);
  spinner.position.x = 0.12;
  propellerGroup.add(spinner);

  const bladeGeo = new THREE.BoxGeometry(0.04, 1.92, 0.15);
  const blades = new THREE.Mesh(bladeGeo, darkMetalMat);
  propellerGroup.add(blades);

  // Puntas de hélice blancas de advertencia
  for (const tipY of [-0.9, 0.9]) {
    const propTip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.155), paintWhite);
    propTip.position.set(0, tipY, 0);
    propellerGroup.add(propTip);
  }

  // Disco traslúcido de hélice en velocidad (prop blur)
  const propDiscGeo = new THREE.CircleGeometry(0.96, 24);
  propDiscGeo.rotateY(Math.PI / 2);
  const propDiscMat = new THREE.MeshBasicMaterial({
    color: 0xcbd5e1,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const propDiscMesh = new THREE.Mesh(propDiscGeo, propDiscMat);
  propDiscMesh.position.x = 0.02;
  propellerGroup.add(propDiscMesh);
  group.add(propellerGroup);

  // 7. Tren de Aterrizaje Triciclo con Carenados (Wheel Pants) y Rueda de Nariz Dirigible
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.14, 16);
  wheelGeo.rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.16, 12);
  hubGeo.rotateX(Math.PI / 2);
  const pantGeo = new THREE.BoxGeometry(0.68, 0.28, 0.24);

  const noseGearPivot = new THREE.Group();
  noseGearPivot.position.set(1.35, -0.42, 0);

  const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.72, 10), chromeMat);
  noseStrut.position.set(0, -0.25, 0);
  const noseWheel = new THREE.Mesh(wheelGeo, tireMat);
  noseWheel.position.set(0, -0.62, 0);
  const nosePant = new THREE.Mesh(pantGeo, paintWhite);
  nosePant.position.set(-0.04, -0.56, 0);
  noseGearPivot.add(noseStrut, noseWheel, nosePant);
  group.add(noseGearPivot);

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.92, 0.07), paintWhite);
    leg.position.set(-0.35, -0.58, side * 0.82);
    leg.rotation.x = side * 0.48;
    leg.castShadow = true;

    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.position.set(-0.35, -1.04, side * 1.25);
    wheel.castShadow = true;

    const hub = new THREE.Mesh(hubGeo, chromeMat);
    hub.position.set(-0.35, -1.04, side * 1.25);

    const pant = new THREE.Mesh(pantGeo, paintWhite);
    pant.position.set(-0.38, -0.96, side * 1.25);
    pant.castShadow = true;

    const pantStripe = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.25), stripeBlue);
    pantStripe.position.set(-0.38, -0.95, side * 1.25);

    group.add(leg, wheel, hub, pant, pantStripe);
  }

  // 8. Ancla para Cámara de Cabina (Ojos del piloto asiento izquierdo)
  const cockpitCameraAnchor = new THREE.Object3D();
  cockpitCameraAnchor.position.set(0.18, 0.62, -0.24);
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
    cockpitCameraAnchor
  };
}

const FLAP_ANGLES_RAD = [0, (10 * Math.PI) / 180, (20 * Math.PI) / 180, (30 * Math.PI) / 180];

/**
 * Actualiza las superficies de control 3D y el efecto visual de la hélice en cada frame.
 */
export function updateC172RigVisuals(
  rig: C172Rig,
  controls: FlightControlsInput,
  rpm: number,
  dt: number
): void {
  // Hélice: radianes por segundo = RPM * 2π / 60
  const omegaProp = (rpm * Math.PI * 2) / 60;
  rig.propellerGroup.rotation.x += omegaProp * dt;

  const mat = rig.propDiscMesh.material as THREE.MeshBasicMaterial;
  mat.opacity = Math.min(0.38, Math.max(0.08, (rpm - 500) / 6500));

  // Alerones (diferenciales: alabeo derecha -> alerón derecho sube, izquierdo baja)
  const maxAileronRad = 0.38;
  rig.leftAileronPivot.rotation.z = controls.aileron * maxAileronRad;
  rig.rightAileronPivot.rotation.z = -controls.aileron * maxAileronRad;

  // Flaps (bajan hacia -Z en el pivote trasero)
  const targetFlapRad = FLAP_ANGLES_RAD[controls.flapIndex] ?? 0;
  rig.leftFlapPivot.rotation.z += (targetFlapRad - rig.leftFlapPivot.rotation.z) * Math.min(1, dt * 6);
  rig.rightFlapPivot.rotation.z = rig.leftFlapPivot.rotation.z;

  // Elevador (+elevator = nariz arriba -> borde de salida sube = rotación -Z en pivote trasero)
  const elevTotal = Math.max(-1, Math.min(1, controls.elevator + controls.elevatorTrim));
  rig.elevatorPivot.rotation.z = -elevTotal * 0.42;

  // Timón y rueda de nariz
  rig.rudderPivot.rotation.y = -controls.rudder * 0.45;
  rig.noseGearPivot.rotation.y = -controls.rudder * 0.35;
}
