export type WeaponCategory =
  | 'pistol'
  | 'assault'
  | 'sniper'
  | 'shotgun'
  | 'smg';

export type FireMode = 'semi' | 'auto' | 'burst' | 'bolt' | 'pump';

export type WeaponSkinId =
  | 'matte_obsidian'
  | 'desert_tan'
  | 'arctic_digital'
  | 'cobalt_steel'
  | 'gold_engraved';

export interface WeaponSkin {
  id: WeaponSkinId;
  name: string;
  primaryColor: number;
  secondaryColor: number;
  accentColor: number;
  metalness: number;
  roughness: number;
  cost: number;
}

export interface WeaponUpgrades {
  barrel: number; // 0..3 (+damage, +range)
  magazine: number; // 0..3 (+magSize, +reload speed)
  grip: number; // 0..3 (-recoil, -spread)
  optics: number; // 0..3 (+adsZoom, +adsSpeed)
}

export interface WeaponDefinition {
  id: string;
  name: string;
  category: WeaponCategory;
  categoryLabel: string;
  roleTag: string;
  fireMode: FireMode;
  damage: number;
  headshotMultiplier: number;
  fireRateRpm: number;
  magSize: number;
  reserveAmmo: number;
  reloadTimeSec: number;
  recoilPitch: number;
  recoilYaw: number;
  baseSpread: number;
  adsSpread: number;
  adsFov: number;
  hasScope: boolean;
  scopeZoomLevels?: number[];
  pellets?: number;
  rangeMeters: number;
  mobility: number; // 0.7..1.05
  unlockCost: number;
  unlockLevel: number;
  audioProfile:
    | 'pistol_light'
    | 'pistol_heavy'
    | 'revolver'
    | 'rifle_heavy'
    | 'rifle_carbine'
    | 'sniper_heavy'
    | 'sniper_bolt'
    | 'shotgun_pump'
    | 'shotgun_auto'
    | 'smg_rapid';
}

export interface EffectiveWeaponStats {
  damage: number;
  headshotMultiplier: number;
  fireRateRpm: number;
  fireIntervalSec: number;
  magSize: number;
  reserveAmmo: number;
  reloadTimeSec: number;
  recoilPitch: number;
  recoilYaw: number;
  baseSpread: number;
  adsSpread: number;
  adsFov: number;
  rangeMeters: number;
  mobility: number;
}

export const WEAPON_SKINS: WeaponSkin[] = [
  {
    id: 'matte_obsidian',
    name: 'Matte Obsidian',
    primaryColor: 0x22262b,
    secondaryColor: 0x15171a,
    accentColor: 0x71717a,
    metalness: 0.65,
    roughness: 0.48,
    cost: 0,
  },
  {
    id: 'desert_tan',
    name: 'Desert Coyote',
    primaryColor: 0xa68b67,
    secondaryColor: 0x3b3328,
    accentColor: 0xd4b996,
    metalness: 0.35,
    roughness: 0.58,
    cost: 400,
  },
  {
    id: 'arctic_digital',
    name: 'Arctic Slate',
    primaryColor: 0xcbd5e1,
    secondaryColor: 0x334155,
    accentColor: 0x94a3b8,
    metalness: 0.4,
    roughness: 0.45,
    cost: 600,
  },
  {
    id: 'cobalt_steel',
    name: 'Cobalt Tactical',
    primaryColor: 0x1e3a5f,
    secondaryColor: 0x0f172a,
    accentColor: 0x38bdf8,
    metalness: 0.78,
    roughness: 0.3,
    cost: 900,
  },
  {
    id: 'gold_engraved',
    name: 'Sovereign Gold',
    primaryColor: 0xd4af37,
    secondaryColor: 0x1c1917,
    accentColor: 0xfef08a,
    metalness: 0.92,
    roughness: 0.22,
    cost: 1600,
  },
];

