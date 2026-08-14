import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const MANIFEST_URL = '/home/manifest.json';

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

const CORRIDOR_WIDTH = 6;
const WALL_HEIGHT = 4;
const EYE_HEIGHT = 1.7;
const MOVE_SPEED = 6.0;
const WALL_MARGIN = 0.6;

const PLAZA_SIZE = 16;
const PLAZA_HALF = PLAZA_SIZE / 2;

const HALL_START_Z = 2;
const HALL_SPACING = 3.4;
const HALL_END_PAD = 3;

const FRAME_SPACING = 3.2;
const FRAME_SIZE = 1.7;

const TWEET_SPACING = 2.0;
const TWEET_SIZE = 1.4;
const TWEETS_MAX = isTouch ? 24 : 60;

const ARCH_ROOM_LENGTH = 9;

const ABOUT_SPACING = 1.9;

const ACCENT_GALLERY = 0xe85d4a;
const ACCENT_TWEETS = 0x4a90d9;
const ACCENT_ARCHITECTURE = 0x2fa88a;
const ACCENT_LINK = 0xe8b23d;
const ZONE_COLORS = { plaza: '#3a3945', hall: '#e8b23d', gallery: '#e85d4a', tweets: '#4a90d9', architecture: '#2fa88a' };

// Flat billboard panels don't need mipmaps — skipping them cuts texture
// upload/generation cost noticeably, which matters most on mobile GPUs.
function flatTexture(texture) {
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

const loadingEl = document.getElementById('loading');
const hudLabel = document.getElementById('hud-label');
const controlsHint = document.getElementById('controls-hint');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');

init();

async function init() {
  const manifest = await fetch(MANIFEST_URL).then(r => r.json());
  const gallery = manifest.gallery || [];
  const tweets = (manifest.tweets || []).slice(0, TWEETS_MAX);
  const profile = manifest.profile || {};

  if (isTouch) {
    document.body.classList.add('is-touch');
    controlsHint.textContent = 'Left stick: move · Drag right side: look · Tap a target to shoot';
  } else {
    controlsHint.textContent = 'WASD: move · Mouse: look · Click: shoot · ESC: exit';
  }

  // ---- layout: a central plaza with four branches ----
  const aboutItemsReversed = (profile.doingnow_items || []).slice().reverse();
  const hallLayout = computeHallLayout(profile, aboutItemsReversed);
  const hallLength = hallLayout.total;
  const galleryLength = Math.max(Math.ceil(gallery.length / 2), 1) * FRAME_SPACING + 3;
  const tweetsLength = Math.max(Math.ceil(tweets.length / 2), 1) * TWEET_SPACING + 3;
  const archLength = ARCH_ROOM_LENGTH;

  const corridorHalf = CORRIDOR_WIDTH / 2;
  const DOOR_OVERLAP = 1.5; // let each branch zone bleed into the plaza past the doorway so there's no dead strip at the threshold
  const zones = [
    { name: 'plaza', minX: -PLAZA_HALF, maxX: PLAZA_HALF, minZ: -PLAZA_HALF, maxZ: PLAZA_HALF },
    { name: 'hall', minX: -corridorHalf, maxX: corridorHalf, minZ: PLAZA_HALF - DOOR_OVERLAP, maxZ: PLAZA_HALF + hallLength },
    { name: 'gallery', minX: -corridorHalf, maxX: corridorHalf, minZ: -PLAZA_HALF - galleryLength, maxZ: -PLAZA_HALF + DOOR_OVERLAP },
    { name: 'tweets', minX: PLAZA_HALF - DOOR_OVERLAP, maxX: PLAZA_HALF + tweetsLength, minZ: -corridorHalf, maxZ: corridorHalf },
    { name: 'architecture', minX: -PLAZA_HALF - archLength, maxX: -PLAZA_HALF + DOOR_OVERLAP, minZ: -corridorHalf, maxZ: corridorHalf },
  ];
  const layout = { zones, hallLength, galleryLength, tweetsLength, archLength };

  // zones used only to label "where am I", without the door overlap so the label
  // flips right at the physical doorway instead of a bit early
  const labelZones = [
    { name: 'hall', label: 'Entrance Hall', minX: -corridorHalf, maxX: corridorHalf, minZ: PLAZA_HALF, maxZ: PLAZA_HALF + hallLength },
    { name: 'gallery', label: `Gallery — ${gallery.length} photos`, minX: -corridorHalf, maxX: corridorHalf, minZ: -PLAZA_HALF - galleryLength, maxZ: -PLAZA_HALF },
    { name: 'tweets', label: 'Tweets Room', minX: PLAZA_HALF, maxX: PLAZA_HALF + tweetsLength, minZ: -corridorHalf, maxZ: corridorHalf },
    { name: 'architecture', label: 'Architecture Room', minX: -PLAZA_HALF - archLength, maxX: -PLAZA_HALF, minZ: -corridorHalf, maxZ: corridorHalf },
  ];
  function currentZoneLabel(x, z) {
    for (const zn of labelZones) {
      if (x >= zn.minX && x <= zn.maxX && z >= zn.minZ && z <= zn.maxZ) return zn.label;
    }
    return 'Central Plaza';
  }

  // ---- scene ----
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0a10);
  scene.fog = new THREE.Fog(0x0b0a10, isTouch ? 6 : 10, isTouch ? 20 : 30);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, isTouch ? 42 : 100);
  camera.position.set(0, EYE_HEIGHT, PLAZA_HALF + hallLength - 1);
  camera.rotation.order = 'YXZ';

  const renderer = new THREE.WebGLRenderer({ antialias: !isTouch, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  buildPlaza(scene);

  const aboutTargets = [];
  addBranch(scene, { axis: 'z', worldOffset: PLAZA_HALF, sign: 1 }, container =>
    buildHall(container, hallLayout, aboutItemsReversed, aboutTargets));
  addBranch(scene, { axis: 'z', worldOffset: -PLAZA_HALF, sign: -1 }, container => {
    buildCorridorShell(container, galleryLength);
    buildGalleryFrames(container, gallery, 0);
  });
  addBranch(scene, { axis: 'x', worldOffset: PLAZA_HALF, sign: 1 }, container => {
    buildCorridorShell(container, tweetsLength);
    buildTweetPanels(container, tweets, 0);
  });
  addBranch(scene, { axis: 'x', worldOffset: -PLAZA_HALF, sign: -1 }, container => {
    buildArchitectureRoom(container, profile, archLength);
  });

  const hemi = new THREE.HemisphereLight(0x8899aa, 0x111111, isTouch ? 1.5 : 0.9);
  scene.add(hemi);
  if (!isTouch) addPointLightGrid(scene, zones);

  // ---- controls ----
  const controls = new PointerLockControls(camera, renderer.domElement);
  const raycaster = new THREE.Raycaster();
  const bullets = [];

  loadingEl.classList.add('hidden');

  // Movement works right away, no click needed — the persistent controls-hint
  // in the HUD covers instructions instead of a blocking "click to enter" screen.
  // A click is still what grants mouse-look (Pointer Lock API requires a user
  // gesture), but nothing on screen needs to gate on it.
  const keys = { forward: false, back: false, left: false, right: false };
  window.addEventListener('keydown', e => {
    if (e.code === 'Escape') { window.location.href = '/'; return; }
    setKey(e.code, true);
  });
  window.addEventListener('keyup', e => setKey(e.code, false));
  function setKey(code, value) {
    if (code === 'KeyW' || code === 'ArrowUp') keys.forward = value;
    if (code === 'KeyS' || code === 'ArrowDown') keys.back = value;
    if (code === 'KeyA' || code === 'ArrowLeft') keys.left = value;
    if (code === 'KeyD' || code === 'ArrowRight') keys.right = value;
  }

  document.addEventListener('click', () => {
    if (isTouch) return;
    if (!controls.isLocked) { controls.lock(); return; }
    interact(camera, raycaster, scene, bullets);
  });

  const touch = isTouch ? setupTouchControls(camera, () => interact(camera, raycaster, scene, bullets)) : null;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  const margin = WALL_MARGIN;
  let lastZoneLabel = null;

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    const step = MOVE_SPEED * dt;

    // movement always works — only mouse-look needs the click-granted pointer lock
    const prevX = camera.position.x, prevZ = camera.position.z;

    if (keys.forward) controls.moveForward(step);
    if (keys.back) controls.moveForward(-step);
    if (keys.left) controls.moveRight(-step);
    if (keys.right) controls.moveRight(step);
    if (touch) {
      controls.moveForward(-touch.move.y * step);
      controls.moveRight(touch.move.x * step);
    }

    resolveCollision(camera, prevX, prevZ, zones, margin);
    camera.position.y = EYE_HEIGHT;

    const zoneLabel = currentZoneLabel(camera.position.x, camera.position.z);
    if (zoneLabel !== lastZoneLabel) {
      hudLabel.textContent = zoneLabel;
      lastZoneLabel = zoneLabel;
    }

    updateAboutTargets(aboutTargets, dt);
    updateBullets(bullets, dt);
    updateMinimap(camera, layout);
    renderer.render(scene, camera);
  });
}

