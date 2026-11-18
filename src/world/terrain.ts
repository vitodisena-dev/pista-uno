import * as THREE from 'three';

/**
 * Crea el terreno plano de la península de Yucatán alrededor de MMMD,
 * con grilla sutil de referencia visual de velocidad y altura.
 */
export function createTerrain(): THREE.Group {
  const group = new THREE.Group();

  // Suelo principal de pasto / selva baja yucateca (20 km x 20 km)
  const groundGeo = new THREE.PlaneGeometry(20000, 20000, 1, 1);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x3f6212 });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // Franja despejada del perímetro aeroportuario MMMD
  const airfieldGeo = new THREE.PlaneGeometry(4200, 1400);
  airfieldGeo.rotateX(-Math.PI / 2);
  const airfieldMat = new THREE.MeshLambertMaterial({ color: 0x4d7c0f });
  const airfieldMesh = new THREE.Mesh(airfieldGeo, airfieldMat);
  airfieldMesh.position.y = 0.01;
  // Alineado con rumbo 108° de la pista 10/28
  const headingRad = (108 - 90) * (Math.PI / 180);
  airfieldMesh.rotation.y = -headingRad;
  airfieldMesh.receiveShadow = true;
  group.add(airfieldMesh);

  return group;
}
