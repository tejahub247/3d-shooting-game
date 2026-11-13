import * as THREE from 'three';
import { createTargetPlateTexture } from './textures';

export type TargetBehavior = 'stationary' | 'moving' | 'popup' | 'drone_orbiter' | 'drone_charger';

export interface TargetEntity {
  id: number;
  root: THREE.Group;
  hitMeshes: THREE.Object3D[];
  behavior: TargetBehavior;
  hp: number;
  maxHp: number;
  alive: boolean;
  koTimer: number;
  hitFlashTimer: number;
  basePos: THREE.Vector3;
  moveAmplitude: number;
  moveSpeed: number;
  phase: number;
  popupState: 'up' | 'down';
  popupTimer: number;
  attackCooldown: number;
  telegraphTimer: number;
  telegraphRing?: THREE.Mesh;
  rotorMeshes?: THREE.Object3D[];
  bodyMaterials: THREE.MeshStandardMaterial[];
}

let sharedPlateTex: THREE.CanvasTexture | null = null;

function getPlateTexture(): THREE.CanvasTexture {
  if (!sharedPlateTex) {
    sharedPlateTex = createTargetPlateTexture();
  }
  return sharedPlateTex;
}

export function createTargetEntity(params: {
  id: number;
  behavior: TargetBehavior;
  position: THREE.Vector3;
  hp: number;
  speed: number;
  amplitude: number;
}): TargetEntity {
  const root = new THREE.Group();
  root.position.copy(params.position);

  const hitMeshes: THREE.Object3D[] = [];
  const bodyMaterials: THREE.MeshStandardMaterial[] = [];
  const rotorMeshes: THREE.Object3D[] = [];
  let telegraphRing: THREE.Mesh | undefined;

  const standMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    metalness: 0.75,
    roughness: 0.35,
  });

  const isDrone =
    params.behavior === 'drone_orbiter' || params.behavior === 'drone_charger';

  if (isDrone) {
    // 6-part composite Hostile Tactical Drone
    const armorMat = new THREE.MeshStandardMaterial({
      color: params.behavior === 'drone_charger' ? 0x991b1b : 0x334155,
      metalness: 0.72,
      roughness: 0.32,
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.85,
      metalness: 0.3,
      roughness: 0.25,
    });
    bodyMaterials.push(armorMat, coreMat);

    // Central armored chassis
    const hull = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.32, 0.34, 8),
      armorMat,
    );
    hull.position.y = 1.85;
    hull.castShadow = true;
    hull.userData = { targetId: params.id, isHead: false };
    root.add(hull);
    hitMeshes.push(hull);

    // Head / Sensor dome (Headshot zone)
    const sensorDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 12),
      coreMat,
    );
    sensorDome.position.set(0, 2.15, 0.08);
    sensorDome.castShadow = true;
    sensorDome.userData = { targetId: params.id, isHead: true };
    root.add(sensorDome);
    hitMeshes.push(sensorDome);

    // 4 rotor arms + spinning blades
    const offsets = [
      [-0.55, 1.98, -0.45],
      [0.55, 1.98, -0.45],
      [-0.55, 1.98, 0.45],
      [0.55, 1.98, 0.45],
    ];
    offsets.forEach(([ox, oy, oz]) => {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.06, 0.08),
        standMat,
      );
      arm.position.set(ox * 0.55, oy - 0.05, oz * 0.55);
      arm.lookAt(ox, oy, oz);
      root.add(arm);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.015, 0.06),
        standMat,
      );
      blade.position.set(ox, oy + 0.04, oz);
      root.add(blade);
      rotorMeshes.push(blade);
    });

    // Attack telegraph ring around sensor eye
    const ringGeo = new THREE.RingGeometry(0.28, 0.38, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    telegraphRing = new THREE.Mesh(ringGeo, ringMat);
    telegraphRing.position.set(0, 2.15, 0.34);
    root.add(telegraphRing);
  } else {
    // Grounded Tactical Silhouette / Bullseye Range Target (5-part composite)
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: getPlateTexture(),
      roughness: 0.72,
      metalness: 0.1,
    });
    const headPlateMat = new THREE.MeshStandardMaterial({
      color: params.behavior === 'moving' ? 0xf59e0b : 0xef4444,
      roughness: 0.45,
      metalness: 0.35,
    });
    bodyMaterials.push(plateMat, headPlateMat);

    // Base pedestal (grounded at y=0)
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.08, 0.65),
      standMat,
    );
    base.position.y = 0.04;
    base.castShadow = true;
    base.receiveShadow = true;
    root.add(base);

    // Twin upright steel posts
    const postL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 1.35, 8),
      standMat,
    );
    postL.position.set(-0.24, 0.72, 0);
    root.add(postL);
    const postR = postL.clone();
    postR.position.x = 0.24;
    root.add(postR);

    // Torso target plate
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.92, 0.08),
      plateMat,
    );
    torso.position.y = 1.28;
    torso.castShadow = true;
    torso.userData = { targetId: params.id, isHead: false };
    root.add(torso);
    hitMeshes.push(torso);

    // Headshot plate
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.09, 16),
      headPlateMat,
    );
    head.rotation.x = Math.PI / 2;
    head.position.y = 1.96;
    head.castShadow = true;
    head.userData = { targetId: params.id, isHead: true };
    root.add(head);
    hitMeshes.push(head);

    // Optional rail bar underneath for moving targets
    if (params.behavior === 'moving') {
      const railAccent = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.12, 0.22),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          metalness: 0.5,
          roughness: 0.4,
        }),
      );
      railAccent.position.y = 0.1;
      root.add(railAccent);
    }
  }

  return {
    id: params.id,
    root,
    hitMeshes,
    behavior: params.behavior,
    hp: params.hp,
    maxHp: params.hp,
    alive: true,
    koTimer: 0,
    hitFlashTimer: 0,
    basePos: params.position.clone(),
    moveAmplitude: params.amplitude,
    moveSpeed: params.speed,
    phase: Math.random() * Math.PI * 2,
    popupState: 'up',
    popupTimer: 1.5 + Math.random() * 2.5,
    attackCooldown: 2.2 + Math.random() * 2.0,
    telegraphTimer: 0,
    telegraphRing,
    rotorMeshes,
    bodyMaterials,
  };
}

