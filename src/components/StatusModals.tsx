import React from 'react';
import { Award, RotateCcw, Star } from 'lucide-react';
import { GameMode, RunOutcome } from '../game/rules';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenArmory: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenArmory,
  onOpenSettings,
  onMainMenu,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-zinc-950/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-5 shadow-2xl"
      >
        <div>
          <h2 id="pause-title" className="font-display text-2xl font-bold text-zinc-50">
            Session Paused
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Adjust loadout, settings, or resume downrange.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-sm cursor-pointer"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-sm cursor-pointer"
          >
            Restart Level
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenArmory}
              className="py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm cursor-pointer"
            >
              Armory
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm cursor-pointer"
            >
              Settings
            </button>
          </div>
          <button
            type="button"
            onClick={onMainMenu}
            className="w-full py-2.5 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-semibold text-sm cursor-pointer"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

interface OutcomeModalProps {
  mode: GameMode;
  levelNumber: number;
  outcome: RunOutcome;
  kills: number;
  headshots: number;
  elapsedSec: number;
  onPrimaryNext: () => void;
  onRetry: () => void;
  onMainMenu: () => void;
}

export const OutcomeModal: React.FC<OutcomeModalProps> = ({
  mode,
  levelNumber,
  outcome,
  kills,
  headshots,
  elapsedSec,
  onPrimaryNext,
  onRetry,
  onMainMenu,
}) => {
  const hasNextLevel = mode === 'mission' && outcome.victory && levelNumber < 100;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-zinc-950/85 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="outcome-title"
        className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className={`text-xs font-bold uppercase tracking-wider ${
                outcome.victory ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {outcome.victory ? 'Operation Complete' : 'Operation Failed'}
            </div>
            <h2
              id="outcome-title"
              className="font-display text-2xl font-bold text-zinc-50 mt-0.5"
            >
              {outcome.reason}
            </h2>
          </div>
          <Award
            className={`w-8 h-8 shrink-0 ${
              outcome.victory ? 'text-amber-400' : 'text-zinc-500'
            }`}
          />
        </div>

        {/* Star Rating */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              className={`w-6 h-6 ${
                s <= outcome.stars
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-zinc-700'
              }`}
            />
          ))}
          <span className="ml-auto font-mono-num text-sm font-bold text-amber-400">
            +{outcome.creditsEarned} CR
          </span>
        </div>

        {/* Mastery / Progress Metrics */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3">
            <div className="text-[11px] text-zinc-400">Score</div>
            <div className="font-mono-num text-lg font-bold text-zinc-50">
              {outcome.finalScore}
            </div>
          </div>
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3">
            <div className="text-[11px] text-zinc-400">Accuracy</div>
            <div className="font-mono-num text-lg font-bold text-zinc-50">
              {outcome.accuracyPercent}%
            </div>
          </div>
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3">
            <div className="text-[11px] text-zinc-400">Time / HS</div>
            <div className="font-mono-num text-lg font-bold text-zinc-50">
              {Math.round(elapsedSec)}s · {headshots}
            </div>
          </div>
        </div>

        <div className="text-xs text-zinc-400">
          Targets Eliminated: <span className="font-mono-num text-zinc-200">{kills}</span>
          {' · '}Accuracy Bonus:{' '}
          <span className="font-mono-num text-zinc-200">+{outcome.accuracyBonus}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          {hasNextLevel ? (
            <button
              type="button"
              data-start="true"
              onClick={onPrimaryNext}
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-sm cursor-pointer"
            >
              Next Level ({levelNumber + 1})
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onRetry}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>
          )}
          {hasNextLevel && (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-sm cursor-pointer"
            >
              Replay
            </button>
          )}
          <button
            type="button"
            onClick={onMainMenu}
            className="px-4 py-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-200 font-semibold text-sm cursor-pointer"
          >
            Menu
          </button>
        </div>
      </div>
    </div>
  );
};
