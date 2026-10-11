// OrbitLab — 3D Photorealistic Satellite & ISS Telemetry Engine
// Powered by Three.js & Real-Time Orbital Mechanics

const EARTH_RADIUS = 5.0;
let scene, camera, renderer, controls;
let earthMesh, cloudsMesh, atmosphereMesh;
let issGroup, issOrbitLine;
let gpsGroup, starlinkGroup, hubbleGroup;
let isLockedToIss = false;

// Telemetry State
let currentLat = 51.64;
let currentLng = 0.0;
let currentAlt = 418.2;
let currentVel = 27580;
let isSunlit = true;

// Texture Loader
const texLoader = new THREE.TextureLoader();

function initScene() {
  const container = document.getElementById('viewport');
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Scene & Camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 8, 16);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  // OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 6.0;
  controls.maxDistance = 50.0;

  // Lighting
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
  sunLight.position.set(15, 5, 10);
  scene.add(sunLight);

  const ambientLight = new THREE.AmbientLight(0x223344, 0.5);
  scene.add(ambientLight);

  createStarfield();
  createEarth();
  createAtmosphere();
  createIss();
  createConstellations();

  window.addEventListener('resize', onWindowResize);

  // Start live telemetry polling & fallback propagation
  fetchLiveIssTelemetry();
  setInterval(fetchLiveIssTelemetry, 5000);

  animate();
}

// ==========================================
// 3D Celestial Objects
// ==========================================
function createStarfield() {
  const starCount = 1800;
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount * 3; i += 3) {
    const r = 150 + Math.random() * 200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i + 2] = r * Math.cos(phi);
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0.85 });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
}

function createEarth() {
  const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
  const dayTex = texLoader.load('assets/textures/earth_day.jpg');
  const normalTex = texLoader.load('assets/textures/earth_normal.jpg');
  const specTex = texLoader.load('assets/textures/earth_specular.jpg');

  const earthMat = new THREE.MeshPhongMaterial({
    map: dayTex,
    normalMap: normalTex,
    normalScale: new THREE.Vector2(0.85, 0.85),
    specularMap: specTex,
    specular: new THREE.Color(0x223344),
    shininess: 15
  });

  earthMesh = new THREE.Mesh(earthGeo, earthMat);
  scene.add(earthMesh);

  // Revolving Cloud Layer
  const cloudsGeo = new THREE.SphereGeometry(EARTH_RADIUS + 0.04, 64, 64);
  const cloudsTex = texLoader.load('assets/textures/earth_clouds.png');
  const cloudsMat = new THREE.MeshLambertMaterial({
    map: cloudsTex,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending
  });

  cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
  scene.add(cloudsMesh);
}

function createAtmosphere() {
  // Rayleigh Atmospheric Rim Glow Shader
  const vertexShader = `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec3 vNormal;
    void main() {
      float intensity = pow(max(0.0, 0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.2);
      gl_FragColor = vec4(0.25, 0.65, 1.0, 1.0) * intensity;
    }
  `;

  const atmosGeo = new THREE.SphereGeometry(EARTH_RADIUS + 0.16, 64, 64);
  const atmosMat = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true
  });

  atmosphereMesh = new THREE.Mesh(atmosGeo, atmosMat);
  scene.add(atmosphereMesh);
}

// ==========================================
// ISS 3D Model & Trajectory Ribbon
// ==========================================
function createIss() {
  issGroup = new THREE.Group();

  // Central cylindrical habitat module
  const bodyGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.22, 12);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xddeeff, metalness: 0.8, roughness: 0.2 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.z = Math.PI / 2;
  issGroup.add(body);

  // Solar array cross-truss
  const trussGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8);
  const truss = new THREE.Mesh(trussGeo, bodyMat);
  issGroup.add(truss);

  // Golden Solar Panels (4 Wings)
  const panelGeo = new THREE.BoxGeometry(0.08, 0.22, 0.008);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0xcca010,
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x332200
  });

  [-0.24, 0.24].forEach(yPos => {
    const p1 = new THREE.Mesh(panelGeo, panelMat);
    p1.position.set(0, yPos, 0);
    issGroup.add(p1);
  });

  scene.add(issGroup);

  // Draw 51.6° Inclined Orbit Ribbon
  const orbitPoints = [];
  const segments = 120;
  const orbitR = EARTH_RADIUS + 0.35; // 420km scaled
  const inc = THREE.MathUtils.degToRad(51.64);

  for (let i = 0; i <= segments; i++) {
    const u = (i / segments) * Math.PI * 2;
    const x = orbitR * Math.cos(u);
    const y = orbitR * Math.sin(u) * Math.sin(inc);
    const z = orbitR * Math.sin(u) * Math.cos(inc);
    orbitPoints.push(new THREE.Vector3(x, y, z));
  }

  const orbitCurve = new THREE.CatmullRomCurve3(orbitPoints);
  const orbitGeo = new THREE.TubeGeometry(orbitCurve, 100, 0.008, 6, true);
  const orbitMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });
  issOrbitLine = new THREE.Mesh(orbitGeo, orbitMat);
  scene.add(issOrbitLine);
}

