import { WeaponCategory } from './weapons';

export type EnvironmentId =
  | 'training_range'
  | 'desert_arena'
  | 'military_ground'
  | 'abandoned_warehouse'
  | 'urban_env'
  | 'forest_range'
  | 'indoor_arena';

export interface EnvironmentDefinition {
  id: EnvironmentId;
  name: string;
  subtitle: string;
  isOutdoor: boolean;
  skyColor: number;
  horizonColor: number;
  fogDensity: number;
  groundColor: number;
  accentColor: number;
  sunColor: number;
  sunIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
}

export const ENVIRONMENTS: EnvironmentDefinition[] = [
  {
    id: 'training_range',
    name: 'Shooting Training Range',
    subtitle: 'Standard Ballistics Lane & Steel Bay',
    isOutdoor: true,
    skyColor: 0x7fb3d5,
    horizonColor: 0xbcd4e6,
    fogDensity: 0.0085,
    groundColor: 0x565952,
    accentColor: 0xf59e0b,
    sunColor: 0xfff1d6,
    sunIntensity: 2.1,
    hemiSkyColor: 0x9ec5e6,
    hemiGroundColor: 0x4b473e,
    hemiIntensity: 0.75,
  },
  {
    id: 'desert_arena',
    name: 'Desert Shooting Arena',
    subtitle: 'Arid Canyon Proving Grounds',
    isOutdoor: true,
    skyColor: 0xd9a86c,
    horizonColor: 0xe8c79b,
    fogDensity: 0.009,
    groundColor: 0xb89261,
    accentColor: 0xd97706,
    sunColor: 0xffdfaa,
    sunIntensity: 2.4,
    hemiSkyColor: 0xf6d5a7,
    hemiGroundColor: 0x6b4f32,
    hemiIntensity: 0.8,
  },
  {
    id: 'military_ground',
    name: 'Military Training Ground',
    subtitle: 'Armored Combat Qualification Course',
    isOutdoor: true,
    skyColor: 0x7a8e99,
    horizonColor: 0xaab7bd,
    fogDensity: 0.01,
    groundColor: 0x4f5646,
    accentColor: 0x84cc16,
    sunColor: 0xffeacc,
    sunIntensity: 1.9,
    hemiSkyColor: 0x9db4c0,
    hemiGroundColor: 0x3b4034,
    hemiIntensity: 0.72,
  },
  {
    id: 'abandoned_warehouse',
    name: 'Abandoned Warehouse',
    subtitle: 'Industrial Steel Depot & Crate Maze',
    isOutdoor: false,
    skyColor: 0x1e2229,
    horizonColor: 0x262b33,
    fogDensity: 0.016,
    groundColor: 0x3f434a,
    accentColor: 0xf97316,
    sunColor: 0xffd2a1,
    sunIntensity: 1.65,
    hemiSkyColor: 0x64748b,
    hemiGroundColor: 0x27272a,
    hemiIntensity: 0.85,
  },
  {
    id: 'urban_env',
    name: 'Urban Shooting Environment',
    subtitle: 'Metropolitan Tactical Alley & Plaza',
    isOutdoor: true,
    skyColor: 0x6886a3,
    horizonColor: 0x9eb2c4,
    fogDensity: 0.0095,
    groundColor: 0x42454b,
    accentColor: 0x38bdf8,
    sunColor: 0xffe6c7,
    sunIntensity: 2.0,
    hemiSkyColor: 0x8fb3d4,
    hemiGroundColor: 0x383a3e,
    hemiIntensity: 0.78,
  },
  {
    id: 'forest_range',
    name: 'Forest Shooting Range',
    subtitle: 'Timberland Marksman Clearing',
    isOutdoor: true,
    skyColor: 0x82b29a,
    horizonColor: 0xb7d3c6,
    fogDensity: 0.011,
    groundColor: 0x3e5235,
    accentColor: 0x22c55e,
    sunColor: 0xfff0c8,
    sunIntensity: 1.95,
    hemiSkyColor: 0xa2ceb8,
    hemiGroundColor: 0x2f3b28,
    hemiIntensity: 0.8,
  },
  {
    id: 'indoor_arena',
    name: 'Indoor Tactical Arena',
    subtitle: 'Close-Quarters Shoot House & Baffles',
    isOutdoor: false,
    skyColor: 0x141820,
    horizonColor: 0x1b212b,
    fogDensity: 0.014,
    groundColor: 0x2e343f,
    accentColor: 0x06b6d4,
    sunColor: 0xe2e8f0,
    sunIntensity: 1.8,
    hemiSkyColor: 0x60a5fa,
    hemiGroundColor: 0x1e293b,
    hemiIntensity: 0.9,
  },
];

