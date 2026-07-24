import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {
  createIcons,
  Info,
  Maximize,
  Minimize,
  Moon,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sun,
  TriangleAlert,
  X,
} from 'lucide';
import { selectPublicModel } from './model-catalog.js';
import './styles.css';

createIcons({
  icons: {
    Info,
    Maximize,
    Minimize,
    Moon,
    Pause,
    Play,
    RotateCcw,
    ShieldCheck,
    Sun,
    TriangleAlert,
    X,
  },
});

const shell = document.querySelector('.viewer-shell');
const canvas = document.querySelector('#viewer-canvas');
const loadingState = document.querySelector('#loading-state');
const loadingLabel = document.querySelector('#loading-label');
const progressBar = document.querySelector('#progress-bar');
const errorState = document.querySelector('#error-state');
const errorTitle = document.querySelector('#error-title');
const errorMessage = document.querySelector('#error-message');
const productName = document.querySelector('#product-name');
const detailsName = document.querySelector('#details-name');
const clientName = document.querySelector('#client-name');
const accessStatus = document.querySelector('#access-status');
const expiryTime = document.querySelector('#expiry-time');
const detailsPanel = document.querySelector('#details-panel');
const infoButton = document.querySelector('#info-button');
const closeDetailsButton = document.querySelector('#close-details-button');
const resetButton = document.querySelector('#reset-button');
const rotateButton = document.querySelector('#rotate-button');
const themeButton = document.querySelector('#theme-button');
const fullscreenButton = document.querySelector('#fullscreen-button');
const watermark = document.querySelector('#watermark');
const watermarkText = document.querySelector('#watermark-text');
const confidentialNote = document.querySelector('#confidential-note');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8ebe6);

const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 1000);
camera.position.set(4.8, 3.2, 6.4);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
pmremGenerator.dispose();

const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
keyLight.position.set(4, 7, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 30;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xbfd7ff, 1.1);
fillLight.position.set(-5, 3, -2);
scene.add(fillLight);

const modelRoot = new THREE.Group();
scene.add(modelRoot);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.ShadowMaterial({ color: 0x1a211b, opacity: 0.13 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.4;
ground.receiveShadow = true;
scene.add(ground);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
controls.autoRotateSpeed = 1.05;
controls.minPolarAngle = 0.08;
controls.maxPolarAngle = Math.PI * 0.92;

let homeView = {
  position: camera.position.clone(),
  target: new THREE.Vector3(0, 0, 0),
};
let isDark = false;
let activeToken = '';

function addMesh(geometry, material, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  modelRoot.add(mesh);
  return mesh;
}

function buildDemoModel() {
  const body = new THREE.MeshPhysicalMaterial({
    color: 0x3f4742,
    roughness: 0.42,
    metalness: 0.5,
    clearcoat: 0.25,
    clearcoatRoughness: 0.35,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x171a18, roughness: 0.5, metalness: 0.72 });
  const accent = new THREE.MeshPhysicalMaterial({ color: 0x18a06f, roughness: 0.3, metalness: 0.25, clearcoat: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xbcc3bf, roughness: 0.28, metalness: 0.9 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xb5fff0,
    roughness: 0.08,
    metalness: 0.05,
    transparent: true,
    opacity: 0.68,
    transmission: 0.45,
    thickness: 0.2,
  });

  addMesh(new THREE.BoxGeometry(3.6, 0.34, 2.35), dark, [0, -1.05, 0]);
  addMesh(new THREE.BoxGeometry(3.3, 1.75, 2.05, 5, 2, 4), body, [0, 0, 0]);
  addMesh(new THREE.BoxGeometry(2.65, 0.12, 1.72), dark, [0, 0.91, 0]);
  addMesh(new THREE.BoxGeometry(1.78, 0.05, 1.05), glass, [0.25, 0.98, 0]);
  addMesh(new THREE.BoxGeometry(0.32, 0.06, 1.05), accent, [-1.03, 0.98, 0]);
  addMesh(new THREE.CylinderGeometry(0.23, 0.23, 0.12, 48), metal, [-1.16, 1.02, 0], [0, 0, 0]);
  addMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 32), dark, [-1.16, 1.11, 0], [0, 0, 0]);

  const ventMaterial = new THREE.MeshStandardMaterial({ color: 0x202522, roughness: 0.7, metalness: 0.45 });
  for (let i = -3; i <= 3; i += 1) {
    addMesh(new THREE.BoxGeometry(0.09, 0.82, 0.035), ventMaterial, [i * 0.24, -0.02, 1.045]);
  }

  for (const x of [-1.32, 1.32]) {
    addMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 24), dark, [x, -1.27, -0.72]);
    addMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 24), dark, [x, -1.27, 0.72]);
  }

  modelRoot.rotation.y = -0.28;
  finishModelSetup();
}

