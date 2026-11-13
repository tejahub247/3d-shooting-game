import { EnvironmentId, MissionLevel } from './levels';
import { WeaponSkinId, WeaponUpgrades, WeaponDefinition, getEffectiveWeaponStats } from './weapons';

export type GameMode = 'practice' | 'mission' | 'survival' | 'time_challenge';
export type CameraPerspective = 'fps' | 'tps';
export type GraphicsQuality = 'high' | 'medium' | 'low';
export type TouchControlsMode = 'auto' | 'always' | 'off';

export interface ButtonOffsets {
  fire: { x: number; y: number };
  aim: { x: number; y: number };
  reload: { x: number; y: number };
  jump: { x: number; y: number };
  crouch: { x: number; y: number };
  switchWeapon: { x: number; y: number };
  scope: { x: number; y: number };
}

export const DEFAULT_BUTTON_OFFSETS: ButtonOffsets = {
  fire: { x: 0, y: 0 },
  aim: { x: 0, y: 0 },
  reload: { x: 0, y: 0 },
  jump: { x: 0, y: 0 },
  crouch: { x: 0, y: 0 },
  switchWeapon: { x: 0, y: 0 },
  scope: { x: 0, y: 0 },
};

export interface PlayerSettings {
  lookSensitivity: number; // 0.3..2.5
  adsSensitivity: number; // 0.2..1.5
  cameraMode: CameraPerspective;
  graphicsQuality: GraphicsQuality;
  touchControls: TouchControlsMode;
  buttonScale: number; // 0.8..1.35
  buttonOffsets: ButtonOffsets;
  muted: boolean;
  masterVolume: number; // 0..1
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  rewardCredits: number;
  target: number;
  metric: 'kills' | 'headshots' | 'missionsCleared' | 'weaponsUnlocked' | 'survivalWave' | 'timeBest';
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_blood',
    title: 'Range Qualified',
    description: 'Eliminate 25 targets across any mode.',
    rewardCredits: 300,
    target: 25,
    metric: 'kills',
  },
  {
    id: 'marksman_100',
    title: 'Sharp Eye',
    description: 'Land 50 precision headshots.',
    rewardCredits: 600,
    target: 50,
    metric: 'headshots',
  },
  {
    id: 'mission_25',
    title: 'Field Specialist',
    description: 'Complete Mission Level 25.',
    rewardCredits: 800,
    target: 25,
    metric: 'missionsCleared',
  },
  {
    id: 'arsenal_collector',
    title: 'Quartermaster',
    description: 'Unlock 8 different weapons in the Armory.',
    rewardCredits: 900,
    target: 8,
    metric: 'weaponsUnlocked',
  },
  {
    id: 'survivor_wave5',
    title: 'Iron Stance',
    description: 'Reach Wave 5 in Survival Mode.',
    rewardCredits: 750,
    target: 5,
    metric: 'survivalWave',
  },
  {
    id: 'blitz_ace',
    title: 'Rapid Reflex',
    description: 'Score 2,500+ points in Time Challenge.',
    rewardCredits: 700,
    target: 2500,
    metric: 'timeBest',
  },
];

export interface DailyChallenge {
  id: string;
  dateKey: string;
  title: string;
  metric: 'kills' | 'headshots' | 'missionsCompleted';
  target: number;
  rewardCredits: number;
}

export interface PlayerStats {
  totalShotsFired: number;
  totalShotsHit: number;
  totalKills: number;
  totalHeadshots: number;
  missionsCompleted: number;
  survivalBestWave: number;
  survivalBestScore: number;
  timeChallengeBestScore: number;
}

export interface PlayerSaveData {
  credits: number;
  unlockedWeapons: string[];
  equippedLoadout: [string, string, string]; // Primary, Secondary, Heavy/Special
  activeSlotIndex: number;
  weaponSkins: Record<string, WeaponSkinId>;
  unlockedSkins: WeaponSkinId[];
  weaponUpgrades: Record<string, WeaponUpgrades>;
  highestLevelUnlocked: number;
  levelBestScores: Record<number, number>;
  levelStars: Record<number, number>;
  unlockedAchievements: string[];
  dailyProgress: {
    dateKey: string;
    kills: number;
    headshots: number;
    missionsCompleted: number;
    claimedIds: string[];
  };
  stats: PlayerStats;
  settings: PlayerSettings;
}

export const SAVE_STORAGE_KEY = 'vanguard_range_3d_save_v1';