// ---------------------------------------------------------------- collision

function insideZones(x, z, zones, margin) {
  return zones.some(zn =>
    x >= zn.minX + margin && x <= zn.maxX - margin &&
    z >= zn.minZ + margin && z <= zn.maxZ - margin
  );
}

function resolveCollision(camera, prevX, prevZ, zones, margin) {
  const { x, z } = camera.position;
  if (insideZones(x, z, zones, margin)) return;
  if (insideZones(x, prevZ, zones, margin)) { camera.position.z = prevZ; return; }
  if (insideZones(prevX, z, zones, margin)) { camera.position.x = prevX; return; }
  camera.position.x = prevX;
  camera.position.z = prevZ;
}

// ---------------------------------------------------------------- branches

function addBranch(scene, { axis, worldOffset, sign }, buildFn) {
  const group = new THREE.Group();
  if (axis === 'z') {
    group.position.set(0, 0, worldOffset);
    group.rotation.y = sign > 0 ? 0 : Math.PI;
  } else {
    group.position.set(worldOffset, 0, 0);
    group.rotation.y = sign > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  scene.add(group);
  buildFn(group);
  return group;
}

// ---------------------------------------------------------------- content

// Walking order in the hall runs from the spawn point (far end) toward the plaza
// (z=0), so whatever should be seen FIRST needs to sit at the highest z. Order
// requested: 1) title/quote, 2) "about me" blurb, 3) the doingnow bullets in
// reverse, 4) social links right before stepping into the plaza.
function computeHallLayout(profile, aboutItemsReversed) {
  const intro = [
    { kind: 'title', title: profile.title || 'David Ayala', body: stripHtml(profile.message || '') },
    { kind: 'text', title: 'Sobre mi', body: stripHtml(profile.description || '') },
  ];
  const social = (profile.social || []).map(s => ({ kind: 'link', title: s.title, url: s.link }));
  const introLen = Math.ceil(intro.length / 2) * HALL_SPACING + HALL_END_PAD;
  const socialLen = Math.ceil(Math.max(social.length, 1) / 2) * HALL_SPACING + HALL_END_PAD;
  const aboutLen = aboutItemsReversed.length ? aboutItemsReversed.length * ABOUT_SPACING + 3 : 0;
  const total = socialLen + aboutLen + introLen;
  return { intro, social, introLen, socialLen, aboutLen, total };
}

function buildHall(container, layout, aboutItemsReversed, targets) {
  buildCorridorShell(container, layout.total);
  mountWallItems(container, layout.social, 0);
  buildAboutTargets(container, aboutItemsReversed, layout.socialLen, targets);
  mountWallItems(container, layout.intro, layout.socialLen + layout.aboutLen);
}

function mountWallItems(container, items, zOffset) {
  const size = 1.9;
  items.forEach((item, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const z = zOffset + HALL_START_Z + Math.floor(i / 2) * HALL_SPACING;
    const isLink = item.kind === 'link';

    const canvas = isLink ? makeLinkCanvas(item.title) : makeTextCanvas(item.title, item.body);
    const mat = new THREE.MeshBasicMaterial({ map: flatTexture(new THREE.CanvasTexture(canvas)) });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);

    mountPanel(container, {
      size, z, side,
      frameMaterial: isLink ? linkFrameMat : frameMat,
      contentMesh: mesh,
      url: item.url,
    });
  });
}

