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
    controlsHint.textContent = 'Arrossega: mira · Toca una fletxa del terra: camina';
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
  const hallContainer = addBranch(scene, { axis: 'z', worldOffset: PLAZA_HALF, sign: 1 }, container =>
    buildHall(container, hallLayout, aboutItemsReversed, aboutTargets));
  const galleryContainer = addBranch(scene, { axis: 'z', worldOffset: -PLAZA_HALF, sign: -1 }, container => {
    buildCorridorShell(container, galleryLength);
    buildGalleryFrames(container, gallery, 0);
  });
  const tweetsContainer = addBranch(scene, { axis: 'x', worldOffset: PLAZA_HALF, sign: 1 }, container => {
    buildCorridorShell(container, tweetsLength);
    buildTweetPanels(container, tweets, 0);
  });
  const architectureContainer = addBranch(scene, { axis: 'x', worldOffset: -PLAZA_HALF, sign: -1 }, container => {
    buildArchitectureRoom(container, profile, archLength);
  });

  const hemi = new THREE.HemisphereLight(0x8899aa, 0x111111, isTouch ? 1.5 : 0.9);
  scene.add(hemi);
  if (!isTouch) addPointLightGrid(scene, zones);

  // touch devices navigate street-view style: fixed viewpoints one per item,
  // drag to look, tap the floor arrow to step — free-roam collision movement
  // doesn't translate well to a joystick + drag-to-look combo on small screens
  let nav = null;
  if (isTouch) {
    scene.updateMatrixWorld(true);
    nav = setupStreetViewNav(scene, camera, {
      hall: hallContainer, gallery: galleryContainer, tweets: tweetsContainer, architecture: architectureContainer,
    }, {
      hallLayout, aboutCount: aboutItemsReversed.length, galleryCount: gallery.length, tweetsCount: tweets.length, archLength,
    });
  }

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
    interact(camera, raycaster, scene, bullets, nav);
  });

  if (isTouch) {
    setupTouchControls(camera, ndc => interact(camera, raycaster, scene, bullets, nav, ndc));
  }

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

    if (nav) {
      nav.update(dt);
    } else {
      const step = MOVE_SPEED * dt;

      // movement always works — only mouse-look needs the click-granted pointer lock
      const prevX = camera.position.x, prevZ = camera.position.z;

      if (keys.forward) controls.moveForward(step);
      if (keys.back) controls.moveForward(-step);
      if (keys.left) controls.moveRight(-step);
      if (keys.right) controls.moveRight(step);

      resolveCollision(camera, prevX, prevZ, zones, margin);
      camera.position.y = EYE_HEIGHT;
    }

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

function interact(camera, raycaster, scene, bullets, nav, ndc) {
  raycaster.setFromCamera(ndc || { x: 0, y: 0 }, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  for (const hit of hits) {
    const data = hit.object.userData;
    if (!data) continue;
    if (data.isNavArrow && nav) {
      nav.goTo(data.navTarget);
      return;
    }
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
  const lookZone = document.getElementById('touch-look');
  let lookTouchId = null, lookLast = { x: 0, y: 0 }, lookMoved = 0;

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
      // a short tap (not a drag) raycasts from the actual tap point, so you
      // can tap directly on a floor arrow or a frame instead of aiming a
      // hidden center crosshair first
      if (lookMoved < 8) {
        onTap({
          x: (t.clientX / window.innerWidth) * 2 - 1,
          y: -(t.clientY / window.innerHeight) * 2 + 1,
        });
      }
    }
  });
}

function applyLook(camera, dx, dy) {
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  euler.setFromQuaternion(camera.quaternion);
  euler.y -= dx * 0.0035;
  euler.x -= dy * 0.0035;
  euler.x = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, euler.x));
  camera.quaternion.setFromEuler(euler);
}

// ---------------------------------------------------------------- street-view navigation (touch)

const NAV_START_Z = 2.2;
const NAV_TRANSITION = 0.35;
const NAV_ARROW_DIST = 2.0;
// Eye-level looks straight ahead with zero pitch by default, so an arrow
// flush with the floor sits well below the camera's vertical FOV and is
// never actually visible unless the user proactively tilts down first (there
// is nothing prompting them to). Lifting it roughly waist-high keeps it
// inside the default view while still reading as "the path ahead".
const NAV_ARROW_HEIGHT = 0.85;