export function getTodayDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailyChallenges(dateKey = getTodayDateKey()): DailyChallenge[] {
  const seed = dateKey.split('-').reduce((acc, part) => acc + Number(part), 0);
  const killTarget = 18 + (seed % 4) * 5;
  const headTarget = 8 + (seed % 3) * 3;
  const missionTarget = 2 + (seed % 2);
  return [
    {
      id: 'daily_kills',
      dateKey,
      title: `Eliminate ${killTarget} targets today`,
      metric: 'kills',
      target: killTarget,
      rewardCredits: 350,
    },
    {
      id: 'daily_headshots',
      dateKey,
      title: `Score ${headTarget} headshots today`,
      metric: 'headshots',
      target: headTarget,
      rewardCredits: 400,
    },
    {
      id: 'daily_missions',
      dateKey,
      title: `Clear ${missionTarget} mission levels today`,
      metric: 'missionsCompleted',
      target: missionTarget,
      rewardCredits: 450,
    },
  ];
}

export function createDefaultSaveData(todayKey = getTodayDateKey()): PlayerSaveData {
  return {
    credits: 1200,
    unlockedWeapons: ['m4a1', 'glock19', 'pump_shotgun', 'kar98', 'ump45'],
    equippedLoadout: ['m4a1', 'glock19', 'kar98'],
    activeSlotIndex: 0,
    weaponSkins: {},
    unlockedSkins: ['matte_obsidian'],
    weaponUpgrades: {},
    highestLevelUnlocked: 1,
    levelBestScores: {},
    levelStars: {},
    unlockedAchievements: [],
    dailyProgress: {
      dateKey: todayKey,
      kills: 0,
      headshots: 0,
      missionsCompleted: 0,
      claimedIds: [],
    },
    stats: {
      totalShotsFired: 0,
      totalShotsHit: 0,
      totalKills: 0,
      totalHeadshots: 0,
      missionsCompleted: 0,
      survivalBestWave: 0,
      survivalBestScore: 0,
      timeChallengeBestScore: 0,
    },
    settings: {
      lookSensitivity: 1.0,
      adsSensitivity: 0.55,
      cameraMode: 'fps',
      graphicsQuality: 'high',
      touchControls: 'auto',
      buttonScale: 1.0,
      buttonOffsets: { ...DEFAULT_BUTTON_OFFSETS },
      muted: false,
      masterVolume: 0.75,
    },
  };
}

export function loadSaveData(): PlayerSaveData {
  const todayKey = getTodayDateKey();
  const base = createDefaultSaveData(todayKey);
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<PlayerSaveData>;
    const merged: PlayerSaveData = {
      ...base,
      ...parsed,
      stats: { ...base.stats, ...(parsed.stats ?? {}) },
      settings: {
        ...base.settings,
        ...(parsed.settings ?? {}),
        buttonOffsets: {
          ...base.settings.buttonOffsets,
          ...(parsed.settings?.buttonOffsets ?? {}),
        },
      },
      dailyProgress:
        parsed.dailyProgress && parsed.dailyProgress.dateKey === todayKey
          ? parsed.dailyProgress
          : base.dailyProgress,
    };
    return merged;
  } catch {
    return base;
  }
}