export const WEAPONS: WeaponDefinition[] = [
  // PISTOLS (4)
  {
    id: 'glock19',
    name: 'Glock-19 Tactical',
    category: 'pistol',
    categoryLabel: 'Pistols',
    roleTag: 'Balanced 9mm Sidearm',
    fireMode: 'semi',
    damage: 32,
    headshotMultiplier: 2.0,
    fireRateRpm: 420,
    magSize: 15,
    reserveAmmo: 90,
    reloadTimeSec: 1.35,
    recoilPitch: 0.022,
    recoilYaw: 0.008,
    baseSpread: 0.014,
    adsSpread: 0.003,
    adsFov: 56,
    hasScope: false,
    rangeMeters: 55,
    mobility: 1.0,
    unlockCost: 0,
    unlockLevel: 1,
    audioProfile: 'pistol_light',
  },
  {
    id: 'usp_tactical',
    name: 'USP .45 Match',
    category: 'pistol',
    categoryLabel: 'Pistols',
    roleTag: 'Suppressed Precision Pistol',
    fireMode: 'semi',
    damage: 38,
    headshotMultiplier: 2.1,
    fireRateRpm: 380,
    magSize: 12,
    reserveAmmo: 72,
    reloadTimeSec: 1.4,
    recoilPitch: 0.024,
    recoilYaw: 0.007,
    baseSpread: 0.011,
    adsSpread: 0.002,
    adsFov: 55,
    hasScope: false,
    rangeMeters: 65,
    mobility: 0.99,
    unlockCost: 450,
    unlockLevel: 8,
    audioProfile: 'pistol_light',
  },
  {
    id: 'revolver',
    name: '.357 Python Revolver',
    category: 'pistol',
    categoryLabel: 'Pistols',
    roleTag: 'High-Caliber Wheelgun',
    fireMode: 'semi',
    damage: 64,
    headshotMultiplier: 2.3,
    fireRateRpm: 165,
    magSize: 6,
    reserveAmmo: 48,
    reloadTimeSec: 1.9,
    recoilPitch: 0.052,
    recoilYaw: 0.014,
    baseSpread: 0.013,
    adsSpread: 0.0018,
    adsFov: 52,
    hasScope: false,
    rangeMeters: 85,
    mobility: 0.96,
    unlockCost: 850,
    unlockLevel: 14,
    audioProfile: 'revolver',
  },
  {
    id: 'deagle',
    name: 'Desert Eagle .50',
    category: 'pistol',
    categoryLabel: 'Pistols',
    roleTag: 'Armor-Piercing Hand Cannon',
    fireMode: 'semi',
    damage: 78,
    headshotMultiplier: 2.4,
    fireRateRpm: 190,
    magSize: 7,
    reserveAmmo: 49,
    reloadTimeSec: 1.75,
    recoilPitch: 0.062,
    recoilYaw: 0.016,
    baseSpread: 0.018,
    adsSpread: 0.0025,
    adsFov: 53,
    hasScope: false,
    rangeMeters: 90,
    mobility: 0.94,
    unlockCost: 1300,
    unlockLevel: 18,
    audioProfile: 'pistol_heavy',
  },

  // ASSAULT RIFLES (4)
  {
    id: 'm4a1',
    name: 'M4A1 Carbine',
    category: 'assault',
    categoryLabel: 'Assault Rifles',
    roleTag: 'Modular Auto Carbine',
    fireMode: 'auto',
    damage: 34,
    headshotMultiplier: 2.0,
    fireRateRpm: 720,
    magSize: 30,
    reserveAmmo: 150,
    reloadTimeSec: 1.85,
    recoilPitch: 0.02,
    recoilYaw: 0.01,
    baseSpread: 0.02,
    adsSpread: 0.003,
    adsFov: 50,
    hasScope: false,
    rangeMeters: 120,
    mobility: 0.9,
    unlockCost: 0,
    unlockLevel: 1,
    audioProfile: 'rifle_carbine',
  },
  {
    id: 'ak47',
    name: 'AK-47 Kalashnikov',
    category: 'assault',
    categoryLabel: 'Assault Rifles',
    roleTag: 'Hard-Hitting 7.62mm Rifle',
    fireMode: 'auto',
    damage: 44,
    headshotMultiplier: 2.1,
    fireRateRpm: 600,
    magSize: 30,
    reserveAmmo: 150,
    reloadTimeSec: 2.05,
    recoilPitch: 0.032,
    recoilYaw: 0.015,
    baseSpread: 0.026,
    adsSpread: 0.0045,
    adsFov: 51,
    hasScope: false,
    rangeMeters: 130,
    mobility: 0.87,
    unlockCost: 900,
    unlockLevel: 21,
    audioProfile: 'rifle_heavy',
  },
  {
    id: 'scar',
    name: 'SCAR-L Mk16',
    category: 'assault',
    categoryLabel: 'Assault Rifles',
    roleTag: 'Precision Battle Rifle',
    fireMode: 'auto',
    damage: 41,
    headshotMultiplier: 2.05,
    fireRateRpm: 630,
    magSize: 30,
    reserveAmmo: 150,
    reloadTimeSec: 1.9,
    recoilPitch: 0.023,
    recoilYaw: 0.01,
    baseSpread: 0.018,
    adsSpread: 0.0024,
    adsFov: 48,
    hasScope: false,
    rangeMeters: 145,
    mobility: 0.88,
    unlockCost: 1450,
    unlockLevel: 25,
    audioProfile: 'rifle_heavy',
  },
  {
    id: 'aug',
    name: 'AUG A3 Bullpup',
    category: 'assault',
    categoryLabel: 'Assault Rifles',
    roleTag: 'Scoped Bullpup Rifle',
    fireMode: 'auto',
    damage: 37,
    headshotMultiplier: 2.0,
    fireRateRpm: 690,
    magSize: 30,
    reserveAmmo: 150,
    reloadTimeSec: 1.95,
    recoilPitch: 0.019,
    recoilYaw: 0.009,
    baseSpread: 0.017,
    adsSpread: 0.002,
    adsFov: 42,
    hasScope: true,
    scopeZoomLevels: [1.5, 3.0],
    rangeMeters: 150,
    mobility: 0.91,
    unlockCost: 1850,
    unlockLevel: 30,
    audioProfile: 'rifle_carbine',
  },

  // SNIPER RIFLES (3)
  {
    id: 'kar98',
    name: 'Kar98k Marksman',
    category: 'sniper',
    categoryLabel: 'Sniper Rifles',
    roleTag: 'Classic Bolt-Action Rifle',
    fireMode: 'bolt',
    damage: 105,
    headshotMultiplier: 2.5,
    fireRateRpm: 46,
    magSize: 5,
    reserveAmmo: 35,
    reloadTimeSec: 2.4,
    recoilPitch: 0.075,
    recoilYaw: 0.015,
    baseSpread: 0.04,
    adsSpread: 0.0005,
    adsFov: 28,
    hasScope: true,
    scopeZoomLevels: [2.5, 5.0],
    rangeMeters: 260,
    mobility: 0.83,
    unlockCost: 1100,
    unlockLevel: 41,
    audioProfile: 'sniper_bolt',
  },
  {
    id: 'awm',
    name: 'AWM .338 Magnum',
    category: 'sniper',
    categoryLabel: 'Sniper Rifles',
    roleTag: 'Long-Range Precision Sniper',
    fireMode: 'bolt',
    damage: 135,
    headshotMultiplier: 2.6,
    fireRateRpm: 42,
    magSize: 5,
    reserveAmmo: 30,
    reloadTimeSec: 2.6,
    recoilPitch: 0.085,
    recoilYaw: 0.016,
    baseSpread: 0.045,
    adsSpread: 0.0003,
    adsFov: 22,
    hasScope: true,
    scopeZoomLevels: [3.0, 6.0, 9.0],
    rangeMeters: 340,
    mobility: 0.8,
    unlockCost: 2200,
    unlockLevel: 45,
    audioProfile: 'sniper_bolt',
  },
  {
    id: 'barrett',
    name: 'Barrett M82 .50 Cal',
    category: 'sniper',
    categoryLabel: 'Sniper Rifles',
    roleTag: 'Semi-Auto Anti-Materiel',
    fireMode: 'semi',
    damage: 165,
    headshotMultiplier: 2.5,
    fireRateRpm: 95,
    magSize: 8,
    reserveAmmo: 32,
    reloadTimeSec: 3.0,
    recoilPitch: 0.11,
    recoilYaw: 0.025,
    baseSpread: 0.055,
    adsSpread: 0.0006,
    adsFov: 20,
    hasScope: true,
    scopeZoomLevels: [3.0, 6.0, 10.0],
    rangeMeters: 400,
    mobility: 0.72,
    unlockCost: 3400,
    unlockLevel: 50,
    audioProfile: 'sniper_heavy',
  },

  // SHOTGUNS (3)
  {
    id: 'pump_shotgun',
    name: 'M870 Pump-Action',
    category: 'shotgun',
    categoryLabel: 'Shotguns',
    roleTag: '8-Pellet Close Quarters',
    fireMode: 'pump',
    damage: 20,
    headshotMultiplier: 1.6,
    fireRateRpm: 72,
    magSize: 8,
    reserveAmmo: 40,
    reloadTimeSec: 2.3,
    recoilPitch: 0.068,
    recoilYaw: 0.02,
    baseSpread: 0.055,
    adsSpread: 0.036,
    adsFov: 56,
    hasScope: false,
    pellets: 8,
    rangeMeters: 38,
    mobility: 0.9,
    unlockCost: 750,
    unlockLevel: 10,
    audioProfile: 'shotgun_pump',
  },
  {
    id: 'double_barrel',
    name: 'S686 Double-Barrel',
    category: 'shotgun',
    categoryLabel: 'Shotguns',
    roleTag: 'Twin-Shot Heavy Buckshot',
    fireMode: 'semi',
    damage: 24,
    headshotMultiplier: 1.65,
    fireRateRpm: 160,
    magSize: 2,
    reserveAmmo: 36,
    reloadTimeSec: 1.7,
    recoilPitch: 0.085,
    recoilYaw: 0.024,
    baseSpread: 0.062,
    adsSpread: 0.04,
    adsFov: 56,
    hasScope: false,
    pellets: 9,
    rangeMeters: 34,
    mobility: 0.93,
    unlockCost: 1200,
    unlockLevel: 51,
    audioProfile: 'shotgun_pump',
  },
  {
    id: 'tactical_shotgun',
    name: 'M1014 Tactical Auto',
    category: 'shotgun',
    categoryLabel: 'Shotguns',
    roleTag: 'Semi-Auto Combat Shotgun',
    fireMode: 'semi',
    damage: 18,
    headshotMultiplier: 1.6,
    fireRateRpm: 210,
    magSize: 7,
    reserveAmmo: 49,
    reloadTimeSec: 2.2,
    recoilPitch: 0.058,
    recoilYaw: 0.018,
    baseSpread: 0.05,
    adsSpread: 0.032,
    adsFov: 54,
    hasScope: false,
    pellets: 8,
    rangeMeters: 42,
    mobility: 0.89,
    unlockCost: 1950,
    unlockLevel: 55,
    audioProfile: 'shotgun_auto',
  },

  // SUBMACHINE GUNS (3)
  {
    id: 'ump45',
    name: 'UMP-45 Tactical',
    category: 'smg',
    categoryLabel: 'Submachine Guns',
    roleTag: 'Controllable .45 SMG',
    fireMode: 'auto',
    damage: 31,
    headshotMultiplier: 1.9,
    fireRateRpm: 650,
    magSize: 25,
    reserveAmmo: 150,
    reloadTimeSec: 1.65,
    recoilPitch: 0.017,
    recoilYaw: 0.009,
    baseSpread: 0.022,
    adsSpread: 0.005,
    adsFov: 53,
    hasScope: false,
    rangeMeters: 75,
    mobility: 0.96,
    unlockCost: 650,
    unlockLevel: 6,
    audioProfile: 'smg_rapid',
  },
  {
    id: 'mp5',
    name: 'MP5-A3',
    category: 'smg',
    categoryLabel: 'Submachine Guns',
    roleTag: 'Rapid 9mm Submachine Gun',
    fireMode: 'auto',
    damage: 26,
    headshotMultiplier: 1.9,
    fireRateRpm: 820,
    magSize: 30,
    reserveAmmo: 180,
    reloadTimeSec: 1.55,
    recoilPitch: 0.014,
    recoilYaw: 0.008,
    baseSpread: 0.02,
    adsSpread: 0.0045,
    adsFov: 53,
    hasScope: false,
    rangeMeters: 70,
    mobility: 0.98,
    unlockCost: 1150,
    unlockLevel: 16,
    audioProfile: 'smg_rapid',
  },
  {
    id: 'vector',
    name: 'Kriss Vector .45',
    category: 'smg',
    categoryLabel: 'Submachine Guns',
    roleTag: 'Ultra-RPM Shredder SMG',
    fireMode: 'auto',
    damage: 25,
    headshotMultiplier: 1.9,
    fireRateRpm: 1080,
    magSize: 33,
    reserveAmmo: 198,
    reloadTimeSec: 1.5,
    recoilPitch: 0.011,
    recoilYaw: 0.007,
    baseSpread: 0.024,
    adsSpread: 0.005,
    adsFov: 54,
    hasScope: false,
    rangeMeters: 68,
    mobility: 1.0,
    unlockCost: 1750,
    unlockLevel: 28,
    audioProfile: 'smg_rapid',
  },
];

