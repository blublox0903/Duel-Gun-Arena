import * as THREE from "three";

const MAX_HP = 150;
const MATCH_POINTS = 5;
const arenaSize = 52;
const normalFov = 74;
const aimFov = 50;
const sniperAimFov = 28;
const mouseSensitivity = 0.00125;
const edgeTurnSpeed = 1.25;
const edgePitchSpeed = 0.75;
const cpuMoveSpeed = 2.9;
const cpuAttackChance = 0.16;
const cpuStartDelayMs = 3800;
const cpuFireDelayMultiplier = 2.35;
const playerRadius = 0.55;
const cpuRadius = 0.55;
const gravity = 22;
const jumpVelocity = 11;
const jumpPadVelocity = 18;
const cpuJumpVelocity = 9.2;
const slideDurationMs = 900;
const slideCooldownMs = 1350;
const slideSpeed = 18;
const grenadeGravity = 24;
const grenadeBounceSpeed = 0.56;
const grenadeRadius = 0.22;
const smokeDurationMs = 18000;
const smokeMergeDistance = 5.2;
const smokeBaseRadius = 5.2;
const smokeRadiusGrowth = 2.2;
const katanaReflectMs = 4000;
const katanaReflectCooldownMs = 4000;
const trowelWallLifetimeMs = 25000;
const trowelBuildCooldownMs = 7000;
const hackPassword = "blueblox0620";
const weapons = {
  rifle: {
    name: "Assault Rifle",
    category: "primary",
    auto: true,
    damage: 15,
    headDamage: 20,
    magSize: 20,
    reloadMs: 4000,
    fireMs: 120,
    range: 45,
    spread: 0.025,
  },
  trishot: {
    name: "Tri-Shot Rifle",
    category: "primary",
    auto: true,
    burst: 3,
    damage: 20,
    headDamage: 25,
    magSize: 12,
    reloadMs: 3500,
    fireMs: 1000,
    burstDelayMs: 90,
    range: 42,
    spread: 0.028,
  },
  sniper: {
    name: "Sniper",
    category: "primary",
    auto: false,
    damage: 50,
    headDamage: 150,
    magSize: 5,
    reloadMs: 7000,
    fireMs: 2000,
    range: 75,
    spread: 0.004,
  },
  lasergun: {
    name: "Laser Gun",
    category: "primary",
    auto: true,
    continuousBeam: true,
    damage: 15,
    magSize: 50,
    reloadMs: 5000,
    fireMs: 60,
    range: 52,
    spread: 0.006,
    tracerColor: 0x49f4ff,
    muzzleColor: 0xa7ffff,
  },
  handgun: {
    name: "Handgun",
    category: "secondary",
    auto: false,
    damage: 10,
    headDamage: 15,
    magSize: 7,
    reloadMs: 2000,
    fireMs: 280,
    range: 38,
    spread: 0.012,
  },
  revolver: {
    name: "Revolver",
    category: "secondary",
    auto: false,
    damage: 30,
    headDamage: 40,
    magSize: 6,
    reloadMs: 2600,
    fireMs: 1000,
    range: 42,
    spread: 0.01,
  },
  energypistol: {
    name: "Energy Pistol",
    category: "secondary",
    auto: true,
    infiniteAmmo: true,
    damage: 2,
    headDamage: 4,
    magSize: Infinity,
    reloadMs: 0,
    fireMs: 0,
    range: 48,
    spread: 0.016,
    tracerColor: 0x25bfff,
    muzzleColor: 0x66ecff,
  },
  fist: {
    name: "Fist",
    category: "melee",
    damage: 30,
    magSize: Infinity,
    reloadMs: 0,
    fireMs: 500,
    range: 2.4,
    spread: 0,
  },
  scythe: {
    name: "Scythe",
    category: "melee",
    damage: 35,
    magSize: Infinity,
    reloadMs: 0,
    fireMs: 720,
    range: 3.25,
    spread: 0,
    dashMs: 1600,
  },
  katana: {
    name: "Katana",
    category: "melee",
    damage: 45,
    magSize: Infinity,
    reloadMs: 0,
    fireMs: 620,
    range: 3.1,
    spread: 0,
    reflectMs: katanaReflectMs,
  },
  trowel: {
    name: "Trowel",
    category: "melee",
    damage: 50,
    magSize: Infinity,
    reloadMs: 0,
    fireMs: 680,
    range: 3.2,
    spread: 0,
  },
  grenade: {
    name: "Grenade",
    category: "utility",
    damage: 75,
    magSize: 1,
    reloadMs: 0,
    fireMs: 60000,
    range: 28,
    spread: 0,
    radius: 6,
  },
  smokegrenade: {
    name: "Smoke Grenade",
    category: "utility",
    damage: 0,
    magSize: 3,
    reloadMs: 0,
    fireMs: 650,
    range: 28,
    spread: 0,
    radius: smokeBaseRadius,
    noReload: true,
  },
};

const loadoutSlots = ["primary", "secondary", "melee", "utility"];
const loadoutChoices = {
  primary: ["rifle", "trishot", "sniper", "lasergun"],
  secondary: ["handgun", "revolver", "energypistol"],
  melee: ["fist", "scythe", "katana", "trowel"],
  utility: ["grenade", "smokegrenade"],
};
const cpuPrimaryChoices = ["rifle", "trishot", "sniper", "lasergun"];

const canvas = document.querySelector("#arena");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x86bce8);
scene.fog = new THREE.Fog(0x86bce8, 38, 92);

const camera = new THREE.PerspectiveCamera(74, 1, 0.1, 120);
camera.rotation.order = "YXZ";

const player = {
  hp: MAX_HP,
  team: "player",
  position: new THREE.Vector3(0, 1.7, 18),
  height: 1.7,
  targetHeight: 1.7,
  slideUntil: 0,
  slideVelocity: new THREE.Vector3(),
  dashUntil: 0,
  dashVelocity: new THREE.Vector3(),
  nextSlideAt: 0,
  feetY: 0,
  verticalVelocity: 0,
  grounded: true,
  jumpPadReadyAt: 0,
  yaw: Math.PI,
  pitch: 0,
  weapon: "rifle",
  ammo: { rifle: 20, handgun: 7, revolver: 6 },
  reloading: null,
  nextFire: 0,
  burstQueue: 0,
  nextBurstShot: 0,
  grenadeReady: 0,
  smokeAmmo: 3,
  scytheDashReady: 0,
  reflectUntil: 0,
  reflectReady: 0,
  trowelBuildReady: 0,
};

function createCpuActor(team) {
  return {
    hp: MAX_HP,
    maxHp: MAX_HP,
    team,
    active: false,
    mesh: null,
    visualScale: 1,
    position: new THREE.Vector3(0, 1.7, -16),
    velocity: new THREE.Vector3(),
    height: 1.7,
    targetHeight: 1.7,
    feetY: 0,
    verticalVelocity: 0,
    grounded: true,
    jumpPadReadyAt: 0,
    slideUntil: 0,
    slideVelocity: new THREE.Vector3(),
    dashUntil: 0,
    dashVelocity: new THREE.Vector3(),
    loadout: {
      primary: "rifle",
      secondary: "handgun",
      melee: "fist",
      utility: "grenade",
    },
    weapon: "rifle",
    ammo: { rifle: 20, handgun: 7, revolver: 6 },
    reloading: null,
    nextFire: 0,
    burstQueue: 0,
    nextBurstShot: 0,
    grenadeReady: 0,
    smokeAmmo: 3,
    scytheDashReady: 0,
    reflectUntil: 0,
    reflectReady: 0,
    trowelBuildReady: 0,
    action: { type: null, start: 0, duration: 1 },
    facingYaw: Math.PI,
    strafeUntil: 0,
    strafeDir: 1,
    pushUntil: 0,
    nextWeaponThinkAt: 0,
    nextJumpAt: 0,
    nextSlideAt: 0,
  };
}

const cpu = createCpuActor("enemy");
const allyCpu = createCpuActor("player");
const allyCpu2 = createCpuActor("player");
const allyCpu3 = createCpuActor("player");
const allyCpu4 = createCpuActor("player");
const allyCpu5 = createCpuActor("player");
const allyCpu6 = createCpuActor("player");
const enemyCpu2 = createCpuActor("enemy");
const allyCpus = [allyCpu, allyCpu2, allyCpu3, allyCpu4, allyCpu5, allyCpu6];
const enemyCpus = [cpu, enemyCpu2];
const cpuActors = [...enemyCpus, ...allyCpus];

const keys = new Set();
const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const tmp3 = new THREE.Vector3();
const solidColliders = [];
const standableColliders = [];
const bulletBlockers = [];
const jumpPads = [];
const projectiles = [];
const smokeClouds = [];
const brickWalls = [];
const cpuSniperBeams = new Map();
let gameOver = true;
let matchStarted = false;
let matchStartTime = 0;
let softPointerLocked = false;
let softTurnInput = 0;
let softPitchInput = 0;
let lastPointerLockAttempt = 0;
let fireHeld = false;
let aimHeld = false;
let playerScore = 0;
let cpuScore = 0;
let roundNumber = 1;
let matchFinished = true;
let selectedMode = "1v1";
let menuState = "main";
let spectatingActor = null;
let loadoutStep = 0;
let roundEnding = false;
let roundEndingUntil = 0;
let roundWinnerActor = null;
let preRoundFreeze = false;
let preRoundEndsAt = 0;
let changingLoadoutMidRound = false;
let playerLoadout = {
  primary: "rifle",
  secondary: "handgun",
  melee: "fist",
  utility: "grenade",
};
let countdownTimer = null;
let paused = false;
let damageNumberTimer = null;
let viewAction = { type: null, start: 0, duration: 1 };
let punchSide = 1;
let hackEnabled = false;
let hackFlying = false;
let lastSpaceTap = 0;
let onlineSocket = null;
let onlineConnected = false;
let onlineMatched = false;
let onlineRole = null;
let onlineLastSend = 0;
const onlineActorsByRole = new Map();
const onlineRolesByActor = new Map();

const ui = {
  playerHp: document.querySelector("#playerHp"),
  cpuHp: document.querySelector("#cpuHp"),
  playerHpText: document.querySelector("#playerHpText"),
  cpuHpText: document.querySelector("#cpuHpText"),
  enemyLabel: document.querySelector("#enemyLabel"),
  playerScore: document.querySelector("#playerScore"),
  cpuScore: document.querySelector("#cpuScore"),
  roundText: document.querySelector("#roundText"),
  weaponName: document.querySelector("#weaponName"),
  ammoText: document.querySelector("#ammoText"),
  weaponHint: document.querySelector("#weaponHint"),
  damageNumber: document.querySelector("#damageNumber"),
  roundBanner: document.querySelector("#roundBanner"),
  lockPrompt: document.querySelector("#lockPrompt"),
  overlay: document.querySelector("#overlay"),
  startButton: document.querySelector("#startButton"),
  onlineButton: document.querySelector("#onlineButton"),
  modeMenu: document.querySelector("#modeMenu"),
  onlineModeMenu: document.querySelector("#onlineModeMenu"),
  loadoutMenu: document.querySelector("#loadoutMenu"),
  loadoutTitle: document.querySelector("#loadoutTitle"),
  pauseButton: document.querySelector("#pauseButton"),
  hackButton: document.querySelector("#hackButton"),
  hackDialog: document.querySelector("#hackDialog"),
  hackForm: document.querySelector("#hackForm"),
  hackPassword: document.querySelector("#hackPassword"),
  hackMessage: document.querySelector("#hackMessage"),
  hackCancel: document.querySelector("#hackCancel"),
  quickbar: document.querySelector(".quickbar"),
};

buildWorld();
scene.add(camera);
const viewModel = makeViewModel();
camera.add(viewModel);
const cpuMesh = makeFighter(0xe55249, 0x2b3340);
cpu.mesh = cpuMesh;
scene.add(cpuMesh);
const allyCpuMesh = makeFighter(0x4fb477, 0x27313a);
allyCpu.mesh = allyCpuMesh;
scene.add(allyCpuMesh);
const allyCpu2Mesh = makeFighter(0x52c0a0, 0x27313a);
allyCpu2.mesh = allyCpu2Mesh;
scene.add(allyCpu2Mesh);
const allyCpu3Mesh = makeFighter(0x66b95f, 0x27313a);
allyCpu3.mesh = allyCpu3Mesh;
scene.add(allyCpu3Mesh);
const allyCpu4Mesh = makeFighter(0x48aee0, 0x27313a);
allyCpu4.mesh = allyCpu4Mesh;
scene.add(allyCpu4Mesh);
const allyCpu5Mesh = makeFighter(0x8ccf55, 0x27313a);
allyCpu5.mesh = allyCpu5Mesh;
scene.add(allyCpu5Mesh);
const allyCpu6Mesh = makeFighter(0x5fcf85, 0x27313a);
allyCpu6.mesh = allyCpu6Mesh;
scene.add(allyCpu6Mesh);
const enemyCpu2Mesh = makeFighter(0xff7a45, 0x2b3340);
enemyCpu2.mesh = enemyCpu2Mesh;
scene.add(enemyCpu2Mesh);
const playerProxy = makeFighter(0x4fb477, 0x27313a);
playerProxy.visible = false;
scene.add(playerProxy);

function isOnlineMode() {
  return selectedMode === "online" || selectedMode === "online2v2";
}

function showRoundBanner(text) {
  ui.roundBanner.textContent = text;
  ui.roundBanner.classList.add("show");
}

function hideRoundBanner() {
  ui.roundBanner.textContent = "";
  ui.roundBanner.classList.remove("show");
}

function buildWorld() {
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x1b232c, 1.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 2.8);
  sun.position.set(9, 18, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -36;
  sun.shadow.camera.right = 36;
  sun.shadow.camera.top = 36;
  sun.shadow.camera.bottom = -36;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 70;
  sun.shadow.bias = -0.00018;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(arenaSize, arenaSize),
    new THREE.MeshStandardMaterial({ color: 0x435244, roughness: 0.92 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(arenaSize, 26, 0x40515e, 0x2d3842);
  grid.position.y = 0.01;
  scene.add(grid);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x33475b, roughness: 0.85 });
  for (const [x, z, sx, sz] of [
    [0, -arenaSize / 2, arenaSize, 1],
    [0, arenaSize / 2, arenaSize, 1],
    [-arenaSize / 2, 0, 1, arenaSize],
    [arenaSize / 2, 0, 1, arenaSize],
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, 3, sz), wallMat);
    wall.position.set(x, 1.5, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    addCollider(wall, true);
  }

  const coverMat = new THREE.MeshStandardMaterial({ color: 0x65717d, roughness: 0.92, metalness: 0.05 });
  for (const [x, z, h] of [
    [-11, -4, 4.8],
    [12, 5, 3.8],
    [-5, 9, 1.5],
    [7, -11, 1.8],
  ]) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(4.2, h, 4.2), coverMat);
    block.position.set(x, h / 2, z);
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);
    addCollider(block, true);
  }

  const centerWall = new THREE.Mesh(
    new THREE.BoxGeometry(15, 5.8, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x475563, roughness: 0.94, metalness: 0.04 }),
  );
  centerWall.position.set(0, 2.9, 0);
  centerWall.castShadow = true;
  centerWall.receiveShadow = true;
  scene.add(centerWall);
  addCollider(centerWall, true);

  addScenery();
  addJumpPad(9, 13);
}

function addScenery() {
  const boxColors = [0x8f6f46, 0x6d7f8f, 0x9b5f50, 0x4f725f];
  for (const [index, x, z, sx, sy, sz] of [
    [0, -18, 12, 2.4, 1.2, 2.4],
    [1, 17, -8, 2.8, 1.5, 2.2],
    [2, -17, -13, 2.2, 1.1, 3.2],
    [3, 15, 14, 3.4, 1.3, 2.0],
  ]) {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz),
      new THREE.MeshStandardMaterial({ color: boxColors[index], roughness: 0.88 }),
    );
    crate.position.set(x, sy / 2, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    scene.add(crate);
    addCollider(crate, sy <= 1.5);
  }

  for (const [x, z] of [
    [-21, 20],
    [-18, -19],
    [-7, 21],
    [19, 19],
    [21, -17],
    [4, -22],
  ]) {
    addTree(x, z);
  }
}

function addTree(x, z) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.34, 2.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 }),
  );
  trunk.position.y = 1.25;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(1.35, 3.4, 16),
    new THREE.MeshStandardMaterial({ color: 0x2f7d4b, roughness: 0.82 }),
  );
  leaves.position.y = 3.75;
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  group.add(leaves);

  group.position.set(x, 0, z);
  scene.add(group);
  const trunkBox = new THREE.Box3(
    new THREE.Vector3(x - 0.42, 0, z - 0.42),
    new THREE.Vector3(x + 0.42, 2.5, z + 0.42),
  );
  solidColliders.push(trunkBox);
  bulletBlockers.push(trunkBox);
}

function addJumpPad(x, z) {
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.45, 0.18, 32),
    new THREE.MeshStandardMaterial({
      color: 0x35d1ff,
      emissive: 0x14607c,
      roughness: 0.35,
      metalness: 0.2,
    }),
  );
  pad.position.set(x, 0.09, z);
  pad.castShadow = true;
  pad.receiveShadow = true;
  scene.add(pad);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.055, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xdafcff }),
  );
  ring.position.set(x, 0.22, z);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  const light = new THREE.PointLight(0x35d1ff, 1.1, 8);
  light.position.set(x, 0.65, z);
  scene.add(light);
  jumpPads.push({ x, z, radius: 1.65, mesh: pad, ring });
}

function addCollider(mesh, canStandOn) {
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  bulletBlockers.push(box);
  solidColliders.push(box);
  if (canStandOn) standableColliders.push(box);
}

function makeViewModel() {
  const group = new THREE.Group();
  group.userData.models = {
    rifle: makeRifleViewModel(),
    trishot: makeTriShotViewModel(),
    sniper: makeSniperViewModel(),
    lasergun: makeLaserGunViewModel(),
    handgun: makeHandgunViewModel(),
    revolver: makeRevolverViewModel(),
    energypistol: makeEnergyPistolViewModel(),
    fist: makeFistViewModel(),
    scythe: makeScytheViewModel(),
    katana: makeKatanaViewModel(),
    trowel: makeTrowelViewModel(),
    grenade: makeGrenadeViewModel(),
    smokegrenade: makeSmokeGrenadeViewModel(),
  };
  Object.entries(group.userData.models).forEach(([weapon, model]) => {
    model.name = weapon;
    model.visible = weapon === player.weapon;
    group.add(model);
  });
  group.traverse((child) => {
    if (child.isMesh) child.castShadow = false;
  });
  return group;
}

function rememberViewPart(part) {
  part.userData.basePosition = part.position.clone();
  part.userData.baseRotation = part.rotation.clone();
  return part;
}

function makeRifleViewModel() {
  const group = new THREE.Group();
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x161f28, roughness: 0.36, metalness: 0.48 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x32404b, roughness: 0.42, metalness: 0.34 });
  const handMat = new THREE.MeshStandardMaterial({ color: 0xd6a982, roughness: 0.72 });
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x8de7ff, transparent: true, opacity: 0.42 });
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xff3939 });

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.92), gunMat);
  receiver.position.set(0, 0, -0.34);
  group.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.74, 12), gunMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, -1.08);
  group.add(barrel);

  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.54), railMat);
  handguard.position.set(0, -0.02, -0.86);
  group.add(handguard);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.44), railMat);
  stock.position.set(0, -0.02, 0.28);
  group.add(stock);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.13), gunMat);
  grip.position.set(0.02, -0.28, -0.1);
  grip.rotation.x = -0.26;
  group.add(grip);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.2), railMat);
  mag.name = "rifleMagazine";
  mag.position.set(0.01, -0.32, -0.34);
  mag.rotation.x = 0.16;
  group.add(mag);
  group.userData.magazine = rememberViewPart(mag);

  const sightBase = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.045, 0.24), railMat);
  sightBase.position.set(0, 0.15, -0.38);
  group.add(sightBase);

  const sightWindow = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.012, 8, 24), railMat);
  sightWindow.position.set(0, 0.24, -0.48);
  group.add(sightWindow);

  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.074, 24), glassMat);
  glass.position.set(0, 0.24, -0.485);
  group.add(glass);

  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), dotMat);
  dot.position.set(0, 0.24, -0.492);
  group.add(dot);

  addViewHands(group, handMat, "rifle");
  return group;
}

