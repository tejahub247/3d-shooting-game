import * as THREE from 'three';
import { WeaponDefinition, WeaponSkinId, getSkinById } from '../game/weapons';

export interface BuiltWeaponModel {
  root: THREE.Group;
  slideOrBolt: THREE.Object3D;
  magazine: THREE.Object3D;
  muzzlePoint: THREE.Object3D;
  ejectionPort: THREE.Object3D;
  adsOffset: THREE.Vector3;
  hipOffset: THREE.Vector3;
}

export function buildWeaponModel(
  weapon: WeaponDefinition,
  skinId: WeaponSkinId = 'matte_obsidian',
): BuiltWeaponModel {
  const skin = getSkinById(skinId);
  const root = new THREE.Group();

  const primaryMat = new THREE.MeshStandardMaterial({
    color: skin.primaryColor,
    metalness: skin.metalness,
    roughness: skin.roughness,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: skin.secondaryColor,
    metalness: Math.max(0.1, skin.metalness - 0.35),
    roughness: Math.min(0.92, skin.roughness + 0.35),
  });
  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0x1b1e23,
    metalness: 0.9,
    roughness: 0.2,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: skin.accentColor,
    metalness: 0.75,
    roughness: 0.25,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x6b3f22,
    metalness: 0.05,
    roughness: 0.78,
  });
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0x22d3ee,
    metalness: 0.1,
    roughness: 0.08,
    clearcoat: 1.0,
    emissive: 0x083344,
    emissiveIntensity: 0.5,
  });

  const slideOrBolt = new THREE.Group();
  const magazine = new THREE.Group();
  const muzzlePoint = new THREE.Object3D();
  const ejectionPort = new THREE.Object3D();

  // Default orientation: barrel points toward -Z, up is +Y
  let adsOffset = new THREE.Vector3(0, -0.145, -0.32);
  let hipOffset = new THREE.Vector3(0.22, -0.22, -0.44);

  const addBox = (
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  const addCyl = (
    parent: THREE.Object3D,
    rTop: number,
    rBot: number,
    len: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    rotX = Math.PI / 2,
  ) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBot, len, 14),
      mat,
    );
    m.position.set(x, y, z);
    m.rotation.x = rotX;
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  if (weapon.category === 'pistol') {
    adsOffset = new THREE.Vector3(0, -0.118, -0.34);
    hipOffset = new THREE.Vector3(0.2, -0.19, -0.42);

    const isRevolver = weapon.id === 'revolver';
    const isDeagle = weapon.id === 'deagle';
    const isUsp = weapon.id === 'usp_tactical';

    // Grip angled slightly
    const grip = addBox(root, 0.036, 0.115, 0.052, 0, -0.058, 0.06, secondaryMat);
    grip.rotation.x = 0.22;

    // Trigger guard
    addBox(root, 0.016, 0.032, 0.045, 0, -0.022, 0.006, secondaryMat);

    if (isRevolver) {
      // Frame + top strap
      addBox(root, 0.036, 0.048, 0.14, 0, 0.015, -0.01, primaryMat);
      // Rotating cylinder (animated on slideOrBolt)
      const cyl = addCyl(slideOrBolt, 0.03, 0.03, 0.056, 0, 0.026, -0.015, accentMat);
      cyl.rotation.x = Math.PI / 2;
      // Long vented rib barrel
      addBox(root, 0.026, 0.038, 0.18, 0, 0.038, -0.14, primaryMat);
      addCyl(root, 0.012, 0.012, 0.19, 0, 0.04, -0.145, barrelMat);
      addBox(root, 0.008, 0.014, 0.016, 0, 0.064, -0.22, accentMat);
      muzzlePoint.position.set(0, 0.04, -0.25);
      ejectionPort.position.set(0.028, 0.03, -0.01);
    } else {
      const len = isDeagle ? 0.25 : 0.19;
      const slideW = isDeagle ? 0.044 : 0.036;
      const slideH = isDeagle ? 0.046 : 0.036;
      // Polymer / metal lower frame
      addBox(root, slideW * 0.92, 0.026, len * 0.9, 0, 0.008, -len * 0.22, secondaryMat);
      // Reciprocating slide
      addBox(slideOrBolt, slideW, slideH, len, 0, 0.038, -len * 0.24, primaryMat);
      // Iron sights
      addBox(slideOrBolt, 0.012, 0.01, 0.012, 0, 0.064, 0.04, accentMat);
      addBox(slideOrBolt, 0.006, 0.01, 0.012, 0, 0.064, -len * 0.7, accentMat);
      // Barrel
      addCyl(root, 0.009, 0.009, len * 0.95, 0, 0.036, -len * 0.26, barrelMat);
      // Suppressor for USP Match
      if (isUsp) {
        addCyl(root, 0.018, 0.018, 0.14, 0, 0.036, -len * 0.74 - 0.06, secondaryMat);
        muzzlePoint.position.set(0, 0.036, -len * 0.74 - 0.14);
      } else {
        muzzlePoint.position.set(0, 0.036, -len * 0.76);
      }
      // Magazine inside grip
      const mag = addBox(magazine, 0.026, 0.1, 0.038, 0, -0.064, 0.062, accentMat);
      mag.rotation.x = 0.22;
      ejectionPort.position.set(0.025, 0.045, -0.01);
    }
  } else if (weapon.category === 'assault') {
    adsOffset = new THREE.Vector3(0, -0.152, -0.32);
    hipOffset = new THREE.Vector3(0.24, -0.23, -0.45);

    const isAk = weapon.id === 'ak47';
    const isAug = weapon.id === 'aug';
    const isScar = weapon.id === 'scar';

    // Receiver
    addBox(root, 0.052, 0.075, 0.28, 0, 0.02, -0.02, primaryMat);
    // Pistol grip
    const grip = addBox(root, 0.036, 0.11, 0.046, 0, -0.058, 0.07, secondaryMat);
    grip.rotation.x = 0.28;

    // Stock
    if (isAk) {
      addBox(root, 0.044, 0.085, 0.22, 0, -0.005, 0.22, woodMat);
      addBox(root, 0.048, 0.055, 0.2, 0, 0.016, -0.24, woodMat);
    } else if (isAug) {
      // Bullpup chassis extends rearward
      addBox(root, 0.056, 0.105, 0.26, 0, -0.01, 0.16, primaryMat);
    } else {
      addBox(root, 0.042, 0.09, 0.22, 0, 0.005, 0.22, secondaryMat);
      addBox(root, 0.05, 0.058, 0.22, 0, 0.022, -0.25, isScar ? primaryMat : secondaryMat);
    }

    // Barrel + muzzle brake
    addCyl(root, 0.011, 0.012, 0.34, 0, 0.03, -0.36, barrelMat);
    addCyl(root, 0.015, 0.015, 0.045, 0, 0.03, -0.53, accentMat);
    // Gas block / front sight post
    addBox(root, 0.014, 0.045, 0.022, 0, 0.055, -0.38, barrelMat);

    // Charging handle / bolt carrier
    addBox(slideOrBolt, 0.018, 0.018, 0.06, 0.03, 0.032, -0.04, accentMat);

    // Magazine
    const magZ = isAug ? 0.14 : -0.08;
    const mag = addBox(magazine, 0.032, 0.16, 0.062, 0, -0.09, magZ, accentMat);
    mag.rotation.x = isAk ? -0.22 : -0.08;

    // Optic / Holographic / AUG Integrated Scope
    if (isAug) {
      addCyl(root, 0.02, 0.02, 0.15, 0, 0.095, -0.02, secondaryMat);
      addCyl(root, 0.016, 0.016, 0.01, 0, 0.095, -0.095, lensMat);
    } else {
      addBox(root, 0.038, 0.038, 0.07, 0, 0.078, 0.0, secondaryMat);
      addBox(root, 0.026, 0.024, 0.01, 0, 0.08, -0.034, lensMat);
    }

    muzzlePoint.position.set(0, 0.03, -0.56);
    ejectionPort.position.set(0.035, 0.032, -0.04);
  } else if (weapon.category === 'sniper') {
    adsOffset = new THREE.Vector3(0, -0.155, -0.28);
    hipOffset = new THREE.Vector3(0.25, -0.24, -0.46);

    const isKar = weapon.id === 'kar98';
    const isBarrett = weapon.id === 'barrett';
    const bodyMat = isKar ? woodMat : primaryMat;

    // Chassis / Stock
    addBox(root, 0.052, 0.078, 0.36, 0, 0.012, 0.02, bodyMat);
    addBox(root, 0.044, 0.092, 0.25, 0, -0.008, 0.26, bodyMat);
    if (!isKar) {
      const grip = addBox(root, 0.036, 0.105, 0.045, 0, -0.055, 0.1, secondaryMat);
      grip.rotation.x = 0.22;
    }

    // Long heavy fluted barrel
    const barrelLen = isBarrett ? 0.56 : 0.48;
    addCyl(
      root,
      isBarrett ? 0.016 : 0.012,
      isBarrett ? 0.02 : 0.014,
      barrelLen,
      0,
      0.034,
      -0.38,
      barrelMat,
    );
    // Heavy muzzle brake
    addBox(
      root,
      isBarrett ? 0.052 : 0.032,
      0.03,
      0.068,
      0,
      0.034,
      -0.38 - barrelLen * 0.5 - 0.02,
      accentMat,
    );

    // Folded bipod legs
    addCyl(root, 0.007, 0.007, 0.16, -0.032, -0.015, -0.34, secondaryMat);
    addCyl(root, 0.007, 0.007, 0.16, 0.032, -0.015, -0.34, secondaryMat);

    // High-power sniper scope
    addBox(root, 0.022, 0.028, 0.12, 0, 0.062, -0.01, secondaryMat);
    addCyl(root, 0.022, 0.022, 0.24, 0, 0.088, -0.02, secondaryMat);
    addCyl(root, 0.03, 0.023, 0.06, 0, 0.088, -0.16, secondaryMat);
    addCyl(root, 0.026, 0.026, 0.008, 0, 0.088, -0.19, lensMat);

    // Bolt handle
    addBox(slideOrBolt, 0.045, 0.014, 0.018, 0.032, 0.034, 0.04, accentMat);
    // Magazine
    addBox(
      magazine,
      0.034,
      isBarrett ? 0.12 : 0.075,
      isBarrett ? 0.095 : 0.065,
      0,
      -0.055,
      -0.06,
      accentMat,
    );

    muzzlePoint.position.set(0, 0.034, -0.38 - barrelLen * 0.5 - 0.06);
    ejectionPort.position.set(0.035, 0.036, -0.01);
  } else if (weapon.category === 'shotgun') {
    adsOffset = new THREE.Vector3(0, -0.145, -0.33);
    hipOffset = new THREE.Vector3(0.24, -0.23, -0.44);

    const isDouble = weapon.id === 'double_barrel';
    const isTac = weapon.id === 'tactical_shotgun';

    // Receiver
    addBox(root, 0.052, 0.072, 0.24, 0, 0.018, 0.01, primaryMat);
    // Stock
    addBox(
      root,
      0.044,
      0.085,
      0.24,
      0,
      -0.015,
      0.23,
      isTac ? secondaryMat : woodMat,
    );

    if (isDouble) {
      // Twin side-by-side barrels
      addCyl(root, 0.014, 0.014, 0.48, -0.015, 0.035, -0.33, barrelMat);
      addCyl(root, 0.014, 0.014, 0.48, 0.015, 0.035, -0.33, barrelMat);
      addBox(root, 0.048, 0.032, 0.16, 0, 0.012, -0.2, woodMat);
    } else {
      // Main barrel + underbarrel tube magazine
      addCyl(root, 0.015, 0.015, 0.46, 0, 0.036, -0.32, barrelMat);
      addCyl(root, 0.013, 0.013, 0.38, 0, 0.008, -0.28, accentMat);
      // Pump forend (animated with slideOrBolt)
      addBox(
        slideOrBolt,
        0.054,
        0.048,
        0.16,
        0,
        0.008,
        -0.25,
        isTac ? secondaryMat : woodMat,
      );
    }

    if (isTac) {
      const grip = addBox(root, 0.036, 0.1, 0.044, 0, -0.05, 0.1, secondaryMat);
      grip.rotation.x = 0.26;
      addBox(root, 0.03, 0.025, 0.05, 0, 0.068, -0.02, secondaryMat);
    }

    muzzlePoint.position.set(0, 0.035, -0.58);
    ejectionPort.position.set(0.032, 0.03, -0.02);
  } else {
    // Submachine Guns (UMP45, MP5, Vector)
    adsOffset = new THREE.Vector3(0, -0.145, -0.33);
    hipOffset = new THREE.Vector3(0.22, -0.21, -0.42);

    const isVector = weapon.id === 'vector';
    const isMp5 = weapon.id === 'mp5';

    addBox(root, 0.05, 0.072, 0.24, 0, 0.02, -0.04, primaryMat);
    const grip = addBox(root, 0.035, 0.1, 0.044, 0, -0.054, 0.05, secondaryMat);
    grip.rotation.x = 0.24;

    if (isVector) {
      // Iconic vertical recoil housing in front of trigger
      addBox(root, 0.05, 0.125, 0.12, 0, -0.025, -0.15, primaryMat);
    }
    // Folding / collapsible stock
    addBox(root, 0.036, 0.065, 0.18, 0, 0.01, 0.16, secondaryMat);

    // Barrel + shroud
    addCyl(root, 0.013, 0.013, 0.18, 0, 0.028, -0.24, barrelMat);
    if (isMp5) {
      addCyl(root, 0.022, 0.022, 0.14, 0, 0.028, -0.21, secondaryMat);
    }
    // Charging bolt
    addBox(slideOrBolt, 0.016, 0.016, 0.045, -0.028, 0.036, -0.08, accentMat);
    // Stick or curved mag
    const mag = addBox(magazine, 0.028, 0.16, 0.044, 0, -0.095, -0.09, accentMat);
    mag.rotation.x = isVector ? 0.22 : isMp5 ? -0.18 : -0.06;

    // Compact red dot optic
    addBox(root, 0.034, 0.034, 0.055, 0, 0.074, -0.03, secondaryMat);
    addBox(root, 0.022, 0.02, 0.008, 0, 0.075, -0.056, lensMat);

    muzzlePoint.position.set(0, 0.028, -0.35);
    ejectionPort.position.set(0.032, 0.03, -0.05);
  }

  root.add(slideOrBolt);
  root.add(magazine);
  root.add(muzzlePoint);
  root.add(ejectionPort);

  return {
    root,
    slideOrBolt,
    magazine,
    muzzlePoint,
    ejectionPort,
    adsOffset,
    hipOffset,
  };
}