function clearModel() {
  while (modelRoot.children.length > 0) {
    const child = modelRoot.children.pop();
    child.geometry?.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
    } else {
      child.material?.dispose();
    }
  }
  modelRoot.rotation.set(0, 0, 0);
}

function finishModelSetup() {
  modelRoot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(modelRoot);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z, 0.5);

  modelRoot.position.sub(center);
  modelRoot.updateMatrixWorld(true);

  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const distance = (maxDimension / (2 * Math.tan(verticalFov / 2))) * 1.65;
  const direction = new THREE.Vector3(1, 0.62, 1.18).normalize();

  controls.target.set(0, 0, 0);
  camera.position.copy(direction.multiplyScalar(distance));
  camera.near = Math.max(distance / 1000, 0.01);
  camera.far = distance * 100;
  camera.updateProjectionMatrix();
  controls.minDistance = distance * 0.28;
  controls.maxDistance = distance * 4.5;
  controls.update();

  const adjustedBox = new THREE.Box3().setFromObject(modelRoot);
  ground.position.y = adjustedBox.min.y - Math.max(maxDimension * 0.015, 0.015);
  homeView = { position: camera.position.clone(), target: controls.target.clone() };
}

function setProgress(percent, label = '正在载入模型') {
  const bounded = Math.min(Math.max(percent, 8), 100);
  progressBar.style.width = `${bounded}%`;
  loadingLabel.textContent = label;
}

function finishLoading() {
  setProgress(100, '模型已就绪');
  window.setTimeout(() => loadingState.classList.add('is-hidden'), 220);
}

function showError(title, message) {
  loadingState.classList.add('is-hidden');
  errorTitle.textContent = title;
  errorMessage.textContent = message;
  errorState.hidden = false;
  controls.enabled = false;
}

function getTokenFromHash() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return params.get('token') || '';
}

async function fetchShareConfig(token) {
  const response = await fetch('/api/share', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.message || '访问链接无效或已过期');
  }
  return response.json();
}

function applyShareConfig(config) {
  productName.textContent = config.name;
  detailsName.textContent = config.name;
  clientName.textContent = config.client || '授权客户';
  accessStatus.textContent = '授权有效';
  expiryTime.textContent = new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(config.expiresAt));
  watermarkText.textContent = `${config.client || '授权客户'} · 专属查看`;
  watermark.hidden = false;
  confidentialNote.hidden = false;
  document.title = `${config.name} · 3D 查看`;
}

function applyPublicConfig(config) {
  const name = config.name || '工业产品预览';
  productName.textContent = name;
  detailsName.textContent = name;
  clientName.textContent = config.client || '公开链接';
  accessStatus.textContent = config.client ? '客户链接' : '公开预览';
  expiryTime.textContent = '长期有效';
  document.title = `${name} · 3D 查看`;

  if (config.watermark) {
    watermarkText.textContent = config.watermark;
    watermark.hidden = false;
  }
}

function loadModel(config, token = '') {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    if (token) {
      loader.setRequestHeader({ Authorization: `Bearer ${token}` });
    }
    loader.load(
      config.modelUrl,
      (gltf) => {
        clearModel();
        modelRoot.add(gltf.scene);
        gltf.scene.traverse((object) => {
          if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });
        finishModelSetup();
        resolve();
      },
      (event) => {
        if (event.lengthComputable && event.total > 0) {
          setProgress((event.loaded / event.total) * 100);
        } else {
          setProgress(42);
        }
      },
      reject,
    );
  });
}