function makeTriShotViewModel() {
  const group = makeRifleViewModel();
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1b2f3f, roughness: 0.32, metalness: 0.58 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x5bbad8, roughness: 0.38, metalness: 0.42 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x263746, roughness: 0.5, metalness: 0.4 });

  const muzzleBlock = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.16), railMat);
  muzzleBlock.position.set(0, 0.01, -1.28);
  group.add(muzzleBlock);

  for (const [x, y] of [
    [-0.085, 0.035],
    [0.085, 0.035],
    [0, -0.055],
  ]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.46, 12), barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(x, y, -1.48);
    group.add(barrel);
  }

  for (let i = 0; i < 4; i += 1) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.035, 0.12), accentMat);
    vent.position.set(-0.12 + i * 0.08, 0.105, -0.86);
    group.add(vent);
  }

  const sideRailLeft = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.055, 0.56), accentMat);
  sideRailLeft.position.set(-0.14, 0.01, -0.76);
  group.add(sideRailLeft);

  const sideRailRight = sideRailLeft.clone();
  sideRailRight.position.x = 0.14;
  group.add(sideRailRight);

  return group;
}

function makeSniperViewModel() {
  const group = makeRifleViewModel();
  const sniperBodyMat = new THREE.MeshStandardMaterial({ color: 0x2f6b3d, roughness: 0.42, metalness: 0.34 });
  const sniperDarkMat = new THREE.MeshStandardMaterial({ color: 0x193224, roughness: 0.38, metalness: 0.42 });
  const scopeMat = new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 0.28, metalness: 0.68 });

  group.traverse((child) => {
    if (!child.isMesh || !child.material?.color) return;
    const color = child.material.color.getHex();
    if (color === 0xd6a982 || color === 0x8de7ff || color === 0xff3939) return;
    child.material = child.name === "rifleMagazine" ? sniperDarkMat : sniperBodyMat;
  });

  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.086, 0.086, 0.52, 24, 1, true), scopeMat);
  scope.rotation.x = Math.PI / 2;
  scope.position.set(0, 0.28, -0.5);
  group.add(scope);

  const rearRing = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.012, 8, 28), scopeMat);
  rearRing.position.set(0, 0.28, -0.24);
  group.add(rearRing);

  const frontRing = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.012, 8, 28), scopeMat);
  frontRing.position.set(0, 0.28, -0.76);
  group.add(frontRing);

  const barrelExtension = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.92, 12), scopeMat);
  barrelExtension.rotation.x = Math.PI / 2;
  barrelExtension.position.set(0, 0.01, -1.76);
  group.add(barrelExtension);

  return group;
}

function makeLaserGunViewModel() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x102b34, roughness: 0.28, metalness: 0.62 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x071116, roughness: 0.36, metalness: 0.58 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x4df6ff,
    emissive: 0x18bfe6,
    emissiveIntensity: 1.7,
    roughness: 0.16,
    metalness: 0.28,
  });
  const glassMat = new THREE.MeshBasicMaterial({ color: 0xa7ffff, transparent: true, opacity: 0.48 });
  const handMat = new THREE.MeshStandardMaterial({ color: 0xd6a982, roughness: 0.72 });

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.92), bodyMat);
  receiver.position.set(0, 0, -0.38);
  group.add(receiver);

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.74, 20), glowMat);
  core.rotation.x = Math.PI / 2;
  core.position.set(0, 0.02, -0.58);
  group.add(core);

  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.02, 16), darkMat);
  shroud.rotation.x = Math.PI / 2;
  shroud.position.set(0, 0.02, -1.15);
  group.add(shroud);

  const emitter = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 8, 28), glowMat);
  emitter.position.set(0, 0.02, -1.68);
  group.add(emitter);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.38), darkMat);
  stock.position.set(0, -0.01, 0.22);
  group.add(stock);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.13), darkMat);
  grip.position.set(0.03, -0.29, -0.13);
  grip.rotation.x = -0.26;
  group.add(grip);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.18), glowMat);
  mag.name = "laserCell";
  mag.position.set(0.02, -0.34, -0.42);
  mag.rotation.x = 0.1;
  group.add(mag);
  group.userData.magazine = rememberViewPart(mag);

  for (let i = 0; i < 5; i += 1) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.12), glowMat);
    vent.position.set(-0.13 + i * 0.065, 0.13, -0.72);
    group.add(vent);
  }

  const sightBase = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.26), darkMat);
  sightBase.position.set(0, 0.16, -0.36);
  group.add(sightBase);

  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.072, 24), glassMat);
  lens.position.set(0, 0.24, -0.46);
  group.add(lens);

  addViewHands(group, handMat, "rifle");
  return group;
}

function makeHandgunViewModel() {
  const group = new THREE.Group();
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x171d24, roughness: 0.38, metalness: 0.52 });
  const slideMat = new THREE.MeshStandardMaterial({ color: 0x3c4751, roughness: 0.34, metalness: 0.62 });
  const handMat = new THREE.MeshStandardMaterial({ color: 0xd6a982, roughness: 0.72 });

  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.62), slideMat);
  slide.position.set(0.05, 0.04, -0.44);
  group.add(slide);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.18, 10), gunMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.05, 0.04, -0.82);
  group.add(barrel);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.42), gunMat);
  frame.position.set(0.05, -0.08, -0.36);
  group.add(frame);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.38, 0.18), gunMat);
  grip.position.set(0.05, -0.32, -0.18);
  grip.rotation.x = -0.2;
  group.add(grip);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 0.13), slideMat);
  mag.name = "handgunMagazine";
  mag.position.set(0.05, -0.47, -0.16);
  mag.rotation.x = -0.2;
  group.add(mag);
  group.userData.magazine = rememberViewPart(mag);

  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.035), slideMat);
  frontSight.position.set(0.05, 0.13, -0.72);
  group.add(frontSight);

  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.035), slideMat);
  rearSight.position.set(0.05, 0.13, -0.17);
  group.add(rearSight);

  addViewHands(group, handMat, "handgun");
  return group;
}

function makeRevolverViewModel() {
  const group = new THREE.Group();
  const silverMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.24, metalness: 0.82 });
  const darkSilverMat = new THREE.MeshStandardMaterial({ color: 0x7d858c, roughness: 0.3, metalness: 0.74 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x7a4b2a, roughness: 0.7, metalness: 0.08 });
  const handMat = new THREE.MeshStandardMaterial({ color: 0xd6a982, roughness: 0.72 });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.42), silverMat);
  frame.position.set(0.06, -0.02, -0.34);
  group.add(frame);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.58, 14), silverMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.06, 0.02, -0.82);
  group.add(barrel);

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.035, 0.08, 14), darkSilverMat);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0.06, 0.02, -1.14);
  group.add(muzzle);

  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 18), darkSilverMat);
  cylinder.rotation.z = Math.PI / 2;
  cylinder.position.set(0.06, -0.01, -0.47);
  group.add(cylinder);

  for (let i = 0; i < 6; i += 1) {
    const chamber = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.19, 8), silverMat);
    chamber.rotation.z = Math.PI / 2;
    const angle = (i / 6) * Math.PI * 2;
    chamber.position.set(0.06, -0.01 + Math.sin(angle) * 0.075, -0.47 + Math.cos(angle) * 0.075);
    group.add(chamber);
  }

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.38, 0.17), gripMat);
  grip.position.set(0.06, -0.31, -0.2);
  grip.rotation.x = -0.32;
  group.add(grip);

  const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.01, 6, 18, Math.PI * 1.4), darkSilverMat);
  triggerGuard.position.set(0.06, -0.17, -0.35);
  triggerGuard.rotation.set(0, Math.PI / 2, -0.18);
  group.add(triggerGuard);

  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.035), darkSilverMat);
  frontSight.position.set(0.06, 0.09, -1.04);
  group.add(frontSight);

  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.035), darkSilverMat);
  rearSight.position.set(0.06, 0.09, -0.24);
  group.add(rearSight);

  addViewHands(group, handMat, "handgun");
  return group;
}

function makeEnergyPistolViewModel() {
  const group = new THREE.Group();
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x142531, roughness: 0.28, metalness: 0.64 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x081018, roughness: 0.36, metalness: 0.5 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x39cfff,
    emissive: 0x0d8fd6,
    emissiveIntensity: 1.4,
    roughness: 0.18,
    metalness: 0.25,
  });
  const handMat = new THREE.MeshStandardMaterial({ color: 0xd6a982, roughness: 0.72 });

  for (const side of [-1, 1]) {
    const pistol = new THREE.Group();
    pistol.position.set(side * 0.19, -0.04, -0.42);
    pistol.rotation.set(-0.03, side * -0.055, side * 0.02);
    group.add(pistol);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.54), coreMat);
    body.position.set(0, 0.02, -0.18);
    pistol.add(body);

    const upperRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.62), darkMat);
    upperRail.position.set(0, 0.12, -0.24);
    pistol.add(upperRail);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.46, 14), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, -0.62);
    pistol.add(barrel);

    const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.026, 0.09, 14), glowMat);
    emitter.rotation.x = Math.PI / 2;
    emitter.position.set(0, 0.04, -0.9);
    pistol.add(emitter);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.34, 0.14), darkMat);
    grip.position.set(0, -0.24, -0.03);
    grip.rotation.x = -0.22;
    pistol.add(grip);

    for (let i = 0; i < 3; i += 1) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.025, 0.12), glowMat);
      strip.position.set(side * -0.073, 0.045, -0.38 + i * 0.14);
      pistol.add(strip);
    }

    const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.25, 8, 12), handMat);
    hand.position.set(side * 0.02, -0.33, 0.04);
    hand.rotation.set(0.44, side * 0.14, side * -0.24);
    pistol.add(hand);
  }

  return group;
}

function makeFistViewModel() {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd6a982, roughness: 0.72 });
  const wrapMat = new THREE.MeshStandardMaterial({ color: 0x252f38, roughness: 0.82 });
  for (const side of [-1, 1]) {
    const fist = new THREE.Group();
    fist.name = side > 0 ? "rightFist" : "leftFist";
    fist.position.set(side * 0.22, -0.17, -0.78);
    fist.rotation.set(0.02, side * 0.08, side * -0.08);
    group.add(fist);
    if (side > 0) group.userData.rightFist = rememberViewPart(fist);
    else group.userData.leftFist = rememberViewPart(fist);

    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.54, 8, 12), skinMat);
    arm.position.set(side * 0.03, -0.24, 0.32);
    arm.rotation.set(0.98, side * -0.18, side * 0.18);
    fist.add(arm);

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.18), skinMat);
    palm.position.set(0, 0, 0);
    palm.rotation.set(0.18, side * 0.12, side * -0.08);
    fist.add(palm);

    for (let i = 0; i < 4; i += 1) {
      const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), skinMat);
      knuckle.position.set(side * (-0.07 + i * 0.035), 0.075, -0.09);
      knuckle.scale.set(1, 0.8, 0.88);
      fist.add(knuckle);
    }

    const wristWrap = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.065, 0.16), wrapMat);
    wristWrap.position.set(side * 0.02, -0.12, 0.14);
    wristWrap.rotation.z = side * -0.12;
    fist.add(wristWrap);
  }
  return group;
}

function makeScytheViewModel() {
  const group = new THREE.Group();
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x263229, roughness: 0.72, metalness: 0.18 });
  const wrapMat = new THREE.MeshStandardMaterial({ color: 0x446b45, roughness: 0.7, metalness: 0.08 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xc8d4d9, roughness: 0.26, metalness: 0.76 });
  const handMat = new THREE.MeshStandardMaterial({ color: 0xd6a982, roughness: 0.72 });

  const scythe = new THREE.Group();
  scythe.position.set(0.18, -0.2, -0.78);
  scythe.rotation.set(-0.16, -0.32, -0.24);
  group.add(scythe);
  group.userData.scythe = rememberViewPart(scythe);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 1.45, 12), handleMat);
  shaft.rotation.x = -0.18;
  shaft.position.set(0.1, -0.02, -0.12);
  scythe.add(shaft);

  const lowerWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.2, 10), wrapMat);
  lowerWrap.rotation.x = -0.18;
  lowerWrap.position.set(0.08, -0.42, 0.0);
  scythe.add(lowerWrap);

  const upperWrap = lowerWrap.clone();
  upperWrap.position.set(0.12, 0.32, -0.24);
  scythe.add(upperWrap);

  const bladeRoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.08), bladeMat);
  bladeRoot.position.set(0.16, 0.72, -0.36);
  bladeRoot.rotation.z = -0.22;
  scythe.add(bladeRoot);

  const blade = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.018, 8, 34, Math.PI * 1.08), bladeMat);
  blade.scale.set(1.32, 0.78, 1);
  blade.position.set(0.36, 0.78, -0.43);
  blade.rotation.set(1.52, 0.18, -0.72);
  scythe.add(blade);

  const bladeTip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 10), bladeMat);
  bladeTip.position.set(0.68, 0.9, -0.47);
  bladeTip.rotation.set(0.3, 0.18, -0.92);
  scythe.add(bladeTip);

  const leftHand = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.26, 8, 12), handMat);
  leftHand.position.set(-0.04, -0.33, -0.08);
  leftHand.rotation.set(1.04, -0.2, 0.38);
  scythe.add(leftHand);

  const rightHand = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.26, 8, 12), handMat);
  rightHand.position.set(0.16, 0.12, -0.22);
  rightHand.rotation.set(1.04, -0.18, -0.32);
  scythe.add(rightHand);

  return group;
}

function makeKatanaViewModel() {
  const group = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xd9e1e6, roughness: 0.22, metalness: 0.82 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.18, metalness: 0.9 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x15191d, roughness: 0.76, metalness: 0.08 });
  const guardMat = new THREE.MeshStandardMaterial({ color: 0xc3a65b, roughness: 0.38, metalness: 0.62 });
  const handMat = new THREE.MeshStandardMaterial({ color: 0xd6a982, roughness: 0.72 });

  const katana = new THREE.Group();
  katana.position.set(0.18, -0.36, -0.8);
  katana.rotation.set(0.04, -0.18, -0.08);
  group.add(katana);
  group.userData.katana = rememberViewPart(katana);

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.72, 0.036), bladeMat);
  blade.position.set(0.08, 0.76, -0.38);
  blade.rotation.set(0.04, 0.03, -0.04);
  katana.add(blade);

  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.028, 1.58, 0.046), edgeMat);
  edge.position.set(0.148, 0.8, -0.38);
  edge.rotation.set(0.04, 0.03, -0.04);
  katana.add(edge);

  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.56, 0.028), bladeMat);
  spine.position.set(0.025, 0.78, -0.38);
  spine.rotation.set(0.04, 0.03, -0.04);
  katana.add(spine);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 4), bladeMat);
  tip.position.set(0.08, 1.68, -0.38);
  tip.rotation.set(0.04, 0.03, Math.PI / 4);
  katana.add(tip);

  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.045, 0.12), guardMat);
  guard.position.set(0.06, -0.1, -0.33);
  guard.rotation.z = -0.08;
  katana.add(guard);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.46, 12), gripMat);
  handle.position.set(0.03, -0.36, -0.3);
  handle.rotation.z = 0.02;
  katana.add(handle);

  for (let i = 0; i < 4; i += 1) {
    const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.018, 0.07), guardMat);
    wrap.position.set(0.03, -0.52 + i * 0.1, -0.3);
    wrap.rotation.set(0, 0, i % 2 ? 0.55 : -0.55);
    katana.add(wrap);
  }

  const leftHand = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.24, 8, 12), handMat);
  leftHand.position.set(-0.03, -0.48, -0.3);
  leftHand.rotation.set(0.98, -0.16, 0.34);
  katana.add(leftHand);

  const rightHand = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.24, 8, 12), handMat);
  rightHand.position.set(0.1, -0.24, -0.32);
  rightHand.rotation.set(0.98, -0.12, -0.32);
  katana.add(rightHand);

  return group;
}

function makeTrowelViewModel() {
  const group = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xb8c0c4, roughness: 0.34, metalness: 0.72 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xf4f7f8, roughness: 0.24, metalness: 0.85 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.72, metalness: 0.08 });
  const handMat = new THREE.MeshStandardMaterial({ color: 0xd6a982, roughness: 0.72 });

  const trowel = new THREE.Group();
  trowel.position.set(0.2, -0.28, -0.7);
  trowel.rotation.set(-0.18, -0.18, -0.18);
  group.add(trowel);
  group.userData.trowel = rememberViewPart(trowel);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.46, 12), handleMat);
  handle.position.set(0.02, -0.28, 0.02);
  handle.rotation.x = -0.24;
  trowel.add(handle);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.28, 10), metalMat);
  neck.position.set(0.03, -0.02, -0.18);
  neck.rotation.x = -0.48;
  trowel.add(neck);

  const blade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.62, 4), metalMat);
  blade.scale.set(0.78, 1, 1.4);
  blade.position.set(0.05, 0.2, -0.48);
  blade.rotation.set(Math.PI / 2 - 0.16, 0, Math.PI / 4);
  trowel.add(blade);

  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.025, 0.46), edgeMat);
  edge.position.set(0.18, 0.2, -0.5);
  edge.rotation.set(-0.16, 0, -0.22);
  trowel.add(edge);

  const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.28, 8, 12), handMat);
  hand.position.set(0.03, -0.38, 0.02);
  hand.rotation.set(0.9, -0.14, -0.18);
  trowel.add(hand);

  return group;
}

function makeGrenadeViewModel() {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd6a982, roughness: 0.72 });
  const grenadeMat = new THREE.MeshStandardMaterial({ color: 0x40573c, roughness: 0.8, metalness: 0.18 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xb7c2c9, roughness: 0.38, metalness: 0.68 });

  const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.38, 8, 12), skinMat);
  palm.position.set(0.18, -0.36, -0.34);
  palm.rotation.set(0.76, 0.08, -0.22);
  group.add(palm);

  const grenade = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), grenadeMat);
  grenade.scale.set(0.82, 1.12, 0.82);
  grenade.position.set(0.08, -0.16, -0.72);
  group.add(grenade);

  const band1 = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.008, 6, 18), metalMat);
  band1.position.copy(grenade.position);
  band1.rotation.x = Math.PI / 2;
  group.add(band1);

  const pin = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.006, 6, 14), metalMat);
  pin.position.set(0.08, 0.03, -0.72);
  pin.rotation.y = Math.PI / 2;
  group.add(pin);

  return group;
}

function makeSmokeGrenadeViewModel() {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd6a982, roughness: 0.72 });
  const canisterMat = new THREE.MeshStandardMaterial({ color: 0xd8d4c7, roughness: 0.68, metalness: 0.22 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x6f777b, roughness: 0.42, metalness: 0.58 });
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x8fa6a1, roughness: 0.58, metalness: 0.2 });

  const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.38, 8, 12), skinMat);
  palm.position.set(0.18, -0.36, -0.34);
  palm.rotation.set(0.76, 0.08, -0.22);
  group.add(palm);

  const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.42, 18), canisterMat);
  canister.position.set(0.08, -0.16, -0.72);
  canister.rotation.x = Math.PI / 2;
  group.add(canister);

  for (const z of [-0.9, -0.54]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.035, 18), capMat);
    cap.position.set(0.08, -0.16, z);
    cap.rotation.x = Math.PI / 2;
    group.add(cap);
  }

  for (const z of [-0.8, -0.64]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.122, 0.122, 0.035, 18), bandMat);
    band.position.set(0.08, -0.16, z);
    band.rotation.x = Math.PI / 2;
    group.add(band);
  }

  const pin = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.006, 6, 18), capMat);
  pin.position.set(0.08, -0.02, -0.53);
  pin.rotation.x = Math.PI / 2;
  group.add(pin);

  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.18, 6, 10), skinMat);
  thumb.position.set(-0.08, -0.22, -0.63);
  thumb.rotation.set(0.7, 0.5, -0.38);
  group.add(thumb);

  return group;
}

function addViewHands(group, handMat, type) {
  const rearHand = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.28, 8, 12), handMat);
  rearHand.position.set(type === "handgun" ? 0.19 : 0.18, -0.36, type === "handgun" ? -0.14 : -0.02);
  rearHand.rotation.set(0.5, 0.2, -0.28);
  group.add(rearHand);

  if (type === "rifle") {
    const frontHand = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.32, 8, 12), handMat);
    frontHand.position.set(-0.18, -0.24, -0.72);
    frontHand.rotation.set(0.8, -0.14, 0.32);
    group.add(frontHand);
  }
}

