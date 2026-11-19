import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

export type TimeOfDayPreset = 'day' | 'golden' | 'dusk';

export interface SkyController {
  sunLight: THREE.DirectionalLight;
  setTimeOfDay: (preset: TimeOfDayPreset) => void;
  updateClouds: (dt: number, playerPos: THREE.Vector3) => void;
}

function createCloudPuffTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  grad.addColorStop(0.45, 'rgba(248, 250, 252, 0.65)');
  grad.addColorStop(0.75, 'rgba(226, 232, 240, 0.22)');
  grad.addColorStop(1, 'rgba(226, 232, 240, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Configura el Cielo Atmosférico Físico (dispersión de Rayleigh/Mie),
 * mapa de entorno HDRI PBR (PMREMGenerator) para reflejos metálicos y en el cristal de cabina,
 * capa de cúmulos 3D sobre Mérida y selector de hora del día (Día / Hora Dorada / Atardecer).
 */
export function setupSkyAndLighting(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer
): SkyController {
  // 1. Mapa de entorno PBR (IBL) para reflejos realistas en pintura, cromo y parabrisas
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  // 2. Shader Atmosférico Físico Preetham (Rayleigh + Mie)
  const sky = new Sky();
  sky.scale.setScalar(36000);
  scene.add(sky);

  const sunVec = new THREE.Vector3();
  const fog = new THREE.FogExp2(0xcbd5e1, 0.000095);
  scene.fog = fog;

  // 3. Iluminación hemisférica y Sol con sombras suaves de alta resolución
  const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x365314, 0.72);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.35);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 20;
  sunLight.shadow.camera.far = 1800;
  sunLight.shadow.bias = -0.00025;
  const d = 95;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  scene.add(sunLight);

  // 4. Capa de Nubes Cúmulos 3D sobre Yucatán (~750 m - 1,150 m AGL)
  const cloudGroup = new THREE.Group();
  const puffGeo = new THREE.DodecahedronGeometry(1, 1);
  const puffMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.86
  });

  // InstancedMesh de 360 cúmulos volumétricos low-poly suaves + sprites de halo
  const cloudInst = new THREE.InstancedMesh(puffGeo, puffMat, 360);
  const dummy = new THREE.Object3D();
  let seed = 9001;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  let idx = 0;
  for (let c = 0; c < 60; c++) {
    const cx = (rand() - 0.5) * 18000;
    const cz = (rand() - 0.5) * 18000;
    const cy = 620 + rand() * 480; // Cúmulos de buen tiempo a ~2,000 - 3,500 ft

    for (let p = 0; p < 6; p++) {
      dummy.position.set(
        cx + (rand() - 0.5) * 240,
        cy + (rand() - 0.5) * 45,
        cz + (rand() - 0.5) * 220
      );
      const sx = 65 + rand() * 95;
      const sy = 26 + rand() * 38;
      const sz = 55 + rand() * 85;
      dummy.scale.set(sx, sy, sz);
      dummy.rotation.set(rand() * 0.2, rand() * Math.PI, rand() * 0.2);
      dummy.updateMatrix();
      cloudInst.setMatrixAt(idx++, dummy.matrix);
    }
  }
  cloudInst.instanceMatrix.needsUpdate = true;
  cloudGroup.add(cloudInst);

  // Billboards suaves de bruma de nube para bordes difusos
  const spriteMat = new THREE.SpriteMaterial({
    map: createCloudPuffTexture(),
    transparent: true,
    opacity: 0.48,
    depthWrite: false
  });
  for (let s = 0; s < 45; s++) {
    const sp = new THREE.Sprite(spriteMat);
    sp.position.set((rand() - 0.5) * 16000, 680 + rand() * 420, (rand() - 0.5) * 16000);
    const scale = 280 + rand() * 260;
    sp.scale.set(scale * 1.6, scale * 0.75, 1);
    cloudGroup.add(sp);
  }
  scene.add(cloudGroup);

  const setTimeOfDay = (preset: TimeOfDayPreset): void => {
    const uniforms = sky.material.uniforms;

    if (preset === 'day') {
      // Mediodía luminoso sobre Mérida
      uniforms['turbidity'].value = 3.2;
      uniforms['rayleigh'].value = 1.65;
      uniforms['mieCoefficient'].value = 0.0045;
      uniforms['mieDirectionalG'].value = 0.82;

      const phi = THREE.MathUtils.degToRad(90 - 52); // Elevación 52°
      const theta = THREE.MathUtils.degToRad(145);
      sunVec.setFromSphericalCoords(1, phi, theta);
      uniforms['sunPosition'].value.copy(sunVec);

      sunLight.color.setHex(0xfffbeb);
      sunLight.intensity = 2.45;
      hemiLight.color.setHex(0xe0f2fe);
      hemiLight.groundColor.setHex(0x365314);
      hemiLight.intensity = 0.8;
      fog.color.setHex(0xc8e2f8);
      fog.density = 0.000085;
      puffMat.color.setHex(0xffffff);
    } else if (preset === 'golden') {
      // Hora dorada (tarde cálida en Yucatán)
      uniforms['turbidity'].value = 7.5;
      uniforms['rayleigh'].value = 2.6;
      uniforms['mieCoefficient'].value = 0.008;
      uniforms['mieDirectionalG'].value = 0.88;

      const phi = THREE.MathUtils.degToRad(90 - 14); // Elevación 14°
      const theta = THREE.MathUtils.degToRad(245);
      sunVec.setFromSphericalCoords(1, phi, theta);
      uniforms['sunPosition'].value.copy(sunVec);

      sunLight.color.setHex(0xfdba74);
      sunLight.intensity = 2.1;
      hemiLight.color.setHex(0xfed7aa);
      hemiLight.groundColor.setHex(0x422006);
      hemiLight.intensity = 0.65;
      fog.color.setHex(0xfed7aa);
      fog.density = 0.00011;
      puffMat.color.setHex(0xffedd5);
    } else {
      // Atardecer / Crepúsculo en MMMD (luces de pista y PAPI resaltan)
      uniforms['turbidity'].value = 10.0;
      uniforms['rayleigh'].value = 3.2;
      uniforms['mieCoefficient'].value = 0.012;
      uniforms['mieDirectionalG'].value = 0.92;

      const phi = THREE.MathUtils.degToRad(90 - 3.2); // Sol rozando el horizonte
      const theta = THREE.MathUtils.degToRad(262);
      sunVec.setFromSphericalCoords(1, phi, theta);
      uniforms['sunPosition'].value.copy(sunVec);

      sunLight.color.setHex(0xf97316);
      sunLight.intensity = 1.35;
      hemiLight.color.setHex(0x818cf8);
      hemiLight.groundColor.setHex(0x1e1b4b);
      hemiLight.intensity = 0.5;
      fog.color.setHex(0x475569);
      fog.density = 0.00012;
      puffMat.color.setHex(0xfda4af);
    }

    sunLight.position.copy(sunVec).multiplyScalar(900);
  };

  setTimeOfDay('day');

  const updateClouds = (dt: number, playerPos: THREE.Vector3): void => {
    cloudGroup.position.x += dt * 3.2;
    // Mantener la cámara de sombras centrada en el avión
    sunLight.position.set(
      playerPos.x + sunVec.x * 450,
      playerPos.y + sunVec.y * 450,
      playerPos.z + sunVec.z * 450
    );
    sunLight.target.position.copy(playerPos);
    sunLight.target.updateMatrixWorld();
  };

  return {
    sunLight,
    setTimeOfDay,
    updateClouds
  };
}
