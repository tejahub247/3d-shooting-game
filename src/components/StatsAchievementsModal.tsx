import React from 'react';
import { Award, CheckCircle2, Flame, X } from 'lucide-react';
import {
  ACHIEVEMENTS,
  calculateAccuracyPercent,
  getDailyChallenges,
  PlayerSaveData,
} from '../game/rules';

interface StatsAchievementsModalProps {
  saveData: PlayerSaveData;
  onClaimDaily: (challengeId: string, reward: number) => void;
  onClose: () => void;
}

export const StatsAchievementsModal: React.FC<StatsAchievementsModalProps> = ({
  saveData,
  onClaimDaily,
  onClose,
}) => {
  const daily = getDailyChallenges(saveData.dailyProgress.dateKey);
  const accuracy = calculateAccuracyPercent(
    saveData.stats.totalShotsHit,
    saveData.stats.totalShotsFired,
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/90 p-3 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-title"
        className="w-full max-w-3xl max-h-[90vh] bg-zinc-900 border border-zinc-700 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 id="stats-title" className="font-display text-xl font-bold text-zinc-50">
              Daily Challenges, Achievements &amp; Career Stats
            </h2>
            <p className="text-xs text-zinc-400">
              All progress saves locally on your device
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Challenges and Stats"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-6">
          {/* Career Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Kills', val: saveData.stats.totalKills },
              { label: 'Headshots', val: saveData.stats.totalHeadshots },
              { label: 'Accuracy', val: `${accuracy}%` },
              {
                label: 'Survival Best',
                val: `Wave ${saveData.stats.survivalBestWave}`,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3"
              >
                <div className="text-[11px] text-zinc-400">{s.label}</div>
                <div className="font-mono-num text-xl font-bold text-zinc-50 mt-0.5">
                  {s.val}
                </div>
              </div>
            ))}
          </div>

          {/* Daily Challenges */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Daily Shooting Challenges</span>
            </div>
            <div className="space-y-2">
              {daily.map((c) => {
                const progress = saveData.dailyProgress[c.metric];
                const completed = progress >= c.target;
                const claimed = saveData.dailyProgress.claimedIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 bg-zinc-950/70 border border-zinc-800 rounded-xl p-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-zinc-100">
                        {c.title}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500"
                            style={{
                              width: `${Math.min(100, (progress / c.target) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono-num text-xs text-zinc-400">
                          {Math.min(progress, c.target)} / {c.target}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!completed || claimed}
                      onClick={() => onClaimDaily(c.id, c.rewardCredits)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer disabled:cursor-not-allowed ${
                        claimed
                          ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                          : completed
                            ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                            : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {claimed
                        ? 'Claimed'
                        : completed
                          ? `Claim +${c.rewardCredits} CR`
                          : `+${c.rewardCredits} CR`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievements */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Achievements</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ACHIEVEMENTS.map((ach) => {
                const unlocked = saveData.unlockedAchievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                      unlocked
                        ? 'bg-zinc-800/80 border-amber-500/60'
                        : 'bg-zinc-950/60 border-zinc-800 opacity-75'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        unlocked ? 'text-amber-400' : 'text-zinc-600'
                      }`}
                    />
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">
                        {ach.title}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {ach.description}
                      </div>
                      <div className="font-mono-num text-[11px] text-amber-400 mt-1">
                        Reward: +{ach.rewardCredits} CR
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