export const WEAPON_MAP: Record<string, WeaponDefinition> = Object.fromEntries(
  WEAPONS.map((w) => [w.id, w]),
);

export const DEFAULT_UPGRADES: WeaponUpgrades = {
  barrel: 0,
  magazine: 0,
  grip: 0,
  optics: 0,
};

export function getWeaponById(id: string): WeaponDefinition {
  return WEAPON_MAP[id] ?? WEAPONS[0];
}

export function getSkinById(id: WeaponSkinId): WeaponSkin {
  return WEAPON_SKINS.find((s) => s.id === id) ?? WEAPON_SKINS[0];
}

export function getUpgradeCost(currentTier: number): number {
  if (currentTier >= 3) return 0;
  return 250 * (currentTier + 1);
}

export function getEffectiveWeaponStats(
  weapon: WeaponDefinition,
  upgrades: WeaponUpgrades = DEFAULT_UPGRADES,
): EffectiveWeaponStats {
  const barrelBonus = upgrades.barrel * 0.08;
  const magBonus = upgrades.magazine * 0.12;
  const reloadReduction = upgrades.magazine * 0.07;
  const recoilReduction = upgrades.grip * 0.1;
  const spreadReduction = upgrades.grip * 0.1;
  const opticsZoomBonus = upgrades.optics * 2;

  const magSize =
    weapon.id === 'double_barrel'
      ? 2
      : Math.max(weapon.magSize, Math.round(weapon.magSize * (1 + magBonus)));

  return {
    damage: Math.round(weapon.damage * (1 + barrelBonus)),
    headshotMultiplier: weapon.headshotMultiplier,
    fireRateRpm: weapon.fireRateRpm,
    fireIntervalSec: 60 / weapon.fireRateRpm,
    magSize,
    reserveAmmo: Math.round(weapon.reserveAmmo * (1 + magBonus)),
    reloadTimeSec: Number(
      Math.max(0.8, weapon.reloadTimeSec * (1 - reloadReduction)).toFixed(2),
    ),
    recoilPitch: weapon.recoilPitch * (1 - recoilReduction),
    recoilYaw: weapon.recoilYaw * (1 - recoilReduction),
    baseSpread: weapon.baseSpread * (1 - spreadReduction),
    adsSpread: weapon.adsSpread * (1 - spreadReduction),
    adsFov: Math.max(14, weapon.adsFov - opticsZoomBonus),
    rangeMeters: Math.round(weapon.rangeMeters * (1 + upgrades.barrel * 0.12)),
    mobility: weapon.mobility,
  };
}
