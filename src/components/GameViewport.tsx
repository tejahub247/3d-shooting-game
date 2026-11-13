import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../audio/soundEngine';
import { buildEnvironment, BuiltEnvironment } from '../engine/environments';
import {
  createTargetEntity,
  createThirdPersonOperator,
  TargetBehavior,
  TargetEntity,
  ThirdPersonOperator,
} from '../engine/targets';
import { buildWeaponModel, BuiltWeaponModel } from '../engine/weaponModels';
import { ENVIRONMENT_MAP, EnvironmentId, getLevelByNumber } from '../game/levels';
import {
  calculateBulletDamage,
  calculateHitScore,
  CameraPerspective,
  GameMode,
  GraphicsQuality,
  PlayerSaveData,
} from '../game/rules';
import {
  DEFAULT_UPGRADES,
  getEffectiveWeaponStats,
  getWeaponById,
  WeaponSkinId,
} from '../game/weapons';

export interface LiveHudSnapshot {
  ammoInMag: number;
  reserveAmmo: number;
  magSize: number;
  isReloading: boolean;
  reloadProgress: number;
  isAds: boolean;
  scopeZoomIndex: number;
  scopeZoomLabel: string;
  isSniperScoped: boolean;
  playerHp: number;
  maxHp: number;
  score: number;
  kills: number;
  targetGoal: number;
  headshots: number;
  headshotQuota: number;
  shotsFired: number;
  shotsHit: number;
  combo: number;
  timeRemainingSec: number;
  elapsedSec: number;
  wave: number;
  activeWeaponId: string;
  activeSlotIndex: number;
  cameraMode: CameraPerspective;
  hitmarkerType: 'none' | 'body' | 'head';
  floatingFeed: { id: number; text: string; isHead: boolean } | null;
  damageFlash: number;
  crosshairSpreadPx: number;
}

export interface TouchInputState {
  moveX: number; // -1..1
  moveY: number; // -1..1 (forward positive)
  lookDeltaX: number;
  lookDeltaY: number;
  firing: boolean;
  justFired: boolean;
  aiming: boolean;
}

export interface GameViewportProps {
  gameState: 'title' | 'playing' | 'paused' | 'gameover';
  mode: GameMode;
  levelNumber: number;
  environmentId: EnvironmentId;
  saveData: PlayerSaveData;
  cameraMode: CameraPerspective;
  graphicsQuality: GraphicsQuality;
  runNonce: number;
  touchInputRef: React.MutableRefObject<TouchInputState>;
  actionQueueRef: React.MutableRefObject<string[]>;
  onHudUpdate: (snap: LiveHudSnapshot) => void;
  onRunComplete: (summary: {
    kills: number;
    headshots: number;
    shotsFired: number;
    shotsHit: number;
    score: number;
    elapsedSec: number;
    playerHp: number;
    waveReached: number;
  }) => void;
  onSlotChange: (slotIndex: number) => void;
}

// Reusable scratch math objects (zero GC in loop)
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

interface PooledParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  spin: THREE.Vector3;
  active: boolean;
}

interface PooledTracer {
  line: THREE.Line;
  life: number;
  maxLife: number;
  active: boolean;
}

