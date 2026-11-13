import React, { useState } from 'react';
import { Lock, MapPin, Star, X } from 'lucide-react';
import {
  ENVIRONMENT_MAP,
  ENVIRONMENTS,
  EnvironmentId,
  LEVEL_TIERS,
  LEVELS,
} from '../game/levels';
import { GameMode, PlayerSaveData } from '../game/rules';

interface MissionSelectModalProps {
  saveData: PlayerSaveData;
  selectedMode: GameMode;
  selectedLevel: number;
  selectedEnvironment: EnvironmentId;
  onSelectEnvironment: (envId: EnvironmentId) => void;
  onLaunchLevel: (levelNumber: number) => void;
  onLaunchModeInEnv: (mode: GameMode, envId: EnvironmentId) => void;
  onClose: () => void;
}

export const MissionSelectModal: React.FC<MissionSelectModalProps> = ({
  saveData,
  selectedMode,
  selectedLevel,
  selectedEnvironment,
  onSelectEnvironment,
  onLaunchLevel,
  onLaunchModeInEnv,
  onClose,
}) => {
  const initialTier =
    LEVELS[Math.max(0, selectedLevel - 1)]?.tierId ?? 1;
  const [activeTierId, setActiveTierId] = useState<number>(initialTier);
  const [tab, setTab] = useState<'levels' | 'environments'>(
    selectedMode === 'mission' ? 'levels' : 'environments',
  );

  const tierLevels = LEVELS.filter((l) => l.tierId === activeTierId);
  const activeTier = LEVEL_TIERS.find((t) => t.id === activeTierId)!;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/90 p-3 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="missions-title"
        className="w-full max-w-5xl max-h-[92vh] bg-zinc-900 border border-zinc-700 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 id="missions-title" className="font-display text-xl sm:text-2xl font-bold text-zinc-50">
              100 Missions &amp; 7 Shooting Arenas
            </h2>
            <p className="text-xs text-zinc-400">
              Highest Unlocked: Level {saveData.highestLevelUnlocked} / 100
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-zinc-950 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setTab('levels')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                  tab === 'levels'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-300 hover:text-zinc-100'
                }`}
              >
                100 Levels
              </button>
              <button
                type="button"
                onClick={() => setTab('environments')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                  tab === 'environments'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-300 hover:text-zinc-100'
                }`}
              >
                7 Environments
              </button>
            </div>
            <button
              type="button"
              aria-label="Close Mission Select"
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {tab === 'levels' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 10 Tiers Navigation */}
            <div className="flex items-center gap-1.5 px-5 py-3 border-b border-zinc-800 overflow-x-auto">
              {LEVEL_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setActiveTierId(tier.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    activeTierId === tier.id
                      ? 'bg-amber-500 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {tier.startLevel}–{tier.endLevel}
                </button>
              ))}
            </div>

            <div className="px-5 py-3 bg-zinc-950/60 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-display text-base font-bold text-amber-400">
                  {activeTier.title}
                </div>
                <div className="text-xs text-zinc-400">{activeTier.summary}</div>
              </div>
              <div className="text-xs text-zinc-300">
                Recommended:{' '}
                <span className="font-semibold text-zinc-100 uppercase">
                  {activeTier.recommendedCategory}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {tierLevels.map((lvl) => {
                const unlocked = lvl.level <= saveData.highestLevelUnlocked;
                const stars = saveData.levelStars[lvl.level] ?? 0;
                const bestScore = saveData.levelBestScores[lvl.level] ?? 0;
                const env = ENVIRONMENT_MAP[lvl.environmentId];
                return (
                  <button
                    key={lvl.level}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => onLaunchLevel(lvl.level)}
                    className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-colors ${
                      unlocked
                        ? lvl.level === selectedLevel
                          ? 'bg-zinc-800 border-amber-500 cursor-pointer'
                          : 'bg-zinc-950/70 border-zinc-800 hover:border-amber-500/70 cursor-pointer'
                        : 'bg-zinc-950/40 border-zinc-800/50 opacity-55 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono-num text-base font-bold text-zinc-50">
                          LVL {lvl.level}
                        </span>
                        {!unlocked ? (
                          <Lock className="w-4 h-4 text-zinc-500" />
                        ) : (
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= stars
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-zinc-700'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-zinc-200 mt-1.5">
                        {lvl.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {env.name}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                      <span>{lvl.targetCount} Targets</span>
                      <span className="font-mono-num text-amber-400">
                        {bestScore > 0 ? `Best ${bestScore}` : `+${lvl.rewardCredits} CR`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scroll p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ENVIRONMENTS.map((env) => {
              const selected = env.id === selectedEnvironment;
              const swatch = `#${env.groundColor.toString(16).padStart(6, '0')}`;
              const sky = `#${env.skyColor.toString(16).padStart(6, '0')}`;
              return (
                <div
                  key={env.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                    selected
                      ? 'bg-zinc-800/90 border-amber-500'
                      : 'bg-zinc-950/70 border-zinc-800'
                  }`}
                >
                  <div>
                    <div
                      className="h-14 rounded-lg mb-3 border border-white/10"
                      style={{
                        background: `linear-gradient(180deg, ${sky} 0%, ${swatch} 100%)`,
                      }}
                    />
                    <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-50">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{env.name}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{env.subtitle}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => onSelectEnvironment(env.id)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
                    >
                      {selected ? 'Selected' : 'Select'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onLaunchModeInEnv('practice', env.id)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-zinc-950 cursor-pointer"
                    >
                      Practice
                    </button>
                    <button
                      type="button"
                      onClick={() => onLaunchModeInEnv('survival', env.id)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-xs font-semibold text-zinc-100 cursor-pointer"
                    >
                      Survival
                    </button>
                    <button
                      type="button"
                      onClick={() => onLaunchModeInEnv('time_challenge', env.id)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-xs font-semibold text-zinc-100 cursor-pointer"
                    >
                      Time Blitz
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
