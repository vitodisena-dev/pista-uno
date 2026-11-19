import * as THREE from 'three';

/**
 * Genera una textura procedural orgánica de paisaje yucateco (parcelas de selva baja,
 * caminos rurales, variaciones de vegetación y suelo calizo) para que el terreno
 * tenga referencias claras de velocidad, altitud y perspectiva sin verse plano ni repetitivo.
 */
function createYucatanLandscapeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base verde selva baja
  ctx.fillStyle = '#3b5e1a';
  ctx.fillRect(0, 0, 512, 512);

  // Semilla determinista para manchas de vegetación y claros
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Parcelas agrícolas / claros de selva
  const palette = ['#365314', '#3f6212', '#4d7c0f', '#2e4812', '#52682d', '#445c1b'];
  for (let i = 0; i < 65; i++) {
    ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
    const x = rand() * 512;
    const y = rand() * 512;
    const w = 35 + rand() * 95;
    const h = 35 + rand() * 95;
    ctx.fillRect(x, y, w, h);
  }

  // Manchas suaves de copa de árboles y sascab (caliza yucateca)
  for (let i = 0; i < 900; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 2 + rand() * 7;
    ctx.fillStyle = rand() > 0.15 ? 'rgba(26, 46, 5, 0.35)' : 'rgba(163, 163, 140, 0.22)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Caminos secundarios sutiles en cuadrícula
  ctx.strokeStyle = 'rgba(120, 113, 108, 0.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 36);
  tex.anisotropy = 8;
  return tex;
}

/**
 * Crea el terreno de Mérida y alrededores (MMMD):
 * - Paisaje texturizado de 36 km × 36 km
 * - Periférico de Mérida (Lic. Manuel Berzunza) y carreteras de acceso
 * - Zonas urbanas low-poly (colonias del Sur/Poniente/Norte de Mérida) con InstancedMesh
 * - Vegetación (árboles de selva baja) fuera de las franjas de pista para dar sensación de velocidad a baja altura
 */
