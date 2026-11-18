import * as THREE from 'three';

/**
 * Crea el cielo con gradiente atmosférico, luz solar de Yucatán y niebla de distancia.
 */
export function setupSkyAndLighting(scene: THREE.Scene): {
  sunLight: THREE.DirectionalLight;
} {
  scene.background = new THREE.Color(0x7ec0ee);
  scene.fog = new THREE.FogExp2(0x9ed2f6, 0.00018);

  // Domo de cielo con shader ligero de horizonte cálido
  const skyGeo = new THREE.SphereGeometry(12000, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x2563eb) },
      horizonColor: { value: new THREE.Color(0xbae6fd) },
      bottomColor: { value: new THREE.Color(0x3f6212) }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        vec3 col = mix(horizonColor, topColor, max(pow(max(h, 0.0), 0.55), 0.0));
        if (h < 0.0) {
          col = mix(horizonColor, bottomColor, min(-h * 4.0, 1.0));
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  // Iluminación hemisférica y direccional (Sol de Mérida)
  const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x365314, 0.75);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.65);
  sunLight.position.set(600, 900, -500);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 50;
  sunLight.shadow.camera.far = 2600;
  const d = 140;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  scene.add(sunLight);

  return { sunLight };
}
