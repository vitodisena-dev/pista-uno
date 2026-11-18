import * as THREE from 'three';
import mmmdData from './airports/mmmd.json';

/**
 * Construye la pista 10/28 del Aeropuerto Internacional de Mérida (MMMD):
 * Longitud: 3,200 m, Ancho: 45 m, Rumbo verdadero: 108°.
 */
export function createRunway(): {
  runwayGroup: THREE.Group;
  runwayHeadingYawRad: number;
  threshold10WorldPos: THREE.Vector3;
} {
  const rwy = mmmdData.runways[0];
  const group = new THREE.Group();

  // En nuestro sistema (X=Este, Z=Sur):
  // Rumbo 90° (Este) apunta en +X (yaw = 0).
  // Rumbo 108° gira 18° hacia el Sur (+Z), que corresponde a rotación -18° alrededor de +Y.
  const runwayHeadingYawRad = -((rwy.headingTrueDeg - 90) * Math.PI) / 180;

  // Superficie asfaltada de la pista 10/28 (3,200 m x 45 m)
  const asphaltGeo = new THREE.PlaneGeometry(rwy.lengthMeters, rwy.widthMeters);
  asphaltGeo.rotateX(-Math.PI / 2);
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.88,
    metalness: 0.05
  });
  const asphaltMesh = new THREE.Mesh(asphaltGeo, asphaltMat);
  asphaltMesh.position.y = 0.03;
  asphaltMesh.receiveShadow = true;
  group.add(asphaltMesh);

  // Línea central blanca discontinua a lo largo de la pista
  const stripeLength = 36;
  const stripeGap = 24;
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf4f4f5 });
  const stripeGeo = new THREE.PlaneGeometry(stripeLength, 0.9);
  stripeGeo.rotateX(-Math.PI / 2);

  for (let x = -1480; x <= 1480; x += stripeLength + stripeGap) {
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(x, 0.04, 0);
    group.add(stripe);
  }

  // Barras de umbral (Threshold Piano Keys) en ambas cabeceras (10 y 28)
  const barGeo = new THREE.PlaneGeometry(30, 1.8);
  barGeo.rotateX(-Math.PI / 2);
  for (const endX of [-1540, 1540]) {
    for (let z = -18; z <= 18; z += 4.5) {
      if (Math.abs(z) < 2) continue;
      const bar = new THREE.Mesh(barGeo, stripeMat);
      bar.position.set(endX, 0.04, z);
      group.add(bar);
    }
  }

  group.rotation.y = runwayHeadingYawRad;

  // Calcular posición mundial de la cabecera 10 para colocar el avión
  const thresholdOffset = rwy.ends ? rwy.ends['10'].thresholdOffsetMeters : -1550;
  const localThreshold10 = new THREE.Vector3(thresholdOffset, 0, 0);
  localThreshold10.applyAxisAngle(new THREE.Vector3(0, 1, 0), runwayHeadingYawRad);

  return {
    runwayGroup: group,
    runwayHeadingYawRad,
    threshold10WorldPos: localThreshold10
  };
}