async function fetchPublicConfig() {
  const configUrl = new URL('models.json', document.baseURI);
  const response = await fetch(configUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('找不到 models.json');
  }
  const catalog = await response.json();
  const requestedId = new URLSearchParams(window.location.search).get('model') || '';
  return selectPublicModel(catalog, requestedId);
}

async function bootstrap() {
  activeToken = getTokenFromHash();
  if (!activeToken) {
    try {
      const config = await fetchPublicConfig();
      if (!config.modelUrl) {
        setProgress(35, '正在准备演示模型');
        buildDemoModel();
        finishLoading();
        return;
      }

      config.modelUrl = new URL(config.modelUrl, document.baseURI).href;
      applyPublicConfig(config);
      setProgress(24);
      await loadModel(config);
      finishLoading();
    } catch (error) {
      showError('无法打开模型', error.message || '模型文件不存在，请检查公开模型配置。');
    }
    return;
  }

  try {
    setProgress(14, '正在验证访问权限');
    const config = await fetchShareConfig(activeToken);
    applyShareConfig(config);
    setProgress(24);
    await loadModel(config, activeToken);
    finishLoading();
  } catch (error) {
    showError('无法打开模型', error.message || '链接可能已经过期，请联系发送方重新获取。');
  }
}

function setPanel(open) {
  detailsPanel.classList.toggle('is-open', open);
  detailsPanel.setAttribute('aria-hidden', String(!open));
  infoButton.setAttribute('aria-expanded', String(open));
}

function replaceButtonIcon(button, iconName) {
  const oldIcon = button.querySelector('svg');
  const placeholder = document.createElement('i');
  placeholder.setAttribute('data-lucide', iconName);
  oldIcon?.replaceWith(placeholder);
  createIcons({
    icons: { Maximize, Minimize, Moon, Pause, Play, Sun },
    attrs: { 'aria-hidden': 'true' },
  });
}

function resetView() {
  camera.position.copy(homeView.position);
  controls.target.copy(homeView.target);
  controls.update();
}

function toggleRotation() {
  controls.autoRotate = !controls.autoRotate;
  rotateButton.classList.toggle('is-active', controls.autoRotate);
  rotateButton.setAttribute('aria-pressed', String(controls.autoRotate));
  rotateButton.setAttribute('aria-label', controls.autoRotate ? '暂停自动旋转' : '开始自动旋转');
  rotateButton.dataset.tooltip = controls.autoRotate ? '暂停旋转' : '自动旋转';
  replaceButtonIcon(rotateButton, controls.autoRotate ? 'pause' : 'play');
}

function toggleTheme() {
  isDark = !isDark;
  shell.classList.toggle('is-dark', isDark);
  scene.background.set(isDark ? 0x242825 : 0xe8ebe6);
  ground.material.opacity = isDark ? 0.3 : 0.13;
  themeButton.setAttribute('aria-pressed', String(isDark));
  themeButton.setAttribute('aria-label', isDark ? '切换浅色背景' : '切换深色背景');
  replaceButtonIcon(themeButton, isDark ? 'moon' : 'sun');
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await shell.requestFullscreen?.();
  } else {
    await document.exitFullscreen?.();
  }
}

infoButton.addEventListener('click', () => setPanel(!detailsPanel.classList.contains('is-open')));
closeDetailsButton.addEventListener('click', () => setPanel(false));
resetButton.addEventListener('click', resetView);
rotateButton.addEventListener('click', toggleRotation);
themeButton.addEventListener('click', toggleTheme);
fullscreenButton.addEventListener('click', toggleFullscreen);

document.addEventListener('fullscreenchange', () => {
  const isFullscreen = Boolean(document.fullscreenElement);
  fullscreenButton.setAttribute('aria-label', isFullscreen ? '退出全屏' : '进入全屏');
  fullscreenButton.dataset.tooltip = isFullscreen ? '退出全屏' : '全屏';
  replaceButtonIcon(fullscreenButton, isFullscreen ? 'minimize' : 'maximize');
});

const resizeObserver = new ResizeObserver(() => {
  const width = shell.clientWidth;
  const height = shell.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});
resizeObserver.observe(shell);

function animate() {
  controls.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

bootstrap();
