import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPONS,
  WEAPON_SKINS,
  getWeaponById,
  getEffectiveWeaponStats,
  getUpgradeCost,
} from './weapons';
import { ENVIRONMENTS, LEVELS, LEVEL_TIERS, getLevelByNumber } from './levels';
import {
  calculateAccuracyPercent,
  calculateBulletDamage,
  calculateHitScore,
  checkNewlyUnlockedAchievements,
  createDefaultSaveData,
  evaluateRunOutcome,
  getDailyChallenges,
} from './rules';

test('weapon catalog contains all 17 requested weapons across 5 categories', () => {
  assert.equal(WEAPONS.length, 17);
  const counts = WEAPONS.reduce<Record<string, number>>((acc, w) => {
    acc[w.category] = (acc[w.category] ?? 0) + 1;
    return acc;
  }, {});
  assert.equal(counts.pistol, 4);
  assert.equal(counts.assault, 4);
  assert.equal(counts.sniper, 3);
  assert.equal(counts.shotgun, 3);
  assert.equal(counts.smg, 3);
  assert.ok(WEAPON_SKINS.length >= 5);
});

test('weapon upgrades increase damage, mag size, and reduce reload time', () => {
  const m4 = getWeaponById('m4a1');
  const base = getEffectiveWeaponStats(m4);
  const upgraded = getEffectiveWeaponStats(m4, {
    barrel: 3,
    magazine: 3,
    grip: 3,
    optics: 3,
  });
  assert.ok(upgraded.damage > base.damage);
  assert.ok(upgraded.magSize > base.magSize);
  assert.ok(upgraded.reloadTimeSec < base.reloadTimeSec);
  assert.ok(upgraded.recoilPitch < base.recoilPitch);
  assert.equal(getUpgradeCost(0), 250);
  assert.equal(getUpgradeCost(3), 0);
});

test('all 100 levels and 7 environments are properly structured and progressive', () => {
  assert.equal(ENVIRONMENTS.length, 7);
  assert.equal(LEVELS.length, 100);
  assert.equal(LEVEL_TIERS.length, 10);

  const l1 = getLevelByNumber(1);
  const l45 = getLevelByNumber(45);
  const l100 = getLevelByNumber(100);

  assert.equal(l1.level, 1);
  assert.equal(l1.tierId, 1);
  assert.equal(l45.recommendedCategory, 'sniper');
  assert.equal(l100.level, 100);
  assert.equal(l100.tierId, 10);
  assert.ok(l100.targetCount > l1.targetCount);
  assert.ok(l100.droneRatio > 0);
});

test('ballistic damage applies headshot multiplier and distance falloff', () => {
  const awm = getWeaponById('awm');
  const closeBody = calculateBulletDamage({
    weapon: awm,
    distanceMeters: 20,
    isHeadshot: false,
  });
  const closeHead = calculateBulletDamage({
    weapon: awm,
    distanceMeters: 20,
    isHeadshot: true,
  });
  const farBody = calculateBulletDamage({
    weapon: awm,
    distanceMeters: 350,
    isHeadshot: false,
  });

  assert.ok(closeHead > closeBody * 2);
  assert.ok(farBody < closeBody);
});

test('hit scoring and mission outcome evaluate victory, stars, and accuracy bonus', () => {
  const headKill = calculateHitScore({
    isHeadshot: true,
    isKill: true,
    distanceMeters: 30,
    combo: 3,
  });
  const bodyHit = calculateHitScore({
    isHeadshot: false,
    isKill: false,
    distanceMeters: 10,
    combo: 1,
  });
  assert.ok(headKill > bodyHit * 3);
  assert.equal(calculateAccuracyPercent(15, 20), 75);

  const lvl1 = getLevelByNumber(1);
  const win = evaluateRunOutcome({
    mode: 'mission',
    level: lvl1,
    kills: lvl1.targetCount,
    headshots: 2,
    shotsFired: 10,
    shotsHit: 8,
    score: 1200,
    elapsedSec: 20,
    playerHp: 100,
    waveReached: 1,
  });
  assert.equal(win.victory, true);
  assert.equal(win.stars, 3);
  assert.ok(win.creditsEarned >= lvl1.rewardCredits);

  const loss = evaluateRunOutcome({
    mode: 'mission',
    level: lvl1,
    kills: 1,
    headshots: 0,
    shotsFired: 10,
    shotsHit: 2,
    score: 100,
    elapsedSec: lvl1.timeLimitSec + 5,
    playerHp: 100,
    waveReached: 1,
  });
  assert.equal(loss.victory, false);
  assert.equal(loss.stars, 0);
});

test('daily challenges and achievement detection work deterministically', () => {
  const daily = getDailyChallenges('2026-11-13');
  assert.equal(daily.length, 3);

  const save = createDefaultSaveData('2026-11-13');
  save.stats.totalKills = 30;
  save.stats.totalHeadshots = 55;
  const newly = checkNewlyUnlockedAchievements(save);
  const ids = newly.map((a) => a.id);
  assert.ok(ids.includes('first_blood'));
  assert.ok(ids.includes('marksman_100'));
});
