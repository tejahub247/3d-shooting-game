import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Check, Lock, ShieldCheck, Wrench, X } from 'lucide-react';
import { buildWeaponModel } from '../engine/weaponModels';
import { PlayerSaveData } from '../game/rules';
import {
  DEFAULT_UPGRADES,
  getEffectiveWeaponStats,
  getUpgradeCost,
  getWeaponById,
  WEAPON_SKINS,
  WEAPONS,
  WeaponCategory,
  WeaponSkinId,
  WeaponUpgrades,
} from '../game/weapons';

interface ArmoryModalProps {
  saveData: PlayerSaveData;
  onClose: () => void;
  onUnlockWeapon: (weaponId: string, cost: number) => void;
  onEquipWeapon: (slotIndex: number, weaponId: string) => void;
  onSelectSkin: (weaponId: string, skinId: WeaponSkinId, cost: number) => void;
  onUpgradeWeapon: (
    weaponId: string,
    stat: keyof WeaponUpgrades,
    cost: number,
  ) => void;
}

const CATEGORIES: { id: WeaponCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All (17)' },
  { id: 'pistol', label: 'Pistols' },
  { id: 'assault', label: 'Assault' },
  { id: 'sniper', label: 'Snipers' },
  { id: 'shotgun', label: 'Shotguns' },
  { id: 'smg', label: 'SMGs' },
];