function makeFighter(bodyColor, accentColor) {
  const group = new THREE.Group();
  group.userData.parts = { arms: [], forearms: [], weapon: null, torso: null };
  const armorMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.62,
    metalness: 0.12,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.52,
    metalness: 0.28,
  });
  const clothMat = new THREE.MeshStandardMaterial({
    color: 0x202933,
    roughness: 0.88,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0c7a7, roughness: 0.5 });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x8de7ff,
    emissive: 0x0b3e52,
    roughness: 0.2,
    metalness: 0.25,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.9, 0.36), armorMat);
  torso.position.y = 1.12;
  torso.castShadow = true;
  group.add(torso);
  group.userData.parts.torso = rememberViewPart(torso);

  const abdomen = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.42, 0.32), clothMat);
  abdomen.position.y = 0.72;
  abdomen.castShadow = true;
  group.add(abdomen);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.62, 0.34), darkMat);
  chest.position.set(0, 1.22, -0.05);
  chest.castShadow = true;
  group.add(chest);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.16, 0.42), clothMat);
  belt.position.y = 0.64;
  belt.castShadow = true;
  group.add(belt);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.18, 12), skinMat);
  neck.position.y = 1.7;
  neck.castShadow = true;
  group.add(neck);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 24, 16),
    skinMat,
  );
  head.position.y = 2.0;
  head.castShadow = true;
  group.add(head);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.405, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    darkMat,
  );
  helmet.position.y = 2.08;
  helmet.castShadow = true;
  group.add(helmet);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.05), visorMat);
  visor.position.set(0, 2.03, -0.36);
  visor.castShadow = true;
  group.add(visor);

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), darkMat);
    shoulder.scale.set(1.25, 0.72, 1);
    shoulder.position.set(side * 0.58, 1.44, -0.02);
    shoulder.castShadow = true;
    group.add(shoulder);

    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.46, 6, 10), clothMat);
    upperArm.position.set(side * 0.66, 1.12, -0.02);
    upperArm.rotation.z = side * 0.18;
    upperArm.castShadow = true;
    group.add(upperArm);
    group.userData.parts.arms.push(rememberViewPart(upperArm));

    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.42, 6, 10), armorMat);
    forearm.position.set(side * 0.57, 0.82, -0.25);
    forearm.rotation.x = 0.8;
    forearm.rotation.z = side * -0.08;
    forearm.castShadow = true;
    group.add(forearm);
    group.userData.parts.forearms.push(rememberViewPart(forearm));

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.48, 6, 10), clothMat);
    thigh.position.set(side * 0.22, 0.28, 0.02);
    thigh.castShadow = true;
    group.add(thigh);

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.38, 6, 10), armorMat);
    shin.position.set(side * 0.22, -0.04, 0);
    shin.castShadow = true;
    group.add(shin);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.16, 0.46), darkMat);
    boot.position.set(side * 0.22, -0.28, -0.08);
    boot.castShadow = true;
    group.add(boot);
  }

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.78, 0.18), darkMat);
  backpack.position.set(0, 1.18, 0.36);
  backpack.castShadow = true;
  group.add(backpack);

  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(0.38, 1.03, -0.62);
  group.add(weaponGroup);
  group.userData.parts.weapon = rememberViewPart(weaponGroup);

  const rifle = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.16, 1.15),
    darkMat,
  );
  rifle.position.set(0, 0, 0);
  rifle.rotation.x = -0.08;
  rifle.castShadow = true;
  weaponGroup.add(rifle);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.58, 10),
    new THREE.MeshStandardMaterial({ color: 0x10161d, roughness: 0.35, metalness: 0.65 }),
  );
  barrel.position.set(0, 0.01, -0.56);
  barrel.rotation.x = Math.PI / 2;
  barrel.castShadow = true;
  weaponGroup.add(barrel);

  const namePlate = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.08), visorMat);
  namePlate.position.set(0, 1.58, -0.3);
  group.add(namePlate);

  return group;
}

function showMainMenu() {
  clearRoundCountdown();
  releasePointerLock();
  if (isOnlineMode()) closeOnline();
  menuState = "main";
  spectatingActor = null;
  roundEnding = false;
  preRoundFreeze = false;
  changingLoadoutMidRound = false;
  hideRoundBanner();
  gameOver = true;
  matchStarted = false;
  matchFinished = true;
  paused = false;
  ui.pauseButton.textContent = "Pause";
  ui.overlay.querySelector("h1").textContent = "CPU Duel Arena";
  ui.overlay.querySelector("p").textContent = "Press Play for CPU battles, or Online to fight a real player.";
  ui.startButton.textContent = "Play";
  ui.startButton.style.display = "";
  ui.onlineButton.style.display = "";
  ui.modeMenu.hidden = true;
  ui.onlineModeMenu.hidden = true;
  ui.loadoutMenu.hidden = true;
  ui.overlay.classList.add("show");
  document.body.classList.add("in-menu");
  document.body.classList.remove("choosing-mode", "choosing-loadout", "spectating");
  playerProxy.visible = true;
  playerProxy.position.set(0, 0, 8);
  playerProxy.rotation.set(0, Math.PI, 0);
  cpuActors.forEach((actor) => {
    actor.active = false;
    if (actor.mesh) actor.mesh.visible = false;
  });
  updateScoreHud();
  updateHud();
}

function showModeMenu() {
  menuState = "mode";
  document.body.classList.add("choosing-mode");
  document.body.classList.remove("choosing-loadout");
  ui.overlay.querySelector("h1").textContent = "Choose Gamemode";
  ui.overlay.querySelector("p").textContent = "Pick the fight setup for this match.";
  ui.startButton.style.display = "none";
  ui.onlineButton.style.display = "none";
  ui.modeMenu.hidden = false;
  ui.onlineModeMenu.hidden = true;
  ui.loadoutMenu.hidden = true;
}

function showOnlineModeMenu() {
  menuState = "online-mode";
  document.body.classList.add("choosing-mode");
  document.body.classList.remove("choosing-loadout");
  ui.overlay.querySelector("h1").textContent = "Choose Online Mode";
  ui.overlay.querySelector("p").textContent = "Pick a real-player match.";
  ui.startButton.style.display = "none";
  ui.onlineButton.style.display = "none";
  ui.modeMenu.hidden = true;
  ui.onlineModeMenu.hidden = false;
  ui.loadoutMenu.hidden = true;
}

function chooseMode(mode) {
  selectedMode = mode;
  matchFinished = true;
  ui.modeMenu.hidden = true;
  ui.onlineModeMenu.hidden = true;
  updateModeClass();
  startLoadoutSelection();
}

function startLoadoutSelection(midRound = false) {
  changingLoadoutMidRound = midRound;
  loadoutStep = 0;
  menuState = "loadout";
  document.body.classList.add("choosing-loadout");
  document.body.classList.remove("choosing-mode");
  ui.overlay.classList.add("show");
  ui.startButton.style.display = "none";
  ui.onlineButton.style.display = "none";
  ui.modeMenu.hidden = true;
  ui.onlineModeMenu.hidden = true;
  ui.loadoutMenu.hidden = false;
  renderLoadoutStep();
}

function renderLoadoutStep() {
  const slot = loadoutSlots[loadoutStep];
  ui.overlay.querySelector("h1").textContent = `Choose ${slot}`;
  ui.overlay.querySelector("p").textContent = "Build your weapons for this match.";
  ui.loadoutTitle.textContent = slot;
  ui.loadoutMenu.querySelector(".loadout-options").innerHTML = loadoutChoices[slot]
    .map((weaponKey) => {
      const weapon = weapons[weaponKey];
      const detail = weaponKey === "sniper"
        ? `Head only / ${weapon.headDamage} head`
        : weapon.headDamage
        ? `${weapon.damage} body / ${weapon.headDamage} head`
        : `${weapon.damage} damage`;
      const ammo = Number.isFinite(weapon.magSize) ? `${weapon.magSize} mag` : "No ammo";
      return `<button type="button" data-weapon="${weaponKey}"><strong>${weapon.name}</strong><span>${detail} | ${ammo}</span></button>`;
    })
    .join("");
}

function chooseLoadoutWeapon(weaponKey) {
  const slot = loadoutSlots[loadoutStep];
  if (!loadoutChoices[slot].includes(weaponKey)) return;
  playerLoadout[slot] = weaponKey;
  loadoutStep += 1;
  if (loadoutStep < loadoutSlots.length) {
    renderLoadoutStep();
    return;
  }
  ui.loadoutMenu.hidden = true;
  ui.overlay.classList.remove("show");
  document.body.classList.remove("in-menu", "choosing-loadout");
  if (changingLoadoutMidRound) {
    changingLoadoutMidRound = false;
    menuState = preRoundFreeze ? "countdown" : "playing";
    setWeapon(playerLoadout.primary);
    requestPointerLock();
    return;
  }
  if (isOnlineMode()) {
    startOnlineMatchmaking();
    return;
  }
  startMatch();
}

function startMatch() {
  if (matchFinished) {
    playerScore = 0;
    cpuScore = 0;
    roundNumber = 1;
    matchFinished = false;
  }
  menuState = "countdown";
  beginRoundCountdown(4);
}

function startOnlineMatchmaking() {
  if (matchFinished) {
    playerScore = 0;
    cpuScore = 0;
    roundNumber = 1;
    matchFinished = false;
  }
  clearRoundCountdown();
  releasePointerLock();
  menuState = "online-wait";
  gameOver = true;
  paused = false;
  onlineMatched = false;
  ui.pauseButton.textContent = "Pause";
  ui.overlay.classList.add("show");
  ui.overlay.querySelector("h1").textContent = "Finding Online Match";
  ui.overlay.querySelector("p").textContent = selectedMode === "online2v2"
    ? "Waiting for four real players to join Online 2v2."
    : "Waiting for another player to join Online 1v1.";
  ui.startButton.style.display = "none";
  ui.onlineButton.style.display = "none";
  ui.modeMenu.hidden = true;
  ui.onlineModeMenu.hidden = true;
  ui.loadoutMenu.hidden = true;
  connectOnline();
}

function onlineUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

function connectOnline() {
  if (onlineSocket && onlineSocket.readyState <= WebSocket.OPEN) return;
  onlineSocket = new WebSocket(onlineUrl());
  onlineSocket.addEventListener("open", () => {
    onlineConnected = true;
    sendOnline({ type: "join", mode: selectedMode });
  });
  onlineSocket.addEventListener("message", (event) => {
    try {
      handleOnlineMessage(JSON.parse(event.data));
    } catch {
      ui.overlay.querySelector("p").textContent = "Online message failed. Try rejoining.";
    }
  });
  onlineSocket.addEventListener("close", () => {
    onlineConnected = false;
    onlineMatched = false;
    if (isOnlineMode() && !matchFinished) {
      gameOver = true;
      releasePointerLock();
      ui.overlay.classList.add("show");
      ui.overlay.querySelector("h1").textContent = "Player Disconnected";
      ui.overlay.querySelector("p").textContent = "The online match ended because someone left.";
      ui.startButton.textContent = "Back To Menu";
      ui.startButton.style.display = "";
      ui.onlineButton.style.display = "none";
    }
  });
}

function sendOnline(message) {
  if (!onlineSocket || onlineSocket.readyState !== WebSocket.OPEN) return;
  onlineSocket.send(JSON.stringify(message));
}

function onlineTeam(role) {
  return role?.startsWith("b") ? "b" : "a";
}

function onlineSlot(role) {
  return role?.endsWith("2") ? 1 : 0;
}

function onlinePlayerSpawn() {
  if (selectedMode === "online2v2") {
    return { x: onlineSlot(onlineRole) ? 5 : -5, z: 18 };
  }
  return { x: 0, z: 18 };
}

function roleIsEnemy(role) {
  return onlineTeam(role) !== onlineTeam(onlineRole);
}

function setupOnlineActors(roles = []) {
  onlineActorsByRole.clear();
  onlineRolesByActor.clear();
  if (selectedMode === "online2v2") {
    const allRoles = roles.length ? roles : ["a1", "a2", "b1", "b2"];
    let allyIndex = 0;
    let enemyIndex = 0;
    for (const role of allRoles) {
      if (role === onlineRole) continue;
      const actor = roleIsEnemy(role) ? enemyCpus[enemyIndex++] : allyCpus[allyIndex++];
      if (!actor) continue;
      actor.team = roleIsEnemy(role) ? "enemy" : "player";
      onlineActorsByRole.set(role, actor);
      onlineRolesByActor.set(actor, role);
    }
    return;
  }
  const role = onlineRole === "a" ? "b" : "a";
  cpu.team = "enemy";
  onlineActorsByRole.set(role, cpu);
  onlineRolesByActor.set(cpu, role);
}

function closeOnline() {
  if (onlineSocket) onlineSocket.close();
  onlineSocket = null;
  onlineConnected = false;
  onlineMatched = false;
  onlineRole = null;
  onlineActorsByRole.clear();
  onlineRolesByActor.clear();
}

function handleOnlineMessage(message) {
  if (message.type === "waiting") {
    ui.overlay.querySelector("h1").textContent = "Waiting For Player";
    const needed = message.needed ?? (selectedMode === "online2v2" ? 4 : 2);
    const count = message.count ?? 1;
    ui.overlay.querySelector("p").textContent = `Share this website link with friends. Waiting for ${count}/${needed} players.`;
    return;
  }
  if (message.type === "matched") {
    onlineMatched = true;
    onlineRole = message.role;
    setupOnlineActors(message.roles);
    ui.overlay.querySelector("h1").textContent = "Online Match Found";
    ui.overlay.querySelector("p").textContent = "Battle starts soon.";
    beginRoundCountdown(4);
    return;
  }
  if (message.type === "state") {
    applyOnlineState(message);
    return;
  }
  if (message.type === "damage" && !gameOver) {
    if (!message.targetRole || message.targetRole === onlineRole) {
      const attacker = onlineActorsByRole.get(message.role) ?? null;
      damage(player, message.amount ?? 0, attacker);
    }
    return;
  }
  if (message.type === "peer-left") {
    gameOver = true;
    releasePointerLock();
    ui.overlay.classList.add("show");
    ui.overlay.querySelector("h1").textContent = "Player Disconnected";
    ui.overlay.querySelector("p").textContent = "The online match ended because the other player left.";
    ui.startButton.textContent = "Back To Menu";
    ui.startButton.style.display = "";
    ui.onlineButton.style.display = "none";
  }
}

function mirrorOnlineVector(vector) {
  return new THREE.Vector3(-(vector?.x ?? 0), vector?.y ?? 1.7, -(vector?.z ?? 18));
}

function mirrorOnlineYaw(yaw) {
  return yaw ?? 0;
}

function applyOnlineState(message) {
  const state = message.state;
  if (!state || !isOnlineMode()) return;
  const role = message.role ?? (onlineRole === "a" ? "b" : "a");
  const actor = onlineActorsByRole.get(role);
  if (!actor) return;
  const enemy = roleIsEnemy(role);
  const position = enemy ? mirrorOnlineVector(state.position) : new THREE.Vector3(state.position?.x ?? 0, state.position?.y ?? 1.7, state.position?.z ?? 18);
  actor.active = true;
  actor.team = enemy ? "enemy" : "player";
  actor.hp = state.hp ?? actor.hp;
  actor.maxHp = MAX_HP;
  actor.weapon = state.weapon ?? actor.weapon;
  actor.height = state.height ?? actor.height;
  actor.targetHeight = actor.height;
  actor.feetY = Math.max(0, position.y - actor.height);
  actor.position.copy(position);
  actor.facingYaw = enemy ? mirrorOnlineYaw(state.yaw) : state.yaw ?? actor.facingYaw;
  if (actor.mesh) {
    actor.mesh.visible = actor.hp > 0;
    actor.mesh.position.set(actor.position.x, actor.feetY, actor.position.z);
    actor.mesh.rotation.y = actor.facingYaw;
  }
  if (!roundEnding && !preRoundFreeze && actor.hp <= 0) {
    if (actor.team === "player" && !playerTeamAlive()) endRound(false);
    if (actor.team === "enemy" && activeEnemyActors().every((enemyActor) => enemyActor.hp <= 0)) endRound(true, player);
  }
}

function updateOnline(now, dt) {
  if (!isOnlineMode() || !onlineMatched) return;
  onlineActorsByRole.forEach((actor) => {
    if (actor.active && actor.mesh) updateFighterPose(actor, now, dt);
  });
  if (now - onlineLastSend < 50) return;
  onlineLastSend = now;
  sendOnline({
    type: "state",
    role: onlineRole,
    state: {
      hp: player.hp,
      position: { x: player.position.x, y: player.position.y, z: player.position.z },
      feetY: player.feetY,
      height: player.height,
      yaw: player.yaw,
      pitch: player.pitch,
      weapon: player.weapon,
      round: roundNumber,
    },
  });
}

function deactivateCombatActor(actor) {
  actor.active = false;
  actor.hp = 0;
  actor.maxHp = MAX_HP;
  actor.visualScale = 1;
  actor.reloading = null;
  actor.reflectUntil = 0;
  actor.trowelBuildReady = 0;
  actor.action = { type: null, start: 0, duration: 1 };
  if (actor.mesh) {
    actor.mesh.visible = false;
    actor.mesh.scale.set(1, 1, 1);
  }
}

function freshAmmo() {
  return Object.fromEntries(
    Object.entries(weapons)
      .filter(([, weapon]) => Number.isFinite(weapon.magSize))
      .map(([key, weapon]) => [key, weapon.magSize]),
  );
}

function chooseCpuPrimary() {
  const roll = Math.random();
  if (roll < 0.48) return "rifle";
  if (roll < 0.8) return "trishot";
  return "sniper";
}

function assignCpuLoadout(actor) {
  const secondaryRoll = Math.random();
  actor.loadout = {
    primary: cpuPrimaryChoices.includes(actor.loadout?.primary) && Math.random() < 0.28
      ? actor.loadout.primary
      : chooseCpuPrimary(),
    secondary: secondaryRoll < 0.34 ? "handgun" : secondaryRoll < 0.68 ? "revolver" : "energypistol",
    melee: Math.random() < 0.24 ? "trowel" : Math.random() < 0.45 ? "katana" : Math.random() < 0.66 ? "scythe" : "fist",
    utility: Math.random() < 0.38 ? "smokegrenade" : "grenade",
  };
}

function resetCombatActor(actor, x, z, maxHp = MAX_HP, visualScale = 1) {
  actor.maxHp = maxHp;
  actor.hp = maxHp;
  actor.active = true;
  actor.visualScale = visualScale;
  actor.position.set(x, 1.7, z);
  actor.height = 1.7;
  actor.targetHeight = 1.7;
  actor.feetY = 0;
  actor.verticalVelocity = 0;
  actor.grounded = true;
  actor.jumpPadReadyAt = 0;
  actor.slideUntil = 0;
  actor.slideVelocity.set(0, 0, 0);
  actor.dashUntil = 0;
  actor.dashVelocity.set(0, 0, 0);
  actor.ammo = freshAmmo();
  actor.reloading = null;
  actor.nextFire = 0;
  actor.burstQueue = 0;
  actor.nextBurstShot = 0;
  actor.grenadeReady = 0;
  actor.smokeAmmo = weapons.smokegrenade.magSize;
  actor.scytheDashReady = 0;
  actor.reflectUntil = 0;
  actor.reflectReady = 0;
  actor.trowelBuildReady = 0;
  actor.action = { type: null, start: 0, duration: 1 };
  assignCpuLoadout(actor);
  actor.weapon = actor.loadout.primary;
  actor.strafeUntil = 0;
  actor.strafeDir = Math.random() < 0.5 ? -1 : 1;
  actor.pushUntil = 0;
  actor.nextWeaponThinkAt = 0;
  actor.facingYaw = z > 0 ? Math.PI : 0;
  actor.nextJumpAt = performance.now() + 1200 + Math.random() * 600;
  actor.nextSlideAt = performance.now() + 1800 + Math.random() * 700;
  if (actor.mesh) {
    actor.mesh.visible = true;
    actor.mesh.position.set(actor.position.x, actor.feetY, actor.position.z);
    actor.mesh.scale.set(visualScale, visualScale, visualScale);
  }
}