export interface ThirdPersonOperator {
  root: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  weaponMount: THREE.Group;
}

export function createThirdPersonOperator(): ThirdPersonOperator {
  const root = new THREE.Group();

  const suitMat = new THREE.MeshStandardMaterial({
    color: 0x2a313b,
    roughness: 0.78,
    metalness: 0.1,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: 0x3b4238,
    roughness: 0.65,
    metalness: 0.2,
  });
  const helmetMat = new THREE.MeshStandardMaterial({
    color: 0x1e242b,
    roughness: 0.45,
    metalness: 0.45,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0x78350f,
    emissiveIntensity: 0.35,
    roughness: 0.15,
    metalness: 0.8,
  });

  // Legs (grounded at y=0)
  const legGeo = new THREE.BoxGeometry(0.18, 0.78, 0.2);
  const leftLeg = new THREE.Mesh(legGeo, suitMat);
  leftLeg.position.set(-0.13, 0.39, 0);
  leftLeg.castShadow = true;
  root.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, suitMat);
  rightLeg.position.set(0.13, 0.39, 0);
  rightLeg.castShadow = true;
  root.add(rightLeg);

  // Torso + tactical plate carrier
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.26), suitMat);
  torso.position.set(0, 1.09, 0);
  torso.castShadow = true;
  root.add(torso);

  const plateCarrier = new THREE.Mesh(
    new THREE.BoxGeometry(0.49, 0.46, 0.3),
    vestMat,
  );
  plateCarrier.position.set(0, 1.12, 0);
  plateCarrier.castShadow = true;
  root.add(plateCarrier);

  // Helmet & Visor
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), helmetMat);
  head.position.set(0, 1.58, 0);
  head.castShadow = true;
  root.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.05), visorMat);
  visor.position.set(0, 1.59, -0.135);
  root.add(visor);

  // Left support arm
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.48, 0.14), suitMat);
  leftArm.position.set(-0.28, 1.15, -0.18);
  leftArm.rotation.x = Math.PI / 3;
  leftArm.rotation.z = -0.35;
  leftArm.castShadow = true;
  root.add(leftArm);

  // Right arm pivot + weapon mount
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.27, 1.28, -0.05);
  const rightArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.46, 0.14),
    suitMat,
  );
  rightArm.position.set(0, -0.05, -0.2);
  rightArm.rotation.x = Math.PI / 2;
  rightArm.castShadow = true;
  rightArmPivot.add(rightArm);

  const weaponMount = new THREE.Group();
  weaponMount.position.set(-0.06, -0.02, -0.45);
  rightArmPivot.add(weaponMount);

  root.add(rightArmPivot);

  return {
    root,
    rightArmPivot,
    leftLeg,
    rightLeg,
    weaponMount,
  };
}