export const ENVIRONMENT_MAP: Record<EnvironmentId, EnvironmentDefinition> =
  Object.fromEntries(ENVIRONMENTS.map((e) => [e.id, e])) as Record<
    EnvironmentId,
    EnvironmentDefinition
  >;

export interface LevelTier {
  id: number;
  title: string;
  startLevel: number;
  endLevel: number;
  recommendedCategory: WeaponCategory | 'any';
  summary: string;
}

export const LEVEL_TIERS: LevelTier[] = [
  {
    id: 1,
    title: 'Basic Shooting Tutorials',
    startLevel: 1,
    endLevel: 10,
    recommendedCategory: 'pistol',
    summary: 'Sight alignment, recoil control, and stationary target fundamentals.',
  },
  {
    id: 2,
    title: 'Pistol Shooting Challenges',
    startLevel: 11,
    endLevel: 20,
    recommendedCategory: 'pistol',
    summary: 'Precision sidearm drills, quick reloads, and crisp headshots.',
  },
  {
    id: 3,
    title: 'Assault Rifle Challenges',
    startLevel: 21,
    endLevel: 30,
    recommendedCategory: 'assault',
    summary: 'Full-auto burst discipline and multi-lane engagements.',
  },
  {
    id: 4,
    title: 'Moving Target Challenges',
    startLevel: 31,
    endLevel: 40,
    recommendedCategory: 'smg',
    summary: 'Tracking lateral rail sleds and unpredictable pop-up silhouettes.',
  },
  {
    id: 5,
    title: 'Sniper Challenges',
    startLevel: 41,
    endLevel: 50,
    recommendedCategory: 'sniper',
    summary: 'Long-range optics zoom, breathing stability, and high-value targets.',
  },
  {
    id: 6,
    title: 'Shotgun Challenges',
    startLevel: 51,
    endLevel: 60,
    recommendedCategory: 'shotgun',
    summary: 'Close-quarters breaching lanes and rapid buckshot sweeps.',
  },
  {
    id: 7,
    title: 'Multiple Target Challenges',
    startLevel: 61,
    endLevel: 70,
    recommendedCategory: 'assault',
    summary: 'Dense simultaneous target arrays requiring fast target transitions.',
  },
  {
    id: 8,
    title: 'Advanced Accuracy Missions',
    startLevel: 71,
    endLevel: 80,
    recommendedCategory: 'sniper',
    summary: 'Strict headshot quotas, armored plates, and tight timers.',
  },
  {
    id: 9,
    title: 'Expert Shooting Challenges',
    startLevel: 81,
    endLevel: 90,
    recommendedCategory: 'any',
    summary: 'Hostile tactical drones returning fire across dynamic cover.',
  },
  {
    id: 10,
    title: 'Ultimate Shooting Challenges',
    startLevel: 91,
    endLevel: 100,
    recommendedCategory: 'any',
    summary: 'Master-tier gauntlets combining drones, high-speed rails, and elites.',
  },
];

export interface MissionLevel {
  level: number;
  tierId: number;
  tierTitle: string;
  name: string;
  description: string;
  environmentId: EnvironmentId;
  recommendedCategory: WeaponCategory | 'any';
  targetCount: number;
  timeLimitSec: number;
  movingRatio: number;
  popupRatio: number;
  droneRatio: number;
  targetSpeed: number;
  minRange: number;
  maxRange: number;
  headshotQuota: number;
  rewardCredits: number;
}

const ENV_CYCLE: EnvironmentId[] = [
  'training_range',
  'desert_arena',
  'military_ground',
  'abandoned_warehouse',
  'urban_env',
  'forest_range',
  'indoor_arena',
];

