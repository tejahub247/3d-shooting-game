import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import {
  ButtonOffsets,
  CameraPerspective,
  DEFAULT_BUTTON_OFFSETS,
  GraphicsQuality,
  PlayerSettings,
  TouchControlsMode,
} from '../game/rules';

interface SettingsModalProps {
  settings: PlayerSettings;
  onUpdateSettings: (patch: Partial<PlayerSettings>) => void;
  onClose: () => void;
}

const BUTTON_KEYS: { key: keyof ButtonOffsets; label: string }[] = [
  { key: 'fire', label: 'Fire' },
  { key: 'aim', label: 'Aim' },
  { key: 'reload', label: 'Reload' },
  { key: 'jump', label: 'Jump' },
  { key: 'crouch', label: 'Crouch' },
  { key: 'switchWeapon', label: 'Swap' },
  { key: 'scope', label: 'Scope' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const [selectedBtn, setSelectedBtn] =
    React.useState<keyof ButtonOffsets>('fire');

  const nudgeButton = (dx: number, dy: number) => {
    const cur = settings.buttonOffsets[selectedBtn];
    onUpdateSettings({
      buttonOffsets: {
        ...settings.buttonOffsets,
        [selectedBtn]: {
          x: Math.max(-140, Math.min(80, cur.x + dx)),
          y: Math.max(-140, Math.min(80, cur.y + dy)),
        },
      },
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/90 p-3 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-full max-w-2xl max-h-[90vh] bg-zinc-900 border border-zinc-700 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 id="settings-title" className="font-display text-xl font-bold text-zinc-50">
              Controls &amp; Graphics Settings
            </h2>
            <p className="text-xs text-zinc-400">
              Adjust sensitivity, camera perspective, quality, and mobile button positions
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Settings"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-6">
          {/* Sensitivity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5">
              <div className="flex justify-between text-xs font-semibold text-zinc-200 mb-2">
                <span>Look Sensitivity</span>
                <span className="font-mono-num text-amber-400">
                  {settings.lookSensitivity.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={0.3}
                max={2.5}
                step={0.05}
                value={settings.lookSensitivity}
                onChange={(e) =>
                  onUpdateSettings({ lookSensitivity: Number(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </label>

            <label className="block bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5">
              <div className="flex justify-between text-xs font-semibold text-zinc-200 mb-2">
                <span>ADS / Scope Sensitivity</span>
                <span className="font-mono-num text-amber-400">
                  {settings.adsSensitivity.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={1.5}
                step={0.05}
                value={settings.adsSensitivity}
                onChange={(e) =>
                  onUpdateSettings({ adsSensitivity: Number(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Camera Perspective & Graphics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5 space-y-2">
              <div className="text-xs font-semibold text-zinc-200">
                Camera Perspective
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'fps', label: 'First-Person (FPS)' },
                    { id: 'tps', label: 'Third-Person (TPS)' },
                  ] as { id: CameraPerspective; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateSettings({ cameraMode: opt.id })}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      settings.cameraMode === opt.id
                        ? 'bg-amber-500 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5 space-y-2">
              <div className="text-xs font-semibold text-zinc-200">
                Graphics Quality
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['high', 'medium', 'low'] as GraphicsQuality[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onUpdateSettings({ graphicsQuality: q })}
                    className={`py-2 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                      settings.graphicsQuality === q
                        ? 'bg-amber-500 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Touch Controls & Button Position Customizer */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-zinc-100">
                  Mobile Touch Controls
                </div>
                <div className="text-[11px] text-zinc-400">
                  Show on-screen joystick &amp; customize button positions
                </div>
              </div>
              <div className="flex gap-1.5">
                {(
                  [
                    { id: 'auto', label: 'Auto' },
                    { id: 'always', label: 'Always On' },
                    { id: 'off', label: 'Off' },
                  ] as { id: TouchControlsMode; label: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onUpdateSettings({ touchControls: m.id })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      settings.touchControls === m.id
                        ? 'bg-amber-500 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <div className="flex justify-between text-xs text-zinc-300 mb-1.5">
                <span>Touch Button Scale</span>
                <span className="font-mono-num text-amber-400">
                  {Math.round(settings.buttonScale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.8}
                max={1.35}
                step={0.05}
                value={settings.buttonScale}
                onChange={(e) =>
                  onUpdateSettings({ buttonScale: Number(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </label>

            <div className="space-y-2.5 pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">
                  Customize Button Position
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      buttonOffsets: { ...DEFAULT_BUTTON_OFFSETS },
                    })
                  }
                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Layout</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {BUTTON_KEYS.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setSelectedBtn(b.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      selectedBtn === b.key
                        ? 'bg-zinc-100 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => nudgeButton(-12, 0)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold cursor-pointer"
                >
                  Left
                </button>
                <button
                  type="button"
                  onClick={() => nudgeButton(12, 0)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold cursor-pointer"
                >
                  Right
                </button>
                <button
                  type="button"
                  onClick={() => nudgeButton(0, -12)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold cursor-pointer"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => nudgeButton(0, 12)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold cursor-pointer"
                >
                  Down
                </button>
                <span className="ml-auto font-mono-num text-xs text-zinc-400">
                  Offset ({settings.buttonOffsets[selectedBtn].x},{' '}
                  {settings.buttonOffsets[selectedBtn].y})
                </span>
              </div>
            </div>
          </div>

          {/* Audio */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs font-semibold text-zinc-200 mb-1.5">
                <span>Master Audio Volume</span>
                <span className="font-mono-num text-amber-400">
                  {settings.muted
                    ? 'MUTED'
                    : `${Math.round(settings.masterVolume * 100)}%`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.masterVolume}
                onChange={(e) =>
                  onUpdateSettings({ masterVolume: Number(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ muted: !settings.muted })}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                settings.muted
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              {settings.muted ? 'Unmute' : 'Mute'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