function startRound(frozenCountdown = false) {
  if (!frozenCountdown) clearRoundCountdown();
  menuState = "playing";
  spectatingActor = null;
  roundEnding = false;
  roundWinnerActor = null;
  document.body.classList.remove("in-menu", "spectating");
  paused = false;
  ui.pauseButton.textContent = "Pause";
  const spawn = onlinePlayerSpawn();
  player.hp = MAX_HP;
  player.position.set(spawn.x, 1.7, spawn.z);
  player.height = 1.7;
  player.targetHeight = 1.7;
  player.slideUntil = 0;
  player.slideVelocity.set(0, 0, 0);
  player.dashUntil = 0;
  player.dashVelocity.set(0, 0, 0);
  player.nextSlideAt = 0;
  player.feetY = 0;
  player.verticalVelocity = 0;
  player.grounded = true;
  player.jumpPadReadyAt = 0;
  player.weapon = playerLoadout.primary;
  player.ammo = freshAmmo();
  player.reloading = null;
  player.nextFire = 0;
  player.burstQueue = 0;
  player.nextBurstShot = 0;
  player.grenadeReady = 0;
  player.smokeAmmo = weapons.smokegrenade.magSize;
  player.scytheDashReady = 0;
  player.reflectUntil = 0;
  player.reflectReady = 0;
  player.trowelBuildReady = 0;

  cpuActors.forEach(deactivateCombatActor);
  if (isOnlineMode()) {
    setupOnlineActors([...onlineActorsByRole.keys(), onlineRole].filter(Boolean));
    onlineActorsByRole.forEach((actor, role) => {
      const enemy = roleIsEnemy(role);
      const x = onlineSlot(role) ? 5 : -5;
      resetCombatActor(actor, enemy ? -x : x, enemy ? -18 : 18);
      actor.loadout = {
        primary: "rifle",
        secondary: "handgun",
        melee: "fist",
        utility: "grenade",
      };
      actor.weapon = "rifle";
    });
  } else if (selectedMode === "juggernaut") {
    resetCombatActor(cpu, 0, -17, 3000, 1.28);
    [
      [-9, 18],
      [-5.4, 19.6],
      [0, 18.6],
      [5.4, 19.6],
      [9, 18],
    ].forEach(([x, z], index) => resetCombatActor(allyCpus[index], x, z));
  } else if (selectedMode === "2v2") {
    resetCombatActor(cpu, -6, -16);
    resetCombatActor(enemyCpu2, 6, -16);
    resetCombatActor(allyCpu, -5, 18);
  } else {
    resetCombatActor(cpu, 0, -16);
  }
  facePlayerToward(cpu.position);
  playerProxy.visible = false;

  projectiles.splice(0).forEach((p) => scene.remove(p.mesh));
  while (smokeClouds.length) removeSmokeCloud(smokeClouds.length - 1);
  while (brickWalls.length) removeBrickWall(brickWalls.length - 1);
  fireHeld = false;
  aimHeld = false;
  clearDamageNumber();
  ui.damageNumber.classList.remove("show", "headshot");
  preRoundFreeze = frozenCountdown;
  gameOver = false;
  matchStarted = true;
  matchStartTime = frozenCountdown ? preRoundEndsAt : performance.now();
  ui.overlay.classList.remove("show");
  requestPointerLock();
  updateQuickbar();
  updateHud();
  updateScoreHud();
  updateAimState();
  updateWeaponClass();
}

function beginRoundCountdown(seconds) {
  clearRoundCountdown();
  paused = false;
  ui.pauseButton.textContent = "Pause";
  fireHeld = false;
  aimHeld = false;
  updateAimState();
  ui.startButton.style.display = "none";
  ui.onlineButton.style.display = "none";
  ui.modeMenu.hidden = true;
  ui.onlineModeMenu.hidden = true;
  ui.loadoutMenu.hidden = true;
  ui.overlay.classList.remove("show");
  preRoundFreeze = true;
  preRoundEndsAt = performance.now() + seconds * 1000;
  startRound(true);

  let remaining = seconds;
  const drawCountdown = () => {
    showRoundBanner(`Round ${roundNumber}: ${selectedMode} | ${playerScore} - ${cpuScore}. Battle starts in ${remaining}. Press M to switch weapons.`);
  };
  drawCountdown();

  countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearRoundCountdown();
      preRoundFreeze = false;
      if (!changingLoadoutMidRound) menuState = "playing";
      hideRoundBanner();
      return;
    }
    drawCountdown();
  }, 1000);
}

function clearRoundCountdown() {
  if (!countdownTimer) return;
  clearInterval(countdownTimer);
  countdownTimer = null;
}

function isPointerLocked() {
  return document.pointerLockElement === canvas || softPointerLocked;
}

function requestPointerLock() {
  if (gameOver || isPointerLocked()) return;
  softPointerLocked = true;
  updatePointerLockUi();
  canvas.focus();
  lastPointerLockAttempt = performance.now();
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
  try {
    const result = canvas.requestPointerLock?.({ unadjustedMovement: true });
    if (result?.catch) result.catch(() => updatePointerLockUi());
  } catch {
    try {
      const result = canvas.requestPointerLock?.();
      if (result?.catch) result.catch(() => updatePointerLockUi());
    } catch {
      updatePointerLockUi();
    }
  }
}

function updatePointerLockUi() {
  const locked = isPointerLocked();
  document.body.classList.toggle("locked", locked);
  ui.lockPrompt.textContent = locked
    ? "Mouse locked. Move to screen edges to keep turning. Esc unlocks."
    : "Click game to lock mouse. Press Esc to unlock.";
}

function releasePointerLock() {
  softPointerLocked = false;
  softTurnInput = 0;
  softPitchInput = 0;
  fireHeld = false;
  aimHeld = false;
  if (document.pointerLockElement === canvas) document.exitPointerLock?.();
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  updatePointerLockUi();
  updateAimState();
}

function updateAimState() {
  const aiming = canAimCurrentWeapon() && aimHeld && !gameOver && isPointerLocked() && !isPlayerSpectating();
  document.body.classList.toggle("aiming", aiming);
}

function canAimCurrentWeapon() {
  return player.weapon !== "fist" && player.weapon !== "scythe" && player.weapon !== "katana" && player.weapon !== "trowel" && player.weapon !== "smokegrenade";
}

function facePlayerToward(target) {
  const direction = target.clone().sub(player.position);
  const horizontal = Math.hypot(direction.x, direction.z);
  player.yaw = Math.atan2(direction.x, direction.z);
  player.pitch = THREE.MathUtils.clamp(Math.atan2(direction.y, horizontal), -1.2, 1.2);
}

function setWeapon(weapon) {
  if (!weapons[weapon] || gameOver || isPlayerSpectating()) return;
  player.weapon = weapon;
  player.reloading = null;
  player.burstQueue = 0;
  fireHeld = false;
  aimHeld = false;
  updateWeaponClass();
  updateQuickbar();
  updateHud();
  updateAimState();
}

function controlsFrozen() {
  return preRoundFreeze || changingLoadoutMidRound;
}

function updateWeaponClass() {
  document.body.classList.remove(
    "weapon-rifle",
    "weapon-trishot",
    "weapon-sniper",
    "weapon-lasergun",
    "weapon-handgun",
    "weapon-revolver",
    "weapon-energypistol",
    "weapon-fist",
    "weapon-scythe",
    "weapon-katana",
    "weapon-trowel",
    "weapon-grenade",
    "weapon-smokegrenade",
  );
  document.body.classList.add(`weapon-${player.weapon}`);
}

function updateModeClass() {
  document.body.classList.toggle("mode-2v2", selectedMode === "2v2");
  document.body.classList.toggle("mode-1v1", selectedMode === "1v1");
  document.body.classList.toggle("mode-juggernaut", selectedMode === "juggernaut");
  document.body.classList.toggle("mode-online", isOnlineMode());
  document.body.classList.toggle("mode-online2v2", selectedMode === "online2v2");
}

function updateQuickbar() {
  const slotLabels = { primary: "1", secondary: "2", melee: "3", utility: "4" };
  ui.quickbar.querySelectorAll("button").forEach((button) => {
    const slot = button.dataset.slot;
    const weaponKey = playerLoadout[slot] ?? button.dataset.weapon;
    button.dataset.weapon = weaponKey;
    button.textContent = `${slotLabels[slot]} ${weapons[weaponKey].name}`;
    button.classList.toggle("active", weaponKey === player.weapon);
  });
}

function activeEnemyActors() {
  return cpuActors.filter((actor) => actor.active && actor.team === "enemy");
}

function activePlayerTeamCpus() {
  return cpuActors.filter((actor) => actor.active && actor.team === "player");
}

function livingPlayerTeamCpus() {
  return activePlayerTeamCpus().filter((actor) => actor.hp > 0);
}

function playerTeamAlive() {
  return player.hp > 0 || livingPlayerTeamCpus().length > 0;
}

function isPlayerSpectating() {
  return !!spectatingActor && spectatingActor.hp > 0 && !gameOver;
}

function livingEnemiesOf(actor) {
  const team = actor === player ? "player" : actor.team;
  const opponents = team === "player" ? activeEnemyActors() : [player, ...activePlayerTeamCpus()];
  return opponents.filter((opponent) => opponent.hp > 0);
}

function chooseAttackTarget(actor) {
  const enemies = livingEnemiesOf(actor);
  if (!enemies.length) return null;
  return enemies.reduce((best, enemy) => (
    actor.position.distanceTo(enemy.position) < actor.position.distanceTo(best.position) ? enemy : best
  ), enemies[0]);
}

function updateHud() {
  ui.enemyLabel.textContent = isOnlineMode() ? "Player" : "CPU";
  ui.playerHp.style.width = `${Math.max(0, (player.hp / MAX_HP) * 100)}%`;
  const enemies = livingEnemiesOf(player);
  const enemyMaxHp = Math.max(MAX_HP, activeEnemyActors().reduce((sum, actor) => sum + (actor.maxHp ?? MAX_HP), 0));
  const enemyHp = activeEnemyActors().reduce((sum, actor) => sum + Math.max(0, actor.hp), 0);
  ui.cpuHp.style.width = `${Math.max(0, (enemyHp / enemyMaxHp) * 100)}%`;
  ui.playerHpText.textContent = `${Math.ceil(Math.max(0, player.hp))} HP`;
  if (selectedMode === "2v2") {
    ui.cpuHpText.textContent = `${Math.ceil(enemyHp)} HP (${enemies.length} alive)`;
  } else if (selectedMode === "juggernaut") {
    ui.cpuHpText.textContent = `${Math.ceil(Math.max(0, cpu.hp))} / ${cpu.maxHp} HP`;
  } else {
    ui.cpuHpText.textContent = `${Math.ceil(Math.max(0, cpu.hp))} HP`;
  }

  const weapon = weapons[player.weapon];
  ui.weaponName.textContent = weapon.name;
  if (isGunWeapon(player.weapon)) {
    ui.ammoText.textContent = weapon.infiniteAmmo ? "Infinite" : `${player.ammo[player.weapon]} / ${weapon.magSize}`;
  } else if (player.weapon === "grenade") {
    const wait = Math.max(0, Math.ceil((player.grenadeReady - performance.now()) / 1000));
    ui.ammoText.textContent = wait ? `${wait}s` : "Ready";
  } else if (player.weapon === "smokegrenade") {
    ui.ammoText.textContent = `${player.ammo.smokegrenade ?? 0} / ${weapons.smokegrenade.magSize}`;
  } else if (player.weapon === "scythe") {
    const wait = Math.max(0, Math.ceil((player.scytheDashReady - performance.now()) / 1000));
    ui.ammoText.textContent = wait ? `Dash ${wait}s` : "Dash Ready";
  } else if (player.weapon === "katana") {
    const now = performance.now();
    const active = Math.max(0, Math.ceil((player.reflectUntil - now) / 1000));
    const cooldown = Math.max(0, Math.ceil((player.reflectReady - now) / 1000));
    ui.ammoText.textContent = active ? `Reflect ${active}s` : cooldown ? `Reflect CD ${cooldown}s` : "Reflect Ready";
  } else if (player.weapon === "trowel") {
    const wait = Math.max(0, Math.ceil((player.trowelBuildReady - performance.now()) / 1000));
    ui.ammoText.textContent = wait ? `Build CD ${wait}s` : "Build Ready";
  } else {
    ui.ammoText.textContent = "Ready";
  }

  if (player.reloading) {
    ui.weaponHint.textContent = `Reloading ${weapon.name}...`;
  } else if (player.weapon === "grenade" && player.grenadeReady > performance.now()) {
    ui.weaponHint.textContent = "Grenade is cooling down";
  } else {
    ui.weaponHint.textContent = player.weapon === "sniper"
      ? `Head only / ${weapon.headDamage} head`
      : player.weapon === "smokegrenade"
      ? "Creates smoke / No damage"
      : player.weapon === "scythe"
      ? `${weapon.damage} damage / Right click dash`
      : player.weapon === "katana"
      ? `${weapon.damage} damage / Right click reflect`
      : player.weapon === "trowel"
      ? `${weapon.damage} damage / Right click build`
      : weapon.headDamage
      ? `${weapon.damage} body / ${weapon.headDamage} head`
      : `${weapon.damage} damage`;
  }
}

function reload(actor, now) {
  const weapon = weapons[actor.weapon];
  if (!Number.isFinite(weapon.magSize) || weapon.noReload || actor.reloading) return;
  if (actor.ammo[actor.weapon] >= weapon.magSize) return;
  actor.reloading = {
    doneAt: now + weapon.reloadMs,
    weapon: actor.weapon,
  };
  actor.burstQueue = 0;
  if (actor === player) {
    fireHeld = false;
    aimHeld = false;
    updateAimState();
    triggerViewAction("reload", weapon.reloadMs);
  } else {
    triggerCpuAction(actor, "reload", weapon.reloadMs);
  }
}

function finishReloads(now) {
  for (const actor of [player, ...cpuActors]) {
    if (actor.reloading && now >= actor.reloading.doneAt) {
      actor.ammo[actor.reloading.weapon] = weapons[actor.reloading.weapon].magSize;
      actor.reloading = null;
    }
  }
}

function updateHackButton() {
  document.body.classList.toggle("hack-enabled", hackEnabled);
  document.body.classList.toggle("hack-flying", hackEnabled && hackFlying);
  if (ui.hackButton) ui.hackButton.textContent = hackEnabled ? (hackFlying ? "Hack Fly" : "Hack On") : "Hack Off";
}

function openHackDialog() {
  if (document.body.classList.contains("in-menu") || isPlayerSpectating()) return;
  fireHeld = false;
  aimHeld = false;
  releasePointerLock();
  ui.hackDialog.hidden = false;
  ui.hackPassword.value = "";
  ui.hackMessage.textContent = "";
  ui.hackPassword.focus();
}

function closeHackDialog() {
  ui.hackDialog.hidden = true;
  ui.hackPassword.value = "";
  ui.hackMessage.textContent = "";
}

function disableHack() {
  hackEnabled = false;
  hackFlying = false;
  player.grounded = player.feetY <= findGroundY(player.position, playerRadius, player.feetY) + 0.05;
  updateHackButton();
}

function enableHack() {
  hackEnabled = true;
  updateHackButton();
}

function toggleHack() {
  if (hackEnabled) disableHack();
  else openHackDialog();
}

function toggleHackFlight() {
  if (!hackEnabled || gameOver || isPlayerSpectating()) return;
  hackFlying = !hackFlying;
  player.verticalVelocity = 0;
  player.grounded = !hackFlying && player.feetY <= findGroundY(player.position, playerRadius, player.feetY) + 0.05;
  updateHackButton();
}

function playerAttack(now) {
  if (isPlayerSpectating() || controlsFrozen()) return;
  attack(player, chooseAttackTarget(player), now, true);
}

function scytheDash(now) {
  if (player.weapon !== "scythe" || player.hp <= 0 || gameOver || paused || controlsFrozen() || now < player.scytheDashReady) return;
  const weapon = weapons.scythe;
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  player.scytheDashReady = now + weapon.dashMs;
  triggerViewAction("scythe", 420);

  if (direction.y > 0.34) {
    player.verticalVelocity = Math.max(player.verticalVelocity, 15.5 + direction.y * 5);
    player.grounded = false;
    addImpact(player.position.clone().add(new THREE.Vector3(0, -0.3, 0)), 0x9cf6ff, 0.35);
    updateHud();
    return;
  }

  direction.y = 0;
  if (direction.lengthSq() < 0.001) {
    direction.set(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  }
  direction.normalize();
  player.dashVelocity.copy(direction).multiplyScalar(25);
  player.dashUntil = now + 300;
  addImpact(player.position.clone().addScaledVector(direction, 0.8), 0xa8ffb0, 0.28);
  updateHud();
}

function katanaReflect(actor, now) {
  if (actor.weapon !== "katana" || actor.hp <= 0 || gameOver || paused || now < actor.reflectReady) return false;
  actor.reflectUntil = now + weapons.katana.reflectMs;
  actor.reflectReady = actor.reflectUntil + katanaReflectCooldownMs;
  actor.nextFire = Math.max(actor.nextFire, now + 360);
  if (actor === player) triggerViewAction("reflect", 520);
  else triggerCpuAction(actor, "reflect", 520);
  addImpact(actor.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xf7fbff, 0.28);
  updateHud();
  return true;
}

function buildTrowelWall(actor, now, isPlayer) {
  if (actor.weapon !== "trowel" || actor.hp <= 0 || gameOver || paused || now < actor.nextFire || now < actor.trowelBuildReady) return false;
  const forward = new THREE.Vector3();
  if (isPlayer) {
    camera.getWorldDirection(forward);
  } else {
    forward.set(Math.sin(actor.facingYaw), 0, Math.cos(actor.facingYaw));
  }
  forward.y = 0;
  if (!forward.lengthSq()) forward.set(0, 0, -1);
  forward.normalize();

  const position = actor.position.clone().addScaledVector(forward, 2.7);
  position.y = (actor.feetY ?? 0) + 0.72;
  createBrickWall(position, Math.atan2(forward.x, forward.z));
  actor.nextFire = now + weapons.trowel.fireMs;
  actor.trowelBuildReady = now + trowelBuildCooldownMs;
  if (isPlayer) triggerViewAction("trowel", 520);
  else triggerCpuAction(actor, "trowel", 520);
  addImpact(position, 0xb56b43, 0.22);
  return true;
}

function createBrickWall(position, yaw) {
  while (brickWalls.length) removeBrickWall(brickWalls.length - 1);
  const wallId = Symbol("trowelWall");
  const root = new THREE.Group();
  const brickMat = new THREE.MeshStandardMaterial({ color: 0x9d4f36, roughness: 0.88, metalness: 0.02 });
  const rows = 6;
  const cols = 7;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const width = 0.64;
      const brick = new THREE.Mesh(new THREE.BoxGeometry(width, 0.34, 0.42), brickMat.clone());
      brick.position.set((col - (cols - 1) / 2) * 0.58 + (row % 2 ? 0.16 : 0), -0.86 + row * 0.34, 0);
      brick.castShadow = true;
      brick.receiveShadow = true;
      root.add(brick);
    }
  }
  root.position.copy(position);
  root.rotation.y = yaw;
  root.updateMatrixWorld(true);

  const created = [];
  for (const brick of [...root.children]) {
    brick.applyMatrix4(root.matrixWorld);
    brick.geometry.computeBoundingBox();
    scene.add(brick);
    const box = new THREE.Box3().setFromObject(brick);
    const piece = {
      group: brick,
      box,
      wallId,
      velocity: new THREE.Vector3(),
      airborne: false,
      freezeAt: 0,
      expiresAt: performance.now() + trowelWallLifetimeMs,
    };
    created.push(piece);
    brickWalls.push(piece);
    solidColliders.push(box);
    bulletBlockers.push(box);
    standableColliders.push(box);
  }
  return created;
}

function launchTrowelWallFromPlayer(now) {
  const standingWall = findBrickWallUnderActor(player, playerRadius);
  if (standingWall) {
    player.verticalVelocity = Math.max(player.verticalVelocity, 24);
    player.grounded = false;
    player.jumpPadReadyAt = now + 500;
    scatterBrickWall(standingWall.wallId, new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw)), now, false);
    triggerViewAction("trowel", 460);
    addImpact(player.position.clone().setY(player.feetY + 0.2), 0xb56b43, 0.3);
    return true;
  }
  const hit = findTrowelWallHitFromPlayer(weapons.trowel.range + 1.6);
  if (!hit) return false;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  scatterBrickWall(hit.wall.wallId, forward, now, false);
  triggerViewAction("trowel", 460);
  addImpact(hit.point, 0xb56b43, 0.26);
  return true;
}

