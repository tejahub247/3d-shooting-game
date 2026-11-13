import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Crosshair,
  Pause,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CameraPerspective,
  GameMode,
  PlayerSaveData,
} from '../game/rules';
import { getWeaponById } from '../game/weapons';
import { LiveHudSnapshot, TouchInputState } from './GameViewport';

interface GameHUDProps {
  hud: LiveHudSnapshot;
  mode: GameMode;
  levelNumber: number;
  saveData: PlayerSaveData;
  cameraMode: CameraPerspective;
  touchInputRef: React.MutableRefObject<TouchInputState>;
  actionQueueRef: React.MutableRefObject<string[]>;
  onToggleCamera: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onSelectSlot: (slotIndex: number) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  mode,
  levelNumber,
  saveData,
  cameraMode,
  touchInputRef,
  actionQueueRef,
  onToggleCamera,
  onToggleMute,
  onPause,
  onSelectSlot,
}) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0 });
  const joyActiveIdRef = useRef<number | null>(null);
  const joyCenterRef = useRef({ x: 0, y: 0 });
  const lookTouchRef = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const hasTouch =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
  }, []);

  const showTouchControls =
    saveData.settings.touchControls === 'always' ||
    (saveData.settings.touchControls === 'auto' &&
      (isTouchDevice || window.innerWidth <= 960));

  const weapon = getWeaponById(hud.activeWeaponId);
  const offsets = saveData.settings.buttonOffsets;
  const scale = saveData.settings.buttonScale;

  const handleJoystickStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    joyActiveIdRef.current = e.pointerId;
    joyCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    updateJoystick(e.clientX, e.clientY);
  };

  const handleJoystickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyActiveIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateJoystick(e.clientX, e.clientY);
  };

  const handleJoystickEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyActiveIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    joyActiveIdRef.current = null;
    setJoyKnob({ x: 0, y: 0 });
    touchInputRef.current.moveX = 0;
    touchInputRef.current.moveY = 0;
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    const maxR = 44;
    const dx = clientX - joyCenterRef.current.x;
    const dy = clientY - joyCenterRef.current.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const nx = dist > 0 ? Math.cos(angle) * clamped : 0;
    const ny = dist > 0 ? Math.sin(angle) * clamped : 0;
    setJoyKnob({ x: nx, y: ny });
    touchInputRef.current.moveX = nx / maxR;
    touchInputRef.current.moveY = -ny / maxR;
  };

  const handleLookDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookTouchRef.current !== null) return;
    lookTouchRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleLookMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!lookTouchRef.current || lookTouchRef.current.id !== e.pointerId) return;
    const dx = e.clientX - lookTouchRef.current.x;
    const dy = e.clientY - lookTouchRef.current.y;
    lookTouchRef.current.x = e.clientX;
    lookTouchRef.current.y = e.clientY;
    touchInputRef.current.lookDeltaX += dx;
    touchInputRef.current.lookDeltaY += dy;
  };

  const handleLookUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookTouchRef.current?.id === e.pointerId) {
      lookTouchRef.current = null;
    }
  };

  const btnStyle = (offset: { x: number; y: number }): React.CSSProperties => ({
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
  });

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none overflow-hidden">
      {/* Damage Vignette */}
      {hud.damageFlash > 0.02 && (
        <div
          className="fixed inset-0 pointer-events-none border-[18px] border-red-600/60"
          style={{
            opacity: hud.damageFlash * 0.75,
            boxShadow: 'inset 0 0 90px rgba(220, 38, 38, 0.75)',
          }}
        />
      )}

      {/* Sniper Scope Optical Overlay */}
      {hud.isSniperScoped && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div
            className="w-full h-full relative"
            style={{
              background:
                'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.96) 33%)',
            }}
          >
            {/* Mil-Dot Crosshair Lines */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-950/90 -translate-x-1/2" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-zinc-950/90 -translate-y-1/2" />
            <div className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full bg-red-500 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute left-1/2 top-[62%] -translate-x-1/2 font-mono-num text-xs font-bold text-amber-400 bg-zinc-950/80 px-2 py-0.5 rounded">
              ZOOM {hud.scopeZoomLabel}
            </div>
          </div>
        </div>
      )}

      {/* Right-Side Touch Camera Look Zone (only when touch controls active) */}
      {showTouchControls && (
        <div
          className="fixed top-16 right-0 bottom-0 w-1/2 pointer-events-auto"
          style={{ touchAction: 'none' }}
          onPointerDown={handleLookDown}
          onPointerMove={handleLookMove}
          onPointerUp={handleLookUp}
          onPointerCancel={handleLookUp}
        />
      )}

      {/* Center Dynamic Crosshair & Hitmarker */}
      {!hud.isSniperScoped && (
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="relative flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-amber-400" />
            <div
              className="absolute w-2.5 h-0.5 bg-zinc-100/90"
              style={{ transform: `translateX(-${hud.crosshairSpreadPx}px)` }}
            />
            <div
              className="absolute w-2.5 h-0.5 bg-zinc-100/90"
              style={{ transform: `translateX(${hud.crosshairSpreadPx}px)` }}
            />
            <div
              className="absolute w-0.5 h-2.5 bg-zinc-100/90"
              style={{ transform: `translateY(-${hud.crosshairSpreadPx}px)` }}
            />
            <div
              className="absolute w-0.5 h-2.5 bg-zinc-100/90"
              style={{ transform: `translateY(${hud.crosshairSpreadPx}px)` }}
            />

            {/* Hitmarker X */}
            {hud.hitmarkerType !== 'none' && (
              <svg
                viewBox="0 0 28 28"
                className="absolute w-7 h-7"
                aria-hidden="true"
              >
                <line
                  x1="5"
                  y1="5"
                  x2="10"
                  y2="10"
                  stroke={hud.hitmarkerType === 'head' ? '#ef4444' : '#ffffff'}
                  strokeWidth="2.4"
                />
                <line
                  x1="23"
                  y1="5"
                  x2="18"
                  y2="10"
                  stroke={hud.hitmarkerType === 'head' ? '#ef4444' : '#ffffff'}
                  strokeWidth="2.4"
                />
                <line
                  x1="5"
                  y1="23"
                  x2="10"
                  y2="18"
                  stroke={hud.hitmarkerType === 'head' ? '#ef4444' : '#ffffff'}
                  strokeWidth="2.4"
                />
                <line
                  x1="23"
                  y1="23"
                  x2="18"
                  y2="18"
                  stroke={hud.hitmarkerType === 'head' ? '#ef4444' : '#ffffff'}
                  strokeWidth="2.4"
                />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Floating Hit Feedback */}
      {hud.floatingFeed && (
        <div
          key={hud.floatingFeed.id}
          className={`fixed left-1/2 top-[41%] -translate-x-1/2 font-display font-bold text-sm tracking-wide hud-text-shadow ${
            hud.floatingFeed.isHead ? 'text-amber-400' : 'text-zinc-100'
          }`}
        >
          {hud.floatingFeed.text}
        </div>
      )}

      {/* Top HUD Bar: Left Status Cluster + Right Utility & Weapon Cluster (Zero Overlap on 390px) */}
      <div className="fixed top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
        {/* Top-Left Cluster: Score, Mission Progress, Timer, Health */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-4 bg-zinc-950/85 border border-zinc-800/90 rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2">
            <div>
              <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400">
                Score
              </div>
              <div
                data-testid="hud-score"
                className="font-mono-num text-base sm:text-xl font-bold text-zinc-50 leading-tight"
              >
                {hud.score}
              </div>
            </div>

            <div className="h-6 w-px bg-zinc-800" />

            <div>
              <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400">
                {mode === 'mission'
                  ? `Lvl ${levelNumber}`
                  : mode === 'survival'
                    ? `Wave ${hud.wave}`
                    : mode === 'time_challenge'
                      ? 'Targets'
                      : 'Practice'}
              </div>
              <div
                data-testid="hud-targets"
                className="font-mono-num text-base sm:text-xl font-bold text-amber-400 leading-tight"
              >
                {mode === 'mission'
                  ? `${hud.kills}/${hud.targetGoal}`
                  : `${hud.kills}`}
              </div>
            </div>

            {hud.timeRemainingSec > 0 && (
              <>
                <div className="h-6 w-px bg-zinc-800" />
                <div>
                  <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400">
                    Time
                  </div>
                  <div
                    className={`font-mono-num text-base sm:text-xl font-bold leading-tight ${
                      hud.timeRemainingSec <= 10 ? 'text-red-400' : 'text-zinc-100'
                    }`}
                  >
                    {hud.timeRemainingSec}s
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Health & Headshot Strip */}
          <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800/80 rounded-lg px-2.5 py-1">
            <span className="text-[10px] font-semibold text-zinc-300">HP</span>
            <div className="w-16 sm:w-28 h-1.5 sm:h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  hud.playerHp <= 30 ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, hud.playerHp))}%` }}
              />
            </div>
            <span className="font-mono-num text-[11px] font-bold text-zinc-100">
              {hud.playerHp}
            </span>
            {hud.headshotQuota > 0 && (
              <span className="font-mono-num text-[10px] text-amber-400 ml-0.5">
                HS {hud.headshots}/{hud.headshotQuota}
              </span>
            )}
          </div>
        </div>

        {/* Top-Right Utility Buttons (+ Compact Weapon Card on Mobile) */}
        <div className="flex flex-col items-end gap-1.5 pointer-events-auto shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              tabIndex={-1}
              aria-label={`Switch Camera (${cameraMode === 'fps' ? 'FPS' : 'TPS'})`}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleCamera();
              }}
              className="flex items-center gap-1 h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg bg-zinc-950/85 border border-zinc-700/80 text-xs font-semibold text-zinc-100 hover:border-amber-500 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>{cameraMode === 'fps' ? 'FPS' : 'TPS'}</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label={saveData.settings.muted ? 'Unmute Audio' : 'Mute Audio'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-zinc-950/85 border border-zinc-700/80 text-zinc-100 hover:border-amber-500 cursor-pointer"
            >
              {saveData.settings.muted ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-zinc-200" />
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Pause Game"
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-zinc-950/85 border border-zinc-700/80 text-zinc-100 hover:border-amber-500 cursor-pointer"
            >
              <Pause className="w-4 h-4 text-zinc-200" />
            </button>
          </div>

          {showTouchControls && (
            <div className="bg-zinc-950/85 border border-zinc-800 rounded-xl px-3 py-1.5 text-right">
              <div className="text-[11px] font-semibold text-amber-400 truncate max-w-[140px]">
                {weapon.name}
              </div>
              <div className="flex items-baseline justify-end gap-1">
                <span
                  data-testid="hud-ammo"
                  className={`font-mono-num text-lg font-bold leading-none ${
                    hud.ammoInMag === 0 ? 'text-red-400' : 'text-zinc-50'
                  }`}
                >
                  {hud.ammoInMag}
                </span>
                <span className="font-mono-num text-xs text-zinc-400">
                  / {mode === 'practice' ? '∞' : hud.reserveAmmo}
                </span>
              </div>
              {hud.isReloading && (
                <div className="mt-1 w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-75"
                    style={{ width: `${Math.round(hud.reloadProgress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Bottom-Right Weapon & Ammo Cluster */}
      {!showTouchControls && (
        <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2 pointer-events-auto">
          <div className="bg-zinc-950/85 border border-zinc-800 rounded-xl px-4 py-2.5 text-right min-w-[170px]">
            <div className="text-xs font-semibold text-amber-400 truncate">
              {weapon.name}
            </div>
            <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
              <span
                data-testid="hud-ammo"
                className={`font-mono-num text-2xl font-bold leading-none ${
                  hud.ammoInMag === 0 ? 'text-red-400' : 'text-zinc-50'
                }`}
              >
                {hud.ammoInMag}
              </span>
              <span className="font-mono-num text-sm text-zinc-400">
                / {mode === 'practice' ? '∞' : hud.reserveAmmo}
              </span>
            </div>
            {hud.isReloading && (
              <div className="mt-1.5 w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-75"
                  style={{ width: `${Math.round(hud.reloadProgress * 100)}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {saveData.equippedLoadout.map((wId, idx) => {
              const w = getWeaponById(wId);
              const active = idx === hud.activeSlotIndex;
              return (
                <button
                  key={`${wId}-${idx}`}
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSelectSlot(idx);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-amber-500 text-zinc-950 border-amber-400'
                      : 'bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  {idx + 1}. {w.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile / Touch On-Screen Controls */}
      {showTouchControls && (
        <>
          {/* Left Virtual Movement Joystick */}
          <div
            aria-label="Movement Joystick"
            onPointerDown={handleJoystickStart}
            onPointerMove={handleJoystickMove}
            onPointerUp={handleJoystickEnd}
            onPointerCancel={handleJoystickEnd}
            className="fixed bottom-5 left-4 w-28 h-28 rounded-full bg-zinc-950/55 border-2 border-zinc-600/70 flex items-center justify-center pointer-events-auto"
            style={{ touchAction: 'none' }}
          >
            <div
              className="w-11 h-11 rounded-full bg-amber-500/85 border-2 border-amber-200 shadow-lg"
              style={{
                transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
              }}
            />
          </div>

          {/* Right Action Cluster (Well-Spaced Ergonomic Arc) */}
          <div className="fixed bottom-4 right-3 w-60 h-56 pointer-events-none">
            {/* Fire Button */}
            <button
              type="button"
              aria-label="Fire Weapon"
              style={btnStyle(offsets.fire)}
              onPointerDown={(e) => {
                e.stopPropagation();
                touchInputRef.current.firing = true;
                touchInputRef.current.justFired = true;
              }}
              onPointerUp={() => {
                touchInputRef.current.firing = false;
              }}
              onPointerCancel={() => {
                touchInputRef.current.firing = false;
              }}
              className="pointer-events-auto absolute bottom-2 right-1 w-20 h-20 rounded-full bg-amber-500/90 active:bg-amber-400 border-2 border-amber-200 text-zinc-950 font-display font-bold text-sm flex items-center justify-center shadow-xl cursor-pointer"
            >
              FIRE
            </button>

            {/* Aim (ADS) Toggle */}
            <button
              type="button"
              aria-label="Aim Down Sights"
              style={btnStyle(offsets.aim)}
              onClick={() => {
                touchInputRef.current.aiming = !touchInputRef.current.aiming;
              }}
              className={`pointer-events-auto absolute bottom-26 right-3 w-12 h-12 rounded-full border text-xs font-bold flex items-center justify-center cursor-pointer ${
                hud.isAds
                  ? 'bg-amber-500 text-zinc-950 border-amber-200'
                  : 'bg-zinc-900/85 text-zinc-100 border-zinc-600'
              }`}
            >
              <Crosshair className="w-5 h-5" />
            </button>

            {/* Reload Button */}
            <button
              type="button"
              aria-label="Reload Weapon"
              style={btnStyle(offsets.reload)}
              onClick={() => actionQueueRef.current.push('reload')}
              className="pointer-events-auto absolute bottom-28 right-22 w-12 h-12 rounded-full bg-zinc-900/85 border border-zinc-600 text-zinc-100 flex items-center justify-center cursor-pointer"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            {/* Jump Button */}
            <button
              type="button"
              aria-label="Jump"
              style={btnStyle(offsets.jump)}
              onClick={() => actionQueueRef.current.push('jump')}
              className="pointer-events-auto absolute bottom-16 right-36 w-12 h-12 rounded-full bg-zinc-900/85 border border-zinc-600 text-[11px] font-bold text-zinc-100 flex items-center justify-center cursor-pointer"
            >
              JUMP
            </button>

            {/* Crouch / Duck Button */}
            <button
              type="button"
              aria-label="Crouch"
              style={btnStyle(offsets.crouch)}
              onClick={() => actionQueueRef.current.push('crouch')}
              className="pointer-events-auto absolute bottom-2 right-26 w-11 h-11 rounded-full bg-zinc-900/85 border border-zinc-600 text-[10px] font-bold text-zinc-100 flex items-center justify-center cursor-pointer"
            >
              DUCK
            </button>

            {/* Switch Weapon Button */}
            <button
              type="button"
              aria-label="Switch Weapon"
              style={btnStyle(offsets.switchWeapon)}
              onClick={() => actionQueueRef.current.push('switch')}
              className="pointer-events-auto absolute bottom-40 right-16 w-11 h-11 rounded-full bg-zinc-900/85 border border-zinc-600 text-[10px] font-bold text-zinc-100 flex items-center justify-center cursor-pointer"
            >
              SWAP
            </button>

            {/* Scope Zoom Button (when weapon has scope) */}
            {weapon.hasScope && (
              <button
                type="button"
                aria-label="Scope Zoom"
                style={btnStyle(offsets.scope)}
                onClick={() => actionQueueRef.current.push('scope')}
                className="pointer-events-auto absolute bottom-42 right-2 w-11 h-11 rounded-full bg-zinc-900/85 border border-amber-500/70 text-[11px] font-mono-num font-bold text-amber-300 flex items-center justify-center cursor-pointer"
              >
                {hud.scopeZoomLabel}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