export function createTerrain(): THREE.Group {
  const group = new THREE.Group();

  // 1. Suelo principal de Yucatán con textura orgánica (36 km x 36 km)
  const groundGeo = new THREE.PlaneGeometry(36000, 36000, 1, 1);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshLambertMaterial({
    map: createYucatanLandscapeTexture()
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // 2. Perímetro de pasto podado del Aeropuerto MMMD (sin z-fighting)
  const headingRad = ((108 - 90) * Math.PI) / 180;
  const airfieldGeo = new THREE.PlaneGeometry(4200, 1500);
  airfieldGeo.rotateX(-Math.PI / 2);
  const airfieldMat = new THREE.MeshLambertMaterial({
    color: 0x4b6b22,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });
  const airfieldMesh = new THREE.Mesh(airfieldGeo, airfieldMat);
  airfieldMesh.position.y = 0.015;
  airfieldMesh.rotation.y = -headingRad;
  airfieldMesh.receiveShadow = true;
  group.add(airfieldMesh);

  // 3. Anillo Periférico de Mérida y Avenidas Principales (Aviación / Itzáes / Umán)
  const roadMat = new THREE.MeshBasicMaterial({ color: 0x334155 });

  // Tramo Poniente/Sur del Periférico (pasa ~2.2 km al Oeste/Sur del aeropuerto)
  const perifWest = new THREE.Mesh(new THREE.PlaneGeometry(34, 14000).rotateX(-Math.PI / 2), roadMat);
  perifWest.position.set(-2450, 0.025, 0);
  perifWest.rotation.y = 0.12;
  group.add(perifWest);

  const perifSouth = new THREE.Mesh(new THREE.PlaneGeometry(14000, 34).rotateX(-Math.PI / 2), roadMat);
  perifSouth.position.set(400, 0.025, 1950);
  perifSouth.rotation.y = -0.08;
  group.add(perifSouth);

  // Avenida Internacional / Calle 60 / Circuito Colonias al Noreste del aeropuerto
  const avItzaes = new THREE.Mesh(new THREE.PlaneGeometry(28, 9500).rotateX(-Math.PI / 2), roadMat);
  avItzaes.position.set(1650, 0.025, -2400);
  avItzaes.rotation.y = -0.35;
  group.add(avItzaes);

  // 4. Manzanas y Edificios Urbanos de Mérida alrededor del aeropuerto (InstancedMesh para 60 FPS)
  const buildingCount = 420;
  const bldgGeo = new THREE.BoxGeometry(1, 1, 1);
  bldgGeo.translate(0, 0.5, 0); // Pivote en la base
  const bldgMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
  const buildingsInst = new THREE.InstancedMesh(bldgGeo, bldgMat, buildingCount);
  buildingsInst.castShadow = true;
  buildingsInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const bldgColors = [0xe2e8f0, 0xfef3c7, 0xf1f5f9, 0xfed7aa, 0xcbd5e1, 0xfde68a];

  let seed = 4242;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  let idx = 0;
  while (idx < buildingCount) {
    // Distribuir en un radio de 1.2 km a 6.5 km alrededor del aeropuerto
    const angle = rand() * Math.PI * 2;
    const radius = 950 + rand() * 5200;
    const wx = Math.cos(angle) * radius;
    const wz = Math.sin(angle) * radius;

    // Excluir el corredor de aproximación y el perímetro interior de la pista 10/28
    const cosR = Math.cos(headingRad);
    const sinR = Math.sin(headingRad);
    const rwyLocalX = wx * cosR + wz * sinR;
    const rwyLocalZ = -wx * sinR + wz * cosR;

    if (Math.abs(rwyLocalX) < 3400 && Math.abs(rwyLocalZ) < 620) {
      continue;
    }

    const w = 14 + rand() * 34;
    const d = 14 + rand() * 34;
    // En el norte de Mérida algunos edificios más altos; alrededor casas/naves de 1-3 pisos
    const h = wz < -1800 && rand() > 0.82 ? 18 + rand() * 28 : 4.5 + rand() * 9.5;

    dummy.position.set(wx, 0, wz);
    dummy.rotation.y = (Math.floor(rand() * 4) * Math.PI) / 2 + 0.15;
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();

    buildingsInst.setMatrixAt(idx, dummy.matrix);
    color.setHex(bldgColors[Math.floor(rand() * bldgColors.length)]);
    buildingsInst.setColorAt(idx, color);
    idx++;
  }
  buildingsInst.instanceMatrix.needsUpdate = true;
  if (buildingsInst.instanceColor) buildingsInst.instanceColor.needsUpdate = true;
  group.add(buildingsInst);

  // 5. Árboles de Selva Baja Yucateca alrededor del perímetro aeroportuario (referencia de altura en el flare)
  const treeCount = 550;
  const crownGeo = new THREE.ConeGeometry(3.2, 7.5, 7);
  crownGeo.translate(0, 4.2, 0);
  const crownMat = new THREE.MeshLambertMaterial({ color: 0x2d4f12 });
  const treesInst = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);

  let tIdx = 0;
  while (tIdx < treeCount) {
    const wx = (rand() - 0.5) * 8500;
    const wz = (rand() - 0.5) * 6500;

    const cosR = Math.cos(headingRad);
    const sinR = Math.sin(headingRad);
    const rwyLocalX = wx * cosR + wz * sinR;
    const rwyLocalZ = -wx * sinR + wz * cosR;

    // Dejar libre la pista y calles de rodaje (z > ±185 m o fuera de umbrales con margen para senda de 3°)
    if (Math.abs(rwyLocalX) < 2800 && Math.abs(rwyLocalZ) < 195) {
      continue;
    }

    const scale = 0.75 + rand() * 0.85;
    dummy.position.set(wx, 0, wz);
    dummy.rotation.y = rand() * Math.PI * 2;
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();

    treesInst.setMatrixAt(tIdx, dummy.matrix);
    color.setHSL(0.24 + (rand() - 0.5) * 0.04, 0.58, 0.2 + rand() * 0.08);
    treesInst.setColorAt(tIdx, color);
    tIdx++;
  }
  treesInst.instanceMatrix.needsUpdate = true;
  if (treesInst.instanceColor) treesInst.instanceColor.needsUpdate = true;
  group.add(treesInst);

  return group;
}