function scatterBrickWall(wallId, direction, now, explosive) {
  const pieces = brickWalls.filter((wall) => wall.wallId === wallId);
  direction = direction.clone();
  direction.y = 0;
  if (!direction.lengthSq()) direction.set(Math.random() - 0.5, 0, Math.random() - 0.5);
  direction.normalize();
  for (const piece of pieces) {
    const side = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    const speed = explosive ? 18 + Math.random() * 18 : 5 + Math.random() * 6;
    piece.velocity.set(
      direction.x * speed + side.x * (explosive ? 10 : 4),
      explosive ? 7 + Math.random() * 8 : 5 + Math.random() * 5,
      direction.z * speed + side.z * (explosive ? 10 : 4),
    );
    piece.airborne = true;
    piece.freezeAt = explosive ? 0 : now + 650 + Math.random() * 320;
    piece.expiresAt = explosive ? now + 2200 : Math.max(piece.expiresAt, now + 5000);
  }
}

function findTrowelWallHitFromPlayer(range) {
  const origin = player.position.clone();
  origin.y = player.position.y;
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  let best = null;
  for (const wall of brickWalls) {
    const hit = directionRayIntersectsBox(origin, direction, wall.box);
    if (!hit || hit.distance > range) continue;
    if (!best || hit.distance < best.distance) best = { ...hit, wall };
  }
  return best;
}

function findBrickWallUnderActor(actor, radius) {
  const feetY = actor.feetY ?? 0;
  return brickWalls.find((wall) => {
    if (wall.airborne) return false;
    if (Math.abs(feetY - wall.box.max.y) > 0.18) return false;
    return circleOverlapsBox(actor.position.x, actor.position.z, radius, wall.box);
  });
}

function quickMelee(now) {
  if (gameOver || paused || isPlayerSpectating()) return;
  const melee = playerLoadout.melee;
  if (!weapons[melee]) return;
  const previousWeapon = player.weapon;
  if (player.weapon !== melee) setWeapon(melee);
  if (melee === "scythe") {
    scytheDash(now);
  } else if (melee === "katana") {
    katanaReflect(player, now);
  } else if (melee === "trowel") {
    buildTrowelWall(player, now, true);
  } else {
    playerAttack(now);
  }
  if (previousWeapon !== melee && weapons[previousWeapon]) {
    const returnDelay = melee === "scythe" ? 440 : Math.min(weapons[melee].fireMs, 520);
    setTimeout(() => {
      if (!gameOver && !paused && !isPlayerSpectating() && player.weapon === melee) {
        setWeapon(previousWeapon);
      }
    }, returnDelay);
  }
}

function isGunWeapon(weaponKey) {
  const weapon = weapons[weaponKey];
  return weapon && (weapon.category === "primary" || weapon.category === "secondary");
}

function hasAmmo(actor, weaponKey) {
  const weapon = weapons[weaponKey];
  return weapon?.infiniteAmmo || (actor.ammo[weaponKey] ?? 0) > 0;
}

function attack(attacker, defender, now, isPlayer) {
  if (gameOver || attacker.hp <= 0 || now < attacker.nextFire || attacker.reloading) return;
  if (!defender || defender.hp <= 0) return;
  const weapon = weapons[attacker.weapon];
  const defenders = livingEnemiesOf(attacker);

  if (attacker.weapon === "smokegrenade") {
    if ((attacker.ammo.smokegrenade ?? 0) <= 0) return;
    attacker.ammo.smokegrenade -= 1;
    attacker.nextFire = now + weapon.fireMs;
    if (isPlayer) triggerViewAction("throw", 680);
    else triggerCpuAction(attacker, "throw", 680);
    throwGrenade(attacker, defender, isPlayer);
    return;
  }

  if (attacker.weapon === "grenade") {
    if (attacker.grenadeReady > now) return;
    attacker.grenadeReady = now + weapon.fireMs;
    attacker.nextFire = now + 700;
    if (isPlayer) triggerViewAction("throw", 680);
    else triggerCpuAction(attacker, "throw", 680);
    throwGrenade(attacker, defender, isPlayer);
    return;
  }

  if (isGunWeapon(attacker.weapon)) {
    if (!hasAmmo(attacker, attacker.weapon)) {
      reload(attacker, now);
      return;
    }
    const fireDelay = !isPlayer && attacker.weapon !== "rifle" ? cpuFireDelayMultiplier : 1;
    attacker.nextFire = now + weapon.fireMs * fireDelay;
    fireGunShot(attacker, defenders, weapon, isPlayer, defender);
    if (weapon.burst && hasAmmo(attacker, attacker.weapon)) {
      attacker.burstQueue = Math.min(weapon.burst - 1, attacker.ammo[attacker.weapon]);
      attacker.nextBurstShot = now + weapon.burstDelayMs;
    }
    return;
  }

  attacker.nextFire = now + weapon.fireMs;
  if (attacker.weapon === "trowel" && isPlayer && launchTrowelWallFromPlayer(now)) {
    return;
  }
  const distance = attacker.position.distanceTo(defender.position);
  if (distance <= weapon.range) damage(defender, weapon.damage, attacker);
  const meleeAction = attacker.weapon === "trowel" ? "trowel" : attacker.weapon === "katana" ? "katana" : attacker.weapon === "scythe" ? "scythe" : "punch";
  if (isPlayer) triggerViewAction(meleeAction, weapon.fireMs);
  else triggerCpuAction(attacker, meleeAction, weapon.fireMs);
  addImpact(attacker.position, 0xf4d35e, 0.2);
}

function fireGunShot(attacker, defenders, weapon, isPlayer, defender) {
  if (!hasAmmo(attacker, attacker.weapon)) return;
  if (!weapon.infiniteAmmo) attacker.ammo[attacker.weapon] -= 1;
  if (!isPlayer) triggerCpuAction(attacker, "shoot", weapon.continuousBeam ? 110 : Math.min(weapon.fireMs, 170));
  fireBullet(attacker, defenders, weapon, isPlayer, defender);
}

function updateBurstFire(now) {
  for (const actor of [player, ...cpuActors]) {
    if (!actor.burstQueue || actor.reloading || actor.hp <= 0 || now < actor.nextBurstShot || gameOver) continue;
    const weapon = weapons[actor.weapon];
    if (!weapon?.burst || !hasAmmo(actor, actor.weapon)) {
      actor.burstQueue = 0;
      continue;
    }
    const target = chooseAttackTarget(actor);
    if (!target) {
      actor.burstQueue = 0;
      continue;
    }
    if (actor !== player && !hasCpuLineOfSight(actor, target, actor.weapon)) {
      actor.burstQueue = 0;
      continue;
    }
    fireGunShot(actor, livingEnemiesOf(actor), weapon, actor === player, target);
    actor.burstQueue -= 1;
    actor.nextBurstShot = now + weapon.burstDelayMs;
  }
}

function fireBullet(attacker, defenders, weapon, isPlayer, preferredTarget) {
  const origin = attacker.position.clone();
  origin.y = (attacker.feetY ?? 0) + (isPlayer ? 1.55 : 1.45);
  const direction = new THREE.Vector3();

  if (isPlayer) {
    camera.getWorldDirection(direction);
    const spread = weapon.spread * playerAccuracyPenalty();
    direction.x += (Math.random() - 0.5) * spread;
    direction.y += (Math.random() - 0.5) * spread;
    direction.z += (Math.random() - 0.5) * spread;
    direction.normalize();
    applyWeaponRecoil(weapon);
  } else {
    direction.copy(getActorAimPoint(preferredTarget, attacker.weapon)).sub(origin).normalize();
    const cpuSpread = weapon.spread * (attacker.weapon === "sniper" ? 4.5 : 5.2);
    direction.x += (Math.random() - 0.5) * cpuSpread;
    direction.y += (Math.random() - 0.5) * cpuSpread * 0.65;
    direction.z += (Math.random() - 0.5) * cpuSpread;
    direction.normalize();
  }

  if (isPlayer && hackEnabled) {
    const headTarget = defenders
      .filter((defender) => defender.hp > 0)
      .reduce((best, defender) => {
        if (!best) return defender;
        return defender.position.distanceTo(player.position) < best.position.distanceTo(player.position) ? defender : best;
      }, null);
    if (headTarget) {
      const headPoint = getActorHeadPoint(headTarget);
      direction.copy(headPoint).sub(origin).normalize();
      if (weapon.continuousBeam) addLaserBeam(origin, headPoint, weapon.tracerColor ?? 0x49f4ff);
      else addTracer(origin, headPoint, weapon.tracerColor ?? 0x25bfff);
      addMuzzleFlash(origin, direction, weapon.muzzleColor ?? 0x66ecff);
      const hitDamage = weapon.headDamage ?? weapon.damage;
      damage(headTarget, hitDamage, attacker);
      showDamageNumber(hitDamage, true);
      addImpact(headPoint, 0xff3333, 0.4);
      return;
    }
  }

  const end = origin.clone().addScaledVector(direction, weapon.range);
  const blockerHit = isPlayer && hackEnabled ? null : findBulletBlocker(origin, direction, weapon.range);
  const tracerEnd = blockerHit?.point ?? end;
  const teamColor = weapon.tracerColor ?? (attacker.team === "player" ? 0xf4d35e : 0xff5b54);
  if (weapon.continuousBeam) addLaserBeam(origin, tracerEnd, teamColor);
  else addTracer(origin, tracerEnd, teamColor);
  addMuzzleFlash(origin, direction, weapon.muzzleColor ?? (attacker.team === "player" ? 0xffe08a : 0xff7c5b));

  let actorHit = null;
  let hitDefender = null;
  for (const defender of defenders) {
    const hit = findActorBulletHit(origin, direction, defender, weapon.range, attacker.weapon === "sniper");
    if (!hit) continue;
    if (!actorHit || hit.distance < actorHit.distance) {
      actorHit = hit;
      hitDefender = defender;
    }
  }
  const blockedBeforeTarget = blockerHit && actorHit && blockerHit.distance < actorHit.distance;
  if (actorHit && hitDefender && !blockedBeforeTarget) {
    const hitDamage = actorHit.headshot && weapon.headDamage ? weapon.headDamage : weapon.damage;
    damage(hitDefender, hitDamage, attacker);
    if (isPlayer) showDamageNumber(hitDamage, actorHit.headshot);
    addImpact(actorHit.point, actorHit.headshot ? 0xff3333 : isPlayer ? 0xfff1a8 : 0xff8a80, 0.35);
  } else if (blockerHit) {
    addImpact(blockerHit.point, 0xbfd8ff, 0.2);
  }
}

function getActorAimPoint(actor, weaponKey = "rifle") {
  const feetY = actor.feetY ?? 0;
  const actorHeight = Math.max(1.45, (actor.height ?? 1.7) * 1.28);
  const y = weaponKey === "sniper"
    ? feetY + actorHeight * 0.88
    : feetY + actorHeight * 0.62;
  return new THREE.Vector3(actor.position.x, y, actor.position.z);
}

function getActorHeadPoint(actor) {
  const feetY = actor.feetY ?? 0;
  const actorHeight = Math.max(1.45, (actor.height ?? 1.7) * 1.28);
  return new THREE.Vector3(actor.position.x, feetY + actorHeight * 0.88, actor.position.z);
}

function findActorBulletHit(origin, direction, actor, range, headOnly = false) {
  const feetY = actor.feetY ?? 0;
  const actorHeight = Math.max(1.45, (actor.height ?? 1.7) * 1.28);
  const bottomY = feetY + 0.22;
  const topY = feetY + actorHeight;
  const headThreshold = bottomY + (topY - bottomY) * (2 / 3);
  const radius = headOnly ? 0.42 : 0.68;
  let best = null;

  for (let i = 0; i <= 14; i += 1) {
    const y = bottomY + ((topY - bottomY) * i) / 14;
    if (headOnly && y < headThreshold) continue;
    const sample = new THREE.Vector3(actor.position.x, y, actor.position.z);
    const closest = closestPointOnRay(origin, direction, sample);
    const distance = closest.distanceTo(sample);
    const forwardDistance = closest.clone().sub(origin).dot(direction);
    if (forwardDistance <= 0 || forwardDistance > range || distance > radius) continue;
    if (!best || distance < best.missDistance) {
      best = {
        point: closest,
        distance: forwardDistance,
        missDistance: distance,
        headshot: y >= headThreshold,
      };
    }
  }
  return best;
}

function showDamageNumber(amount, headshot) {
  if (damageNumberTimer) clearTimeout(damageNumberTimer);
  ui.damageNumber.textContent = amount;
  ui.damageNumber.classList.remove("show", "headshot");
  void ui.damageNumber.offsetWidth;
  ui.damageNumber.classList.toggle("headshot", headshot);
  ui.damageNumber.classList.add("show");
  damageNumberTimer = setTimeout(() => {
    ui.damageNumber.classList.remove("show", "headshot");
    ui.damageNumber.textContent = "";
    damageNumberTimer = null;
  }, 1000);
}

function clearDamageNumber() {
  if (damageNumberTimer) clearTimeout(damageNumberTimer);
  damageNumberTimer = null;
  ui.damageNumber.textContent = "";
  ui.damageNumber.classList.remove("show", "headshot");
}

function playerAccuracyPenalty() {
  let penalty = 1;
  if (keys.has("KeyW") || keys.has("KeyA") || keys.has("KeyS") || keys.has("KeyD")) penalty += 0.65;
  if (!player.grounded) penalty += 0.9;
  if (keys.has("KeyC")) penalty *= 0.62;
  if (aimHeld && canAimCurrentWeapon()) penalty *= 0.46;
  return penalty;
}

function applyWeaponRecoil(weapon) {
  const kick = weapon.name === "Laser Gun" ? 0.001 : weapon.name === "Energy Pistol" ? 0.0015 : weapon.name === "Assault Rifle" ? 0.0045 : 0.008;
  player.pitch = THREE.MathUtils.clamp(player.pitch + kick, -1.2, 1.2);
}

function findBulletBlocker(origin, direction, range) {
  let nearest = null;
  for (const box of bulletBlockers) {
    const hit = directionRayIntersectsBox(origin, direction, box);
    if (!hit || hit.distance > range) continue;
    if (!nearest || hit.distance < nearest.distance) nearest = hit;
  }
  return nearest;
}

function findSmokeBlocker(origin, direction, range) {
  let nearest = null;
  for (const cloud of smokeClouds) {
    const hit = directionRayIntersectsSphere(origin, direction, cloud.position.clone().setY(cloud.position.y + 1.6), cloud.radius);
    if (!hit || hit.distance > range) continue;
    if (!nearest || hit.distance < nearest.distance) nearest = hit;
  }
  return nearest;
}

function directionRayIntersectsBox(origin, direction, box) {
  raycaster.set(origin, direction);
  const point = raycaster.ray.intersectBox(box, tmp3);
  if (!point) return null;
  return { point: point.clone(), distance: point.distanceTo(origin) };
}

function directionRayIntersectsSphere(origin, direction, center, radius) {
  const toCenter = center.clone().sub(origin);
  const projection = toCenter.dot(direction);
  if (projection < 0) return null;
  const closest = origin.clone().addScaledVector(direction, projection);
  const missSq = closest.distanceToSquared(center);
  if (missSq > radius * radius) return null;
  const offset = Math.sqrt(radius * radius - missSq);
  const distance = Math.max(0, projection - offset);
  return { point: origin.clone().addScaledVector(direction, distance), distance };
}

function actorInsideSmoke(actor) {
  const position = actor.position;
  return smokeClouds.some((cloud) => {
    const dx = position.x - cloud.position.x;
    const dz = position.z - cloud.position.z;
    return dx * dx + dz * dz <= (cloud.radius * 0.82) ** 2;
  });
}

function throwGrenade(attacker, defender, isPlayer) {
  const weaponKey = attacker.weapon;
  const weapon = weapons[weaponKey];
  const origin = attacker.position.clone();
  origin.y = isPlayer ? player.position.y - 0.22 : attacker.position.y + 0.65;
  const direction = new THREE.Vector3();
  if (isPlayer) {
    camera.getWorldDirection(direction);
  } else {
    direction.copy(defender.position).sub(origin).normalize();
  }
  direction.y = Math.max(direction.y, 0.16);
  direction.normalize();
  const mesh = weaponKey === "smokegrenade"
    ? makeSmokeGrenadeProjectile()
    : new THREE.Mesh(
      new THREE.SphereGeometry(grenadeRadius, 16, 12),
      new THREE.MeshStandardMaterial({ color: attacker.team === "player" ? 0x93f5a6 : 0xff8a80, emissive: 0x172116 }),
    );
  mesh.position.copy(origin);
  scene.add(mesh);
  projectiles.push({
    mesh,
    type: weaponKey === "smokegrenade" ? "smoke" : "grenade",
    attacker,
    velocity: direction.multiplyScalar(isPlayer ? 18 : 14),
    targets: livingEnemiesOf(attacker),
    bounces: 0,
    radius: weapon.radius,
    damage: weapon.damage,
  });
}

function makeSmokeGrenadeProjectile() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd8d4c7, roughness: 0.7, metalness: 0.16 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x727b80, roughness: 0.42, metalness: 0.55 });
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x8fa6a1, roughness: 0.58, metalness: 0.2 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 18), bodyMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  for (const z of [-0.22, 0.22]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.134, 0.134, 0.04, 18), capMat);
    cap.rotation.x = Math.PI / 2;
    cap.position.z = z;
    group.add(cap);
  }

  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.138, 0.138, 0.06, 18), bandMat);
  band.rotation.x = Math.PI / 2;
  group.add(band);
  return group;
}

function damage(target, amount, attacker = null) {
  if (!target || target.hp <= 0) return;
  if (attacker && attacker !== target && target.team !== attacker.team && target.reflectUntil > performance.now()) {
    addImpact(target.position.clone().add(new THREE.Vector3(0, 1.15, 0)), 0xf7fbff, 0.36);
    target.nextFire = Math.max(target.nextFire, performance.now() + 180);
    if (target === player) triggerViewAction("reflect", 360);
    else triggerCpuAction(target, "reflect", 360);
    damage(attacker, amount, null);
    return;
  }
  target.hp = Math.max(0, target.hp - amount);
  if (isOnlineMode() && attacker === player && target.team === "enemy") {
    sendOnline({ type: "damage", role: onlineRole, targetRole: onlineRolesByActor.get(target), amount });
  }
  if (target.hp > 0) return;
  if (target.mesh) target.mesh.visible = false;
  if (target === player) {
    if (selectedMode !== "1v1" && livingPlayerTeamCpus().length > 0) {
      startSpectating(livingPlayerTeamCpus()[0]);
    } else {
      endRound(false, attacker);
    }
  } else if (target.team === "player" && !playerTeamAlive()) {
    endRound(false, attacker);
  } else if (target.team === "enemy" && activeEnemyActors().every((actor) => actor.hp <= 0)) {
    endRound(true, attacker);
  }
}

function startSpectating(actor) {
  spectatingActor = actor;
  fireHeld = false;
  aimHeld = false;
  player.reloading = null;
  releasePointerLock();
  document.body.classList.add("spectating");
  updateAimState();
  ui.overlay.querySelector("h1").textContent = "Watching Teammate";
  ui.overlay.querySelector("p").textContent = "You are down. Your teammate can still win the round.";
  ui.startButton.style.display = "none";
  ui.onlineButton.style.display = "none";
  ui.modeMenu.hidden = true;
  ui.onlineModeMenu.hidden = true;
  ui.overlay.classList.add("show");
  setTimeout(() => {
    if (isPlayerSpectating()) ui.overlay.classList.remove("show");
  }, 1800);
}