// One node per pair of wall-mounted items, at the exact z each pair is
// mounted at (see mountPanel/mountWallItems) — so stepping never skips past
// content, and every photo/tweet pair is individually reachable.
function pairNodeZs(count, startZ, spacing) {
  const pairs = Math.max(Math.ceil(count / 2), 1);
  const zs = [];
  for (let i = 0; i < pairs; i++) zs.push(startZ + i * spacing);
  return zs;
}

// The hall concatenates three segments (social links, about-me targets,
// intro/title) each with their own spacing — mirror buildHall's z formulas
// exactly so every node lines up with real content instead of empty wall.
function hallNodeZs(hallLayout, aboutCount) {
  const zs = [];
  pairNodeZs(hallLayout.social.length, HALL_START_Z, HALL_SPACING).forEach(z => zs.push(z));
  for (let i = 0; i < aboutCount; i++) zs.push(hallLayout.socialLen + 2 + i * ABOUT_SPACING);
  pairNodeZs(hallLayout.intro.length, hallLayout.socialLen + hallLayout.aboutLen + HALL_START_Z, HALL_SPACING)
    .forEach(z => zs.push(z));
  return zs;
}

// Architecture room has no per-item content to align to (just the entrance
// and the end display), so fall back to a short, even step.
function uniformNodeZs(length, step) {
  const end = Math.max(length - 1.6, NAV_START_Z + step);
  const span = end - NAV_START_Z;
  const count = Math.max(2, Math.round(span / step) + 1);
  const zs = [];
  for (let i = 0; i < count; i++) zs.push(NAV_START_Z + (span * i) / (count - 1));
  return zs;
}

function makeChevronCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.translate(64, 64);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  // points toward the top of the canvas, which after the flat-lay + lookAt
  // transform below ends up pointing away from the viewer, in the direction
  // of travel — flip both if it ever reads as pointing the wrong way
  ctx.moveTo(0, 46);
  ctx.lineTo(40, -20);
  ctx.lineTo(16, -20);
  ctx.lineTo(16, -46);
  ctx.lineTo(-16, -46);
  ctx.lineTo(-16, -20);
  ctx.lineTo(-40, -20);
  ctx.closePath();
  ctx.fill();
  return canvas;
}

const chevronTexture = flatTexture(new THREE.CanvasTexture(makeChevronCanvas()));