function buildAboutTargets(container, items, startZ, targets) {
  items.forEach((text, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * 0.9;
    const z = startZ + 2 + i * ABOUT_SPACING;

    const label = makeFloatingLabel(text);
    label.position.set(x, EYE_HEIGHT - 0.35, z);
    container.add(label);

    const targetMat = new THREE.MeshBasicMaterial({
      map: flatTexture(new THREE.CanvasTexture(makeTargetCanvas())), transparent: true, side: THREE.DoubleSide,
    });
    const target = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), targetMat);
    target.position.set(x, EYE_HEIGHT + 0.35, z);
    target.userData = { isAboutTarget: true, state: 'idle', t: 0, label, spinSeed: i };
    container.add(target);

    targets.push(target);
  });
}

function makeTargetCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const cx = 128, cy = 128;
  [[122, '#e8e6e0'], [94, '#c0392b'], [66, '#e8e6e0'], [38, '#c0392b']].forEach(([r, color]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#1c1b22';
  ctx.fill();
  return canvas;
}

// ---------------------------------------------------------------- plaza

function buildPlaza(scene) {
  const doorWidth = CORRIDOR_WIDTH;

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x201f28, roughness: 0.9 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(PLAZA_SIZE, PLAZA_SIZE), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x0f0e13, roughness: 1 });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(PLAZA_SIZE, PLAZA_SIZE), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT + 1.2;
  scene.add(ceiling);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3f3f0, roughness: 0.85 });
  const wingWidth = (PLAZA_SIZE - doorWidth) / 2;

  // four walls, each split into two wings around the central doorway
  const walls = [
    { rot: 0, pos: [0, PLAZA_HALF] },        // south
    { rot: Math.PI, pos: [0, -PLAZA_HALF] }, // north
    { rot: -Math.PI / 2, pos: [PLAZA_HALF, 0] },  // east
    { rot: Math.PI / 2, pos: [-PLAZA_HALF, 0] },  // west
  ];
  walls.forEach(w => {
    [-1, 1].forEach(side => {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(wingWidth, WALL_HEIGHT), wallMat);
      const offset = side * (doorWidth / 2 + wingWidth / 2);
      wing.position.set(offset, WALL_HEIGHT / 2, 0);
      const group = new THREE.Group();
      group.rotation.y = w.rot;
      group.position.set(w.pos[0], 0, w.pos[1]);
      group.add(wing);
      scene.add(group);
    });
  });

  // pillar in the middle with a landmark light, labels above each doorway
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x2a2833, roughness: 0.5 });
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, WALL_HEIGHT, 16), pillarMat);
  pillar.position.set(0, WALL_HEIGHT / 2, 0);
  scene.add(pillar);

  const doorSigns = [
    { text: 'Gallery', color: ZONE_COLORS.gallery, pos: [0, 2.6, -PLAZA_HALF + 0.05], rotY: Math.PI },
    { text: 'Tweets', color: ZONE_COLORS.tweets, pos: [PLAZA_HALF - 0.05, 2.6, 0], rotY: -Math.PI / 2 },
    { text: 'Architecture', color: ZONE_COLORS.architecture, pos: [-PLAZA_HALF + 0.05, 2.6, 0], rotY: Math.PI / 2 },
    { text: 'Entrance', color: ZONE_COLORS.hall, pos: [0, 2.6, PLAZA_HALF - 0.05], rotY: 0 },
  ];
  doorSigns.forEach(s => {
    const sign = makeLabel(s.text, 2.4, 0.5, 44, s.color);
    sign.position.set(...s.pos);
    sign.rotation.y = s.rotY;
    scene.add(sign);
  });
}