function endRound(playerWon, winnerActor = null) {
  if (roundEnding || matchFinished) return;
  gameOver = false;
  menuState = "roundOver";
  roundEnding = true;
  roundEndingUntil = performance.now() + 3000;
  roundWinnerActor = winnerActor && winnerActor.hp > 0 ? winnerActor : playerWon ? player : activeEnemyActors().find((actor) => actor.hp > 0) ?? cpu;
  preRoundFreeze = false;
  fireHeld = false;
  aimHeld = false;
  updateAimState();
  if (playerWon && player.hp > 0) {
    spectatingActor = null;
    document.body.classList.remove("spectating");
    requestPointerLock();
  } else {
    spectatingActor = roundWinnerActor;
    document.body.classList.add("spectating");
    releasePointerLock();
  }
  if (playerWon) playerScore += 1;
  else cpuScore += 1;
  updateScoreHud();
  ui.overlay.classList.remove("show");
  showRoundBanner(`${playerWon ? "Your side" : "Enemy side"} won the round. Next round in 3`);

  const matchWon = playerScore >= MATCH_POINTS || cpuScore >= MATCH_POINTS;
  matchFinished = matchWon;
}

function finishRoundEnding() {
  if (!roundEnding || performance.now() < roundEndingUntil) return;
  roundEnding = false;
  hideRoundBanner();
  spectatingActor = null;
  document.body.classList.remove("spectating");
  if (matchFinished) {
    gameOver = true;
    releasePointerLock();
    paused = false;
    ui.pauseButton.textContent = "Pause";
    const playerWonMatch = playerScore >= MATCH_POINTS;
    ui.overlay.querySelector("h1").textContent = playerWonMatch ? "Your Team Wins" : "Enemy Team Wins";
    ui.overlay.querySelector("p").textContent = `${selectedMode} finished ${playerScore} - ${cpuScore}. First to ${MATCH_POINTS} points is complete.`;
    ui.startButton.textContent = "Back To Menu";
    ui.startButton.style.display = "";
    ui.onlineButton.style.display = "none";
    ui.modeMenu.hidden = true;
    ui.onlineModeMenu.hidden = true;
    ui.overlay.classList.add("show");
    return;
  }
  roundNumber += 1;
  beginRoundCountdown(4);
}

function updateScoreHud() {
  ui.playerScore.textContent = playerScore;
  ui.cpuScore.textContent = cpuScore;
  ui.roundText.textContent = roundNumber;
}

function togglePause() {
  if (gameOver || matchFinished || countdownTimer) return;
  paused = !paused;
  ui.pauseButton.textContent = paused ? "Resume" : "Pause";
  if (paused) {
    releasePointerLock();
    ui.overlay.querySelector("h1").textContent = "Paused";
    ui.overlay.querySelector("p").textContent = "Press Resume to continue the round.";
    ui.startButton.style.display = "none";
    ui.onlineButton.style.display = "none";
    ui.modeMenu.hidden = true;
    ui.onlineModeMenu.hidden = true;
    ui.overlay.classList.add("show");
  } else {
    fireHeld = false;
    aimHeld = false;
    updateAimState();
    ui.overlay.classList.remove("show");
    requestPointerLock();
  }
}

function closestPointOnRay(origin, direction, point) {
  const distance = point.clone().sub(origin).dot(direction);
  return origin.clone().addScaledVector(direction, Math.max(0, distance));
}

function addTracer(start, end, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  setTimeout(() => {
    scene.remove(line);
    geometry.dispose();
    material.dispose();
  }, 70);
}

function addLaserBeam(start, end, color) {
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const direction = end.clone().sub(start);
  const length = direction.length();
  if (length < 0.05) return;

  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, length, 10),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
  );
  const glow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, length, 12),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22 }),
  );
  const rotation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize(),
  );
  core.position.copy(midpoint);
  glow.position.copy(midpoint);
  core.quaternion.copy(rotation);
  glow.quaternion.copy(rotation);
  scene.add(glow);
  scene.add(core);
  setTimeout(() => {
    scene.remove(core);
    scene.remove(glow);
    core.geometry.dispose();
    glow.geometry.dispose();
    core.material.dispose();
    glow.material.dispose();
  }, 90);
}

function addMuzzleFlash(origin, direction, color) {
  const position = origin.clone().addScaledVector(direction, 0.65);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
  );
  const light = new THREE.PointLight(color, 1.7, 5);
  mesh.position.copy(position);
  light.position.copy(position);
  scene.add(mesh);
  scene.add(light);
  setTimeout(() => {
    scene.remove(mesh);
    scene.remove(light);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }, 45);
}

function addImpact(position, color, scale) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(scale, 16, 12),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
  );
  mesh.position.copy(position);
  scene.add(mesh);
  setTimeout(() => {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }, 140);
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const p = projectiles[i];
    p.velocity.y -= grenadeGravity * dt;
    p.mesh.position.addScaledVector(p.velocity, dt);
    resolveGrenadeBounce(p);
    if (p.bounces >= 2) {
      if (p.type === "smoke") makeSmokeCloud(p.mesh.position);
      else explodeGrenade(p, i);
      if (p.type === "smoke") removeProjectile(p, i);
    }
  }
}

function resolveGrenadeBounce(projectile) {
  const pos = projectile.mesh.position;
  const limit = arenaSize / 2 - 1.2;
  if (pos.y <= grenadeRadius) {
    pos.y = grenadeRadius;
    bounceGrenade(projectile, "y");
  }
  if (pos.x < -limit || pos.x > limit) {
    pos.x = THREE.MathUtils.clamp(pos.x, -limit, limit);
    bounceGrenade(projectile, "x");
  }
  if (pos.z < -limit || pos.z > limit) {
    pos.z = THREE.MathUtils.clamp(pos.z, -limit, limit);
    bounceGrenade(projectile, "z");
  }

  for (const box of bulletBlockers) {
    if (!sphereIntersectsBox(pos, grenadeRadius, box)) continue;
    const previous = pos.clone().addScaledVector(projectile.velocity, -0.016);
    const axis = dominantCollisionAxis(previous, pos, box);
    resolveSphereBoxPushout(pos, grenadeRadius, box, axis);
    bounceGrenade(projectile, axis);
    break;
  }
}

function bounceGrenade(projectile, axis) {
  projectile.bounces += 1;
  projectile.velocity[axis] = -projectile.velocity[axis] * grenadeBounceSpeed;
  if (axis === "y") {
    projectile.velocity.x *= 0.82;
    projectile.velocity.z *= 0.82;
  }
}

function explodeGrenade(projectile, index) {
  const position = projectile.mesh.position.clone();
  for (const target of projectile.targets.filter((actor) => actor.hp > 0)) {
    if (position.distanceTo(target.position) <= projectile.radius) {
      damage(target, projectile.damage, projectile.attacker);
    }
  }
  blastBrickWalls(position, projectile.radius);
  addImpact(position, 0xffd166, projectile.radius * 0.25);
  removeProjectile(projectile, index);
}

function blastBrickWalls(position, radius) {
  for (const wall of brickWalls) {
    const center = wall.group.position;
    if (center.distanceTo(position) > radius + 2.8) continue;
    const direction = center.clone().sub(position);
    direction.y = 0;
    if (!direction.lengthSq()) direction.set(Math.random() - 0.5, 0, Math.random() - 0.5);
    direction.normalize();
    const randomSide = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    const push = 20 + Math.random() * 18;
    wall.velocity.set(
      direction.x * push + randomSide.x * 14,
      8 + Math.random() * 7,
      direction.z * push + randomSide.z * 14,
    );
    wall.airborne = true;
    wall.freezeAt = 0;
    wall.expiresAt = performance.now() + 2200;
  }
}

function removeProjectile(projectile, index) {
  scene.remove(projectile.mesh);
  projectile.mesh.traverse?.((child) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) child.material.forEach((mat) => mat.dispose?.());
    else child.material?.dispose?.();
  });
  projectiles.splice(index, 1);
}

function makeSmokeCloud(position) {
  const existing = smokeClouds.find((cloud) => cloud.position.distanceTo(position) <= smokeMergeDistance);
  if (existing) {
    existing.layers = Math.min(existing.layers + 1, 3);
    existing.radius = smokeBaseRadius + smokeRadiusGrowth * (existing.layers - 1);
    existing.expiresAt = performance.now() + smokeDurationMs;
    scaleSmokeCloud(existing);
    addImpact(position.clone(), 0xcfd3d0, 0.42);
    return;
  }

  const group = new THREE.Group();
  const cloud = {
    group,
    position: position.clone(),
    radius: smokeBaseRadius,
    layers: 1,
    expiresAt: performance.now() + smokeDurationMs,
  };
  const smokeMat = new THREE.MeshBasicMaterial({
    color: 0xb9bfba,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });
  for (let i = 0; i < 13; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), smokeMat.clone());
    const angle = (i / 13) * Math.PI * 2;
    const ring = i % 4;
    const r = ring === 0 ? 0 : 1.1 + ring * 0.45;
    puff.position.set(Math.cos(angle) * r, 0.95 + (i % 5) * 0.28, Math.sin(angle) * r);
    puff.scale.setScalar(1.2 + (i % 4) * 0.28);
    group.add(puff);
  }
  group.position.copy(position);
  scene.add(group);
  smokeClouds.push(cloud);
  scaleSmokeCloud(cloud);
}

function scaleSmokeCloud(cloud) {
  const scale = cloud.radius / smokeBaseRadius;
  cloud.group.scale.set(scale, 0.78 + scale * 0.22, scale);
  cloud.group.children.forEach((puff, index) => {
    puff.material.opacity = Math.min(0.72, 0.52 + cloud.layers * 0.08 - (index % 3) * 0.025);
  });
}

function updateSmokeClouds(now, dt) {
  for (let i = smokeClouds.length - 1; i >= 0; i -= 1) {
    const cloud = smokeClouds[i];
    const timeLeft = cloud.expiresAt - now;
    if (timeLeft <= 0) {
      removeSmokeCloud(i);
      continue;
    }
    const fade = THREE.MathUtils.clamp(timeLeft / 2600, 0, 1);
    cloud.group.rotation.y += dt * 0.08;
    cloud.group.children.forEach((puff, index) => {
      puff.material.opacity = Math.min(0.72, (0.5 + cloud.layers * 0.08 - (index % 3) * 0.02) * fade);
    });
  }
}

function removeSmokeCloud(index) {
  const cloud = smokeClouds[index];
  scene.remove(cloud.group);
  cloud.group.traverse((child) => {
    child.geometry?.dispose?.();
    child.material?.dispose?.();
  });
  smokeClouds.splice(index, 1);
}

function updateBrickWalls(now, dt) {
  for (let i = brickWalls.length - 1; i >= 0; i -= 1) {
    const wall = brickWalls[i];
    const ageLeft = wall.expiresAt - now;
    if (!wall.airborne && ageLeft < 650) {
      wall.group.scale.setScalar(Math.max(0.05, ageLeft / 650));
    }
    if (now >= wall.expiresAt || Math.abs(wall.group.position.x) > arenaSize + 28 || Math.abs(wall.group.position.z) > arenaSize + 28) {
      removeBrickWall(i);
      continue;
    }
    if (wall.airborne) {
      wall.velocity.y -= gravity * dt;
      wall.group.position.addScaledVector(wall.velocity, dt);
      wall.group.rotation.x += dt * wall.velocity.z * 0.08;
      wall.group.rotation.z -= dt * wall.velocity.x * 0.08;
      if (wall.freezeAt && now >= wall.freezeAt) {
        wall.airborne = false;
        wall.velocity.set(0, 0, 0);
      }
    }
    wall.group.updateMatrixWorld(true);
    wall.box.setFromObject(wall.group);
  }
}

function removeBrickWall(index) {
  const wall = brickWalls[index];
  scene.remove(wall.group);
  wall.group.traverse((child) => {
    child.geometry?.dispose?.();
    child.material?.dispose?.();
  });
  removeColliderBox(wall.box, solidColliders);
  removeColliderBox(wall.box, bulletBlockers);
  removeColliderBox(wall.box, standableColliders);
  brickWalls.splice(index, 1);
}

function removeColliderBox(box, list) {
  const index = list.indexOf(box);
  if (index >= 0) list.splice(index, 1);
}

function sphereIntersectsBox(position, radius, box) {
  const closestX = THREE.MathUtils.clamp(position.x, box.min.x, box.max.x);
  const closestY = THREE.MathUtils.clamp(position.y, box.min.y, box.max.y);
  const closestZ = THREE.MathUtils.clamp(position.z, box.min.z, box.max.z);
  const dx = position.x - closestX;
  const dy = position.y - closestY;
  const dz = position.z - closestZ;
  return dx * dx + dy * dy + dz * dz <= radius * radius;
}

function dominantCollisionAxis(previous, position, box) {
  if (previous.y >= box.max.y + grenadeRadius || previous.y <= box.min.y - grenadeRadius) return "y";
  if (previous.x <= box.min.x - grenadeRadius || previous.x >= box.max.x + grenadeRadius) return "x";
  if (previous.z <= box.min.z - grenadeRadius || previous.z >= box.max.z + grenadeRadius) return "z";
  const distances = {
    x: Math.min(Math.abs(position.x - box.min.x), Math.abs(position.x - box.max.x)),
    y: Math.min(Math.abs(position.y - box.min.y), Math.abs(position.y - box.max.y)),
    z: Math.min(Math.abs(position.z - box.min.z), Math.abs(position.z - box.max.z)),
  };
  return Object.entries(distances).sort((a, b) => a[1] - b[1])[0][0];
}

function resolveSphereBoxPushout(position, radius, box, axis) {
  if (axis === "x") {
    const left = Math.abs(position.x - box.min.x);
    const right = Math.abs(position.x - box.max.x);
    position.x = left < right ? box.min.x - radius : box.max.x + radius;
  } else if (axis === "y") {
    const bottom = Math.abs(position.y - box.min.y);
    const top = Math.abs(position.y - box.max.y);
    position.y = bottom < top ? box.min.y - radius : box.max.y + radius;
  } else {
    const back = Math.abs(position.z - box.min.z);
    const front = Math.abs(position.z - box.max.z);
    position.z = back < front ? box.min.z - radius : box.max.z + radius;
  }
}

function updatePlayer(dt) {
  if (player.hp <= 0) {
    player.targetHeight = 1.7;
    if (hackFlying) {
      hackFlying = false;
      updateHackButton();
    }
    return;
  }
  updateSoftLook(dt);
  if (controlsFrozen()) {
    player.slideUntil = 0;
    player.dashUntil = 0;
    player.targetHeight = 1.7;
    player.height = THREE.MathUtils.lerp(player.height, player.targetHeight, 1 - Math.pow(0.001, dt));
    camera.position.copy(player.position);
    camera.rotation.y = player.yaw + Math.PI;
    camera.rotation.x = player.pitch;
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0, 1 - Math.pow(0.0005, dt));
    return;
  }
  const forward = tmp.set(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = tmp2.set(-Math.cos(player.yaw), 0, Math.sin(player.yaw));
  const move = new THREE.Vector3();
  if (keys.has("KeyW")) move.add(forward);
  if (keys.has("KeyS")) move.sub(forward);
  if (keys.has("KeyD")) move.add(right);
  if (keys.has("KeyA")) move.sub(right);
  const isMoving = move.lengthSq() > 0;
  const now = performance.now();
  const isSliding = now < player.slideUntil;
  const isDashing = now < player.dashUntil;
  player.targetHeight = hackFlying ? 1.7 : isSliding ? 0.86 : keys.has("KeyC") ? 1.02 : 1.7;

  if (isDashing) {
    const dashLeft = Math.max(0, (player.dashUntil - now) / 300);
    const dashFrame = player.dashVelocity.clone().multiplyScalar((0.25 + dashLeft) * dt);
    moveActor(player, dashFrame, playerRadius);
  }

  if (isSliding) {
    const slideLeft = Math.max(0, (player.slideUntil - now) / slideDurationMs);
    const slideFrame = player.slideVelocity.clone().multiplyScalar((0.18 + slideLeft * 0.9) * dt);
    moveActor(player, slideFrame, playerRadius);
  }

  if (isMoving && !isSliding && !isDashing) {
    const speed = hackFlying ? 10.5 : keys.has("KeyC") ? 4.7 : 8.2;
    move.normalize().multiplyScalar(speed * dt);
    moveActor(player, move, playerRadius);
  }
  if (hackEnabled && hackFlying) {
    const vertical = (keys.has("Space") ? 1 : 0) - (keys.has("KeyC") ? 1 : 0);
    player.feetY = Math.max(0, player.feetY + vertical * 9.6 * dt);
    player.verticalVelocity = 0;
    player.grounded = false;
  } else {
    updateActorVertical(player, playerRadius, dt);
    applyJumpPads(player, playerRadius, now);
  }
  player.height = THREE.MathUtils.lerp(player.height, player.targetHeight, 1 - Math.pow(0.001, dt));
  clampToArena(player.position, player.feetY + player.height);
  camera.position.copy(player.position);
  camera.rotation.y = player.yaw + Math.PI;
  camera.rotation.x = player.pitch;
  camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, isSliding ? -0.08 : 0, 1 - Math.pow(0.0005, dt));
}

function updateActorVertical(actor, radius, dt) {
  if (actor === player && hackEnabled && hackFlying) return;
  actor.verticalVelocity -= gravity * dt;
  actor.feetY += actor.verticalVelocity * dt;
  const groundY = findGroundY(actor.position, radius, actor.feetY);
  if (actor.feetY <= groundY) {
    actor.feetY = groundY;
    actor.verticalVelocity = 0;
    actor.grounded = true;
  } else {
    actor.grounded = false;
  }
  if (!(actor === player && hackEnabled)) resolveSolidCollision(actor, radius);
}

function applyJumpPads(actor, radius, now) {
  if (!actor.grounded || now < actor.jumpPadReadyAt) return;
  for (const pad of jumpPads) {
    const dx = actor.position.x - pad.x;
    const dz = actor.position.z - pad.z;
    if (dx * dx + dz * dz > (pad.radius + radius) ** 2) continue;
    actor.verticalVelocity = jumpPadVelocity;
    actor.grounded = false;
    actor.jumpPadReadyAt = now + 900;
    addImpact(new THREE.Vector3(pad.x, 0.3, pad.z), 0x9cf6ff, 0.42);
    break;
  }
}

function findGroundY(position, radius, feetY) {
  let groundY = 0;
  for (const box of standableColliders) {
    if (!circleOverlapsBox(position.x, position.z, radius, box)) continue;
    const closeToTop = feetY >= box.max.y - 0.25;
    if (closeToTop && box.max.y > groundY) groundY = box.max.y;
  }
  return groundY;
}

function moveActor(actor, delta, radius) {
  actor.position.x += delta.x;
  if (!(actor === player && hackEnabled)) resolveSolidCollision(actor, radius);
  actor.position.z += delta.z;
  if (!(actor === player && hackEnabled)) resolveSolidCollision(actor, radius);
}

function resolveSolidCollision(actor, radius) {
  for (const box of solidColliders) {
    const feetY = actor.feetY ?? 0;
    const bodyTop = feetY + (actor.height ?? 2.0);
    const standingOnTop = feetY >= box.max.y - 0.08;
    const jumpedOver = feetY >= box.max.y;
    if (standingOnTop || bodyTop <= box.min.y || jumpedOver) continue;
    if (!circleOverlapsBox(actor.position.x, actor.position.z, radius, box)) continue;

    const leftPush = Math.abs(actor.position.x - (box.min.x - radius));
    const rightPush = Math.abs(actor.position.x - (box.max.x + radius));
    const backPush = Math.abs(actor.position.z - (box.min.z - radius));
    const frontPush = Math.abs(actor.position.z - (box.max.z + radius));
    const minPush = Math.min(leftPush, rightPush, backPush, frontPush);

    if (minPush === leftPush) actor.position.x = box.min.x - radius;
    else if (minPush === rightPush) actor.position.x = box.max.x + radius;
    else if (minPush === backPush) actor.position.z = box.min.z - radius;
    else actor.position.z = box.max.z + radius;
  }
}

function circleOverlapsBox(x, z, radius, box) {
  const closestX = THREE.MathUtils.clamp(x, box.min.x, box.max.x);
  const closestZ = THREE.MathUtils.clamp(z, box.min.z, box.max.z);
  const dx = x - closestX;
  const dz = z - closestZ;
  return dx * dx + dz * dz <= radius * radius;
}

function updateSoftLook(dt) {
  if (!softPointerLocked || document.pointerLockElement === canvas) return;
  retryNativePointerLock();
  player.yaw -= softTurnInput * edgeTurnSpeed * dt;
  player.pitch -= softPitchInput * edgePitchSpeed * dt;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.2, 1.2);
}

