import * as THREE from 'three';
import { ENVIRONMENT_MAP, EnvironmentId } from '../game/levels';
import { createCrateTexture, createGroundTexture } from './textures';

export interface BoxObstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY: number;
  mesh: THREE.Object3D;
}

export interface BuiltEnvironment {
  group: THREE.Group;
  obstacles: BoxObstacle[];
  occluders: THREE.Object3D[];
  playBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export function buildEnvironment(
  envId: EnvironmentId,
  anisotropy = 4,
): BuiltEnvironment {
  const def = ENVIRONMENT_MAP[envId];
  const group = new THREE.Group();
  const obstacles: BoxObstacle[] = [];
  const occluders: THREE.Object3D[] = [];

  const groundBaseHex = '#' + def.groundColor.toString(16).padStart(6, '0');
  const groundTex = createGroundTexture(
    groundBaseHex,
    def.isOutdoor ? '#d4d4d8' : '#71717a',
    envId === 'training_range' || envId === 'indoor_arena' || envId === 'military_ground',
    anisotropy,
  );
  const crateTex = createCrateTexture(anisotropy);

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: groundTex,
    roughness: 0.88,
    metalness: 0.05,
  });

  const groundSize = def.isOutdoor ? 260 : 84;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize, groundSize),
    groundMat,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  occluders.push(ground);

  const addBoxProp = (
    w: number,
    h: number,
    d: number,
    x: number,
    z: number,
    mat: THREE.Material,
    yBase = 0,
    collide = true,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, yBase + h * 0.5, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    occluders.push(mesh);
    if (collide) {
      obstacles.push({
        minX: x - w * 0.5,
        maxX: x + w * 0.5,
        minZ: z - d * 0.5,
        maxZ: z + d * 0.5,
        maxY: yBase + h,
        mesh,
      });
    }
    return mesh;
  };

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x646a73,
    roughness: 0.85,
    metalness: 0.08,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x2a2f37,
    roughness: 0.35,
    metalness: 0.78,
  });
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: crateTex,
    roughness: 0.78,
    metalness: 0.08,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: def.accentColor,
    roughness: 0.4,
    metalness: 0.35,
  });
  const sandbagMat = new THREE.MeshStandardMaterial({
    color: 0x9c8b6e,
    roughness: 0.92,
    metalness: 0.02,
  });

  // Firing line deck behind player spawn (z = 8..13)
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(24, 0.04, 5),
    concreteMat,
  );
  deck.position.set(0, 0.02, 10.5);
  deck.receiveShadow = true;
  group.add(deck);

  // Subtle range lane strips on floor (offset >= 0.02 to prevent z-fighting)
  const laneStripeMat = new THREE.MeshStandardMaterial({
    color: def.accentColor,
    roughness: 0.5,
    metalness: 0.2,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  [-8, 0, 8].forEach((lx) => {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 48),
      laneStripeMat,
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(lx, 0.03, -18);
    group.add(stripe);
  });

  if (envId === 'training_range') {
    // Low shooting bench dividers on flanks (leaving center clear!)
    addBoxProp(0.35, 1.0, 2.6, -6.5, 6.5, darkSteelMat);
    addBoxProp(0.35, 1.0, 2.6, 6.5, 6.5, darkSteelMat);
    // Overhead steel range gantry landmark at z = -12
    addBoxProp(0.6, 5.2, 0.6, -15, -12, darkSteelMat);
    addBoxProp(0.6, 5.2, 0.6, 15, -12, darkSteelMat);
    addBoxProp(31, 0.55, 0.8, 0, -12, accentMat, 5.1, false);
    // Side range safety walls
    addBoxProp(1.2, 3.2, 72, -18, -22, concreteMat);
    addBoxProp(1.2, 3.2, 72, 18, -22, concreteMat);
    // Distant earthen impact berm & ridge
    addBoxProp(44, 5.5, 6, 0, -64, sandbagMat);
    addCrateCluster(addBoxProp, crateMat, -13, 3);
    addCrateCluster(addBoxProp, crateMat, 13, -4);
  } else if (envId === 'desert_arena') {
    // Sandstone canyon mesas & desert rock outcrops around perimeter
    const sandstoneMat = new THREE.MeshStandardMaterial({
      color: 0xa86f42,
      roughness: 0.9,
      metalness: 0.04,
    });
    const mesaCoords = [
      [-26, -24, 14, 10, 18],
      [27, -28, 15, 12, 20],
      [-22, -56, 22, 15, 16],
      [20, -60, 24, 16, 18],
      [0, -76, 46, 14, 16],
    ];
    mesaCoords.forEach(([x, z, w, h, d]) => {
      addBoxProp(w, h, d, x, z, sandstoneMat);
    });
    // Tactical sandbag bunkers & crates mid-range
    addBoxProp(3.4, 1.05, 1.0, -7.5, -8, sandbagMat);
    addBoxProp(3.4, 1.05, 1.0, 7.5, -14, sandbagMat);
    addCrateCluster(addBoxProp, crateMat, -11, -22);
    addCrateCluster(addBoxProp, crateMat, 11, -26);
  } else if (envId === 'military_ground') {
    const oliveMat = new THREE.MeshStandardMaterial({
      color: 0x4b533b,
      roughness: 0.72,
      metalness: 0.2,
    });
    // Tall military watchtower landmark on left flank
    addBoxProp(0.45, 7.5, 0.45, -16, -28, darkSteelMat);
    addBoxProp(0.45, 7.5, 0.45, -12, -28, darkSteelMat);
    addBoxProp(0.45, 7.5, 0.45, -16, -24, darkSteelMat);
    addBoxProp(0.45, 7.5, 0.45, -12, -24, darkSteelMat);
    addBoxProp(4.8, 1.8, 4.8, -14, -26, oliveMat, 7.5, false);

    // Armored chevron barriers
    addBoxProp(3.8, 1.25, 0.9, -6.5, -10, concreteMat);
    addBoxProp(3.8, 1.25, 0.9, 6.5, -10, concreteMat);
    addBoxProp(4.5, 1.6, 1.1, 0, -28, oliveMat);
    // Berm
    addBoxProp(52, 5.2, 5, 0, -66, oliveMat);
    addCrateCluster(addBoxProp, crateMat, 12, -16);
  } else if (envId === 'abandoned_warehouse') {
    const brickWallMat = new THREE.MeshStandardMaterial({
      color: 0x46413e,
      roughness: 0.88,
      metalness: 0.1,
    });
    const rustMat = new THREE.MeshStandardMaterial({
      color: 0x6c3d28,
      roughness: 0.75,
      metalness: 0.45,
    });
    // Enclosed warehouse walls & roof trusses
    addBoxProp(1.2, 10, 82, -20, -24, brickWallMat);
    addBoxProp(1.2, 10, 82, 20, -24, brickWallMat);
    addBoxProp(42, 10, 1.4, 0, -64, brickWallMat);
    addBoxProp(42, 10, 1.4, 0, 16, brickWallMat);
    // Steel roof beams
    for (let bz = -50; bz <= 6; bz += 14) {
      addBoxProp(40, 0.6, 0.5, 0, bz, darkSteelMat, 8.8, false);
    }
    // Industrial crate stacks & steel containers
    addBoxProp(3.2, 2.8, 7.5, -11, -18, rustMat);
    addBoxProp(3.2, 2.8, 7.5, 11, -24, darkSteelMat);
    addCrateCluster(addBoxProp, crateMat, -7, -6);
    addCrateCluster(addBoxProp, crateMat, 8, -9);
  } else if (envId === 'urban_env') {
    const facadeMat = new THREE.MeshStandardMaterial({
      color: 0x525866,
      roughness: 0.75,
      metalness: 0.15,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.18,
      metalness: 0.8,
      emissive: 0x0c4a6e,
      emissiveIntensity: 0.25,
    });
    // Multi-story urban facades framing the street corridor
    [
      [-21, -12, 8, 12, 16],
      [-21, -34, 8, 16, 18],
      [21, -14, 8, 14, 16],
      [21, -38, 8, 11, 20],
      [0, -70, 44, 18, 10],
    ].forEach(([x, z, w, h, d]) => {
      addBoxProp(w, h, d, x, z, facadeMat);
      addBoxProp(w * 0.7, h * 0.12, d * 0.8, x, z, glassMat, h * 0.55, false);
    });
    // Jersey barriers & tactical cover vehicles/crates
    addBoxProp(3.6, 1.0, 0.7, -5.5, -9, concreteMat);
    addBoxProp(3.6, 1.0, 0.7, 5.5, -15, concreteMat);
    addBoxProp(2.6, 2.2, 5.8, -10, -28, accentMat);
  } else if (envId === 'forest_range') {
    const timberMat = new THREE.MeshStandardMaterial({
      color: 0x5c3d24,
      roughness: 0.88,
      metalness: 0.05,
    });
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x2d5a36,
      roughness: 0.82,
      metalness: 0.02,
    });
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x5a5f5e,
      roughness: 0.9,
      metalness: 0.06,
    });

    // Instanced pine grove surrounding the shooting clearing
    const treeCount = 44;
    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.42, 4.2, 8);
    const coneGeo = new THREE.ConeGeometry(2.1, 5.5, 9);
    const trunks = new THREE.InstancedMesh(trunkGeo, timberMat, treeCount);
    const crowns = new THREE.InstancedMesh(coneGeo, foliageMat, treeCount);
    trunks.castShadow = true;
    crowns.castShadow = true;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    let idx = 0;
    for (let i = 0; i < treeCount; i++) {
      const side = i % 3;
      let tx = 0;
      let tz = 0;
      if (side === 0) {
        tx = -17 - (i % 5) * 3.8;
        tz = 10 - i * 1.7;
      } else if (side === 1) {
        tx = 17 + (i % 5) * 3.8;
        tz = 10 - i * 1.7;
      } else {
        tx = -24 + ((i * 7) % 48);
        tz = -56 - (i % 4) * 5.5;
      }
      const scale = 0.85 + ((i * 17) % 30) / 100;
      dummy.position.set(tx, 2.1 * scale, tz);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(tx, 5.6 * scale, tz);
      dummy.updateMatrix();
      crowns.setMatrixAt(idx, dummy.matrix);
      color.setHSL(0.35 + ((i % 5) - 2) * 0.015, 0.36, 0.24 + (i % 3) * 0.03);
      crowns.setColorAt(idx, color);
      idx++;
    }
    trunks.computeBoundingSphere();
    crowns.computeBoundingSphere();
    group.add(trunks);
    group.add(crowns);

    // Log barricades & boulders
    addBoxProp(3.6, 1.0, 0.9, -6.5, -10, timberMat);
    addBoxProp(3.6, 1.0, 0.9, 6.5, -16, timberMat);
    addBoxProp(2.4, 1.6, 2.2, -12, -26, rockMat);
    addBoxProp(2.8, 1.8, 2.4, 12, -32, rockMat);
  } else {
    // indoor_arena
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x202630,
      roughness: 0.55,
      metalness: 0.45,
    });
    const neonTrimMat = new THREE.MeshStandardMaterial({
      color: def.accentColor,
      emissive: def.accentColor,
      emissiveIntensity: 0.65,
      roughness: 0.25,
    });
    // Enclosed shoot-house walls
    addBoxProp(1.0, 8.5, 80, -18, -22, panelMat);
    addBoxProp(1.0, 8.5, 80, 18, -22, panelMat);
    addBoxProp(38, 8.5, 1.0, 0, -62, panelMat);
    addBoxProp(38, 8.5, 1.0, 0, 16, panelMat);
    // Overhead acoustic baffles with subtle cyan edge strip
    for (let bz = -48; bz <= 4; bz += 13) {
      addBoxProp(36, 0.5, 0.35, 0, bz, darkSteelMat, 7.6, false);
      addBoxProp(34, 0.12, 0.12, 0, bz, neonTrimMat, 7.3, false);
    }
    // Tactical cover partitions
    addBoxProp(3.4, 1.4, 0.5, -6, -9, panelMat);
    addBoxProp(3.4, 1.4, 0.5, 6, -15, panelMat);
    addBoxProp(4.2, 1.8, 0.6, 0, -29, panelMat);
  }

  return {
    group,
    obstacles,
    occluders,
    playBounds: {
      minX: -15.5,
      maxX: 15.5,
      minZ: -54,
      maxZ: 12.5,
    },
  };
}

function addCrateCluster(
  addBoxProp: (
    w: number,
    h: number,
    d: number,
    x: number,
    z: number,
    mat: THREE.Material,
    yBase?: number,
    collide?: boolean,
  ) => THREE.Mesh,
  crateMat: THREE.Material,
  cx: number,
  cz: number,
) {
  addBoxProp(1.3, 1.3, 1.3, cx, cz, crateMat);
  addBoxProp(1.1, 1.1, 1.1, cx + 1.35, cz + 0.2, crateMat);
  addBoxProp(1.0, 1.0, 1.0, cx + 0.4, cz, crateMat, 1.3);
}