export function persistSaveData(data: PlayerSaveData): void {
  try {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}

export function calculateBulletDamage(params: {
  weapon: WeaponDefinition;
  upgrades?: WeaponUpgrades;
  distanceMeters: number;
  isHeadshot: boolean;
  armorFactor?: number;
}): number {
  const stats = getEffectiveWeaponStats(params.weapon, params.upgrades);
  const falloffStart = stats.rangeMeters * 0.55;
  let falloffMult = 1.0;
  if (params.distanceMeters > falloffStart) {
    const excess = params.distanceMeters - falloffStart;
    const span = Math.max(10, stats.rangeMeters - falloffStart);
    falloffMult = Math.max(0.45, 1 - (excess / span) * 0.55);
  }
  const headMult = params.isHeadshot ? stats.headshotMultiplier : 1.0;
  const armor = params.armorFactor ?? 1.0;
  return Math.max(1, Math.round(stats.damage * falloffMult * headMult * armor));
}

export function calculateHitScore(params: {
  isHeadshot: boolean;
  isKill: boolean;
  distanceMeters: number;
  combo: number;
}): number {
  const base = params.isHeadshot ? 120 : 50;
  const killBonus = params.isKill ? (params.isHeadshot ? 150 : 90) : 0;
  const distBonus = Math.min(80, Math.round(params.distanceMeters * 1.2));
  const comboMult = 1 + Math.min(2.0, Math.max(0, params.combo - 1) * 0.15);
  return Math.round((base + killBonus + distBonus) * comboMult);
}

export function calculateAccuracyPercent(shotsHit: number, shotsFired: number): number {
  if (shotsFired <= 0) return 0;
  return Math.min(100, Math.round((shotsHit / shotsFired) * 100));
}

export interface RunSummaryInput {
  mode: GameMode;
  level?: MissionLevel;
  kills: number;
  headshots: number;
  shotsFired: number;
  shotsHit: number;
  score: number;
  elapsedSec: number;
  playerHp: number;
  waveReached: number;
}

export interface RunOutcome {
  victory: boolean;
  reason: string;
  stars: number;
  accuracyPercent: number;
  accuracyBonus: number;
  finalScore: number;
  creditsEarned: number;
}

export function evaluateRunOutcome(input: RunSummaryInput): RunOutcome {
  const accuracyPercent = calculateAccuracyPercent(input.shotsHit, input.shotsFired);
  const accuracyBonus = Math.round(accuracyPercent * 6);

  if (input.mode === 'mission' && input.level) {
    const metKills = input.kills >= input.level.targetCount;
    const metHeadshots = input.headshots >= input.level.headshotQuota;
    const alive = input.playerHp > 0;
    const withinTime = input.elapsedSec <= input.level.timeLimitSec;
    const victory = alive && metKills && metHeadshots && withinTime;

    let reason = 'Mission Complete';
    if (!alive) reason = 'Operator Eliminated';
    else if (!withinTime) reason = 'Time Expired';
    else if (!metKills) reason = 'Targets Remaining';
    else if (!metHeadshots)
      reason = `Need ${input.level.headshotQuota} Headshots`;

    const timeRatio = Math.max(0, 1 - input.elapsedSec / input.level.timeLimitSec);
    const stars = !victory
      ? 0
      : accuracyPercent >= 65 && timeRatio >= 0.3
        ? 3
        : accuracyPercent >= 40
          ? 2
          : 1;

    const finalScore = input.score + accuracyBonus + (victory ? Math.round(timeRatio * 500) : 0);
    const creditsEarned = victory
      ? input.level.rewardCredits + stars * 40
      : Math.max(25, Math.round(input.kills * 12));

    return {
      victory,
      reason,
      stars,
      accuracyPercent,
      accuracyBonus,
      finalScore,
      creditsEarned,
    };
  }

  if (input.mode === 'time_challenge') {
    const finalScore = input.score + accuracyBonus;
    const victory = input.kills >= 10;
    return {
      victory,
      reason: 'Time Challenge Complete',
      stars: finalScore >= 3000 ? 3 : finalScore >= 1600 ? 2 : 1,
      accuracyPercent,
      accuracyBonus,
      finalScore,
      creditsEarned: Math.max(60, Math.round(finalScore * 0.14)),
    };
  }

  if (input.mode === 'survival') {
    const finalScore = input.score + accuracyBonus + input.waveReached * 250;
    return {
      victory: input.waveReached >= 3,
      reason: input.playerHp <= 0 ? `Fell on Wave ${input.waveReached}` : 'Survival Ended',
      stars: input.waveReached >= 6 ? 3 : input.waveReached >= 3 ? 2 : 1,
      accuracyPercent,
      accuracyBonus,
      finalScore,
      creditsEarned: Math.max(50, input.waveReached * 90 + input.kills * 10),
    };
  }

  // Practice
  return {
    victory: true,
    reason: 'Practice Session Complete',
    stars: 3,
    accuracyPercent,
    accuracyBonus,
    finalScore: input.score + accuracyBonus,
    creditsEarned: Math.min(300, Math.round(input.kills * 8)),
  };
}

export function checkNewlyUnlockedAchievements(save: PlayerSaveData): AchievementDefinition[] {
  const newlyUnlocked: AchievementDefinition[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (save.unlockedAchievements.includes(ach.id)) continue;
    let value = 0;
    switch (ach.metric) {
      case 'kills':
        value = save.stats.totalKills;
        break;
      case 'headshots':
        value = save.stats.totalHeadshots;
        break;
      case 'missionsCleared':
        value = Math.max(save.highestLevelUnlocked - 1, save.stats.missionsCompleted);
        break;
      case 'weaponsUnlocked':
        value = save.unlockedWeapons.length;
        break;
      case 'survivalWave':
        value = save.stats.survivalBestWave;
        break;
      case 'timeBest':
        value = save.stats.timeChallengeBestScore;
        break;
    }
    if (value >= ach.target) {
      newlyUnlocked.push(ach);
    }
  }
  return newlyUnlocked;
}

export interface SessionConfig {
  mode: GameMode;
  levelNumber: number;
  environmentId: EnvironmentId;
}