function retryNativePointerLock() {
  const now = performance.now();
  if (now - lastPointerLockAttempt < 1500) return;
  lastPointerLockAttempt = now;
  try {
    const result = canvas.requestPointerLock?.();
    if (result?.catch) result.catch(() => {});
  } catch {
    // Some embedded browsers reject Pointer Lock entirely; keep soft lock active.
  }
}

function startSlideOrCrouch(now) {
  const move = new THREE.Vector3();
  moveInputVector(move);
  if (!move.lengthSq() || now < player.slideUntil || now < player.nextSlideAt || !player.grounded) {
    player.targetHeight = 1.02;
    return;
  }
  move.normalize();
  player.slideVelocity.copy(move).multiplyScalar(slideSpeed);
  player.slideUntil = now + slideDurationMs;
  player.nextSlideAt = now + slideCooldownMs;
}

function moveInputVector(target) {
  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = new THREE.Vector3(-Math.cos(player.yaw), 0, Math.sin(player.yaw));
  if (keys.has("KeyW")) target.add(forward);
  if (keys.has("KeyS")) target.sub(forward);
  if (keys.has("KeyD")) target.add(right);
  if (keys.has("KeyA")) target.sub(right);
  return target;
}

function triggerCpuAction(actor, type, duration) {
  actor.action = { type, start: performance.now(), duration: Math.max(1, duration) };
}

function angleDelta(target, current) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

function turnCpuToward(actor, target, dt) {
  const desiredYaw = Math.atan2(
    target.position.x - actor.position.x,
    target.position.z - actor.position.z,
  );
  actor.facingYaw += angleDelta(desiredYaw, actor.facingYaw) * (1 - Math.pow(0.00003, dt));
  actor.mesh.rotation.set(0, actor.facingYaw, 0);
}

function updateFighterPose(actor, now, dt) {
  const parts = actor.mesh?.userData.parts;
  if (!parts) return;
  const t = 1 - Math.pow(0.00001, dt);
  const action = actor.action;
  let progress = action.type ? (now - action.start) / action.duration : 1;
  if (progress >= 1) {
    action.type = null;
    progress = 1;
  }

  const pulse = Math.sin(Math.min(progress, 1) * Math.PI);
  const snap = Math.sin(Math.min(progress, 1) * Math.PI * 2);
  const isSliding = now < actor.slideUntil;
  const weaponTarget = {
    position: parts.weapon.userData.basePosition.clone(),
    rotation: parts.weapon.userData.baseRotation.clone(),
  };
  const armLift = action.type ? pulse : 0;
  const bodyLean = (isSliding ? -0.18 : 0) + (action.type === "reload" ? 0.12 * pulse : 0);

  if (action.type === "shoot") {
    weaponTarget.position.z += 0.16 * pulse;
    weaponTarget.rotation.x -= 0.22 * pulse;
  } else if (action.type === "reload") {
    weaponTarget.position.y -= 0.24 * pulse;
    weaponTarget.position.x += 0.12 * pulse;
    weaponTarget.rotation.x += 0.55 * pulse;
    weaponTarget.rotation.z -= 0.38 * pulse + 0.08 * snap;
  } else if (action.type === "throw") {
    weaponTarget.position.y += 0.38 * pulse;
    weaponTarget.position.z += 0.24 * pulse;
    weaponTarget.rotation.x -= 1.1 * pulse;
    weaponTarget.rotation.z += 0.5 * pulse;
  } else if (action.type === "punch") {
    weaponTarget.position.z -= 0.55 * pulse;
    weaponTarget.position.y += 0.18 * pulse;
    weaponTarget.rotation.x -= 0.65 * pulse;
  } else if (action.type === "scythe") {
    weaponTarget.position.z -= 0.48 * pulse;
    weaponTarget.position.y += 0.16 * pulse;
    weaponTarget.rotation.x -= 0.34 * pulse;
    weaponTarget.rotation.y += 0.72 * pulse;
    weaponTarget.rotation.z -= 0.9 * pulse + 0.15 * snap;
  } else if (action.type === "katana") {
    weaponTarget.position.z -= 0.5 * pulse;
    weaponTarget.position.y += 0.14 * pulse;
    weaponTarget.rotation.x -= 0.26 * pulse;
    weaponTarget.rotation.y += 0.86 * pulse;
    weaponTarget.rotation.z -= 1.04 * pulse + 0.12 * snap;
  } else if (action.type === "trowel") {
    weaponTarget.position.z -= 0.35 * pulse;
    weaponTarget.position.y += 0.16 * pulse;
    weaponTarget.rotation.x -= 0.55 * pulse;
    weaponTarget.rotation.y += 0.3 * pulse;
    weaponTarget.rotation.z -= 0.45 * pulse + 0.08 * snap;
  } else if (action.type === "reflect") {
    weaponTarget.position.y += 0.22 * pulse;
    weaponTarget.position.z -= 0.18 * pulse;
    weaponTarget.rotation.x -= 0.18 * pulse;
    weaponTarget.rotation.z += 0.84 * pulse;
  }

  parts.weapon.position.lerp(weaponTarget.position, t);
  parts.weapon.rotation.x = THREE.MathUtils.lerp(parts.weapon.rotation.x, weaponTarget.rotation.x, t);
  parts.weapon.rotation.y = THREE.MathUtils.lerp(parts.weapon.rotation.y, weaponTarget.rotation.y, t);
  parts.weapon.rotation.z = THREE.MathUtils.lerp(parts.weapon.rotation.z, weaponTarget.rotation.z, t);

  parts.torso.rotation.x = THREE.MathUtils.lerp(parts.torso.rotation.x, bodyLean, t);
  parts.arms.forEach((arm, index) => {
    const base = arm.userData.baseRotation;
    const side = index === 0 ? -1 : 1;
    const targetX = base.x + 0.34 * armLift + (isSliding ? 0.22 : 0);
    const targetZ = base.z + side * (0.18 * armLift);
    arm.rotation.x = THREE.MathUtils.lerp(arm.rotation.x, targetX, t);
    arm.rotation.z = THREE.MathUtils.lerp(arm.rotation.z, targetZ, t);
  });
  parts.forearms.forEach((forearm, index) => {
    const base = forearm.userData.baseRotation;
    const side = index === 0 ? -1 : 1;
    const targetX = base.x + 0.58 * armLift;
    const targetZ = base.z - side * 0.14 * armLift;
    forearm.rotation.x = THREE.MathUtils.lerp(forearm.rotation.x, targetX, t);
    forearm.rotation.z = THREE.MathUtils.lerp(forearm.rotation.z, targetZ, t);
  });
}

function updateCpu(now, dt, actor = cpu) {
  if (!actor.active || actor.hp <= 0) {
    if (actor.mesh) actor.mesh.visible = false;
    return;
  }
  const target = chooseAttackTarget(actor);
  if (!target) return;
  const toTarget = target.position.clone().sub(actor.position);
  const distance = toTarget.length();
  const dir = toTarget.normalize();
  if (now > actor.nextWeaponThinkAt || actor.reloading || !hasAmmo(actor, actor.weapon)) {
    actor.weapon = chooseCpuWeapon(actor, now, distance, target);
    actor.nextWeaponThinkAt = now + 650 + Math.random() * 550;
  }
  const hasShot = hasCpuLineOfSight(actor, target, actor.weapon);
  if (now > actor.strafeUntil) {
    actor.strafeUntil = now + (hasShot ? 850 : 1250) + Math.random() * 850;
    actor.strafeDir = Math.random() < 0.5 ? -1 : 1;
  }

  const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(actor.strafeDir);
  const desired = new THREE.Vector3();
  if (!hasShot) {
    if (now > actor.pushUntil) actor.pushUntil = now + 1500 + Math.random() * 900;
    if (distance > 7) desired.addScaledVector(dir, 1.12);
    else desired.sub(dir);
    desired.addScaledVector(side, 1.35);
  } else {
    if (distance > 18) desired.add(dir);
    if (distance < 7.5) desired.sub(dir);
    if (now < actor.pushUntil || distance > 23) desired.addScaledVector(dir, 0.35);
    desired.addScaledVector(side, 0.52);
  }
  if (desired.lengthSq()) desired.normalize();
  updateCpuMovementAbilities(actor, now, distance, desired);
  if (now < actor.slideUntil) {
    const slideLeft = Math.max(0, (actor.slideUntil - now) / 620);
    moveActor(actor, actor.slideVelocity.clone().multiplyScalar((0.35 + slideLeft) * dt), cpuRadius);
  } else {
    moveActor(actor, desired.clone().multiplyScalar(cpuMoveSpeed * dt), cpuRadius);
  }
  updateActorVertical(actor, cpuRadius, dt);
  applyJumpPads(actor, cpuRadius, now);
  actor.height = THREE.MathUtils.lerp(actor.height, actor.targetHeight, 1 - Math.pow(0.001, dt));
  clampToArena(actor.position, actor.feetY + actor.height);

  actor.mesh.position.set(actor.position.x, actor.feetY, actor.position.z);
  actor.mesh.scale.set(actor.visualScale, (actor.height / 1.7) * actor.visualScale, actor.visualScale);
  turnCpuToward(actor, target, dt);
  updateFighterPose(actor, now, dt);

  if (isGunWeapon(actor.weapon) && !hasAmmo(actor, actor.weapon)) {
    reload(actor, now);
  }
  if (actor.weapon === "trowel" && distance > 5 && distance < 14 && hasShot && Math.random() < 0.0025) {
    buildTrowelWall(actor, now, false);
  }
  const canAttackThroughCover = ["grenade", "smokegrenade"].includes(actor.weapon) || weapons[actor.weapon]?.category === "melee";
  const facingTarget = Math.abs(angleDelta(
    Math.atan2(target.position.x - actor.position.x, target.position.z - actor.position.z),
    actor.facingYaw,
  )) < 0.55;
  if (
    facingTarget
    && (hasShot || canAttackThroughCover)
    && now > matchStartTime + cpuStartDelayMs
    && distance < weapons[actor.weapon].range
    && Math.random() < cpuAttackChance
  ) {
    attack(actor, target, now, false);
  }
}

function hasCpuLineOfSight(actor, target, weaponKey) {
  if (weaponKey === "grenade" || weapons[weaponKey]?.category === "melee") return true;
  if (actorInsideSmoke(actor) || actorInsideSmoke(target)) return false;
  const origin = actor.position.clone();
  origin.y = (actor.feetY ?? 0) + 1.45;
  const aimPoint = getActorAimPoint(target, weaponKey);
  const direction = aimPoint.clone().sub(origin);
  const distance = direction.length();
  if (distance <= 0.001) return true;
  direction.normalize();
  const blocker = findBulletBlocker(origin, direction, Math.min(distance, weapons[weaponKey].range));
  const smoke = findSmokeBlocker(origin, direction, Math.min(distance, weapons[weaponKey].range));
  if (smoke && smoke.distance < Math.max(0, distance - 0.5)) return false;
  return !blocker || blocker.distance > Math.max(0, distance - 0.9);
}

function updateCpuMovementAbilities(actor, now, distance, desired) {
  const isSliding = now < actor.slideUntil;
  actor.targetHeight = isSliding ? 0.92 : 1.7;

  if (actor.grounded && now > actor.nextJumpAt && distance > 4 && desired.lengthSq()) {
    actor.verticalVelocity = cpuJumpVelocity;
    actor.grounded = false;
    actor.nextJumpAt = now + 2600 + Math.random() * 2200;
  }

  if (!isSliding && actor.grounded && now > actor.nextSlideAt && distance > 4 && distance < 17 && desired.lengthSq()) {
    actor.slideVelocity.copy(desired).normalize().multiplyScalar(14);
    actor.slideUntil = now + 760;
    actor.nextSlideAt = now + 2800 + Math.random() * 2200;
  }
}

function chooseCpuWeapon(actor, now, distance, target) {
  const primary = actor.loadout?.primary ?? "rifle";
  const secondary = actor.loadout?.secondary ?? "handgun";
  const melee = actor.loadout?.melee ?? "fist";
  const utility = actor.loadout?.utility ?? "grenade";
  const primaryWeapon = weapons[primary];
  const hasShot = target ? hasCpuLineOfSight(actor, target, primary) : true;
  if (distance < weapons[melee].range) return melee;
  if (utility === "smokegrenade" && !hasShot && actor.ammo.smokegrenade > 0 && distance > 7 && distance < 25 && Math.random() < 0.006) {
    return "smokegrenade";
  }
  if (utility === "grenade" && actor.grenadeReady <= now && distance > 7 && distance < 25 && Math.random() < (hasShot ? 0.003 : 0.012)) {
    return "grenade";
  }
  if (actor.reloading?.weapon === primary && hasAmmo(actor, secondary)) return secondary;
  if (actor.reloading?.weapon === secondary && hasAmmo(actor, primary)) return primary;
  if (hasAmmo(actor, primary) && actor.reloading?.weapon !== primary) {
    if (primary === "sniper" && distance < 12 && hasAmmo(actor, secondary) && Math.random() < 0.55) return secondary;
    if (distance <= primaryWeapon.range || !hasAmmo(actor, secondary)) return primary;
  }
  if (hasAmmo(actor, secondary) && actor.reloading?.weapon !== secondary) return secondary;
  return actor.reloading?.weapon ?? primary;
}

function clampToArena(position, y) {
  const limit = arenaSize / 2 - 2;
  position.x = THREE.MathUtils.clamp(position.x, -limit, limit);
  position.y = y;
  position.z = THREE.MathUtils.clamp(position.z, -limit, limit);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();
  if (roundEnding) {
    const remaining = Math.max(1, Math.ceil((roundEndingUntil - now) / 1000));
    showRoundBanner(`${playerScore >= MATCH_POINTS || cpuScore >= MATCH_POINTS ? "Match ends" : "Next round"} in ${remaining}`);
    finishRoundEnding();
  }
  updateAimCamera(dt);
  updateSmokeClouds(now, dt);
  updateBrickWalls(now, dt);
  animateJumpPads(now);
  finishReloads(now);
  if (!gameOver && !paused) {
    if (isPlayerSpectating()) {
      updateSpectatorCamera(dt);
    } else {
      updatePlayer(dt);
      updateAutoFire(now);
    }
    if (!controlsFrozen()) updateBurstFire(now);
    if (isOnlineMode()) updateOnline(now, dt);
    else if (!preRoundFreeze) cpuActors.forEach((actor) => updateCpu(now, dt, actor));
    if (!preRoundFreeze) updateProjectiles(dt);
  } else if (!matchStarted || menuState === "main" || menuState === "mode") {
    updateMenuPreview();
  }
  updateSniperAimLights();
  updateHud();
  renderer.render(scene, camera);
}

function updateSniperAimLights() {
  if (gameOver || document.body.classList.contains("in-menu")) {
    for (const [actor, beam] of cpuSniperBeams.entries()) {
      scene.remove(beam);
      beam.geometry.dispose();
      beam.material.dispose();
      cpuSniperBeams.delete(actor);
    }
    return;
  }
  const active = new Set();
  for (const actor of cpuActors) {
    if (!actor.active || actor.hp <= 0 || actor.weapon !== "sniper") continue;
    const target = chooseAttackTarget(actor);
    if (!target || !hasCpuLineOfSight(actor, target, "sniper")) continue;
    const facingTarget = Math.abs(angleDelta(
      Math.atan2(target.position.x - actor.position.x, target.position.z - actor.position.z),
      actor.facingYaw,
    )) < 0.75;
    if (!facingTarget) continue;
    active.add(actor);
    const start = actor.position.clone();
    start.y = (actor.feetY ?? 0) + 1.42;
    const end = getActorAimPoint(target, "sniper");
    let beam = cpuSniperBeams.get(actor);
    if (!beam) {
      const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
      const material = new THREE.LineBasicMaterial({ color: 0xf8fbff, transparent: true, opacity: 0.9 });
      beam = new THREE.Line(geometry, material);
      scene.add(beam);
      cpuSniperBeams.set(actor, beam);
    } else {
      beam.geometry.setFromPoints([start, end]);
    }
  }

  for (const [actor, beam] of cpuSniperBeams.entries()) {
    if (active.has(actor)) continue;
    scene.remove(beam);
    beam.geometry.dispose();
    beam.material.dispose();
    cpuSniperBeams.delete(actor);
  }
}

function updateSpectatorCamera(dt) {
  if (!spectatingActor || spectatingActor.hp <= 0) {
    if (!playerTeamAlive()) endRound(false);
    return;
  }
  const target = chooseAttackTarget(spectatingActor);
  const behind = new THREE.Vector3(0, 2.4, 5.2);
  const lookTarget = spectatingActor.position.clone();
  lookTarget.y = spectatingActor.feetY + 1.35;
  if (target) {
    const away = spectatingActor.position.clone().sub(target.position).setY(0);
    if (away.lengthSq()) {
      away.normalize();
      behind.set(away.x * 5.2, 2.4, away.z * 5.2);
    }
  }
  const desired = lookTarget.clone().add(behind);
  camera.position.lerp(desired, 1 - Math.pow(0.0001, dt));
  camera.lookAt(lookTarget);
}

function updateMenuPreview() {
  playerProxy.visible = true;
  playerProxy.position.set(0, 0, 8);
  playerProxy.rotation.set(0, Math.PI, 0);
  camera.position.set(0, 1.45, 12.2);
  camera.lookAt(0, 1.35, 8);
}

function updateAimCamera(dt) {
  updateAimState();
  const scoped = aimHeld && canAimCurrentWeapon() && !gameOver && isPointerLocked() && !isPlayerSpectating();
  const targetFov = scoped
    ? (player.weapon === "sniper" ? sniperAimFov : player.weapon === "lasergun" ? 46 : aimFov)
    : normalFov;
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.pow(0.0001, dt));
  camera.updateProjectionMatrix();
  updateViewModel(dt);
}

function updateViewModel(dt) {
  viewModel.visible = !isPlayerSpectating() && !document.body.classList.contains("in-menu");
  if (!viewModel.visible) return;
  const aiming = aimHeld && canAimCurrentWeapon() && !gameOver && isPointerLocked();
  Object.entries(viewModel.userData.models).forEach(([weapon, model]) => {
    model.visible = weapon === player.weapon && !(weapon === "sniper" && aiming);
  });
  updateViewModelParts();
  const pose = getViewModelPose(player.weapon, aiming);
  const action = getViewActionPose();
  const t = 1 - Math.pow(0.00001, dt);
  const targetPosition = pose.position.clone().add(action.position);
  const targetRotation = new THREE.Euler(
    pose.rotation.x + action.rotation.x,
    pose.rotation.y + action.rotation.y,
    pose.rotation.z + action.rotation.z,
  );
  viewModel.position.lerp(targetPosition, t);
  viewModel.rotation.x = THREE.MathUtils.lerp(viewModel.rotation.x, targetRotation.x, t);
  viewModel.rotation.y = THREE.MathUtils.lerp(viewModel.rotation.y, targetRotation.y, t);
  viewModel.rotation.z = THREE.MathUtils.lerp(viewModel.rotation.z, targetRotation.z, t);
}

function resetViewPart(part) {
  if (!part?.userData.basePosition || !part.userData.baseRotation) return;
  part.position.copy(part.userData.basePosition);
  part.rotation.copy(part.userData.baseRotation);
  part.visible = true;
}

function currentViewActionProgress(type) {
  if (viewAction.type !== type) return null;
  return THREE.MathUtils.clamp((performance.now() - viewAction.start) / viewAction.duration, 0, 1);
}

function updateViewModelParts() {
  for (const model of Object.values(viewModel.userData.models)) {
    resetViewPart(model.userData.magazine);
    resetViewPart(model.userData.leftFist);
    resetViewPart(model.userData.rightFist);
    resetViewPart(model.userData.scythe);
    resetViewPart(model.userData.katana);
    resetViewPart(model.userData.trowel);
  }

  const activeModel = viewModel.userData.models[player.weapon];
  const reloadProgress = currentViewActionProgress("reload");
  if (reloadProgress !== null) {
    if (player.reloading?.weapon === "lasergun") animateLaserReload(activeModel, reloadProgress);
    else animateMagazineReload(activeModel?.userData.magazine, reloadProgress);
  }

  const punchProgress = currentViewActionProgress("punch");
  if (punchProgress !== null) animateFistPunch(activeModel, punchProgress);

  const scytheProgress = currentViewActionProgress("scythe");
  if (scytheProgress !== null) animateScytheSwing(activeModel, scytheProgress);

  const katanaProgress = currentViewActionProgress("katana");
  if (katanaProgress !== null) animateKatanaSlice(activeModel, katanaProgress);

  const reflectProgress = currentViewActionProgress("reflect");
  if (reflectProgress !== null) animateKatanaReflect(activeModel, reflectProgress);

  const trowelProgress = currentViewActionProgress("trowel");
  if (trowelProgress !== null) animateTrowelSwing(activeModel, trowelProgress);
}