function buildLevel(levelNum: number): MissionLevel {
  const tier =
    LEVEL_TIERS.find(
      (t) => levelNum >= t.startLevel && levelNum <= t.endLevel,
    ) ?? LEVEL_TIERS[0];
  const localIdx = levelNum - tier.startLevel; // 0..9
  const envIdx = (Math.floor((levelNum - 1) / 3) + (tier.id - 1)) % ENV_CYCLE.length;
  const environmentId =
    levelNum <= 4 ? 'training_range' : ENV_CYCLE[envIdx];

  const targetCount = Math.min(34, 5 + Math.floor(levelNum * 0.25) + (localIdx >= 8 ? 2 : 0));
  const baseTime = 50 + targetCount * 2.2 - tier.id * 1.4;
  const timeLimitSec = Math.max(35, Math.round(baseTime));

  let movingRatio = 0;
  let popupRatio = 0;
  let droneRatio = 0;
  let minRange = 12;
  let maxRange = 28;
  let targetSpeed = 1.6 + levelNum * 0.035;
  let headshotQuota = 0;

  switch (tier.id) {
    case 1: // Tutorials
      movingRatio = localIdx >= 5 ? 0.25 : 0;
      popupRatio = localIdx >= 7 ? 0.25 : 0;
      minRange = 10;
      maxRange = 22 + localIdx;
      break;
    case 2: // Pistol
      movingRatio = 0.25 + localIdx * 0.03;
      popupRatio = 0.2;
      minRange = 10;
      maxRange = 28;
      headshotQuota = localIdx >= 4 ? 2 + Math.floor(localIdx / 3) : 0;
      break;
    case 3: // Assault Rifle
      movingRatio = 0.35 + localIdx * 0.03;
      popupRatio = 0.25;
      minRange = 14;
      maxRange = 36;
      headshotQuota = 3;
      break;
    case 4: // Moving Targets
      movingRatio = 0.7 + localIdx * 0.025;
      popupRatio = 0.15;
      targetSpeed = 2.6 + localIdx * 0.22;
      minRange = 14;
      maxRange = 38;
      break;
    case 5: // Sniper
      movingRatio = 0.3 + localIdx * 0.03;
      popupRatio = 0.15;
      minRange = 26;
      maxRange = 54;
      headshotQuota = 3 + Math.floor(localIdx / 2);
      break;
    case 6: // Shotgun
      movingRatio = 0.35;
      popupRatio = 0.35;
      minRange = 7;
      maxRange = 18;
      break;
    case 7: // Multi-target
      movingRatio = 0.45;
      popupRatio = 0.35;
      minRange = 12;
      maxRange = 38;
      headshotQuota = 4;
      break;
    case 8: // Advanced Accuracy
      movingRatio = 0.5;
      popupRatio = 0.25;
      minRange = 18;
      maxRange = 48;
      headshotQuota = Math.ceil(targetCount * 0.45);
      break;
    case 9: // Expert
      movingRatio = 0.35;
      popupRatio = 0.2;
      droneRatio = 0.35 + localIdx * 0.02;
      minRange = 14;
      maxRange = 42;
      headshotQuota = 5;
      break;
    case 10: // Ultimate
    default:
      movingRatio = 0.35;
      popupRatio = 0.2;
      droneRatio = 0.45 + localIdx * 0.015;
      targetSpeed = 3.5 + localIdx * 0.25;
      minRange = 14;
      maxRange = 48;
      headshotQuota = Math.ceil(targetCount * 0.4);
      break;
  }

  const envName = ENVIRONMENT_MAP[environmentId].name.split(' ')[0];
  const milestoneSuffix =
    localIdx === 9
      ? 'Boss Qualification'
      : localIdx === 4
        ? 'Mid-Tier Trial'
        : `Stage ${localIdx + 1}`;

  return {
    level: levelNum,
    tierId: tier.id,
    tierTitle: tier.title,
    name: `${envName} ${milestoneSuffix}`,
    description: `${tier.summary} Clear ${targetCount} targets within ${timeLimitSec}s${
      headshotQuota > 0 ? ` (${headshotQuota}+ headshots)` : ''
    }.`,
    environmentId,
    recommendedCategory: tier.recommendedCategory,
    targetCount,
    timeLimitSec,
    movingRatio: Math.min(0.95, movingRatio),
    popupRatio: Math.min(0.6, popupRatio),
    droneRatio: Math.min(0.7, droneRatio),
    targetSpeed,
    minRange,
    maxRange,
    headshotQuota,
    rewardCredits: 180 + levelNum * 22 + (localIdx === 9 ? 250 : 0),
  };
}

export const LEVELS: MissionLevel[] = Array.from({ length: 100 }, (_, i) =>
  buildLevel(i + 1),
);

export function getLevelByNumber(levelNum: number): MissionLevel {
  const clamped = Math.max(1, Math.min(100, Math.floor(levelNum)));
  return LEVELS[clamped - 1];
}
