import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { ArmoryModal } from './components/ArmoryModal';
import { GameHUD } from './components/GameHUD';
import {
  GameViewport,
  LiveHudSnapshot,
  TouchInputState,
} from './components/GameViewport';
import { MissionSelectModal } from './components/MissionSelectModal';
import { SettingsModal } from './components/SettingsModal';
import { StatsAchievementsModal } from './components/StatsAchievementsModal';
import { OutcomeModal, PauseModal } from './components/StatusModals';
import { TitleScreen } from './components/TitleScreen';
import { EnvironmentId, getLevelByNumber } from './game/levels';
import {
  checkNewlyUnlockedAchievements,
  evaluateRunOutcome,
  GameMode,
  loadSaveData,
  persistSaveData,
  PlayerSaveData,
  PlayerSettings,
  RunOutcome,
} from './game/rules';
import { WeaponSkinId, WeaponUpgrades } from './game/weapons';

type GameState = 'title' | 'playing' | 'paused' | 'gameover';
type ActiveModal = 'none' | 'armory' | 'missions' | 'settings' | 'stats';

const INITIAL_HUD: LiveHudSnapshot = {
  ammoInMag: 30,
  reserveAmmo: 150,
  magSize: 30,
  isReloading: false,
  reloadProgress: 0,
  isAds: false,
  scopeZoomIndex: 0,
  scopeZoomLabel: '1x',
  isSniperScoped: false,
  playerHp: 100,
  maxHp: 100,
  score: 0,
  kills: 0,
  targetGoal: 5,
  headshots: 0,
  headshotQuota: 0,
  shotsFired: 0,
  shotsHit: 0,
  combo: 0,
  timeRemainingSec: 60,
  elapsedSec: 0,
  wave: 1,
  activeWeaponId: 'm4a1',
  activeSlotIndex: 0,
  cameraMode: 'fps',
  hitmarkerType: 'none',
  floatingFeed: null,
  damageFlash: 0,
  crosshairSpreadPx: 18,
};