function animateMagazineReload(magazine, progress) {
  if (!magazine) return;
  const outProgress = THREE.MathUtils.smoothstep(Math.min(progress / 0.28, 1), 0, 1);
  const inProgress = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((progress - 0.58) / 0.34, 0, 1), 0, 1);
  const outAmount = outProgress * (1 - inProgress);
  const swapTwitch = Math.sin(progress * Math.PI * 5) * 0.025 * outAmount;

  magazine.position.x += 0.05 * outAmount;
  magazine.position.y -= 0.58 * outAmount;
  magazine.position.z += 0.08 * outAmount + swapTwitch;
  magazine.rotation.x += 0.22 * outAmount;
  magazine.rotation.z += 0.16 * outAmount;
}

function animateLaserReload(model, progress) {
  if (!model) return;
  const cell = model.userData.magazine;
  if (!cell) return;
  const vent = Math.sin(progress * Math.PI * 7);
  const eject = THREE.MathUtils.smoothstep(Math.min(progress / 0.28, 1), 0, 1);
  const charge = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((progress - 0.38) / 0.42, 0, 1), 0, 1);
  const lock = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((progress - 0.78) / 0.18, 0, 1), 0, 1);

  cell.position.y -= 0.35 * eject * (1 - charge);
  cell.position.z += 0.18 * eject * (1 - charge);
  cell.rotation.x += 1.2 * eject * (1 - charge);
  cell.scale.setScalar(0.72 + charge * 0.34 + Math.max(0, vent) * 0.05 * charge * (1 - lock));
  cell.position.y += 0.08 * lock;

  model.traverse((part) => {
    if (!part.isMesh || !part.material?.emissive) return;
    part.material.emissiveIntensity = 0.6 + charge * 2.2 + Math.max(0, vent) * 0.5 * charge;
  });
}

function animateFistPunch(model, progress) {
  if (!model) return;
  const fist = viewAction.side > 0 ? model.userData.rightFist : model.userData.leftFist;
  const guard = viewAction.side > 0 ? model.userData.leftFist : model.userData.rightFist;
  const windup = Math.sin(Math.min(progress / 0.18, 1) * Math.PI * 0.5);
  const strike = progress < 0.34
    ? THREE.MathUtils.smoothstep(progress / 0.34, 0, 1)
    : 1 - THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((progress - 0.34) / 0.46, 0, 1), 0, 1);
  const recoil = Math.sin(THREE.MathUtils.clamp((progress - 0.34) / 0.66, 0, 1) * Math.PI) * 0.12;

  if (fist) {
    fist.position.x -= viewAction.side * 0.08 * strike;
    fist.position.y += 0.04 * strike;
    fist.position.z -= 0.78 * strike;
    fist.rotation.x -= 0.52 * strike;
    fist.rotation.y += viewAction.side * 0.24 * strike;
    fist.rotation.z += viewAction.side * 0.2 * strike;
  }

  if (guard) {
    guard.position.y -= 0.04 * windup;
    guard.position.z += 0.08 * windup - recoil;
    guard.rotation.z -= viewAction.side * 0.1 * windup;
  }
}

function animateScytheSwing(model, progress) {
  const scythe = model?.userData.scythe;
  if (!scythe) return;
  const windup = THREE.MathUtils.smoothstep(Math.min(progress / 0.24, 1), 0, 1);
  const slash = progress < 0.52
    ? THREE.MathUtils.smoothstep(Math.max((progress - 0.16) / 0.36, 0), 0, 1)
    : 1 - THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((progress - 0.52) / 0.38, 0, 1), 0, 1);
  const recover = Math.sin(Math.min(progress, 1) * Math.PI);

  scythe.position.x -= 0.1 * windup;
  scythe.position.y += 0.1 * recover;
  scythe.position.z -= 0.42 * slash;
  scythe.rotation.x -= 0.32 * slash;
  scythe.rotation.y += 1.18 * slash - 0.46 * windup;
  scythe.rotation.z -= 1.25 * slash + 0.32 * windup;
}

function animateKatanaSlice(model, progress) {
  const katana = model?.userData.katana;
  if (!katana) return;
  const slash = progress < 0.46
    ? THREE.MathUtils.smoothstep(progress / 0.46, 0, 1)
    : 1 - THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((progress - 0.46) / 0.42, 0, 1), 0, 1);
  const windup = Math.sin(Math.min(progress / 0.2, 1) * Math.PI * 0.5);
  katana.position.x -= 0.12 * windup;
  katana.position.y += 0.12 * slash;
  katana.position.z -= 0.5 * slash;
  katana.rotation.x -= 0.36 * slash;
  katana.rotation.y += 0.92 * slash - 0.28 * windup;
  katana.rotation.z -= 1.34 * slash + 0.22 * windup;
}

function animateKatanaReflect(model, progress) {
  const katana = model?.userData.katana;
  if (!katana) return;
  const raise = THREE.MathUtils.smoothstep(Math.min(progress / 0.22, 1), 0, 1);
  const shimmer = Math.sin(progress * Math.PI * 8) * 0.035;
  katana.position.set(0.02 + shimmer, -0.08, -0.58);
  katana.rotation.set(-0.08, 0.12 + shimmer, 0.92 * raise);
}

function animateTrowelSwing(model, progress) {
  const trowel = model?.userData.trowel;
  if (!trowel) return;
  const swing = progress < 0.42
    ? THREE.MathUtils.smoothstep(progress / 0.42, 0, 1)
    : 1 - THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((progress - 0.42) / 0.42, 0, 1), 0, 1);
  const windup = Math.sin(Math.min(progress / 0.2, 1) * Math.PI * 0.5);
  trowel.position.y += 0.1 * swing;
  trowel.position.z -= 0.34 * swing;
  trowel.rotation.x -= 0.72 * swing;
  trowel.rotation.y += 0.28 * windup;
  trowel.rotation.z -= 0.42 * swing;
}

function triggerViewAction(type, duration) {
  const nextAction = { type, start: performance.now(), duration: Math.max(1, duration) };
  if (type === "punch") {
    punchSide *= -1;
    nextAction.side = punchSide;
  }
  viewAction = nextAction;
}

function getViewActionPose() {
  if (!viewAction.type) return { position: new THREE.Vector3(), rotation: new THREE.Euler() };
  const progress = (performance.now() - viewAction.start) / viewAction.duration;
  if (progress >= 1) {
    viewAction.type = null;
    return { position: new THREE.Vector3(), rotation: new THREE.Euler() };
  }
  const pulse = Math.sin(progress * Math.PI);
  const snap = Math.sin(progress * Math.PI * 2);
  const position = new THREE.Vector3();
  const rotation = new THREE.Euler();

  if (viewAction.type === "reload") {
    if (player.reloading?.weapon === "lasergun") {
      const charge = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((progress - 0.34) / 0.48, 0, 1), 0, 1);
      position.set(0.03 * snap, -0.18 * pulse - 0.08 * charge, 0.1 * pulse);
      rotation.set(0.12 * pulse, 0.08 * snap, 0.18 * pulse - 0.06 * snap);
    } else {
      position.set(0.18 * pulse, -0.42 * pulse, 0.16 * pulse);
      rotation.set(0.42 * pulse, -0.22 * pulse, -0.55 * pulse + 0.08 * snap);
    }
  } else if (viewAction.type === "punch") {
    const jab = progress < 0.28
      ? THREE.MathUtils.smoothstep(progress / 0.28, 0, 1)
      : 1 - THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((progress - 0.28) / 0.48, 0, 1), 0, 1);
    position.set(0.04 * snap, -0.03 * jab, -0.16 * jab);
    rotation.set(-0.12 * jab, 0.1 * snap, 0.06 * snap);
  } else if (viewAction.type === "scythe") {
    const slash = progress < 0.5
      ? THREE.MathUtils.smoothstep(progress / 0.5, 0, 1)
      : 1 - THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((progress - 0.5) / 0.42, 0, 1), 0, 1);
    position.set(-0.08 * pulse, -0.04 * slash, -0.28 * slash);
    rotation.set(-0.2 * slash, 0.34 * pulse, -0.62 * slash + 0.16 * snap);
  } else if (viewAction.type === "katana") {
    const slash = progress < 0.48
      ? THREE.MathUtils.smoothstep(progress / 0.48, 0, 1)
      : 1 - THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((progress - 0.48) / 0.42, 0, 1), 0, 1);
    position.set(-0.1 * pulse, -0.02 * slash, -0.3 * slash);
    rotation.set(-0.16 * slash, 0.34 * pulse, -0.68 * slash + 0.12 * snap);
  } else if (viewAction.type === "trowel") {
    const swing = progress < 0.44
      ? THREE.MathUtils.smoothstep(progress / 0.44, 0, 1)
      : 1 - THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((progress - 0.44) / 0.42, 0, 1), 0, 1);
    position.set(0.04 * snap, 0.02 * swing, -0.18 * swing);
    rotation.set(-0.26 * swing, 0.12 * pulse, -0.2 * swing);
  } else if (viewAction.type === "reflect") {
    position.set(0.02 * snap, 0.08 * pulse, -0.08 * pulse);
    rotation.set(-0.06 * pulse, 0.06 * snap, 0.18 * pulse);
  } else if (viewAction.type === "throw") {
    position.set(0.16 * pulse, -0.18 * pulse, -0.34 * pulse);
    rotation.set(-0.85 * pulse + 0.2 * snap, 0.28 * pulse, 0.42 * pulse);
  }

  return { position, rotation };
}

function getViewModelPose(weapon, aiming) {
  const poses = {
    rifle: {
      hip: [new THREE.Vector3(0.48, -0.42, -0.92), new THREE.Euler(-0.02, -0.08, 0)],
      aim: [new THREE.Vector3(0, -0.24, -0.7), new THREE.Euler(0, 0, 0)],
    },
    trishot: {
      hip: [new THREE.Vector3(0.48, -0.42, -0.92), new THREE.Euler(-0.02, -0.08, 0)],
      aim: [new THREE.Vector3(0, -0.24, -0.7), new THREE.Euler(0, 0, 0)],
    },
    lasergun: {
      hip: [new THREE.Vector3(0.44, -0.4, -0.94), new THREE.Euler(-0.015, -0.075, 0)],
      aim: [new THREE.Vector3(0, -0.245, -0.72), new THREE.Euler(0, 0, 0)],
    },
    sniper: {
      hip: [new THREE.Vector3(0.42, -0.42, -0.98), new THREE.Euler(-0.03, -0.07, 0)],
      aim: [new THREE.Vector3(0, -0.28, -0.78), new THREE.Euler(0, 0, 0)],
    },
    handgun: {
      hip: [new THREE.Vector3(0.32, -0.38, -0.82), new THREE.Euler(-0.03, -0.06, 0.02)],
      aim: [new THREE.Vector3(-0.05, -0.24, -0.64), new THREE.Euler(0, 0, 0)],
    },
    revolver: {
      hip: [new THREE.Vector3(0.34, -0.39, -0.84), new THREE.Euler(-0.035, -0.055, 0.02)],
      aim: [new THREE.Vector3(-0.055, -0.235, -0.66), new THREE.Euler(0, 0, 0)],
    },
    energypistol: {
      hip: [new THREE.Vector3(0, -0.38, -0.82), new THREE.Euler(-0.03, 0, 0)],
      aim: [new THREE.Vector3(0, -0.29, -0.66), new THREE.Euler(0, 0, 0)],
    },
    fist: {
      hip: [new THREE.Vector3(0, -0.28, -0.72), new THREE.Euler(-0.1, 0, 0)],
      aim: [new THREE.Vector3(0, -0.28, -0.72), new THREE.Euler(-0.1, 0, 0)],
    },
    scythe: {
      hip: [new THREE.Vector3(0.14, -0.28, -0.78), new THREE.Euler(-0.08, -0.06, 0.02)],
      aim: [new THREE.Vector3(0.14, -0.28, -0.78), new THREE.Euler(-0.08, -0.06, 0.02)],
    },
    katana: {
      hip: [new THREE.Vector3(0.08, -0.24, -0.7), new THREE.Euler(-0.05, -0.02, 0.04)],
      aim: [new THREE.Vector3(0.08, -0.24, -0.7), new THREE.Euler(-0.05, -0.02, 0.04)],
    },
    trowel: {
      hip: [new THREE.Vector3(0.16, -0.26, -0.7), new THREE.Euler(-0.08, -0.06, 0.02)],
      aim: [new THREE.Vector3(0.16, -0.26, -0.7), new THREE.Euler(-0.08, -0.06, 0.02)],
    },
    grenade: {
      hip: [new THREE.Vector3(0.24, -0.28, -0.68), new THREE.Euler(-0.08, -0.08, 0.02)],
      aim: [new THREE.Vector3(0.1, -0.24, -0.62), new THREE.Euler(-0.04, 0, 0)],
    },
    smokegrenade: {
      hip: [new THREE.Vector3(0.24, -0.28, -0.68), new THREE.Euler(-0.08, -0.08, 0.02)],
      aim: [new THREE.Vector3(0.24, -0.28, -0.68), new THREE.Euler(-0.08, -0.08, 0.02)],
    },
  };
  const [position, rotation] = poses[weapon][aiming ? "aim" : "hip"];
  return { position, rotation };
}

function animateJumpPads(now) {
  for (const pad of jumpPads) {
    const pulse = 1 + Math.sin(now * 0.006) * 0.08;
    pad.ring.scale.setScalar(pulse);
    pad.ring.rotation.z += 0.025;
  }
}

function updateAutoFire(now) {
  if (!fireHeld || !weapons[player.weapon]?.auto || !isPointerLocked() || isPlayerSpectating() || controlsFrozen()) return;
  playerAttack(now);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  if (!ui.hackDialog.hidden) {
    if (event.code === "Escape") closeHackDialog();
    return;
  }
  if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyC", "KeyQ", "KeyM", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  const wasPressed = keys.has(event.code);
  keys.add(event.code);
  if (event.code === "KeyP") togglePause();
  if (event.code === "KeyH" && !wasPressed) toggleHack();
  if (event.code === "KeyM" && !wasPressed && preRoundFreeze) {
    fireHeld = false;
    aimHeld = false;
    updateAimState();
    releasePointerLock();
    startLoadoutSelection(true);
    return;
  }
  if (isPlayerSpectating()) {
    if (event.code === "Escape") releasePointerLock();
    return;
  }
  if (event.code === "Digit1") setWeapon(playerLoadout.primary);
  if (event.code === "Digit2") setWeapon(playerLoadout.secondary);
  if (event.code === "Digit3") setWeapon(playerLoadout.melee);
  if (event.code === "Digit4") setWeapon(playerLoadout.utility);
  if (event.code === "KeyQ" && !wasPressed && !controlsFrozen()) quickMelee(performance.now());
  if (event.code === "KeyR" && !controlsFrozen()) reload(player, performance.now());
  if (event.code === "Space" && !wasPressed && hackEnabled && !gameOver && !controlsFrozen()) {
    const now = performance.now();
    if (now - lastSpaceTap < 340) {
      lastSpaceTap = 0;
      toggleHackFlight();
      return;
    }
    lastSpaceTap = now;
  }
  if (event.code === "Space" && !wasPressed && !gameOver && !controlsFrozen() && player.grounded) {
    player.verticalVelocity = jumpVelocity;
    player.grounded = false;
  }
  if (event.code === "KeyC" && !wasPressed && !gameOver && !controlsFrozen() && !(hackEnabled && hackFlying)) startSlideOrCrouch(performance.now());
  if (event.code === "Escape") releasePointerLock();
});
window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
  if (event.code === "KeyC" && !gameOver && !isPlayerSpectating() && performance.now() >= player.slideUntil) {
    player.targetHeight = 1.7;
  }
});
window.addEventListener("mousemove", (event) => {
  if (gameOver || paused || changingLoadoutMidRound || isPlayerSpectating() || !isPointerLocked()) return;
  const nativeLocked = document.pointerLockElement === canvas;
  if (!nativeLocked) {
    softTurnInput = edgeInput(event.clientX, window.innerWidth);
    softPitchInput = edgeInput(event.clientY, window.innerHeight);
  }
  const sensitivity = mouseSensitivity * (aimHeld ? 0.52 : 1);
  player.yaw -= event.movementX * sensitivity;
  player.pitch -= event.movementY * sensitivity;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.2, 1.2);
});
window.addEventListener("contextmenu", (event) => event.preventDefault());
window.addEventListener("mousedown", (event) => {
  if (gameOver || paused || isPlayerSpectating()) return;
  if (!isPointerLocked()) {
    requestPointerLock();
    if (event.button === 2 && !controlsFrozen()) aimHeld = canAimCurrentWeapon();
    updateAimState();
    return;
  }
  if (controlsFrozen()) return;
  if (event.button === 2) {
    if (player.weapon === "scythe") {
      scytheDash(performance.now());
      updateAimState();
      return;
    }
    if (player.weapon === "katana") {
      katanaReflect(player, performance.now());
      updateAimState();
      return;
    }
    if (player.weapon === "trowel") {
      buildTrowelWall(player, performance.now(), true);
      updateAimState();
      return;
    }
    aimHeld = canAimCurrentWeapon();
    updateAimState();
    return;
  }
  if (event.button !== 0) return;
  fireHeld = true;
  playerAttack(performance.now());
});
window.addEventListener("mouseup", (event) => {
  if (event.button === 0) fireHeld = false;
  if (event.button === 2) {
    aimHeld = false;
    updateAimState();
  }
});
window.addEventListener("blur", () => {
  fireHeld = false;
  aimHeld = false;
  updateAimState();
});
document.addEventListener("pointerlockchange", () => {
  if (!gameOver && softPointerLocked) {
    updatePointerLockUi();
    return;
  }
  updatePointerLockUi();
});
document.addEventListener("pointerlockerror", () => {
  if (!gameOver) softPointerLocked = true;
  updatePointerLockUi();
});

function edgeInput(value, size) {
  const zone = size * 0.22;
  if (value < zone) return (value - zone) / zone;
  if (value > size - zone) return (value - (size - zone)) / zone;
  return 0;
}
ui.quickbar.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button) setWeapon(button.dataset.weapon);
});
document.querySelector(".top-buttons")?.addEventListener("mousedown", (event) => event.stopPropagation());
document.querySelector(".top-buttons")?.addEventListener("pointerdown", (event) => event.stopPropagation());
ui.pauseButton.addEventListener("click", togglePause);
ui.hackButton.addEventListener("click", toggleHack);
ui.hackDialog.addEventListener("mousedown", (event) => event.stopPropagation());
ui.hackDialog.addEventListener("pointerdown", (event) => event.stopPropagation());
ui.hackForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (ui.hackPassword.value === hackPassword) {
    closeHackDialog();
    enableHack();
    return;
  }
  ui.hackPassword.value = "";
  ui.hackMessage.textContent = "Wrong password";
  ui.hackPassword.focus();
});
ui.hackCancel.addEventListener("click", closeHackDialog);
ui.startButton.addEventListener("click", () => {
  if (menuState === "roundOver") {
    showMainMenu();
    return;
  }
  if (menuState === "main") showModeMenu();
});
ui.onlineButton.addEventListener("click", () => {
  if (menuState !== "main") return;
  showOnlineModeMenu();
});
ui.modeMenu.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-mode]");
  if (button) chooseMode(button.dataset.mode);
});
ui.onlineModeMenu.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-mode]");
  if (button) chooseMode(button.dataset.mode);
});
ui.loadoutMenu.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-weapon]");
  if (button) chooseLoadoutWeapon(button.dataset.weapon);
});

resize();
updateHud();
  updatePointerLockUi();
  updateScoreHud();
  updateWeaponClass();
  updateModeClass();
  showMainMenu();
  animate();