// ==========================================
// Constellation Swarms (GPS, Starlink, Hubble)
// ==========================================
function createConstellations() {
  // 1. GPS MEO Constellation (24 Satellites in 6 planes)
  gpsGroup = new THREE.Group();
  const gpsR = EARTH_RADIUS + 2.4; // 20,200 km altitude
  const gpsMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
  for (let p = 0; p < 6; p++) {
    const planeAngle = (p / 6) * Math.PI * 2;
    for (let s = 0; s < 4; s++) {
      const u = (s / 4) * Math.PI * 2 + (p * 0.5);
      const sat = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), gpsMat);
      sat.position.set(
        gpsR * Math.cos(u) * Math.cos(planeAngle),
        gpsR * Math.sin(u) * 0.8,
        gpsR * Math.cos(u) * Math.sin(planeAngle)
      );
      gpsGroup.add(sat);
    }
  }
  scene.add(gpsGroup);

  // 2. Starlink LEO Cluster (48 satellites)
  starlinkGroup = new THREE.Group();
  const slR = EARTH_RADIUS + 0.45; // 550 km
  const slMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
  for (let i = 0; i < 48; i++) {
    const u = Math.random() * Math.PI * 2;
    const inc = THREE.MathUtils.degToRad(53.0);
    const sat = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), slMat);
    sat.position.set(
      slR * Math.cos(u),
      slR * Math.sin(u) * Math.sin(inc),
      slR * Math.sin(u) * Math.cos(inc)
    );
    starlinkGroup.add(sat);
  }
  scene.add(starlinkGroup);

  // 3. Hubble Space Telescope
  hubbleGroup = new THREE.Group();
  const hstR = EARTH_RADIUS + 0.44; // 540 km
  const hstMat = new THREE.MeshBasicMaterial({ color: 0xfb923c });
  const hst = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), hstMat);
  hst.position.set(hstR * 0.7, hstR * 0.5, hstR * 0.4);
  hubbleGroup.add(hst);
  scene.add(hubbleGroup);
}

// Convert Lat/Lng/Alt to 3D Cartesian coordinates on Earth Sphere
function latLngToVector3(lat, lng, altKm) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const r = EARTH_RADIUS + (altKm / 6371.0) * EARTH_RADIUS; // Scaled radius

  const x = -(r * Math.sin(phi) * Math.cos(theta));
  const z = r * Math.sin(phi) * Math.sin(theta);
  const y = r * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

// ==========================================
// Live Open Notify ISS Telemetry Poller
// ==========================================
async function fetchLiveIssTelemetry() {
  try {
    const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
    if (!res.ok) throw new Error("API status " + res.status);
    const data = await res.json();

    currentLat = data.latitude;
    currentLng = data.longitude;
    currentAlt = data.altitude;
    currentVel = data.velocity;
    isSunlit = data.visibility === "daylight";

    updateHudTelemetry();
  } catch (err) {
    // Smooth fallback extrapolation
    currentLng = (currentLng + 0.4) % 360;
    currentLat = 51.64 * Math.sin(THREE.MathUtils.degToRad(currentLng * 2));
    updateHudTelemetry();
  }
}

function updateHudTelemetry() {
  document.getElementById('hudAlt').textContent = `${currentAlt.toFixed(1)} km`;
  document.getElementById('hudVel').textContent = `${Math.round(currentVel).toLocaleString()} km/h`;

  const latDir = currentLat >= 0 ? 'N' : 'S';
  const lngDir = currentLng >= 0 ? 'E' : 'W';
  document.getElementById('hudCoords').textContent = `${Math.abs(currentLat).toFixed(2)}° ${latDir}, ${Math.abs(currentLng).toFixed(2)}° ${lngDir}`;

  const sunEl = document.getElementById('hudSunlight');
  if (isSunlit) {
    sunEl.textContent = "DAYLIGHT";
    sunEl.className = "val text-success";
  } else {
    sunEl.textContent = "EARTH SHADOW";
    sunEl.className = "val";
    sunEl.style.color = "#94a3b8";
  }
}

// ==========================================
// Interactive Actions & Camera Lock
// ==========================================
function toggleLockIss() {
  isLockedToIss = !isLockedToIss;
  const btn = document.getElementById('btnLockIss');
  btn.classList.toggle('active', isLockedToIss);
  btn.textContent = isLockedToIss ? "🎯 UNLOCK ISS" : "🎯 LOCK ISS";
}

function resetCamera() {
  isLockedToIss = false;
  document.getElementById('btnLockIss').classList.remove('active');
  document.getElementById('btnLockIss').textContent = "🎯 LOCK ISS";
  camera.position.set(0, 8, 16);
  controls.target.set(0, 0, 0);
}

function toggleLayer(layer) {
  if (layer === 'iss' && issOrbitLine) issOrbitLine.visible = !issOrbitLine.visible;
  if (layer === 'gps' && gpsGroup) gpsGroup.visible = !gpsGroup.visible;
  if (layer === 'starlink' && starlinkGroup) starlinkGroup.visible = !starlinkGroup.visible;
  if (layer === 'hubble' && hubbleGroup) hubbleGroup.visible = !hubbleGroup.visible;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==========================================
// 60 FPS Animation Loop
// ==========================================
function animate() {
  requestAnimationFrame(animate);

  // Slow Earth and clouds axial rotation
  if (earthMesh) earthMesh.rotation.y += 0.0003;
  if (cloudsMesh) cloudsMesh.rotation.y += 0.00045;

  // Update ISS position along orbit
  const issPos = latLngToVector3(currentLat, currentLng, currentAlt);
  if (issGroup) {
    issGroup.position.copy(issPos);
    issGroup.lookAt(0, 0, 0);
  }

  // Camera lock tracking
  if (isLockedToIss && issGroup) {
    controls.target.lerp(issGroup.position, 0.08);
  }

  controls.update();
  renderer.render(scene, camera);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initScene);