// ---------------------------------------------------------------- structure

function buildCorridorShell(container, length) {
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1c1b22, roughness: 0.95 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR_WIDTH, length), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, length / 2);
  container.add(floor);

  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x0f0e13, roughness: 1 });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR_WIDTH, length), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, WALL_HEIGHT, length / 2);
  container.add(ceiling);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3f3f0, roughness: 0.85 });
  const wallGeo = new THREE.PlaneGeometry(length, WALL_HEIGHT);

  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.position.set(-CORRIDOR_WIDTH / 2, WALL_HEIGHT / 2, length / 2);
  leftWall.rotation.y = Math.PI / 2;
  container.add(leftWall);

  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.position.set(CORRIDOR_WIDTH / 2, WALL_HEIGHT / 2, length / 2);
  rightWall.rotation.y = -Math.PI / 2;
  container.add(rightWall);

  // end cap
  const cap = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR_WIDTH, WALL_HEIGHT), wallMat);
  cap.position.set(0, WALL_HEIGHT / 2, length);
  cap.rotation.y = Math.PI;
  container.add(cap);
}

const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2833, roughness: 0.6 });
const galleryFrameMat = new THREE.MeshStandardMaterial({ color: 0x2a2833, roughness: 0.6, emissive: ACCENT_GALLERY, emissiveIntensity: 0.12 });
const tweetFrameMat = new THREE.MeshStandardMaterial({ color: 0x2a2833, roughness: 0.6, emissive: ACCENT_TWEETS, emissiveIntensity: 0.12 });
const linkFrameMat = new THREE.MeshStandardMaterial({ color: 0x2a2833, roughness: 0.6, emissive: ACCENT_LINK, emissiveIntensity: 0.15 });
const wallOffset = CORRIDOR_WIDTH / 2 - 0.05;