export const GameViewport: React.FC<GameViewportProps> = ({
  gameState,
  mode,
  levelNumber,
  environmentId,
  saveData,
  cameraMode,
  graphicsQuality,
  runNonce,
  touchInputRef,
  actionQueueRef,
  onHudUpdate,
  onRunComplete,
  onSlotChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const propsRef = useRef({
    gameState,
    mode,
    levelNumber,
    environmentId,
    saveData,
    cameraMode,
    graphicsQuality,
    onHudUpdate,
    onRunComplete,
    onSlotChange,
  });
  propsRef.current = {
    gameState,
    mode,
    levelNumber,
    environmentId,
    saveData,
    cameraMode,
    graphicsQuality,
    onHudUpdate,
    onRunComplete,
    onSlotChange,
  };

  const resetRunSignalRef = useRef(0);
  const rebuildEnvSignalRef = useRef(0);
  const rebuildWeaponSignalRef = useRef(0);

  useEffect(() => {
    resetRunSignalRef.current += 1;
  }, [runNonce, mode, levelNumber]);

  useEffect(() => {
    rebuildEnvSignalRef.current += 1;
  }, [environmentId, levelNumber, mode]);

  useEffect(() => {
    rebuildWeaponSignalRef.current += 1;
  }, [
    saveData.activeSlotIndex,
    saveData.equippedLoadout,
    saveData.weaponSkins,
    saveData.weaponUpgrades,
  ]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL (SwiftShader/llvmpipe) cleanly
    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: isSoftwareGl,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      68,
      (container.clientWidth || 1280) / (container.clientHeight || 720),
      0.08,
      360,
    );
    scene.add(camera);

    // Three-point / outdoor warm-cool lighting rig
    const hemiLight = new THREE.HemisphereLight(0x9ec5e6, 0x4b473e, 0.78);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.1);
    keyLight.position.set(24, 38, 20);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 110;
    keyLight.shadow.camera.left = -36;
    keyLight.shadow.camera.right = 36;
    keyLight.shadow.camera.top = 36;
    keyLight.shadow.camera.bottom = -36;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.55);
    rimLight.position.set(-22, 16, -40);
    scene.add(rimLight);

    // Muzzle flash point light
    const muzzleLight = new THREE.PointLight(0xffb74d, 0, 10, 2);
    scene.add(muzzleLight);

    // Muzzle flash visual burst mesh attached to camera/weapon
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const muzzleFlashMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.09, 0),
      flashMat,
    );
    muzzleFlashMesh.visible = false;
    scene.add(muzzleFlashMesh);

    // FPS Weapon Viewmodel Rig attached to camera
    const viewmodelRoot = new THREE.Group();
    camera.add(viewmodelRoot);

    // TPS Operator Model in world space
    const tpsOperator: ThirdPersonOperator = createThirdPersonOperator();
    tpsOperator.root.visible = false;
    scene.add(tpsOperator.root);

    let activeBuiltEnv: BuiltEnvironment | null = null;
    let activeFpsWeapon: BuiltWeaponModel | null = null;
    let activeTpsWeapon: BuiltWeaponModel | null = null;

    // Pooled ring-buffer particles (sparks, smoke, shell casings)
    const PARTICLE_COUNT = 72;
    const particles: PooledParticle[] = [];
    const sparkGeo = new THREE.BoxGeometry(0.055, 0.055, 0.055);
    const shellGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.042, 8);
    const smokeGeo = new THREE.SphereGeometry(0.09, 6, 6);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const isShell = i < 24;
      const isSmoke = i >= 24 && i < 42;
      const mat = new THREE.MeshStandardMaterial({
        color: isShell ? 0xeab308 : isSmoke ? 0x9ca3af : 0xfbbf24,
        emissive: isShell || isSmoke ? 0x000000 : 0xf59e0b,
        emissiveIntensity: isShell || isSmoke ? 0 : 1.4,
        roughness: isShell ? 0.25 : 0.85,
        metalness: isShell ? 0.9 : 0.0,
        transparent: isSmoke,
        opacity: isSmoke ? 0.45 : 1.0,
      });
      const mesh = new THREE.Mesh(
        isShell ? shellGeo : isSmoke ? smokeGeo : sparkGeo,
        mat,
      );
      mesh.visible = false;
      scene.add(mesh);
      particles.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        gravity: isShell ? 9.8 : isSmoke ? -0.6 : 6.0,
        spin: new THREE.Vector3(),
        active: false,
      });
    }
    let particleCursor = 0;

    function spawnParticle(
      kind: 'shell' | 'smoke' | 'spark',
      pos: THREE.Vector3,
      vel: THREE.Vector3,
      maxLife: number,
    ) {
      const startIdx = kind === 'shell' ? 0 : kind === 'smoke' ? 24 : 42;
      const span = kind === 'shell' ? 24 : kind === 'smoke' ? 18 : 30;
      const idx = startIdx + (particleCursor++ % span);
      const p = particles[idx];
      p.active = true;
      p.life = maxLife;
      p.maxLife = maxLife;
      p.mesh.visible = true;
      p.mesh.position.copy(pos);
      p.mesh.scale.setScalar(1);
      p.vel.copy(vel);
      p.spin.set(
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18,
      );
    }

    // Pooled Bullet Tracers
    const tracers: PooledTracer[] = [];
    for (let i = 0; i < 16; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(0, 0, -1),
      ]);
      const mat = new THREE.LineBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.75,
      });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      line.frustumCulled = false;
      scene.add(line);
      tracers.push({ line, life: 0, maxLife: 0.08, active: false });
    }
    let tracerCursor = 0;

    function spawnTracer(start: THREE.Vector3, end: THREE.Vector3) {
      const t = tracers[tracerCursor++ % tracers.length];
      const posAttr = t.line.geometry.attributes.position as THREE.BufferAttribute;
      posAttr.setXYZ(0, start.x, start.y, start.z);
      posAttr.setXYZ(1, end.x, end.y, end.z);
      posAttr.needsUpdate = true;
      t.active = true;
      t.life = 0.07;
      t.maxLife = 0.07;
      t.line.visible = true;
    }

    // Simulation state
    const sim = {
      playerPos: new THREE.Vector3(0, 0, 8),
      playerVelY: 0,
      grounded: true,
      crouching: false,
      yaw: 0,
      pitch: 0,
      recoilPitch: 0,
      recoilYaw: 0,
      trauma: 0,
      walkDist: 0,
      adsBlend: 0,
      scopeZoomIndex: 0,
      fireCooldown: 0,
      reloadTimer: 0,
      isReloading: false,
      weaponKick: 0,
      muzzleTimer: 0,
      slotAmmo: [30, 15, 5] as number[],
      slotReserve: [150, 90, 30] as number[],
      playerHp: 100,
      maxHp: 100,
      score: 0,
      kills: 0,
      headshots: 0,
      shotsFired: 0,
      shotsHit: 0,
      combo: 0,
      comboTimer: 0,
      elapsedSec: 0,
      timeLimitSec: 60,
      targetGoal: 10,
      headshotQuota: 0,
      wave: 1,
      hitmarkerType: 'none' as 'none' | 'body' | 'head',
      hitmarkerTimer: 0,
      floatingFeed: null as { id: number; text: string; isHead: boolean } | null,
      floatingTimer: 0,
      feedCounter: 1,
      damageFlash: 0,
      runEnded: false,
      hitstopTimer: 0,
      targets: [] as TargetEntity[],
      nextTargetId: 1,
      lastBuiltEnvSig: '',
      lastWeaponSig: '',
      lastRunSig: -1,
      hudSyncAccum: 0,
      titleOrbitAngle: 0,
    };

    const raycaster = new THREE.Raycaster();
    const keys = new Set<string>();
    let mouseDown = false;
    let mouseJustPressed = false;
    let rightMouseDown = false;
    let draggingLook = false;
    let lastPointerX = 0;
    let lastPointerY = 0;

    function getActiveWeapon() {
      const s = propsRef.current.saveData;
      const weaponId = s.equippedLoadout[s.activeSlotIndex] ?? s.equippedLoadout[0];
      return getWeaponById(weaponId);
    }

    function applyEnvironment(envId: EnvironmentId) {
      if (activeBuiltEnv) {
        scene.remove(activeBuiltEnv.group);
        activeBuiltEnv.group.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            m.geometry.dispose();
          }
        });
      }
      const def = ENVIRONMENT_MAP[envId];
      scene.background = new THREE.Color(def.horizonColor);
      scene.fog = new THREE.FogExp2(def.horizonColor, def.fogDensity);
      keyLight.color.setHex(def.sunColor);
      keyLight.intensity = def.sunIntensity;
      hemiLight.color.setHex(def.hemiSkyColor);
      hemiLight.groundColor.setHex(def.hemiGroundColor);
      hemiLight.intensity = def.hemiIntensity;

      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      activeBuiltEnv = buildEnvironment(envId, Math.min(8, maxAniso));
      scene.add(activeBuiltEnv.group);
      sim.lastBuiltEnvSig = envId;
    }

    function rebuildWeaponMeshes() {
      const s = propsRef.current.saveData;
      const weapon = getActiveWeapon();
      const skinId: WeaponSkinId =
        s.weaponSkins[weapon.id] ?? 'matte_obsidian';

      if (activeFpsWeapon) {
        viewmodelRoot.remove(activeFpsWeapon.root);
      }
      if (activeTpsWeapon) {
        tpsOperator.weaponMount.remove(activeTpsWeapon.root);
      }

      activeFpsWeapon = buildWeaponModel(weapon, skinId);
      viewmodelRoot.add(activeFpsWeapon.root);

      activeTpsWeapon = buildWeaponModel(weapon, skinId);
      activeTpsWeapon.root.scale.setScalar(0.95);
      tpsOperator.weaponMount.add(activeTpsWeapon.root);

      sim.lastWeaponSig = `${weapon.id}:${skinId}`;
    }

    function clearTargets() {
      for (const t of sim.targets) {
        scene.remove(t.root);
      }
      sim.targets = [];
    }

    function spawnTarget(behavior: TargetBehavior, minZ: number, maxZ: number, hp: number, speed: number) {
      const laneX = (Math.random() - 0.5) * 20;
      const z = -(minZ + Math.random() * Math.max(4, maxZ - minZ));
      const pos = new THREE.Vector3(laneX, 0, z);
      const t = createTargetEntity({
        id: sim.nextTargetId++,
        behavior,
        position: pos,
        hp,
        speed,
        amplitude: 2.2 + Math.random() * 2.5,
      });
      scene.add(t.root);
      sim.targets.push(t);
    }

    function populateWaveTargets() {
      clearTargets();
      const p = propsRef.current;
      const lvl = getLevelByNumber(p.levelNumber);

      if (p.mode === 'mission') {
        const activeCount = Math.min(7, Math.max(4, Math.ceil(lvl.targetCount * 0.45)));
        for (let i = 0; i < activeCount; i++) {
          const r = Math.random();
          let behavior: TargetBehavior = 'stationary';
          if (r < lvl.droneRatio) {
            behavior = i % 2 === 0 ? 'drone_orbiter' : 'drone_charger';
          } else if (r < lvl.droneRatio + lvl.popupRatio) {
            behavior = 'popup';
          } else if (r < lvl.droneRatio + lvl.popupRatio + lvl.movingRatio) {
            behavior = 'moving';
          }
          const hp =
            behavior.startsWith('drone')
              ? 80 + lvl.level * 1.4
              : 65 + lvl.level * 1.1;
          spawnTarget(behavior, lvl.minRange, lvl.maxRange, hp, lvl.targetSpeed);
        }
      } else if (p.mode === 'survival') {
        const count = Math.min(8, 3 + sim.wave);
        for (let i = 0; i < count; i++) {
          const behavior: TargetBehavior =
            i % 3 === 0
              ? 'drone_charger'
              : i % 2 === 0
                ? 'drone_orbiter'
                : 'moving';
          spawnTarget(
            behavior,
            14,
            34,
            85 + sim.wave * 24,
            1.8 + sim.wave * 0.35,
          );
        }
      } else if (p.mode === 'time_challenge') {
        for (let i = 0; i < 6; i++) {
          const behavior: TargetBehavior =
            i % 3 === 0 ? 'moving' : i % 3 === 1 ? 'popup' : 'stationary';
          spawnTarget(behavior, 10, 32, 70, 2.5);
        }
      } else {
        // Practice Mode: curated lanes (close, medium, moving, long)
        spawnTarget('stationary', 10, 14, 100, 0);
        spawnTarget('stationary', 18, 22, 100, 0);
        spawnTarget('moving', 16, 26, 100, 2.0);
        spawnTarget('popup', 20, 30, 100, 0);
        spawnTarget('stationary', 32, 42, 120, 0);
      }
    }

    function resetSimulation() {
      const p = propsRef.current;
      const lvl = getLevelByNumber(p.levelNumber);
      const envId = p.mode === 'mission' ? lvl.environmentId : p.environmentId;
      applyEnvironment(envId);
      rebuildWeaponMeshes();

      sim.playerPos.set(0, 0, 8);
      sim.playerVelY = 0;
      sim.grounded = true;
      sim.crouching = false;
      sim.yaw = 0;
      sim.pitch = 0;
      sim.recoilPitch = 0;
      sim.recoilYaw = 0;
      sim.trauma = 0;
      sim.adsBlend = 0;
      sim.scopeZoomIndex = 0;
      sim.fireCooldown = 0;
      sim.reloadTimer = 0;
      sim.isReloading = false;
      sim.weaponKick = 0;
      sim.muzzleTimer = 0;
      sim.playerHp = 100;
      sim.maxHp = 100;
      sim.score = 0;
      sim.kills = 0;
      sim.headshots = 0;
      sim.shotsFired = 0;
      sim.shotsHit = 0;
      sim.combo = 0;
      sim.comboTimer = 0;
      sim.elapsedSec = 0;
      sim.wave = 1;
      sim.damageFlash = 0;
      sim.hitmarkerType = 'none';
      sim.hitmarkerTimer = 0;
      sim.floatingFeed = null;
      sim.runEnded = false;
      sim.hitstopTimer = 0;

      if (p.mode === 'mission') {
        sim.timeLimitSec = lvl.timeLimitSec;
        sim.targetGoal = lvl.targetCount;
        sim.headshotQuota = lvl.headshotQuota;
      } else if (p.mode === 'time_challenge') {
        sim.timeLimitSec = 60;
        sim.targetGoal = 0;
        sim.headshotQuota = 0;
      } else {
        sim.timeLimitSec = 0;
        sim.targetGoal = 0;
        sim.headshotQuota = 0;
      }

      // Initialize ammo for all 3 loadout slots
      p.saveData.equippedLoadout.forEach((wId, idx) => {
        const w = getWeaponById(wId);
        const up = p.saveData.weaponUpgrades[wId] ?? DEFAULT_UPGRADES;
        const stats = getEffectiveWeaponStats(w, up);
        sim.slotAmmo[idx] = stats.magSize;
        sim.slotReserve[idx] = stats.reserveAmmo;
      });

      populateWaveTargets();
    }

    function startReload() {
      if (sim.isReloading) return;
      const slot = propsRef.current.saveData.activeSlotIndex;
      const weapon = getActiveWeapon();
      const up =
        propsRef.current.saveData.weaponUpgrades[weapon.id] ?? DEFAULT_UPGRADES;
      const stats = getEffectiveWeaponStats(weapon, up);
      if (sim.slotAmmo[slot] >= stats.magSize) return;
      if (propsRef.current.mode !== 'practice' && sim.slotReserve[slot] <= 0)
        return;

      sim.isReloading = true;
      sim.reloadTimer = stats.reloadTimeSec;
      sim.adsBlend = 0;
      sim.scopeZoomIndex = 0;
      soundEngine.playReload(stats.reloadTimeSec);
    }

    function finishReload() {
      const slot = propsRef.current.saveData.activeSlotIndex;
      const weapon = getActiveWeapon();
      const up =
        propsRef.current.saveData.weaponUpgrades[weapon.id] ?? DEFAULT_UPGRADES;
      const stats = getEffectiveWeaponStats(weapon, up);
      const needed = stats.magSize - sim.slotAmmo[slot];
      if (propsRef.current.mode === 'practice') {
        sim.slotAmmo[slot] = stats.magSize;
      } else {
        const take = Math.min(needed, sim.slotReserve[slot]);
        sim.slotAmmo[slot] += take;
        sim.slotReserve[slot] -= take;
      }
      sim.isReloading = false;
      sim.reloadTimer = 0;
    }

    function switchWeaponSlot(nextSlot: number) {
      const bounded = ((nextSlot % 3) + 3) % 3;
      if (bounded === propsRef.current.saveData.activeSlotIndex) return;
      sim.isReloading = false;
      sim.reloadTimer = 0;
      sim.scopeZoomIndex = 0;
      sim.adsBlend = 0;
      soundEngine.playSwitch();
      propsRef.current.onSlotChange(bounded);
    }

    function fireWeapon() {
      const slot = propsRef.current.saveData.activeSlotIndex;
      if (sim.isReloading || sim.fireCooldown > 0) return;

      const weapon = getActiveWeapon();
      const up =
        propsRef.current.saveData.weaponUpgrades[weapon.id] ?? DEFAULT_UPGRADES;
      const stats = getEffectiveWeaponStats(weapon, up);

      if (sim.slotAmmo[slot] <= 0) {
        soundEngine.playEmptyClick();
        sim.fireCooldown = 0.22;
        startReload();
        return;
      }

      sim.slotAmmo[slot] -= 1;
      sim.fireCooldown = stats.fireIntervalSec;
      sim.shotsFired += 1;
      sim.weaponKick = 1.0;
      sim.muzzleTimer = 0.055;
      sim.trauma = Math.min(1, sim.trauma + (weapon.category === 'sniper' || weapon.category === 'shotgun' ? 0.42 : 0.18));

      // Recoil kick
      const recoilMul = sim.adsBlend > 0.5 ? 0.72 : 1.0;
      sim.recoilPitch += stats.recoilPitch * recoilMul;
      sim.recoilYaw += (Math.random() - 0.5) * 2 * stats.recoilYaw * recoilMul;

      soundEngine.playFire(weapon.audioProfile);
      if (weapon.category !== 'shotgun' || weapon.id === 'tactical_shotgun') {
        soundEngine.playShellClink();
      }

      // World muzzle & ejection positions
      const activeModel =
        propsRef.current.cameraMode === 'fps' ? activeFpsWeapon : activeTpsWeapon;
      const muzzlePos = new THREE.Vector3();
      const ejectPos = new THREE.Vector3();
      if (activeModel) {
        activeModel.muzzlePoint.getWorldPosition(muzzlePos);
        activeModel.ejectionPort.getWorldPosition(ejectPos);
      } else {
        muzzlePos.copy(camera.position);
        ejectPos.copy(camera.position);
      }

      muzzleLight.position.copy(muzzlePos);
      muzzleLight.intensity = 4.5;
      muzzleFlashMesh.position.copy(muzzlePos);
      muzzleFlashMesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);

      // Eject brass shell casing + muzzle smoke
      const rightDir = _vecA.set(1, 0.35, 0).applyQuaternion(camera.quaternion);
      spawnParticle(
        'shell',
        ejectPos,
        rightDir.clone().multiplyScalar(2.4 + Math.random() * 0.9),
        0.95,
      );
      const fwdDir = _vecB.set(0, 0.25, -1).applyQuaternion(camera.quaternion);
      spawnParticle('smoke', muzzlePos, fwdDir.multiplyScalar(1.4), 0.38);

      // Perform ballistic raycast(s)
      const pellets = weapon.pellets ?? 1;
      const spread = THREE.MathUtils.lerp(
        stats.baseSpread,
        stats.adsSpread,
        sim.adsBlend,
      );

      const allTargetMeshes: THREE.Object3D[] = [];
      for (const t of sim.targets) {
        if (t.alive && t.popupState === 'up') {
          allTargetMeshes.push(...t.hitMeshes);
        }
      }

      let anyHit = false;
      let anyHeadshot = false;
      let totalHitScore = 0;

      for (let p = 0; p < pellets; p++) {
        _dir.set(
          (Math.random() - 0.5) * 2 * spread,
          (Math.random() - 0.5) * 2 * spread,
          -1,
        );
        _dir.normalize().applyQuaternion(camera.quaternion);
        raycaster.set(camera.position, _dir);
        raycaster.far = stats.rangeMeters;

        const targetHits = raycaster.intersectObjects(allTargetMeshes, false);
        const envHits = activeBuiltEnv
          ? raycaster.intersectObjects(activeBuiltEnv.occluders, false)
          : [];
        const nearestEnvDist = envHits.length > 0 ? envHits[0].distance : Infinity;

        if (targetHits.length > 0 && targetHits[0].distance < nearestEnvDist) {
          const hit = targetHits[0];
          const targetId = hit.object.userData.targetId as number;
          const isHead = Boolean(hit.object.userData.isHead);
          const target = sim.targets.find((t) => t.id === targetId);

          if (p === 0) {
            spawnTracer(muzzlePos, hit.point);
          }
          // Impact spark burst
          for (let s = 0; s < (pellets > 1 ? 2 : 5); s++) {
            spawnParticle(
              'spark',
              hit.point,
              new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                1.5 + Math.random() * 3,
                (Math.random() - 0.5) * 5,
              ),
              0.28,
            );
          }

          if (target && target.alive) {
            anyHit = true;
            if (isHead) anyHeadshot = true;
            const dmg = calculateBulletDamage({
              weapon,
              upgrades: up,
              distanceMeters: hit.distance,
              isHeadshot: isHead,
            });
            target.hp -= dmg;
            target.hitFlashTimer = 0.08;

            if (target.hp <= 0) {
              target.alive = false;
              target.koTimer = 0.42;
              sim.kills += 1;
              if (isHead) sim.headshots += 1;
              sim.combo += 1;
              sim.comboTimer = 4.5;
              sim.hitstopTimer = 0.032;

              const pts = calculateHitScore({
                isHeadshot: isHead,
                isKill: true,
                distanceMeters: hit.distance,
                combo: sim.combo,
              });
              totalHitScore += pts;
              sim.score += pts;

              // Explosion spark burst on kill
              for (let s = 0; s < 10; s++) {
                spawnParticle(
                  'spark',
                  hit.point,
                  new THREE.Vector3(
                    (Math.random() - 0.5) * 7,
                    2 + Math.random() * 4,
                    (Math.random() - 0.5) * 7,
                  ),
                  0.45,
                );
              }
            } else {
              const pts = calculateHitScore({
                isHeadshot: isHead,
                isKill: false,
                distanceMeters: hit.distance,
                combo: Math.max(1, sim.combo),
              });
              totalHitScore += pts;
              sim.score += pts;
            }
          }
        } else if (envHits.length > 0) {
          const hit = envHits[0];
          if (p === 0) spawnTracer(muzzlePos, hit.point);
          for (let s = 0; s < 3; s++) {
            spawnParticle(
              'spark',
              hit.point,
              new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                1 + Math.random() * 2.5,
                (Math.random() - 0.5) * 4,
              ),
              0.22,
            );
          }
        } else if (p === 0) {
          const endPt = camera.position.clone().add(_dir.clone().multiplyScalar(55));
          spawnTracer(muzzlePos, endPt);
        }
      }

      if (anyHit) {
        sim.shotsHit += 1;
        sim.hitmarkerType = anyHeadshot ? 'head' : 'body';
        sim.hitmarkerTimer = 0.16;
        soundEngine.playHitmarker(anyHeadshot);
        sim.floatingFeed = {
          id: sim.feedCounter++,
          text: `${anyHeadshot ? 'HEADSHOT' : 'HIT'} +${totalHitScore}`,
          isHead: anyHeadshot,
        };
        sim.floatingTimer = 0.75;
      }

      if (sim.slotAmmo[slot] <= 0) {
        startReload();
      }
    }

    function finishRunNow() {
      if (sim.runEnded) return;
      sim.runEnded = true;
      document.exitPointerLock?.();
      propsRef.current.onRunComplete({
        kills: sim.kills,
        headshots: sim.headshots,
        shotsFired: sim.shotsFired,
        shotsHit: sim.shotsHit,
        score: sim.score,
        elapsedSec: sim.elapsedSec,
        playerHp: sim.playerHp,
        waveReached: sim.wave,
      });
    }

    // Input event handlers
    const onKeyDown = (e: KeyboardEvent) => {
      if (propsRef.current.gameState !== 'playing') return;
      keys.add(e.code);

      if (e.code === 'KeyR') startReload();
      if (e.code === 'Digit1') switchWeaponSlot(0);
      if (e.code === 'Digit2') switchWeaponSlot(1);
      if (e.code === 'Digit3') switchWeaponSlot(2);
      if (e.code === 'KeyQ')
        switchWeaponSlot(propsRef.current.saveData.activeSlotIndex + 1);
      if (e.code === 'KeyC' || e.code === 'ControlLeft') {
        sim.crouching = !sim.crouching;
      }
      if (e.code === 'Space' && sim.grounded) {
        sim.playerVelY = 6.2;
        sim.grounded = false;
      }
      if (e.code === 'KeyZ') {
        actionQueueRef.current.push('scope');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (propsRef.current.gameState !== 'playing') return;
      if (e.target !== renderer.domElement) return;
      if (e.button === 0) {
        mouseDown = true;
        mouseJustPressed = true;
        draggingLook = true;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
      } else if (e.button === 2) {
        rightMouseDown = true;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        mouseDown = false;
        draggingLook = false;
      } else if (e.button === 2) {
        rightMouseDown = false;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (propsRef.current.gameState !== 'playing') return;
      const sens =
        0.0022 *
        propsRef.current.saveData.settings.lookSensitivity *
        (sim.adsBlend > 0.5
          ? propsRef.current.saveData.settings.adsSensitivity
          : 1);

      if (document.pointerLockElement === renderer.domElement) {
        sim.yaw -= e.movementX * sens;
        sim.pitch = THREE.MathUtils.clamp(
          sim.pitch - e.movementY * sens,
          -1.2,
          1.2,
        );
      } else if (draggingLook) {
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        sim.yaw -= dx * sens * 1.4;
        sim.pitch = THREE.MathUtils.clamp(
          sim.pitch - dy * sens * 1.4,
          -1.2,
          1.2,
        );
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      if (e.target === renderer.domElement) e.preventDefault();
    };

    const clearHeldInputs = () => {
      keys.clear();
      mouseDown = false;
      rightMouseDown = false;
      draggingLook = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('blur', clearHeldInputs);

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    const resizeObs = new ResizeObserver(onResize);
    resizeObs.observe(container);

    // Initial environment & weapon setup
    resetSimulation();
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Frame loop with software-WebGL pacing
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function stepSimulation(dt: number) {
      const p = propsRef.current;

      // Sync environment or weapon if user switched in menu/armory
      if (sim.lastRunSig !== resetRunSignalRef.current) {
        sim.lastRunSig = resetRunSignalRef.current;
        resetSimulation();
      } else {
        const targetEnv =
          p.mode === 'mission'
            ? getLevelByNumber(p.levelNumber).environmentId
            : p.environmentId;
        if (sim.lastBuiltEnvSig !== targetEnv) {
          applyEnvironment(targetEnv);
        }
        const activeW = getActiveWeapon();
        const activeSkin = p.saveData.weaponSkins[activeW.id] ?? 'matte_obsidian';
        if (sim.lastWeaponSig !== `${activeW.id}:${activeSkin}`) {
          rebuildWeaponMeshes();
        }
      }

      // Shadow toggling based on graphics setting (never on software GL)
      renderer.shadowMap.enabled =
        !isSoftwareGl && p.graphicsQuality !== 'low';

      if (p.gameState === 'title') {
        viewmodelRoot.visible = false;
        tpsOperator.root.visible = false;
        sim.titleOrbitAngle += dt * 0.16;
        camera.fov = 58;
        camera.updateProjectionMatrix();
        camera.position.set(
          Math.sin(sim.titleOrbitAngle) * 14,
          4.2 + Math.sin(sim.titleOrbitAngle * 0.7) * 0.6,
          10 + Math.cos(sim.titleOrbitAngle) * 4,
        );
        camera.lookAt(0, 1.8, -18);
        return;
      }

      if (p.gameState !== 'playing' || sim.runEnded) {
        return;
      }

      // Process queued HUD button actions
      while (actionQueueRef.current.length > 0) {
        const act = actionQueueRef.current.shift()!;
        if (act === 'reload') startReload();
        else if (act === 'jump' && sim.grounded) {
          sim.playerVelY = 6.2;
          sim.grounded = false;
        } else if (act === 'crouch') {
          sim.crouching = !sim.crouching;
        } else if (act === 'switch') {
          switchWeaponSlot(p.saveData.activeSlotIndex + 1);
        } else if (act === 'scope') {
          const w = getActiveWeapon();
          if (w.hasScope && w.scopeZoomLevels && w.scopeZoomLevels.length > 0) {
            sim.scopeZoomIndex =
              (sim.scopeZoomIndex + 1) % (w.scopeZoomLevels.length + 1);
          }
        }
      }

      // Hitstop freeze for heavy kills
      if (sim.hitstopTimer > 0) {
        sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
        return;
      }

      const touch = touchInputRef.current;
      const weapon = getActiveWeapon();
      const up = p.saveData.weaponUpgrades[weapon.id] ?? DEFAULT_UPGRADES;
      const stats = getEffectiveWeaponStats(weapon, up);

      // Apply touch look deltas
      const sens =
        0.004 *
        p.saveData.settings.lookSensitivity *
        (sim.adsBlend > 0.5 ? p.saveData.settings.adsSensitivity : 1);
      if (touch.lookDeltaX !== 0 || touch.lookDeltaY !== 0) {
        sim.yaw -= touch.lookDeltaX * sens;
        sim.pitch = THREE.MathUtils.clamp(
          sim.pitch - touch.lookDeltaY * sens,
          -1.2,
          1.2,
        );
        touch.lookDeltaX = 0;
        touch.lookDeltaY = 0;
      }

      // Player movement (WASD + Arrows + Touch Joystick)
      let moveX =
        (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) +
        touch.moveX;
      let moveZ =
        (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
        (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) +
        touch.moveY;

      const mag = Math.hypot(moveX, moveZ);
      if (mag > 1) {
        moveX /= mag;
        moveZ /= mag;
      }

      const speed =
        (sim.crouching ? 3.2 : 5.6) *
        stats.mobility *
        (sim.adsBlend > 0.5 ? 0.72 : 1.0);

      const sinY = Math.sin(sim.yaw);
      const cosY = Math.cos(sim.yaw);
      // Forward is (-sinY, 0, -cosY), Right is (cosY, 0, -sinY)
      const dx = (-sinY * moveZ + cosY * moveX) * speed * dt;
      const dz = (-cosY * moveZ - sinY * moveX) * speed * dt;

      if (mag > 0.05 && sim.grounded) {
        sim.walkDist += Math.hypot(dx, dz);
      }

      const bounds = activeBuiltEnv?.playBounds ?? {
        minX: -15,
        maxX: 15,
        minZ: -52,
        maxZ: 12,
      };

      const nextX = THREE.MathUtils.clamp(sim.playerPos.x + dx, bounds.minX, bounds.maxX);
      const nextZ = THREE.MathUtils.clamp(sim.playerPos.z + dz, bounds.minZ, bounds.maxZ);

      // Simple AABB obstacle pushout
      let blockedX = false;
      let blockedZ = false;
      const r = 0.5;
      if (activeBuiltEnv) {
        for (const ob of activeBuiltEnv.obstacles) {
          if (
            nextX + r > ob.minX &&
            nextX - r < ob.maxX &&
            sim.playerPos.z + r > ob.minZ &&
            sim.playerPos.z - r < ob.maxZ
          ) {
            blockedX = true;
          }
          if (
            sim.playerPos.x + r > ob.minX &&
            sim.playerPos.x - r < ob.maxX &&
            nextZ + r > ob.minZ &&
            nextZ - r < ob.maxZ
          ) {
            blockedZ = true;
          }
        }
      }
      if (!blockedX) sim.playerPos.x = nextX;
      if (!blockedZ) sim.playerPos.z = nextZ;

      // Vertical jump & gravity
      if (!sim.grounded || sim.playerVelY !== 0) {
        sim.playerPos.y += sim.playerVelY * dt;
        sim.playerVelY -= 18 * dt;
        if (sim.playerPos.y <= 0) {
          sim.playerPos.y = 0;
          sim.playerVelY = 0;
          sim.grounded = true;
        }
      }

      // ADS & Scope FOV damping
      const wantAds =
        (rightMouseDown || touch.aiming || sim.scopeZoomIndex > 0) &&
        !sim.isReloading;
      sim.adsBlend = THREE.MathUtils.damp(
        sim.adsBlend,
        wantAds ? 1 : 0,
        14,
        dt,
      );

      let targetFov = 68;
      if (wantAds) {
        if (
          weapon.hasScope &&
          sim.scopeZoomIndex > 0 &&
          weapon.scopeZoomLevels
        ) {
          const zoom =
            weapon.scopeZoomLevels[
              Math.min(sim.scopeZoomIndex - 1, weapon.scopeZoomLevels.length - 1)
            ];
          targetFov = Math.max(8, 68 / zoom);
        } else {
          targetFov = stats.adsFov;
        }
      }
      camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 12, dt);
      camera.updateProjectionMatrix();

      // Decay recoil & camera trauma
      sim.recoilPitch = THREE.MathUtils.damp(sim.recoilPitch, 0, 10, dt);
      sim.recoilYaw = THREE.MathUtils.damp(sim.recoilYaw, 0, 10, dt);
      sim.trauma = Math.max(0, sim.trauma - dt * 2.4);
      sim.weaponKick = THREE.MathUtils.damp(sim.weaponKick, 0, 18, dt);

      // Cooldowns & reload
      sim.fireCooldown = Math.max(0, sim.fireCooldown - dt);
      if (sim.isReloading) {
        sim.reloadTimer -= dt;
        if (sim.reloadTimer <= 0) {
          finishReload();
        }
      }

      // Firing logic (auto vs tap)
      const isAuto = weapon.fireMode === 'auto';
      const triggerActive = isAuto
        ? mouseDown || touch.firing
        : mouseJustPressed || touch.justFired;
      mouseJustPressed = false;
      touch.justFired = false;

      if (triggerActive) {
        fireWeapon();
      }

      // Muzzle flash fade
      if (sim.muzzleTimer > 0) {
        sim.muzzleTimer -= dt;
        muzzleFlashMesh.visible = true;
        flashMat.opacity = Math.min(1, sim.muzzleTimer * 18);
      } else {
        muzzleFlashMesh.visible = false;
        muzzleLight.intensity = THREE.MathUtils.damp(muzzleLight.intensity, 0, 24, dt);
      }

      // Camera positioning (FPS vs TPS)
      const eyeHeight = sim.crouching ? 1.15 : 1.65;
      const shakeAmt = sim.trauma * sim.trauma * 0.035;
      const shakeX = (Math.random() - 0.5) * shakeAmt;
      const shakeY = (Math.random() - 0.5) * shakeAmt;

      _euler.set(
        THREE.MathUtils.clamp(sim.pitch + sim.recoilPitch + shakeY, -1.3, 1.3),
        sim.yaw + sim.recoilYaw + shakeX,
        0,
        'YXZ',
      );
      camera.quaternion.setFromEuler(_euler);

      const isSniperScoped =
        Boolean(weapon.hasScope) &&
        weapon.category === 'sniper' &&
        sim.adsBlend > 0.65;

      if (p.cameraMode === 'fps') {
        tpsOperator.root.visible = false;
        viewmodelRoot.visible = !isSniperScoped;

        const bobY = Math.sin(sim.walkDist * 2.6) * 0.018 * (1 - sim.adsBlend * 0.7);
        const bobX = Math.cos(sim.walkDist * 1.3) * 0.014 * (1 - sim.adsBlend * 0.7);

        camera.position.set(
          sim.playerPos.x,
          sim.playerPos.y + eyeHeight + bobY,
          sim.playerPos.z,
        );

        if (activeFpsWeapon) {
          _vecA.lerpVectors(
            activeFpsWeapon.hipOffset,
            activeFpsWeapon.adsOffset,
            sim.adsBlend,
          );
          const reloadDrop = sim.isReloading
            ? Math.sin((1 - sim.reloadTimer / stats.reloadTimeSec) * Math.PI) * 0.14
            : 0;
          activeFpsWeapon.root.position.set(
            _vecA.x + bobX * 0.4,
            _vecA.y - reloadDrop + bobY * 0.3,
            _vecA.z + sim.weaponKick * 0.045,
          );
          activeFpsWeapon.root.rotation.set(
            sim.weaponKick * 0.12 - (sim.isReloading ? 0.35 : 0),
            0,
            sim.isReloading ? 0.25 : 0,
          );
          // Slide blowback & mag drop animation
          activeFpsWeapon.slideOrBolt.position.z = sim.weaponKick * 0.045;
          activeFpsWeapon.magazine.position.y = sim.isReloading ? -reloadDrop * 1.1 : 0;
        }
      } else {
        // Third-Person (TPS) Mode
        viewmodelRoot.visible = false;
        tpsOperator.root.visible = true;
        tpsOperator.root.position.copy(sim.playerPos);
        tpsOperator.root.rotation.y = sim.yaw;
        tpsOperator.root.scale.y = sim.crouching ? 0.76 : 1.0;

        // Walk leg swing
        const stride = Math.sin(sim.walkDist * 2.6) * 0.45;
        tpsOperator.leftLeg.rotation.x = stride;
        tpsOperator.rightLeg.rotation.x = -stride;
        tpsOperator.rightArmPivot.rotation.x = THREE.MathUtils.clamp(
          sim.pitch + sim.recoilPitch,
          -0.8,
          0.8,
        );

        // Over-the-shoulder camera with wall pull-in raycast
        const shoulderOffset = _vecA
          .set(0.68, 0.25, sim.adsBlend > 0.5 ? 1.85 : 2.85)
          .applyQuaternion(camera.quaternion);
        const pivot = _vecB.set(
          sim.playerPos.x,
          sim.playerPos.y + eyeHeight - 0.18,
          sim.playerPos.z,
        );
        const desiredCam = pivot.clone().add(shoulderOffset);

        if (activeBuiltEnv) {
          _vecC.subVectors(desiredCam, pivot);
          const dist = _vecC.length();
          _vecC.normalize();
          raycaster.set(pivot, _vecC);
          raycaster.far = dist;
          const wallHit = raycaster.intersectObjects(activeBuiltEnv.occluders, false);
          if (wallHit.length > 0 && wallHit[0].distance < dist) {
            desiredCam.copy(pivot).addScaledVector(_vecC, Math.max(0.6, wallHit[0].distance - 0.25));
          }
        }
        camera.position.lerp(desiredCam, 1 - Math.exp(-16 * dt));
      }

      // Update pooled particles & tracers
      for (const pt of particles) {
        if (!pt.active) continue;
        pt.life -= dt;
        if (pt.life <= 0) {
          pt.active = false;
          pt.mesh.visible = false;
          continue;
        }
        pt.vel.y -= pt.gravity * dt;
        pt.mesh.position.addScaledVector(pt.vel, dt);
        if (pt.mesh.position.y < 0.02) {
          pt.mesh.position.y = 0.02;
          pt.vel.y *= -0.35;
          pt.vel.x *= 0.6;
          pt.vel.z *= 0.6;
        }
        pt.mesh.rotation.x += pt.spin.x * dt;
        pt.mesh.rotation.y += pt.spin.y * dt;
        if (pt.gravity < 0) {
          // Smoke expands & fades
          const s = 1 + (1 - pt.life / pt.maxLife) * 2.2;
          pt.mesh.scale.setScalar(s);
        }
      }

      for (const tr of tracers) {
        if (!tr.active) continue;
        tr.life -= dt;
        if (tr.life <= 0) {
          tr.active = false;
          tr.line.visible = false;
        }
      }

      // Update targets & drone combat AI
      let activeAttackers = 0;
      for (let i = sim.targets.length - 1; i >= 0; i--) {
        const t = sim.targets[i];
        if (t.hitFlashTimer > 0) {
          t.hitFlashTimer -= dt;
          for (const m of t.bodyMaterials) {
            m.emissive.setHex(t.hitFlashTimer > 0 ? 0xffffff : 0x000000);
          }
        }
        if (!t.alive) {
          t.koTimer -= dt;
          t.root.rotation.x = THREE.MathUtils.lerp(
            t.root.rotation.x,
            -Math.PI / 2,
            1 - Math.exp(-14 * dt),
          );
          if (t.koTimer <= 0) {
            scene.remove(t.root);
            sim.targets.splice(i, 1);
          }
          continue;
        }

        t.phase += dt * t.moveSpeed;
        if (t.behavior === 'moving') {
          t.root.position.x = t.basePos.x + Math.sin(t.phase) * t.moveAmplitude;
        } else if (t.behavior === 'popup') {
          t.popupTimer -= dt;
          if (t.popupTimer <= 0) {
            t.popupState = t.popupState === 'up' ? 'down' : 'up';
            t.popupTimer = t.popupState === 'up' ? 2.6 : 1.4;
          }
          const targetY = t.popupState === 'up' ? 0 : -1.85;
          t.root.position.y = THREE.MathUtils.damp(t.root.position.y, targetY, 12, dt);
        } else if (t.behavior === 'drone_orbiter' || t.behavior === 'drone_charger') {
          if (t.rotorMeshes) {
            for (const blade of t.rotorMeshes) {
              blade.rotation.y += dt * 28;
            }
          }
          if (t.behavior === 'drone_orbiter') {
            t.root.position.x = t.basePos.x + Math.sin(t.phase * 0.9) * (t.moveAmplitude + 1.5);
            t.root.position.y = Math.sin(t.phase * 1.7) * 0.35;
          } else {
            // Charger closes distance slowly while weaving
            const toPlayerZ = sim.playerPos.z - t.root.position.z;
            if (toPlayerZ > 7.5) {
              t.root.position.z += dt * Math.min(2.4, t.moveSpeed * 0.55);
            }
            t.root.position.x = THREE.MathUtils.damp(
              t.root.position.x,
              sim.playerPos.x + Math.sin(t.phase) * 2.5,
              1.6,
              dt,
            );
          }
          t.root.lookAt(sim.playerPos.x, t.root.position.y, sim.playerPos.z);

          // Telegraphed attack with crowd token cap (<= 3 concurrent attackers)
          if (t.telegraphTimer > 0) {
            activeAttackers++;
            t.telegraphTimer -= dt;
            if (t.telegraphRing) {
              const mat = t.telegraphRing.material as THREE.MeshBasicMaterial;
              mat.opacity = 0.85;
              const s = 1 + (0.65 - t.telegraphTimer) * 0.8;
              t.telegraphRing.scale.setScalar(s);
            }
            if (t.telegraphTimer <= 0) {
              if (t.telegraphRing) {
                (t.telegraphRing.material as THREE.MeshBasicMaterial).opacity = 0;
              }
              t.attackCooldown = 2.6 + Math.random() * 1.8;
              // Deal damage to player
              sim.playerHp = Math.max(0, sim.playerHp - 12);
              sim.damageFlash = 1.0;
              sim.trauma = Math.min(1, sim.trauma + 0.35);
              soundEngine.playDamageTaken();
            }
          } else {
            t.attackCooldown -= dt;
            if (t.attackCooldown <= 0 && activeAttackers < 3) {
              t.telegraphTimer = 0.65;
              activeAttackers++;
            }
          }
        }
      }

      // Respawn targets / wave progression / win-loss evaluation
      sim.elapsedSec += dt;
      if (sim.comboTimer > 0) {
        sim.comboTimer -= dt;
        if (sim.comboTimer <= 0) sim.combo = 0;
      }
      if (sim.hitmarkerTimer > 0) {
        sim.hitmarkerTimer -= dt;
        if (sim.hitmarkerTimer <= 0) sim.hitmarkerType = 'none';
      }
      if (sim.floatingTimer > 0) {
        sim.floatingTimer -= dt;
        if (sim.floatingTimer <= 0) sim.floatingFeed = null;
      }
      if (sim.damageFlash > 0) {
        sim.damageFlash = Math.max(0, sim.damageFlash - dt * 2.6);
      }

      if (sim.playerHp <= 0) {
        finishRunNow();
        return;
      }

      if (p.mode === 'mission') {
        const lvl = getLevelByNumber(p.levelNumber);
        const remainingToSpawn = lvl.targetCount - sim.kills - sim.targets.length;
        if (remainingToSpawn > 0 && sim.targets.length < 6) {
          const r = Math.random();
          let behavior: TargetBehavior = 'stationary';
          if (r < lvl.droneRatio) behavior = 'drone_orbiter';
          else if (r < lvl.droneRatio + lvl.popupRatio) behavior = 'popup';
          else if (r < lvl.droneRatio + lvl.popupRatio + lvl.movingRatio)
            behavior = 'moving';
          spawnTarget(
            behavior,
            lvl.minRange,
            lvl.maxRange,
            65 + lvl.level * 1.1,
            lvl.targetSpeed,
          );
        }
        if (sim.kills >= lvl.targetCount || sim.elapsedSec >= lvl.timeLimitSec) {
          finishRunNow();
          return;
        }
      } else if (p.mode === 'time_challenge') {
        while (sim.targets.length < 6) {
          const behaviors: TargetBehavior[] = ['stationary', 'moving', 'popup'];
          const b = behaviors[Math.floor(Math.random() * behaviors.length)];
          spawnTarget(b, 10, 34, 70, 2.6);
        }
        if (sim.elapsedSec >= 60) {
          finishRunNow();
          return;
        }
      } else if (p.mode === 'survival') {
        if (sim.targets.length === 0) {
          sim.wave += 1;
          sim.playerHp = Math.min(sim.maxHp, sim.playerHp + 20);
          populateWaveTargets();
        }
      } else {
        // Practice Mode keeps 5 targets populated
        while (sim.targets.length < 5) {
          const behaviors: TargetBehavior[] = ['stationary', 'moving', 'popup'];
          const b = behaviors[sim.targets.length % behaviors.length];
          spawnTarget(b, 10, 38, 100, 2.0);
        }
      }

      // Throttled HUD sync (~15Hz)
      sim.hudSyncAccum += dt;
      if (sim.hudSyncAccum >= 0.06) {
        sim.hudSyncAccum = 0;
        const slot = p.saveData.activeSlotIndex;
        const zoomLabel =
          weapon.hasScope && sim.scopeZoomIndex > 0 && weapon.scopeZoomLevels
            ? `${weapon.scopeZoomLevels[Math.min(sim.scopeZoomIndex - 1, weapon.scopeZoomLevels.length - 1)]}x`
            : '1x';
        p.onHudUpdate({
          ammoInMag: sim.slotAmmo[slot] ?? 0,
          reserveAmmo: p.mode === 'practice' ? 999 : (sim.slotReserve[slot] ?? 0),
          magSize: stats.magSize,
          isReloading: sim.isReloading,
          reloadProgress: sim.isReloading
            ? Math.max(0, 1 - sim.reloadTimer / stats.reloadTimeSec)
            : 0,
          isAds: wantAds,
          scopeZoomIndex: sim.scopeZoomIndex,
          scopeZoomLabel: zoomLabel,
          isSniperScoped,
          playerHp: Math.round(sim.playerHp),
          maxHp: sim.maxHp,
          score: Math.round(sim.score),
          kills: sim.kills,
          targetGoal: sim.targetGoal,
          headshots: sim.headshots,
          headshotQuota: sim.headshotQuota,
          shotsFired: sim.shotsFired,
          shotsHit: sim.shotsHit,
          combo: sim.combo,
          timeRemainingSec:
            sim.timeLimitSec > 0
              ? Math.max(0, Math.ceil(sim.timeLimitSec - sim.elapsedSec))
              : 0,
          elapsedSec: sim.elapsedSec,
          wave: sim.wave,
          activeWeaponId: weapon.id,
          activeSlotIndex: slot,
          cameraMode: p.cameraMode,
          hitmarkerType: sim.hitmarkerType,
          floatingFeed: sim.floatingFeed,
          damageFlash: sim.damageFlash,
          crosshairSpreadPx: Math.round(
            THREE.MathUtils.lerp(18, 4, sim.adsBlend) + sim.weaponKick * 16,
          ),
        });
      }
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      stepSimulation(dt);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    stepSimulation(0.016);
    if (isSoftwareGl) {
      renderer.render(scene, camera);
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObs.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('blur', clearHeldInputs);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="game-canvas-container"
      className="fixed inset-0 w-full h-full bg-zinc-950"
    />
  );
};
