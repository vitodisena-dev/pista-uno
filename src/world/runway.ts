import * as THREE from 'three';
import mmmdData from './airports/mmmd.json';

function createRunwayNumberTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = '#f4f4f5';
  ctx.font = 'bold 165px "Arial Narrow", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 134);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#26272b';
  ctx.fillRect(0, 0, 256, 256);

  // Grano de asfalto sutil
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = 30 + Math.floor(Math.random() * 26);
    ctx.fillStyle = `rgb(${v},${v},${v + 2})`;
    ctx.fillRect(x, y, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(160, 3);
  return tex;
}

/**
 * Construye la pista 10/28 del Aeropuerto Internacional de Mérida (MMMD)
 * con marcas normativas ICAO, luces PAPI de 4 focos, torre de control y hangares.
 */
export function createRunway(): {
  runwayGroup: THREE.Group;
  runwayHeadingYawRad: number;
  threshold10WorldPos: THREE.Vector3;
} {
  const rwy = mmmdData.runways[0];
  const group = new THREE.Group();

  const runwayHeadingYawRad = -((rwy.headingTrueDeg - 90) * Math.PI) / 180;

  // Superficie asfaltada con textura procedural de grano fino
  const asphaltGeo = new THREE.PlaneGeometry(rwy.lengthMeters, rwy.widthMeters);
  asphaltGeo.rotateX(-Math.PI / 2);
  const asphaltMat = new THREE.MeshStandardMaterial({
    map: createAsphaltTexture(),
    roughness: 0.88,
    metalness: 0.04
  });
  const asphaltMesh = new THREE.Mesh(asphaltGeo, asphaltMat);
  asphaltMesh.position.y = 0.03;
  asphaltMesh.receiveShadow = true;
  group.add(asphaltMesh);

  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });

  // Líneas de borde laterales (Edge stripes)
  const edgeGeo = new THREE.PlaneGeometry(rwy.lengthMeters - 40, 0.75);
  edgeGeo.rotateX(-Math.PI / 2);
  for (const side of [-1, 1]) {
    const edge = new THREE.Mesh(edgeGeo, stripeMat);
    edge.position.set(0, 0.04, side * 21.2);
    group.add(edge);
  }

  // Línea central blanca discontinua
  const stripeLength = 36;
  const stripeGap = 24;
  const stripeGeo = new THREE.PlaneGeometry(stripeLength, 0.9);
  stripeGeo.rotateX(-Math.PI / 2);

  for (let x = -1420; x <= 1420; x += stripeLength + stripeGap) {
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(x, 0.04, 0);
    group.add(stripe);
  }

  // Barras de umbral (Piano keys) en cabeceras 10 (-1550 m) y 28 (+1550 m)
  const barGeo = new THREE.PlaneGeometry(32, 1.75);
  barGeo.rotateX(-Math.PI / 2);
  for (const endX of [-1545, 1545]) {
    for (let z = -18; z <= 18; z += 4.2) {
      if (Math.abs(z) < 2) continue;
      const bar = new THREE.Mesh(barGeo, stripeMat);
      bar.position.set(endX, 0.04, z);
      group.add(bar);
    }
  }

  // Números de cabecera "10" y "28"
  const numGeo = new THREE.PlaneGeometry(18, 18);
  numGeo.rotateX(-Math.PI / 2);

  const num10Mat = new THREE.MeshBasicMaterial({
    map: createRunwayNumberTexture('10'),
    transparent: true
  });
  const num10Mesh = new THREE.Mesh(numGeo, num10Mat);
  num10Mesh.rotation.y = -Math.PI / 2;
  num10Mesh.position.set(-1495, 0.045, 0);
  group.add(num10Mesh);

  const num28Mat = new THREE.MeshBasicMaterial({
    map: createRunwayNumberTexture('28'),
    transparent: true
  });
  const num28Mesh = new THREE.Mesh(numGeo, num28Mat);
  num28Mesh.rotation.y = Math.PI / 2;
  num28Mesh.position.set(1495, 0.045, 0);
  group.add(num28Mesh);

  // Bloques de Punto de Visada (Aiming Point / 1,000 ft markers a ±1,250 m)
  const aimingGeo = new THREE.PlaneGeometry(45, 6.5);
  aimingGeo.rotateX(-Math.PI / 2);
  for (const endX of [-1250, 1250]) {
    for (const side of [-1, 1]) {
      const aim = new THREE.Mesh(aimingGeo, stripeMat);
      aim.position.set(endX, 0.04, side * 11.5);
      group.add(aim);
    }
  }

  // Luces PAPI (4 cajas junto a la zona de toque de la pista 10, en x = -1250 m, z = -30 m)
  const papiBoxGeo = new THREE.BoxGeometry(1.2, 0.6, 1.2);
  const papiBoxMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24 });
  for (let i = 0; i < 4; i++) {
    const box = new THREE.Mesh(papiBoxGeo, papiBoxMat);
    box.position.set(-1250, 0.3, -28 - i * 4.5);
    const lightSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshBasicMaterial({ color: i < 2 ? 0xffffff : 0xef4444 })
    );
    lightSphere.position.set(-1250.7, 0.45, -28 - i * 4.5);
    group.add(box, lightSphere);
  }

  // Edificios de referencia del Aeropuerto de Mérida (Torre de Control y Hangares al Norte de la pista)
  const buildingMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
  const glassTowerMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.7, roughness: 0.2 });

  // Torre de control MMMD
  const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.2, 28, 12), buildingMat);
  towerBase.position.set(-350, 14, -145);
  towerBase.castShadow = true;
  const towerCab = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 4.0, 4.5, 12), glassTowerMat);
  towerCab.position.set(-350, 30, -145);
  const towerRoof = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 0.8, 12), roofMat);
  towerRoof.position.set(-350, 32.5, -145);
  group.add(towerBase, towerCab, towerRoof);

  // Hangares FBO y Terminal
  for (let i = 0; i < 5; i++) {
    const hangar = new THREE.Mesh(new THREE.BoxGeometry(42, 11, 28), buildingMat);
    hangar.position.set(-650 + i * 140, 5.5, -135);
    hangar.castShadow = true;
    const hRoof = new THREE.Mesh(new THREE.BoxGeometry(44, 1.2, 30), roofMat);
    hRoof.position.set(-650 + i * 140, 11.4, -135);
    group.add(hangar, hRoof);
  }

  // Manga de viento (Windsock) cerca de la cabecera 10
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 6, 8),
    new THREE.MeshStandardMaterial({ color: 0xd4d4d8 })
  );
  pole.position.set(-1420, 3, -36);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 2.8, 12, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xf97316, side: THREE.DoubleSide })
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(-1418.5, 5.6, -36);
  group.add(pole, sock);

  group.rotation.y = runwayHeadingYawRad;

  const thresholdOffset = rwy.ends ? rwy.ends['10'].thresholdOffsetMeters : -1550;
  const localThreshold10 = new THREE.Vector3(thresholdOffset, 0, 0);
  localThreshold10.applyAxisAngle(new THREE.Vector3(0, 1, 0), runwayHeadingYawRad);

  return {
    runwayGroup: group,
    runwayHeadingYawRad,
    threshold10WorldPos: localThreshold10
  };
}
