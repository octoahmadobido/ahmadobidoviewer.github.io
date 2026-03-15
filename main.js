import * as THREE from 'three';
import { Font } from 'three/examples/jsm/Addons.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


/* ---------- BASIC SCENE ---------- */

const scene = new THREE.Scene();




/* ---------- WORLD AXES (PURE RGB) ---------- */
const AXIS_LEN = 10;

function createWorldAxis(color, x, y, z) {
  const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, y, z)];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color, toneMapped: false });
  return new THREE.Line(geo, mat);
}

const worldX = createWorldAxis(0xff0000, AXIS_LEN, 0, 0);
const worldY = createWorldAxis(0x00ff00, 0, AXIS_LEN, 0);
const worldZ = createWorldAxis(0x0000ff, 0, 0, AXIS_LEN);
scene.add(worldX, worldY, worldZ);

let axesVisible = true;

/* ---------- LIGHTING ---------- */

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 3);
scene.add(dirLight);
scene.add(dirLight.target);

let lightAzimuth = 45 * Math.PI / 180;
const LIGHT_RADIUS = 8;

function updateLightPos() {
  dirLight.position.set(
    Math.cos(lightAzimuth) * LIGHT_RADIUS,
    5,
    Math.sin(lightAzimuth) * LIGHT_RADIUS
  );
  dirLight.target.position.set(0, 0, 0);
  dirLight.target.updateMatrixWorld();
}
updateLightPos();

/* ---------- CAMERA / RENDERER / CONTROLS ---------- */

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

const camera = new THREE.PerspectiveCamera(
  35,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(0, 0, 20);
scene.add(camera);

const canvas = document.querySelector('.webgl');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);
renderer.autoClear = false;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.minDistance = 3;
controls.maxDistance = 25;
controls.zoomSpeed = 0.7;
controls.panSpeed = 2.0;
controls.target.set(0, 0, 0);
controls.autoRotate = false;     // disabled by default
controls.autoRotateSpeed = 2.0;

/* ---------- LOADING ---------- */