function mountPanel(container, { size, z, side, frameMaterial, contentMesh, url }) {
  const frameGeo = new THREE.BoxGeometry(size + 0.16, size + 0.16, 0.06);
  const frame = new THREE.Mesh(frameGeo, frameMaterial);
  frame.position.set(side * wallOffset, EYE_HEIGHT + 0.2, z);
  frame.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
  if (url) frame.userData.url = url;
  container.add(frame);

  contentMesh.position.set(side * (wallOffset - 0.035), EYE_HEIGHT + 0.2, z);
  contentMesh.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
  if (url) contentMesh.userData.url = url;
  container.add(contentMesh);

  return frame;
}

function buildGalleryFrames(container, gallery, startZ) {
  const loader = new THREE.TextureLoader();

  gallery.forEach((item, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const z = startZ + 3 + Math.floor(i / 2) * FRAME_SPACING;

    const picMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(FRAME_SIZE, FRAME_SIZE), picMat);

    mountPanel(container, { size: FRAME_SIZE, z, side, frameMaterial: galleryFrameMat, contentMesh: pic, url: item.url });

    loader.load(item.image, texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      if (isTouch) flatTexture(texture);
      picMat.map = texture;
      picMat.color.set(0xffffff);
      picMat.needsUpdate = true;
    });

    const label = makeLabel(item.title, 1.7, 0.32, 34);
    label.position.set(side * (wallOffset - 0.03), EYE_HEIGHT + 0.2 - FRAME_SIZE / 2 - 0.28, z);
    label.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
    container.add(label);
  });
}

function buildTweetPanels(container, tweets, startZ) {
  const loader = new THREE.TextureLoader();

  tweets.forEach((tweet, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const z = startZ + 2 + Math.floor(i / 2) * TWEET_SPACING;

    const canvas = makeTweetCanvas(tweet);
    const mat = new THREE.MeshBasicMaterial({ map: flatTexture(new THREE.CanvasTexture(canvas)) });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(TWEET_SIZE, TWEET_SIZE), mat);

    mountPanel(container, { size: TWEET_SIZE, z, side, frameMaterial: tweetFrameMat, contentMesh: mesh });

    if (tweet.media) {
      loader.load(tweet.media, texture => {
        texture.colorSpace = THREE.SRGBColorSpace;
        drawTextureOntoCanvas(canvas, texture.image, mat);
      }, undefined, () => {});
    }
  });
}