export const ArmoryModal: React.FC<ArmoryModalProps> = ({
  saveData,
  onClose,
  onUnlockWeapon,
  onEquipWeapon,
  onSelectSkin,
  onUpgradeWeapon,
}) => {
  const [category, setCategory] = useState<WeaponCategory | 'all'>('all');
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>(
    saveData.equippedLoadout[saveData.activeSlotIndex] ?? WEAPONS[0].id,
  );
  const [equipSlot, setEquipSlot] = useState<number>(saveData.activeSlotIndex);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const selectedWeapon = useMemo(
    () => getWeaponById(selectedWeaponId),
    [selectedWeaponId],
  );
  const selectedSkin: WeaponSkinId =
    saveData.weaponSkins[selectedWeapon.id] ?? 'matte_obsidian';
  const upgrades = saveData.weaponUpgrades[selectedWeapon.id] ?? DEFAULT_UPGRADES;
  const stats = useMemo(
    () => getEffectiveWeaponStats(selectedWeapon, upgrades),
    [selectedWeapon, upgrades],
  );

  const filteredWeapons = useMemo(
    () =>
      category === 'all'
        ? WEAPONS
        : WEAPONS.filter((w) => w.category === category),
    [category],
  );

  const isUnlocked = saveData.unlockedWeapons.includes(selectedWeapon.id);
  const isEquippedInSlot =
    saveData.equippedLoadout[equipSlot] === selectedWeapon.id;

  // Live 3D Rotating Weapon Preview Canvas
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    const w = container.clientWidth || 440;
    const h = container.clientHeight || 220;
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.05, 30);
    camera.position.set(0.45, 0.22, 0.78);
    camera.lookAt(0, 0.02, -0.06);

    const key = new THREE.DirectionalLight(0xfff4e0, 2.2);
    key.position.set(2, 3, 2);
    scene.add(key);
    scene.add(new THREE.HemisphereLight(0xcbd5e1, 0x1e293b, 0.8));

    const turntable = new THREE.Group();
    scene.add(turntable);
    const built = buildWeaponModel(selectedWeapon, selectedSkin);
    built.root.scale.setScalar(1.35);
    built.root.rotation.y = Math.PI / 2;
    turntable.add(built.root);

    let frameId = 0;
    let disposed = false;
    let last = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      turntable.rotation.y += dt * 0.65;
      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    renderer.render(scene, camera);
    if (isSoftwareGl) afterDraw(tick);
    else frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [selectedWeapon, selectedSkin]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/90 p-3 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="armory-title"
        className="w-full max-w-5xl max-h-[92vh] bg-zinc-900 border border-zinc-700 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 id="armory-title" className="font-display text-xl sm:text-2xl font-bold text-zinc-50">
              Weapon Collection
            </h2>
            <p className="text-xs text-zinc-400">
              3D Preview · Skins · Performance Upgrades · 3-Slot Loadout
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono-num text-sm font-bold text-amber-400">
              {saveData.credits.toLocaleString()} CR
            </span>
            <button
              type="button"
              aria-label="Close Weapon Collection"
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-zinc-800 overflow-x-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                category === c.id
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Body Split: Weapon List + 3D Preview & Customization */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Weapon Roster */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-zinc-800 overflow-y-auto custom-scroll p-3 space-y-1.5 max-h-56 lg:max-h-none">
            {filteredWeapons.map((w) => {
              const unlocked = saveData.unlockedWeapons.includes(w.id);
              const equippedSlotIdx = saveData.equippedLoadout.indexOf(w.id);
              const active = w.id === selectedWeapon.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWeaponId(w.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left border transition-colors cursor-pointer ${
                    active
                      ? 'bg-zinc-800 border-amber-500/80 text-zinc-50'
                      : 'bg-zinc-950/50 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{w.name}</div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {w.categoryLabel} · {w.roleTag}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {equippedSlotIdx >= 0 ? (
                      <span className="text-[11px] font-bold text-emerald-400">
                        Slot {equippedSlotIdx + 1}
                      </span>
                    ) : unlocked ? (
                      <Check className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <span className="flex items-center gap-1 font-mono-num text-xs text-amber-400">
                        <Lock className="w-3.5 h-3.5" />
                        {w.unlockCost}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Inspection & Customization */}
          <div className="lg:col-span-7 overflow-y-auto custom-scroll p-5 space-y-5">
            {/* 3D Rotating Preview Canvas */}
            <div className="relative h-48 sm:h-56 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div ref={previewRef} className="w-full h-full" />
              <div className="absolute top-3 left-3 pointer-events-none">
                <div className="font-display text-lg font-bold text-zinc-50">
                  {selectedWeapon.name}
                </div>
                <div className="text-xs text-zinc-400">
                  {selectedWeapon.roleTag} · {selectedWeapon.fireMode.toUpperCase()}
                </div>
              </div>
              {selectedWeapon.hasScope && (
                <div className="absolute top-3 right-3 text-[11px] font-mono-num text-amber-400">
                  OPTIC ZOOM READY
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                {
                  label: 'Damage',
                  val: `${stats.damage}${selectedWeapon.pellets ? `×${selectedWeapon.pellets}` : ''}`,
                  pct: Math.min(100, (stats.damage * (selectedWeapon.pellets ?? 1)) / 1.9),
                },
                {
                  label: 'Fire Rate',
                  val: `${stats.fireRateRpm} RPM`,
                  pct: Math.min(100, stats.fireRateRpm / 11),
                },
                {
                  label: 'Capacity',
                  val: `${stats.magSize} / ${stats.reserveAmmo}`,
                  pct: Math.min(100, stats.magSize * 2.5),
                },
                {
                  label: 'Reload',
                  val: `${stats.reloadTimeSec}s`,
                  pct: Math.max(15, 100 - stats.reloadTimeSec * 24),
                },
                {
                  label: 'Range',
                  val: `${stats.rangeMeters}m`,
                  pct: Math.min(100, stats.rangeMeters / 4),
                },
                {
                  label: 'Stability',
                  val: `${Math.round((1 - Math.min(0.9, stats.recoilPitch * 7)) * 100)}%`,
                  pct: Math.round((1 - Math.min(0.9, stats.recoilPitch * 7)) * 100),
                },
              ].map((st) => (
                <div
                  key={st.label}
                  className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-2.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">{st.label}</span>
                    <span className="font-mono-num font-bold text-zinc-100">
                      {st.val}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${st.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Unlock / Equip Loadout Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/70 border border-zinc-800 rounded-xl p-3.5">
              {!isUnlocked ? (
                <>
                  <div className="text-xs text-zinc-300">
                    Unlock cost:{' '}
                    <span className="font-mono-num font-bold text-amber-400">
                      {selectedWeapon.unlockCost} CR
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={saveData.credits < selectedWeapon.unlockCost}
                    onClick={() =>
                      onUnlockWeapon(selectedWeapon.id, selectedWeapon.unlockCost)
                    }
                    className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-400 text-zinc-950 font-display font-bold text-xs cursor-pointer disabled:cursor-not-allowed"
                  >
                    {saveData.credits >= selectedWeapon.unlockCost
                      ? 'Unlock Weapon'
                      : 'Insufficient Credits'}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-400 mr-1">Equip to:</span>
                    {[0, 1, 2].map((slotIdx) => (
                      <button
                        key={slotIdx}
                        type="button"
                        onClick={() => setEquipSlot(slotIdx)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          equipSlot === slotIdx
                            ? 'bg-zinc-100 text-zinc-950'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        Slot {slotIdx + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => onEquipWeapon(equipSlot, selectedWeapon.id)}
                    className={`flex items-center gap-1.5 px-5 py-2 rounded-lg font-display font-bold text-xs cursor-pointer ${
                      isEquippedInSlot
                        ? 'bg-emerald-600 text-zinc-50'
                        : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {isEquippedInSlot ? 'Equipped' : `Equip Slot ${equipSlot + 1}`}
                    </span>
                  </button>
                </>
              )}
            </div>

            {/* Skins */}
            <div>
              <div className="text-xs font-semibold text-zinc-300 mb-2">
                Weapon Finish / Skin
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {WEAPON_SKINS.map((skin) => {
                  const owned = saveData.unlockedSkins.includes(skin.id);
                  const active = selectedSkin === skin.id;
                  const swatchHex = `#${skin.primaryColor.toString(16).padStart(6, '0')}`;
                  return (
                    <button
                      key={skin.id}
                      type="button"
                      disabled={!owned && saveData.credits < skin.cost}
                      onClick={() =>
                        onSelectSkin(
                          selectedWeapon.id,
                          skin.id,
                          owned ? 0 : skin.cost,
                        )
                      }
                      className={`p-2 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-50 ${
                        active
                          ? 'bg-zinc-800 border-amber-500'
                          : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div
                        className="w-full h-4 rounded-md border border-white/10 mb-1.5"
                        style={{ backgroundColor: swatchHex }}
                      />
                      <div className="text-[11px] font-semibold text-zinc-100 truncate">
                        {skin.name}
                      </div>
                      <div className="text-[10px] font-mono-num text-amber-400">
                        {active ? 'Active' : owned ? 'Owned' : `${skin.cost} CR`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Upgrades */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 mb-2">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span>Weapon Upgrades</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    { key: 'barrel', label: 'Rifled Barrel', desc: '+8% DMG & Range' },
                    { key: 'magazine', label: 'Extended Mag', desc: '+12% Ammo & Reload' },
                    { key: 'grip', label: 'Tactical Grip', desc: '-10% Recoil & Spread' },
                    { key: 'optics', label: 'Precision Optic', desc: '+ADS Zoom Focus' },
                  ] as const
                ).map((item) => {
                  const tier = upgrades[item.key];
                  const cost = getUpgradeCost(tier);
                  const maxed = tier >= 3;
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-2 bg-zinc-950/70 border border-zinc-800 rounded-xl p-2.5"
                    >
                      <div>
                        <div className="text-xs font-semibold text-zinc-100">
                          {item.label} (Lv {tier}/3)
                        </div>
                        <div className="text-[10px] text-zinc-400">{item.desc}</div>
                      </div>
                      <button
                        type="button"
                        disabled={maxed || !isUnlocked || saveData.credits < cost}
                        onClick={() =>
                          onUpgradeWeapon(selectedWeapon.id, item.key, cost)
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-mono-num font-bold text-[11px] cursor-pointer disabled:cursor-not-allowed shrink-0"
                      >
                        {maxed ? 'MAX' : `${cost} CR`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
