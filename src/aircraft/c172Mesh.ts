import * as THREE from 'three';

/**
 * Construye un modelo low-poly limpio del Cessna 172 Skyhawk (ala alta, tren triciclo, hélice).
 * Ejes locales del avión:
 * +X: Nariz (adelante)
 * +Y: Techo de cabina (arriba)
 * +Z: Ala derecha
 */
export function createC172Mesh(): {
  aircraftGroup: THREE.Group;
  propellerMesh: THREE.Group;
} {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    metalness: 0.1
  });
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.4,
    metalness: 0.15
  });
  const redAccentMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.4
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.15,
    metalness: 0.6,
    transparent: true,
    opacity: 0.78
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.9
  });
  const strutMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    metalness: 0.6,
    roughness: 0.3
  });

  // Fuselaje central y capó del motor
  const fuselageGeo = new THREE.BoxGeometry(3.8, 1.15, 1.15);
  const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
  fuselage.position.set(0.2, 0.1, 0);
  fuselage.castShadow = true;
  group.add(fuselage);

  // Franja decorativa azul lateral
  const stripeGeo = new THREE.BoxGeometry(3.85, 0.18, 1.17);
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.set(0.2, 0.05, 0);
  group.add(stripe);

  // Cono de cola (Tailcone)
  const tailConeGeo = new THREE.BoxGeometry(3.4, 0.65, 0.65);
  const tailCone = new THREE.Mesh(tailConeGeo, bodyMat);
  tailCone.position.set(-3.1, 0.15, 0);
  tailCone.castShadow = true;
  group.add(tailCone);

  // Cabina / Parabrisas
  const cabinGeo = new THREE.BoxGeometry(1.95, 0.65, 1.08);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0.15, 0.85, 0);
  group.add(cabin);

  // Ala alta (Envergadura 11.0 m, cuerda ~1.49 m)
  const wingGeo = new THREE.BoxGeometry(1.49, 0.14, 11.0);
  const wing = new THREE.Mesh(wingGeo, bodyMat);
  wing.position.set(0.05, 1.22, 0);
  wing.castShadow = true;
  wing.receiveShadow = true;
  group.add(wing);

  // Puntas de ala rojas
  const tipGeo = new THREE.BoxGeometry(1.49, 0.15, 0.35);
  const leftTip = new THREE.Mesh(tipGeo, redAccentMat);
  leftTip.position.set(0.05, 1.22, -5.5);
  const rightTip = new THREE.Mesh(tipGeo, redAccentMat);
  rightTip.position.set(0.05, 1.22, 5.5);
  group.add(leftTip, rightTip);

  // Montantes de las alas (Wing struts)
  const strutGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.6, 8);
  const leftStrut = new THREE.Mesh(strutGeo, strutMat);
  leftStrut.position.set(0.1, 0.45, -1.5);
  leftStrut.rotation.x = -0.82;
  const rightStrut = new THREE.Mesh(strutGeo, strutMat);
  rightStrut.position.set(0.1, 0.45, 1.5);
  rightStrut.rotation.x = 0.82;
  group.add(leftStrut, rightStrut);

  // Estabilizador horizontal (cola)
  const hStabGeo = new THREE.BoxGeometry(0.95, 0.1, 3.45);
  const hStab = new THREE.Mesh(hStabGeo, bodyMat);
  hStab.position.set(-4.4, 0.35, 0);
  hStab.castShadow = true;
  group.add(hStab);

  // Estabilizador vertical (timón)
  const vStabGeo = new THREE.BoxGeometry(1.25, 1.45, 0.12);
  const vStab = new THREE.Mesh(vStabGeo, bodyMat);
  vStab.position.set(-4.35, 0.95, 0);
  vStab.castShadow = true;
  group.add(vStab);

  const vStabAccent = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.28, 0.14), redAccentMat);
  vStabAccent.position.set(-4.35, 1.5, 0);
  group.add(vStabAccent);

  // Hélice y Spinner frontal
  const propellerGroup = new THREE.Group();
  propellerGroup.position.set(2.2, 0.1, 0);

  const spinnerGeo = new THREE.ConeGeometry(0.22, 0.42, 12);
  spinnerGeo.rotateZ(-Math.PI / 2);
  const spinner = new THREE.Mesh(spinnerGeo, strutMat);
  propellerGroup.add(spinner);

  const bladeGeo = new THREE.BoxGeometry(0.05, 1.92, 0.16);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
  const blades = new THREE.Mesh(bladeGeo, bladeMat);
  propellerGroup.add(blades);
  group.add(propellerGroup);

  // Tren de aterrizaje triciclo (Nariz + Principal Izq/Der)
  const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.16, 16);
  wheelGeo.rotateX(Math.PI / 2);

  // Rueda de nariz (x = +1.35, y = -1.04)
  const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9), strutMat);
  noseStrut.position.set(1.35, -0.6, 0);
  const noseWheel = new THREE.Mesh(wheelGeo, tireMat);
  noseWheel.position.set(1.35, -1.04, 0);
  noseWheel.castShadow = true;
  group.add(noseStrut, noseWheel);

  // Ruedas principales (x = -0.35, y = -1.04, z = ±1.25)
  for (const side of [-1, 1]) {
    const mainLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.08), strutMat);
    mainLeg.position.set(-0.35, -0.58, side * 0.85);
    mainLeg.rotation.x = side * 0.45;
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.position.set(-0.35, -1.04, side * 1.25);
    wheel.castShadow = true;
    group.add(mainLeg, wheel);
  }

  return {
    aircraftGroup: group,
    propellerMesh: propellerGroup
  };
}