function drawTextureOntoCanvas(canvas, img, mat) {
  const ctx = canvas.getContext('2d');
  const h = canvas.height * 0.42;
  ctx.drawImage(img, 0, 0, canvas.width, h);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, canvas.width, h);
  mat.map.needsUpdate = true;
}

function buildArchitectureRoom(container, profile, length) {
  buildCorridorShell(container, length);

  const stripMat = new THREE.MeshStandardMaterial({ color: 0x101410, emissive: ACCENT_ARCHITECTURE, emissiveIntensity: 0.4 });
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR_WIDTH - 0.4, 0.06), stripMat);
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(0, 0.01, length - 0.6);
  container.add(strip);

  const title = profile.architecture_title || 'Arquitectura del lloc';
  const sign = makeLabel(title, 5.2, 0.7, 36, ZONE_COLORS.architecture);
  sign.position.set(0, WALL_HEIGHT - 0.55, length - 0.05);
  sign.rotation.y = Math.PI;
  container.add(sign);

  if (profile.architecture_image) {
    const ratio = 1000 / 620;
    const w = 5.2, h = w / ratio;
    const mat = new THREE.MeshBasicMaterial({ color: 0x1c1b22 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    plane.position.set(0, WALL_HEIGHT / 2 - 0.1, length - 0.04);
    plane.rotation.y = Math.PI;
    container.add(plane);

    new THREE.TextureLoader().load(profile.architecture_image, texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      if (isTouch) flatTexture(texture);
      mat.map = texture;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    });

    const spot = new THREE.PointLight(0xffffff, 12, 8, 2);
    spot.position.set(0, WALL_HEIGHT - 0.5, length - 2.5);
    container.add(spot);
  }
}

// ---------------------------------------------------------------- canvases

function makeTextCanvas(title, body) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1c1b22';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e8e6e0';
  ctx.textAlign = 'center';
  ctx.font = '700 40px system-ui, sans-serif';
  ctx.fillText(title, canvas.width / 2, 90);
  ctx.strokeStyle = '#e85d4a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(160, 118); ctx.lineTo(352, 118); ctx.stroke();
  ctx.font = '400 26px system-ui, sans-serif';
  ctx.fillStyle = '#b9b9c2';
  wrapText(ctx, body, canvas.width / 2, 190, 420, 36, 9);
  return canvas;
}

function makeLinkCanvas(title) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1c1b22';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#e8b23d';
  ctx.fillRect(0, 0, canvas.width, 10);

  ctx.strokeStyle = '#e8b23d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 190, 56, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#e8b23d';
  ctx.font = '700 54px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('↗', canvas.width / 2, 196);

  ctx.fillStyle = '#e8e6e0';
  ctx.font = '700 40px system-ui, sans-serif';
  ctx.fillText(title, canvas.width / 2, 320);
  ctx.fillStyle = '#8f8f9a';
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillText('OBRIR ENLLAÇ', canvas.width / 2, 366);
  return canvas;
}

function makeTweetCanvas(tweet) {
  const canvas = document.createElement('canvas');
  canvas.width = 420; canvas.height = 420;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#16151b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#7d7d89';
  ctx.textAlign = 'left';
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillText(formatDate(tweet.date), 20, 34);
  ctx.fillStyle = '#e8e6e0';
  ctx.font = '400 20px system-ui, sans-serif';
  wrapText(ctx, tweet.text || '', 20, 70, 380, 27, 12, 'left');
  return canvas;
}

function makeLabel(text, width = 1.7, height = 0.32, fontSize = 34, accent = null) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = Math.round(512 * (height / width));
  const ctx = canvas.getContext('2d');
  if (accent) {
    ctx.fillStyle = accent;
    ctx.fillRect(0, canvas.height - 6, canvas.width, 6);
  }
  ctx.fillStyle = '#e8e6e0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxTextWidth = canvas.width - 48;
  let size = fontSize;
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  while (size > 14 && ctx.measureText(text).width > maxTextWidth) {
    size -= 2;
    ctx.font = `600 ${size}px system-ui, sans-serif`;
  }
  let display = text;
  while (display.length > 4 && ctx.measureText(display).width > maxTextWidth) {
    display = display.slice(0, -1);
  }
  if (display !== text) display = truncate(display, display.length - 1);
  ctx.fillText(display, canvas.width / 2, canvas.height / 2 - 4);

  const texture = flatTexture(new THREE.CanvasTexture(canvas));
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
}