function createLoadingOverlay() {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; inset:0; z-index:999999;
    display:flex; align-items:center; justify-content:center;
    background:#000; color:#fff; font:14px system-ui;
    transition:opacity .35s ease;
  `;

  el.innerHTML = `
    <div style="width:min(420px,85vw); text-align:center;">
      <div style="font-size:18px; margin-bottom:14px; opacity:.9;">Loading</div>
      <div style="height:10px; background:rgba(255,255,255,.15); border-radius:999px; overflow:hidden;">
        <div id="loadingBarFill" style="height:100%; width:0%; background:#fff;"></div>
      </div>
      <div id="loadingText" style="margin-top:10px; opacity:.85;">0%</div>
    </div>
  `;

  (function attach() {
    if (document.body) document.body.appendChild(el);
    else requestAnimationFrame(attach);
  })();

  return {
    el,
    fill: () => el.querySelector('#loadingBarFill'),
    text: () => el.querySelector('#loadingText'),
  };
}

const loadingUI = createLoadingOverlay();

const manager = new THREE.LoadingManager();

manager.onProgress = (url, itemsLoaded, itemsTotal) => {
  const p = itemsTotal ? Math.round((itemsLoaded / itemsTotal) * 100) : 0;
  const bar = loadingUI.fill();
  const txt = loadingUI.text();
  if (bar) bar.style.width = `${p}%`;
  if (txt) txt.textContent = `${p}%`;
};

manager.onLoad = () => {
  const bar = loadingUI.fill();
  const txt = loadingUI.text();
  if (bar) bar.style.width = `100%`;
  if (txt) txt.textContent = `100%`;

  setTimeout(() => {
    loadingUI.el.style.opacity = '0';
    setTimeout(() => loadingUI.el.remove(), 400);
  }, 150);
};


/* ---------- SMOOTH ZOOM STATE ---------- */

let targetZoom = camera.zoom;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 28.5;
const ZOOM_STEP = 0.35;  // a bit more than before
const ZOOM_SMOOTH = 0.18;

/* ---------- Draw landmarks ----------- */
const labelGroup = new THREE.Group();
scene.add(labelGroup);

function drawLabel(text) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Canvas size
  canvas.width = 256;
  canvas.height = 128;

  // Center the text
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  // font and color
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  
  // Draw text in the exact center of the canvas
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);

  // Consider adding transparency options just in case
  const material = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true
  });
  
  const sprite = new THREE.Sprite(material);

  // Scale adjusted to match the 2:1 aspect ratio of the canvas (e.g., 5 width, 2.5 height)
  sprite.scale.set(5, 2.5, 1);

  return sprite;
}

const label1 = drawLabel("Olympus Mons");
label1.position.set(2.8, 1.3, -2.8);
scene.add(label1);
labelGroup.add(label1);

/* ---------- GIZMO (TOP-LEFT WITH X/Y/Z LABELS) ---------- */

const gizmoScene = new THREE.Scene();
const gizmoCamera = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0, 10);
gizmoCamera.position.set(0, 0, 5);
gizmoCamera.lookAt(0, 0, 0);

const gizmoRoot = new THREE.Object3D();
gizmoScene.add(gizmoRoot);

function createGizmoAxis(color, x, y, z) {
  const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, y, z)];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });
  const line = new THREE.Line(geo, mat);
  line.renderOrder = 999;
  return line;
}

function createAxisLabel(text, color, x, y, z) {
  const size = 128;
  const canvasLabel = document.createElement('canvas');
  canvasLabel.width = size;
  canvasLabel.height = size;
  const ctx = canvasLabel.getContext('2d');

  ctx.clearRect(0, 0, size, size);
  ctx.font = 'bold 64px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.strokeText(text, size / 2, size / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvasLabel);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, y, z);
  sprite.scale.set(0.8, 0.8, 0.8);
  sprite.renderOrder = 1000;
  return sprite;
}

gizmoRoot.add(
  createGizmoAxis(0xff0000, 1.1, 0, 0),
  createGizmoAxis(0x00ff00, 0, 1.1, 0),
  createGizmoAxis(0x0000ff, 0, 0, 1.1),
  createAxisLabel('X', '#ff0000', 1.3, 0, 0),
  createAxisLabel('Y', '#00ff00', 0, 1.3, 0),
  createAxisLabel('Z', '#0000ff', 0, 0, 1.3)
);


/* ---------- RENDER LOOP ---------- */

function animate() {
  requestAnimationFrame(animate);

  // Smooth zoom animation
  camera.zoom += (targetZoom - camera.zoom) * ZOOM_SMOOTH;
  camera.updateProjectionMatrix();

  controls.update();

  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, sizes.width, sizes.height);
  renderer.clear();
  renderer.render(scene, camera);

  if (axesVisible) {
    const gizmoSize = 110;
    const margin = 16;

    const x = margin;
    const y = sizes.height - gizmoSize - margin;

    renderer.setViewport(x, y, gizmoSize, gizmoSize);
    renderer.setScissor(x, y, gizmoSize, gizmoSize);
    renderer.setScissorTest(true);

    gizmoRoot.quaternion.copy(camera.quaternion).invert();

    renderer.clearDepth();
    renderer.render(gizmoScene, gizmoCamera);
  }

  renderer.setScissorTest(false);
}
animate();

/* ---------- Skybox ---------- */

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

const exrUrl = `${import.meta.env.BASE_URL}textures/starmap_2020_4k.exr`;
const exrLoader = new EXRLoader(manager);

exrLoader.load(
  exrUrl,
  (tex) => {
    tex.colorSpace = THREE.LinearSRGBColorSpace;
    tex.mapping = THREE.EquirectangularReflectionMapping;

 
    scene.background = tex;

    const envMap = pmrem.fromEquirectangular(tex).texture;
    scene.environment = envMap;

    pmrem.dispose();

    console.log("EXR loaded:", exrUrl);
  },
  undefined,
  (err) => console.error("EXR load error:", exrUrl, err)
);

scene.backgroundIntensity = 0.1;
scene.environmentIntensity = 1.0;

/* ---------- MODEL (glTF/glb) ---------- */

const modelUrl = `${import.meta.env.BASE_URL}models/MarsFS.glb`;

const gltfLoader = new GLTFLoader(manager);

let marsModel = null;


gltfLoader.load(
  modelUrl,
  (gltf) => {
    const model = gltf.scene;
    marsModel = gltf.scene;
  

    // масштаб/позиция по желанию
    model.position.set(0, 0, 0);
    model.scale.set(15, 15, 15);

    // чтобы тени работали (если включишь)
    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    scene.add(model);
    console.log("Model loaded:", modelUrl);
  },
  (xhr) => {
    // прогресс
    // console.log((xhr.loaded / xhr.total) * 100, "% loaded");
  },
  (err) => {
    console.error("Model load error:", modelUrl, err);
  }
);




/* ---------- RESIZE ---------- */

window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
});

/* ---------- UI HOOKS ---------- */

const toRad = (deg) => (deg * Math.PI) / 180;

// Smooth zoom buttons (+ / - in the zoom-panel)
const zoomInBtn = document.querySelector('.zoom-in');
const zoomOutBtn = document.querySelector('.zoom-out');

if (zoomInBtn) {
  zoomInBtn.addEventListener('click', () => {
    targetZoom = Math.min(MAX_ZOOM, targetZoom + ZOOM_STEP);
  });
}
if (zoomOutBtn) {
  zoomOutBtn.addEventListener('click', () => {
    targetZoom = Math.max(MIN_ZOOM, targetZoom - ZOOM_STEP);
  });
}

/* ---- Reset Orientation (Compass) ---- */
const compassBtn = document.querySelector('.compass-button');

if (compassBtn) {
  compassBtn.addEventListener('click', () => {

    // Reset camera position
    camera.position.set(0, 0, 8);

    // Reset orbit target
    controls.target.set(0, 0, 0);

    // Make sure controls update
    controls.update();
  });
}

const autoRotateToggle = document.querySelector('.auto-rotate-toggle');
if (autoRotateToggle) {
  autoRotateToggle.addEventListener('change', e => {
    controls.autoRotate = e.target.checked;
  });
}

/* ---- Light rotation ---- */
const lightRotSlider = document.querySelector('.light-rotation');
const lightRotValue = document.querySelector('.light-rotation-value');

if (lightRotSlider && lightRotValue) {
  const updateLightRotUI = () => {
    const v = Number(lightRotSlider.value);
    lightRotValue.textContent = `${Math.round(v)}°`;
    lightAzimuth = toRad(v);
    updateLightPos();
  };
  lightRotSlider.addEventListener('input', updateLightRotUI);
  updateLightRotUI();
}

/* ---- Light intensity ---- */
const lightIntSlider = document.querySelector('.light-intensity');
const lightIntValue = document.querySelector('.light-intensity-value');

if (lightIntSlider && lightIntValue) {
  const updateLightIntUI = () => {
    const v = Number(lightIntSlider.value);
    dirLight.intensity = v;
    lightIntValue.textContent = v.toFixed(1);
  };
  lightIntSlider.addEventListener('input', updateLightIntUI);
  updateLightIntUI();
}

/* ---- Model rotation sliders ---- */

function setupRotationSlider(sliderSelector, labelSelector, axis) {
  const slider = document.querySelector(sliderSelector);
  const label = document.querySelector(labelSelector);
  if (!slider || !label) return;

  const updateRot = () => {
  const v = Number(slider.value);
  label.textContent = `${Math.round(v)}°`;

  if (!marsModel) return;

  const r = toRad(v);
  if (axis === 'x') marsModel.rotation.x = r;
  if (axis === 'y') marsModel.rotation.y = r;
  if (axis === 'z') marsModel.rotation.z = r;
};


  slider.addEventListener('input', updateRot);
  updateRot();
}

setupRotationSlider('.model-rot-x', '.model-rot-x-value', 'x');
setupRotationSlider('.model-rot-y', '.model-rot-y-value', 'y');
setupRotationSlider('.model-rot-z', '.model-rot-z-value', 'z');

/* ---- Show axes toggle ---- */

const axesToggle = document.querySelector('.axes-toggle');
if (axesToggle) {
  axesToggle.addEventListener('change', (event) => {
    axesVisible = event.target.checked;
    worldX.visible = axesVisible;
    worldY.visible = axesVisible;
    worldZ.visible = axesVisible;
  });
}

/* ---- labels visibility ---- */
const labelsToggle = document.querySelector('.labels-toggle')
if (labelsToggle) {
    labelsToggle.addEventListener('change', (event) => {
    labelGroup.visible = event.target.checked;
    })
}