function setupStreetViewNav(scene, camera, containers, content) {
  const branchDefs = [
    { key: 'hall', container: containers.hall, label: 'Vestíbul', zs: hallNodeZs(content.hallLayout, content.aboutCount) },
    { key: 'gallery', container: containers.gallery, label: 'Galeria', zs: pairNodeZs(content.galleryCount, 3, FRAME_SPACING) },
    { key: 'tweets', container: containers.tweets, label: 'Piulades', zs: pairNodeZs(content.tweetsCount, 2, TWEET_SPACING) },
    { key: 'architecture', container: containers.architecture, label: 'Arquitectura', zs: uniformNodeZs(content.archLength, 2.2) },
  ];

  // every node sits on its branch's local x=0 centerline, so a straight lerp
  // between any two (including to/from the plaza) stays on the walkable path
  // and never cuts through a wall
  const positions = new Map([['plaza', new THREE.Vector3(0, EYE_HEIGHT, 0)]]);
  const edges = new Map();
  const hub = [];

  branchDefs.forEach(b => {
    b.zs.forEach((z, i) => {
      const id = `${b.key}-${i}`;
      positions.set(id, b.container.localToWorld(new THREE.Vector3(0, EYE_HEIGHT, z)));
      const back = i === 0 ? 'plaza' : `${b.key}-${i - 1}`;
      const forward = i < b.zs.length - 1 ? `${b.key}-${i + 1}` : null;
      edges.set(id, { back, forward });
      if (i === 0) hub.push({ id, label: b.label });
    });
  });
  edges.set('plaza', { hub });

  const homeBtn = document.getElementById('nav-home');

  const arrowGroup = new THREE.Group();
  scene.add(arrowGroup);

  function clearArrows() {
    arrowGroup.children.slice().forEach(group => {
      arrowGroup.remove(group);
      group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); });
    });
  }

  // a flat chevron marking the path ahead, pointing from the current spot
  // toward `toId` — kept within the target's own distance so it never floats
  // past the stop it's pointing at, especially on short hops
  function addArrow(fromPos, toId) {
    const toPos = positions.get(toId);
    const offset = new THREE.Vector3(toPos.x - fromPos.x, 0, toPos.z - fromPos.z);
    const toDistance = offset.length();
    if (toDistance < 1e-3) return;
    const dir = offset.clone().divideScalar(toDistance);
    const dist = Math.min(NAV_ARROW_DIST, toDistance * 0.8);

    const group = new THREE.Group();
    group.position.set(fromPos.x + dir.x * dist, NAV_ARROW_HEIGHT, fromPos.z + dir.z * dist);
    group.lookAt(group.position.x + dir.x, group.position.y, group.position.z + dir.z);
    group.userData = { pulseSeed: Math.random() * Math.PI * 2 };

    const mat = new THREE.MeshBasicMaterial({ map: chevronTexture, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.userData = { isNavArrow: true, navTarget: toId };
    group.add(mesh);

    arrowGroup.add(group);
  }

  // after a move, keep facing the direction just walked (so a subsequent
  // forward/back arrow lands roughly in view instead of behind or off to the
  // side — branches don't all face the same way relative to the plaza)
  function yawFacing(fromId, toId) {
    const dir = new THREE.Vector3().subVectors(positions.get(toId), positions.get(fromId));
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) return null;
    dir.normalize();
    return Math.atan2(-dir.x, -dir.z);
  }
  function wrapAngle(a) {
    return ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  }

  // start where the desktop version's own narrative starts (the far end of
  // the entrance hall, i.e. the title/intro) rather than the plaza hub, so
  // touch visitors read the site from its actual beginning too
  const hallDef = branchDefs.find(b => b.key === 'hall');
  let currentId = hallDef && hallDef.zs.length ? `hall-${hallDef.zs.length - 1}` : 'plaza';
  camera.position.copy(positions.get(currentId));
  {
    const startEdge = edges.get(currentId);
    const faceTowards = startEdge.forward || startEdge.back;
    const yaw = faceTowards && yawFacing(currentId, faceTowards);
    if (yaw !== null && yaw !== undefined) {
      const euler = new THREE.Euler(0, 0, 0, 'YXZ');
      euler.setFromQuaternion(camera.quaternion);
      euler.y = yaw;
      camera.quaternion.setFromEuler(euler);
    }
  }

  const transition = { active: false, from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, fromYaw: 0, deltaYaw: 0 };

  function goTo(id) {
    if (transition.active || id === currentId || !positions.has(id)) return;
    const prevId = currentId;
    transition.from.copy(camera.position);
    transition.to.copy(positions.get(id));
    transition.t = 0;
    transition.active = true;

    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(camera.quaternion);
    transition.fromYaw = euler.y;
    const targetYaw = yawFacing(prevId, id);
    transition.deltaYaw = targetYaw === null ? 0 : wrapAngle(targetYaw - transition.fromYaw);

    currentId = id;
    refreshUI();
  }

  function refreshUI() {
    clearArrows();
    const edge = edges.get(currentId);
    const curPos = positions.get(currentId);
    if (currentId === 'plaza') {
      homeBtn.classList.remove('visible');
      edge.hub.forEach(h => addArrow(curPos, h.id));
    } else {
      homeBtn.classList.add('visible');
      if (edge.forward) addArrow(curPos, edge.forward);
      if (edge.back) addArrow(curPos, edge.back);
    }
  }

  homeBtn.addEventListener('touchend', ev => {
    ev.preventDefault();
    goTo('plaza');
  }, { passive: false });

  refreshUI();

  return {
    goTo,
    update(dt) {
      arrowGroup.children.forEach(group => {
        const s = 1 + 0.1 * Math.sin(performance.now() * 0.004 + group.userData.pulseSeed);
        group.scale.setScalar(s);
      });
      if (!transition.active) return;
      transition.t += dt / NAV_TRANSITION;
      const k = Math.min(transition.t, 1);
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      camera.position.lerpVectors(transition.from, transition.to, eased);

      if (transition.deltaYaw !== 0) {
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(camera.quaternion);
        euler.y = transition.fromYaw + transition.deltaYaw * eased;
        camera.quaternion.setFromEuler(euler);
      }

      if (k >= 1) transition.active = false;
    },
  };
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