function makeFloatingLabel(text, width = 2.2, height = 0.44, fontSize = 30) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = Math.round(512 * (height / width));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e8e6e0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxTextWidth = canvas.width - 30;
  let size = fontSize;
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  while (size > 14 && ctx.measureText(text).width > maxTextWidth) {
    size -= 2;
    ctx.font = `600 ${size}px system-ui, sans-serif`;
  }
  ctx.fillText(truncate(text, 60), canvas.width / 2, canvas.height / 2);

  const texture = flatTexture(new THREE.CanvasTexture(canvas));
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines, align = 'center') {
  ctx.textAlign = align;
  const words = (text || '').split(/\s+/);
  let line = '';
  let lines = [];
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
}

// ---------------------------------------------------------------- lights

function addPointLightGrid(scene, zones) {
  zones.forEach(zn => {
    const w = zn.maxX - zn.minX, d = zn.maxZ - zn.minZ;
    const spacing = 6;
    const countAlongLongAxis = Math.max(Math.round(Math.max(w, d) / spacing), 1);
    for (let i = 0; i < countAlongLongAxis; i++) {
      const t = countAlongLongAxis === 1 ? 0.5 : i / (countAlongLongAxis - 1);
      const x = w >= d ? THREE.MathUtils.lerp(zn.minX + 1, zn.maxX - 1, t) : (zn.minX + zn.maxX) / 2;
      const z = w >= d ? (zn.minZ + zn.maxZ) / 2 : THREE.MathUtils.lerp(zn.minZ + 1, zn.maxZ - 1, t);
      const light = new THREE.PointLight(0xffe9c7, 5, 8, 2);
      light.position.set(x, WALL_HEIGHT - 0.3, z);
      scene.add(light);
    }
  });
}

// ---------------------------------------------------------------- interaction

function interact(camera, raycaster, scene, bullets) {
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  for (const hit of hits) {
    const data = hit.object.userData;
    if (!data) continue;
    if (data.url) {
      window.open(data.url, '_blank', 'noopener');
      return;
    }
    if (data.isAboutTarget && data.state === 'idle') {
      spawnBullet(scene, camera, hit.point, bullets);
      data.state = 'exploding';
      data.t = 0;
      return;
    }
  }
}

const EXPLODE_DURATION = 0.35;

function updateAboutTargets(targets, dt) {
  for (let i = targets.length - 1; i >= 0; i--) {
    const target = targets[i];
    const d = target.userData;
    if (d.state === 'idle') {
      const s = 1 + 0.08 * Math.sin(performance.now() * 0.004 + d.spinSeed);
      target.scale.setScalar(s);
    } else {
      d.t += dt;
      const k = Math.min(d.t / EXPLODE_DURATION, 1);
      target.scale.setScalar(1 + k * 2.4);
      target.material.opacity = 1 - k;
      if (k >= 1) {
        if (target.parent) target.parent.remove(target);
        if (d.label && d.label.material) d.label.material.opacity = 0.3;
        targets.splice(i, 1);
      }
    }
  }
}

const BULLET_DURATION = 0.12;

function spawnBullet(scene, camera, hitPoint, bullets) {
  const muzzle = camera.getWorldPosition(new THREE.Vector3());
  muzzle.addScaledVector(new THREE.Vector3(0.12, -0.1, 0).applyQuaternion(camera.quaternion), 1);

  const geometry = new THREE.BufferGeometry().setFromPoints([muzzle, hitPoint]);
  const material = new THREE.LineBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 1 });
  const line = new THREE.Line(geometry, material);
  scene.add(line);

  const flashMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 1 });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), flashMat);
  flash.position.copy(hitPoint);
  scene.add(flash);

  bullets.push({ line, flash, t: 0 });
}

