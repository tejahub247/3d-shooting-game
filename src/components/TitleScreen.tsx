import React from 'react';
import { Crosshair, Shield, Swords, Target, Trophy, Wrench } from 'lucide-react';
import { getLevelByNumber } from '../game/levels';
import { GameMode, PlayerSaveData } from '../game/rules';

interface TitleScreenProps {
  saveData: PlayerSaveData;
  selectedMode: GameMode;
  selectedLevel: number;
  onSelectMode: (mode: GameMode) => void;
  onStartGame: (modeOverride?: GameMode) => void;
  onOpenArmory: () => void;
  onOpenMissions: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  saveData,
  selectedMode,
  selectedLevel,
  onSelectMode,
  onStartGame,
  onOpenArmory,
  onOpenMissions,
  onOpenStats,
  onOpenSettings,
}) => {
  const currentLvl = getLevelByNumber(selectedLevel);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none bg-gradient-to-r from-zinc-950/85 via-zinc-950/35 to-transparent p-5 sm:p-10">
      {/* Top Bar: Credits & Quick Utility */}
      <div className="flex items-center justify-between gap-4 pointer-events-auto">
        <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
          <span className="font-mono-num font-bold text-amber-400">
            {saveData.credits.toLocaleString()} CR
          </span>
          <span aria-hidden="true" className="text-zinc-600">·</span>
          <span>
            Level {saveData.highestLevelUnlocked} / 100
          </span>
          <span aria-hidden="true" className="text-zinc-600 hidden sm:inline">·</span>
          <span className="hidden sm:inline text-zinc-400">
            {saveData.unlockedWeapons.length} / 17 Weapons
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenStats}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700/70 text-xs font-medium text-zinc-200 hover:border-amber-500/70 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Challenges</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700/70 text-xs font-medium text-zinc-200 hover:border-amber-500/70 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5 text-zinc-300" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Left-Third Negative Space Title Lockup & Actions */}
      <div className="max-w-lg my-auto pointer-events-auto space-y-6">
        <div className="flex items-center gap-4">
          <svg
            viewBox="0 0 64 64"
            className="w-14 h-14 shrink-0"
            aria-hidden="true"
          >
            <polygon
              points="32,4 58,18 58,46 32,60 6,46 6,18"
              fill="#18181b"
              stroke="#f59e0b"
              strokeWidth="2.5"
            />
            <circle cx="32" cy="32" r="14" fill="none" stroke="#e4e4e7" strokeWidth="2" />
            <circle cx="32" cy="32" r="4" fill="#f59e0b" />
            <line x1="32" y1="10" x2="32" y2="22" stroke="#f59e0b" strokeWidth="2.5" />
            <line x1="32" y1="42" x2="32" y2="54" stroke="#f59e0b" strokeWidth="2.5" />
            <line x1="10" y1="32" x2="22" y2="32" stroke="#f59e0b" strokeWidth="2.5" />
            <line x1="42" y1="32" x2="54" y2="32" stroke="#f59e0b" strokeWidth="2.5" />
          </svg>
          <div>
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-zinc-50 leading-none">
              Vanguard Range 3D
            </h1>
            <p className="mt-1.5 text-sm text-zinc-300">
              17 Ballistic Weapons · 7 Tactical Arenas · 100 Missions
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-zinc-900/90 border border-zinc-800 rounded-xl"
          role="tablist"
          aria-label="Game Mode"
        >
          {(
            [
              { id: 'mission', label: 'Mission', icon: Target },
              { id: 'practice', label: 'Practice', icon: Crosshair },
              { id: 'survival', label: 'Survival', icon: Shield },
              { id: 'time_challenge', label: 'Time Blitz', icon: Swords },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = selectedMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectMode(item.id)}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Mode Brief */}
        <div className="bg-zinc-900/85 border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
            <span>
              {selectedMode === 'mission'
                ? `Level ${currentLvl.level} · ${currentLvl.tierTitle}`
                : selectedMode === 'practice'
                  ? 'Free Range Training'
                  : selectedMode === 'survival'
                    ? 'Endless Drone Waves'
                    : '60-Second Accuracy Blitz'}
            </span>
            {selectedMode === 'mission' && (
              <button
                type="button"
                onClick={onOpenMissions}
                className="text-zinc-200 underline underline-offset-2 hover:text-amber-300 cursor-pointer"
              >
                Change Level
              </button>
            )}
          </div>
          <p className="text-sm text-zinc-200">
            {selectedMode === 'mission'
              ? `${currentLvl.name} — ${currentLvl.description}`
              : selectedMode === 'practice'
                ? 'Unlimited reserve ammo with stationary, moving, and pop-up range lanes.'
                : selectedMode === 'survival'
                  ? 'Survive escalating hostile drone waves. Eliminated waves restore armor.'
                  : 'Destroy as many targets as possible in 60 seconds with accuracy bonuses.'}
          </p>
        </div>

        {/* Primary CTA + Secondary Menu Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={() => onStartGame()}
            className="px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-zinc-950 font-display font-bold text-base tracking-wide shadow-lg transition-all cursor-pointer whitespace-nowrap"
          >
            Play Game
          </button>

          <button
            type="button"
            onClick={onOpenArmory}
            className="px-5 py-3.5 rounded-xl bg-zinc-900/95 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Weapon Collection
          </button>

          <button
            type="button"
            onClick={onOpenMissions}
            className="px-5 py-3.5 rounded-xl bg-zinc-900/95 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            {selectedMode === 'mission' ? '100 Levels' : 'Arenas & Levels'}
          </button>
        </div>
      </div>

      {/* Single Flat Borderless Control Hint Line */}
      <div className="text-xs text-zinc-400 hud-text-shadow">
        WASD Move · Mouse / Drag Look · Left-Click Fire · Right-Click Aim · R Reload · Z Scope · V FPS/TPS · Esc Pause
      </div>
    </div>
  );
};