export default function App() {
  const [saveData, setSaveData] = useState<PlayerSaveData>(() => loadSaveData());
  const [gameState, setGameState] = useState<GameState>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1' ? 'playing' : 'title';
  });
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [selectedMode, setSelectedMode] = useState<GameMode>('mission');
  const [selectedLevel, setSelectedLevel] = useState<number>(() =>
    Math.max(1, loadSaveData().highestLevelUnlocked),
  );
  const [selectedEnvironment, setSelectedEnvironment] =
    useState<EnvironmentId>('training_range');
  const [runNonce, setRunNonce] = useState<number>(1);
  const [hud, setHud] = useState<LiveHudSnapshot>(INITIAL_HUD);
  const [outcomeData, setOutcomeData] = useState<{
    outcome: RunOutcome;
    kills: number;
    headshots: number;
    elapsedSec: number;
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const touchInputRef = useRef<TouchInputState>({
    moveX: 0,
    moveY: 0,
    lookDeltaX: 0,
    lookDeltaY: 0,
    firing: false,
    justFired: false,
    aiming: false,
  });
  const actionQueueRef = useRef<string[]>([]);

  // Mirror state to document.body.dataset.state & sync sound engine
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  useEffect(() => {
    soundEngine.setMuted(saveData.settings.muted);
    soundEngine.setVolume(saveData.settings.masterVolume);
    persistSaveData(saveData);
  }, [saveData]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const startGame = useCallback(
    (modeOverride?: GameMode, levelOverride?: number, envOverride?: EnvironmentId) => {
      const m = modeOverride ?? selectedMode;
      const lvl = levelOverride ?? selectedLevel;
      const env = envOverride ?? selectedEnvironment;
      setSelectedMode(m);
      setSelectedLevel(lvl);
      setSelectedEnvironment(env);
      setActiveModal('none');
      setOutcomeData(null);
      setRunNonce((n) => n + 1);
      document.body.dataset.state = 'playing';
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setGameState('playing');
    },
    [selectedMode, selectedLevel, selectedEnvironment],
  );

  // Global keyboard shortcuts (Start on Enter/Space in Title, Pause on Esc/P, V Camera, M Mute)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeModal !== 'none') {
        if (e.code === 'Escape') {
          setActiveModal('none');
        }
        return;
      }

      if (gameState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (gameState === 'playing') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          document.exitPointerLock?.();
          setGameState('paused');
        } else if (e.code === 'KeyV') {
          setSaveData((prev) => ({
            ...prev,
            settings: {
              ...prev.settings,
              cameraMode: prev.settings.cameraMode === 'fps' ? 'tps' : 'fps',
            },
          }));
        } else if (e.code === 'KeyM') {
          setSaveData((prev) => ({
            ...prev,
            settings: { ...prev.settings, muted: !prev.settings.muted },
          }));
        }
      } else if (gameState === 'paused') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          setGameState('playing');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, activeModal, startGame]);

  const handleRunComplete = useCallback(
    (summary: {
      kills: number;
      headshots: number;
      shotsFired: number;
      shotsHit: number;
      score: number;
      elapsedSec: number;
      playerHp: number;
      waveReached: number;
    }) => {
      const level =
        selectedMode === 'mission' ? getLevelByNumber(selectedLevel) : undefined;
      const outcome = evaluateRunOutcome({
        mode: selectedMode,
        level,
        ...summary,
      });

      soundEngine.playOutcome(outcome.victory);

      setSaveData((prev) => {
        const next: PlayerSaveData = {
          ...prev,
          credits: prev.credits + outcome.creditsEarned,
          stats: {
            ...prev.stats,
            totalShotsFired: prev.stats.totalShotsFired + summary.shotsFired,
            totalShotsHit: prev.stats.totalShotsHit + summary.shotsHit,
            totalKills: prev.stats.totalKills + summary.kills,
            totalHeadshots: prev.stats.totalHeadshots + summary.headshots,
            missionsCompleted:
              prev.stats.missionsCompleted +
              (selectedMode === 'mission' && outcome.victory ? 1 : 0),
            survivalBestWave:
              selectedMode === 'survival'
                ? Math.max(prev.stats.survivalBestWave, summary.waveReached)
                : prev.stats.survivalBestWave,
            survivalBestScore:
              selectedMode === 'survival'
                ? Math.max(prev.stats.survivalBestScore, outcome.finalScore)
                : prev.stats.survivalBestScore,
            timeChallengeBestScore:
              selectedMode === 'time_challenge'
                ? Math.max(prev.stats.timeChallengeBestScore, outcome.finalScore)
                : prev.stats.timeChallengeBestScore,
          },
          dailyProgress: {
            ...prev.dailyProgress,
            kills: prev.dailyProgress.kills + summary.kills,
            headshots: prev.dailyProgress.headshots + summary.headshots,
            missionsCompleted:
              prev.dailyProgress.missionsCompleted +
              (selectedMode === 'mission' && outcome.victory ? 1 : 0),
          },
          levelBestScores: { ...prev.levelBestScores },
          levelStars: { ...prev.levelStars },
        };

        if (selectedMode === 'mission' && level) {
          next.levelBestScores[level.level] = Math.max(
            next.levelBestScores[level.level] ?? 0,
            outcome.finalScore,
          );
          next.levelStars[level.level] = Math.max(
            next.levelStars[level.level] ?? 0,
            outcome.stars,
          );
          if (outcome.victory && level.level >= next.highestLevelUnlocked) {
            next.highestLevelUnlocked = Math.min(100, level.level + 1);
          }
        }

        const newAchs = checkNewlyUnlockedAchievements(next);
        if (newAchs.length > 0) {
          next.unlockedAchievements = [
            ...next.unlockedAchievements,
            ...newAchs.map((a) => a.id),
          ];
          const bonus = newAchs.reduce((s, a) => s + a.rewardCredits, 0);
          next.credits += bonus;
          showToast(
            `Achievement Unlocked: ${newAchs[0].title} (+${bonus} CR)`,
          );
        }
        return next;
      });

      setOutcomeData({
        outcome,
        kills: summary.kills,
        headshots: summary.headshots,
        elapsedSec: summary.elapsedSec,
      });
      setGameState('gameover');
    },
    [selectedMode, selectedLevel, showToast],
  );

  const handleUpdateSettings = (patch: Partial<PlayerSettings>) => {
    setSaveData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  };

  return (
    <main className="relative w-full h-full overflow-hidden bg-zinc-950">
      {/* Persistent 3D WebGL Viewport */}
      <GameViewport
        gameState={gameState}
        mode={selectedMode}
        levelNumber={selectedLevel}
        environmentId={selectedEnvironment}
        saveData={saveData}
        cameraMode={saveData.settings.cameraMode}
        graphicsQuality={saveData.settings.graphicsQuality}
        runNonce={runNonce}
        touchInputRef={touchInputRef}
        actionQueueRef={actionQueueRef}
        onHudUpdate={setHud}
        onRunComplete={handleRunComplete}
        onSlotChange={(slotIndex) =>
          setSaveData((prev) => ({ ...prev, activeSlotIndex: slotIndex }))
        }
      />

      {/* Title Screen */}
      {gameState === 'title' && (
        <TitleScreen
          saveData={saveData}
          selectedMode={selectedMode}
          selectedLevel={selectedLevel}
          onSelectMode={setSelectedMode}
          onStartGame={(m) => startGame(m)}
          onOpenArmory={() => setActiveModal('armory')}
          onOpenMissions={() => setActiveModal('missions')}
          onOpenStats={() => setActiveModal('stats')}
          onOpenSettings={() => setActiveModal('settings')}
        />
      )}

      {/* Active Gameplay HUD */}
      {gameState === 'playing' && (
        <GameHUD
          hud={hud}
          mode={selectedMode}
          levelNumber={selectedLevel}
          saveData={saveData}
          cameraMode={saveData.settings.cameraMode}
          touchInputRef={touchInputRef}
          actionQueueRef={actionQueueRef}
          onToggleCamera={() =>
            handleUpdateSettings({
              cameraMode: saveData.settings.cameraMode === 'fps' ? 'tps' : 'fps',
            })
          }
          onToggleMute={() =>
            handleUpdateSettings({ muted: !saveData.settings.muted })
          }
          onPause={() => {
            document.exitPointerLock?.();
            setGameState('paused');
          }}
          onSelectSlot={(slotIndex) =>
            setSaveData((prev) => ({ ...prev, activeSlotIndex: slotIndex }))
          }
        />
      )}

      {/* Pause Modal */}
      {gameState === 'paused' && activeModal === 'none' && (
        <PauseModal
          onResume={() => setGameState('playing')}
          onRestart={() => startGame()}
          onOpenArmory={() => setActiveModal('armory')}
          onOpenSettings={() => setActiveModal('settings')}
          onMainMenu={() => setGameState('title')}
        />
      )}

      {/* Victory / Defeat Outcome Modal */}
      {gameState === 'gameover' && outcomeData && (
        <OutcomeModal
          mode={selectedMode}
          levelNumber={selectedLevel}
          outcome={outcomeData.outcome}
          kills={outcomeData.kills}
          headshots={outcomeData.headshots}
          elapsedSec={outcomeData.elapsedSec}
          onPrimaryNext={() =>
            startGame('mission', Math.min(100, selectedLevel + 1))
          }
          onRetry={() => startGame()}
          onMainMenu={() => setGameState('title')}
        />
      )}

      {/* Weapon Collection / Armory Modal */}
      {activeModal === 'armory' && (
        <ArmoryModal
          saveData={saveData}
          onClose={() => setActiveModal('none')}
          onUnlockWeapon={(weaponId, cost) => {
            setSaveData((prev) => {
              if (
                prev.unlockedWeapons.includes(weaponId) ||
                prev.credits < cost
              )
                return prev;
              return {
                ...prev,
                credits: prev.credits - cost,
                unlockedWeapons: [...prev.unlockedWeapons, weaponId],
              };
            });
          }}
          onEquipWeapon={(slotIndex, weaponId) => {
            setSaveData((prev) => {
              const nextLoadout = [...prev.equippedLoadout] as [
                string,
                string,
                string,
              ];
              nextLoadout[slotIndex] = weaponId;
              return {
                ...prev,
                equippedLoadout: nextLoadout,
                activeSlotIndex: slotIndex,
              };
            });
          }}
          onSelectSkin={(weaponId, skinId: WeaponSkinId, cost) => {
            setSaveData((prev) => {
              if (prev.credits < cost) return prev;
              const unlockedSkins = prev.unlockedSkins.includes(skinId)
                ? prev.unlockedSkins
                : [...prev.unlockedSkins, skinId];
              return {
                ...prev,
                credits: prev.credits - cost,
                unlockedSkins,
                weaponSkins: { ...prev.weaponSkins, [weaponId]: skinId },
              };
            });
          }}
          onUpgradeWeapon={(
            weaponId,
            stat: keyof WeaponUpgrades,
            cost,
          ) => {
            setSaveData((prev) => {
              if (prev.credits < cost) return prev;
              const cur = prev.weaponUpgrades[weaponId] ?? {
                barrel: 0,
                magazine: 0,
                grip: 0,
                optics: 0,
              };
              if (cur[stat] >= 3) return prev;
              return {
                ...prev,
                credits: prev.credits - cost,
                weaponUpgrades: {
                  ...prev.weaponUpgrades,
                  [weaponId]: { ...cur, [stat]: cur[stat] + 1 },
                },
              };
            });
          }}
        />
      )}

      {/* 100 Missions & 7 Environments Modal */}
      {activeModal === 'missions' && (
        <MissionSelectModal
          saveData={saveData}
          selectedMode={selectedMode}
          selectedLevel={selectedLevel}
          selectedEnvironment={selectedEnvironment}
          onSelectEnvironment={(envId) => setSelectedEnvironment(envId)}
          onLaunchLevel={(lvlNum) => startGame('mission', lvlNum)}
          onLaunchModeInEnv={(m, envId) => startGame(m, selectedLevel, envId)}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Settings & Button Layout Customizer */}
      {activeModal === 'settings' && (
        <SettingsModal
          settings={saveData.settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Daily Challenges, Achievements & Career Stats */}
      {activeModal === 'stats' && (
        <StatsAchievementsModal
          saveData={saveData}
          onClaimDaily={(challengeId, reward) => {
            setSaveData((prev) => {
              if (prev.dailyProgress.claimedIds.includes(challengeId))
                return prev;
              return {
                ...prev,
                credits: prev.credits + reward,
                dailyProgress: {
                  ...prev.dailyProgress,
                  claimedIds: [...prev.dailyProgress.claimedIds, challengeId],
                },
              };
            });
            showToast(`Daily Challenge Claimed (+${reward} CR)`);
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Achievement / Reward Toast */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-display font-bold text-xs shadow-xl pointer-events-none">
          {toastMsg}
        </div>
      )}
    </main>
  );
}