function updateBullets(bullets, dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.t += dt;
    const k = Math.min(b.t / BULLET_DURATION, 1);
    b.line.material.opacity = 1 - k;
    b.flash.material.opacity = 1 - k;
    b.flash.scale.setScalar(1 + k * 3);
    if (k >= 1) {
      b.line.parent.remove(b.line);
      b.flash.parent.remove(b.flash);
      b.line.geometry.dispose();
      b.line.material.dispose();
      b.flash.geometry.dispose();
      b.flash.material.dispose();
      bullets.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------- minimap

function updateMinimap(camera, layout) {
  const w = minimapCanvas.width, h = minimapCanvas.height;
  const ctx = minimapCtx;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(10,10,14,0.75)';
  ctx.fillRect(0, 0, w, h);

  const worldExtent = Math.max(
    PLAZA_HALF + layout.hallLength,
    PLAZA_HALF + layout.galleryLength,
    PLAZA_HALF + layout.tweetsLength,
    PLAZA_HALF + layout.archLength
  ) + 2;
  const scale = (Math.min(w, h) - 12) / (worldExtent * 2);
  const cx = w / 2, cy = h / 2;
  const toMap = (x, z) => [cx + x * scale, cy + z * scale];

  ctx.lineWidth = 1;
  layout.zones.forEach(zn => {
    const [x0, y0] = toMap(zn.minX, zn.minZ);
    const [x1, y1] = toMap(zn.maxX, zn.maxZ);
    ctx.fillStyle = ZONE_COLORS[zn.name] || '#555';
    ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  });

  const [px, py] = toMap(camera.position.x, camera.position.z);
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const angle = Math.atan2(dir.x, dir.z);

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(4, 5);
  ctx.lineTo(-4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- touch controls

function setupTouchControls(camera, onTap) {
  const moveZone = document.getElementById('touch-move');
  const lookZone = document.getElementById('touch-look');
  const stick = document.getElementById('touch-stick');

  const state = { move: { x: 0, y: 0 } };
  let moveTouchId = null, moveOrigin = { x: 0, y: 0 };
  let lookTouchId = null, lookLast = { x: 0, y: 0 }, lookMoved = 0;

  moveZone.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    moveTouchId = t.identifier;
    moveOrigin = { x: t.clientX, y: t.clientY };
    stick.style.opacity = '1';
  }, { passive: true });

  moveZone.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== moveTouchId) continue;
      const dx = t.clientX - moveOrigin.x;
      const dy = t.clientY - moveOrigin.y;
      const r = 45;
      const len = Math.min(Math.hypot(dx, dy), r);
      const angle = Math.atan2(dy, dx);
      const nx = (Math.cos(angle) * len) / r;
      const ny = (Math.sin(angle) * len) / r;
      state.move = { x: nx, y: ny };
      stick.style.transform = `translate(${nx * r}px, ${ny * r}px)`;
    }
  }, { passive: true });

  function endMove(e) {
    for (const t of e.changedTouches) {
      if (t.identifier !== moveTouchId) continue;
      moveTouchId = null;
      state.move = { x: 0, y: 0 };
      stick.style.transform = 'translate(0,0)';
      stick.style.opacity = '0.5';
    }
  }
  moveZone.addEventListener('touchend', endMove);
  moveZone.addEventListener('touchcancel', endMove);

  lookZone.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    lookTouchId = t.identifier;
    lookLast = { x: t.clientX, y: t.clientY };
    lookMoved = 0;
  }, { passive: true });

  lookZone.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== lookTouchId) continue;
      const dx = t.clientX - lookLast.x;
      const dy = t.clientY - lookLast.y;
      lookLast = { x: t.clientX, y: t.clientY };
      lookMoved += Math.abs(dx) + Math.abs(dy);
      applyLook(camera, dx, dy);
    }
  }, { passive: true });

  lookZone.addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== lookTouchId) continue;
      lookTouchId = null;
      if (lookMoved < 8) onTap();
    }
  });

  return state;
}

function applyLook(camera, dx, dy) {
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  euler.setFromQuaternion(camera.quaternion);
  euler.y -= dx * 0.0035;
  euler.x -= dy * 0.0035;
  euler.x = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, euler.x));
  camera.quaternion.setFromEuler(euler);
}

// ---------------------------------------------------------------- utils

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
