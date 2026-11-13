import { WeaponDefinition } from '../game/weapons';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private volume = 0.75;

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.noiseBuffer && this.ctx) {
      const sampleRate = this.ctx.sampleRate;
      const length = sampleRate * 1.2;
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.ctx;
  }

  public playFire(profile: WeaponDefinition['audioProfile']) {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const jitter = 0.94 + Math.random() * 0.12;
    const masterGain = ctx.createGain();
    masterGain.gain.value = this.volume * 0.65;
    masterGain.connect(ctx.destination);

    // 1. Explosive transient noise burst
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';

    const noiseGain = ctx.createGain();

    // 2. Low-frequency punch body oscillator
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    let duration = 0.18;
    let startFreq = 160;
    let endFreq = 45;
    let filterFreq = 1400;
    let filterQ = 0.8;
    let oscType: OscillatorType = 'triangle';

    switch (profile) {
      case 'pistol_light':
        duration = 0.14;
        startFreq = 220 * jitter;
        endFreq = 58;
        filterFreq = 1900 * jitter;
        filterQ = 0.9;
        break;
      case 'pistol_heavy':
        duration = 0.28;
        startFreq = 185 * jitter;
        endFreq = 40;
        filterFreq = 1350 * jitter;
        filterQ = 0.7;
        oscType = 'sawtooth';
        break;
      case 'revolver':
        duration = 0.25;
        startFreq = 200 * jitter;
        endFreq = 46;
        filterFreq = 1600 * jitter;
        filterQ = 0.85;
        oscType = 'sawtooth';
        break;
      case 'rifle_carbine':
        duration = 0.15;
        startFreq = 190 * jitter;
        endFreq = 52;
        filterFreq = 2100 * jitter;
        filterQ = 1.0;
        break;
      case 'rifle_heavy':
        duration = 0.2;
        startFreq = 155 * jitter;
        endFreq = 42;
        filterFreq = 1500 * jitter;
        filterQ = 0.85;
        oscType = 'sawtooth';
        break;
      case 'sniper_bolt':
        duration = 0.42;
        startFreq = 150 * jitter;
        endFreq = 32;
        filterFreq = 1200 * jitter;
        filterQ = 0.65;
        oscType = 'sawtooth';
        break;
      case 'sniper_heavy':
        duration = 0.55;
        startFreq = 125 * jitter;
        endFreq = 26;
        filterFreq = 950 * jitter;
        filterQ = 0.6;
        oscType = 'sawtooth';
        break;
      case 'shotgun_pump':
      case 'shotgun_auto':
        duration = 0.34;
        startFreq = 135 * jitter;
        endFreq = 30;
        filterFreq = 1050 * jitter;
        filterQ = 0.55;
        oscType = 'sawtooth';
        break;
      case 'smg_rapid':
        duration = 0.1;
        startFreq = 260 * jitter;
        endFreq = 75;
        filterFreq = 2500 * jitter;
        filterQ = 1.1;
        break;
    }

    filter.frequency.setValueAtTime(filterFreq, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + duration);
    filter.Q.value = filterQ;

    noiseGain.gain.setValueAtTime(0.85, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);

    osc.type = oscType;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration * 0.7);
    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.75);

    osc.connect(oscGain);
    oscGain.connect(masterGain);

    noise.start(now);
    noise.stop(now + duration);
    osc.start(now);
    osc.stop(now + duration);

    // Delayed bolt/pump cycle sound for bolt snipers & pump shotgun
    if (profile === 'sniper_bolt' || profile === 'shotgun_pump') {
      const delay = profile === 'sniper_bolt' ? 0.34 : 0.22;
      this.scheduleClick(now + delay, 950, 0.045, 0.22);
      this.scheduleClick(now + delay + 0.11, 1300, 0.04, 0.25);
    }
  }

  public playReload(durationSec: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Mag release
    this.scheduleClick(now + 0.05, 640, 0.05, 0.28);
    // Mag insert
    this.scheduleClick(now + durationSec * 0.58, 480, 0.07, 0.34);
    // Bolt rack / slide release
    this.scheduleClick(now + durationSec * 0.85, 1180, 0.055, 0.32);
  }

  public playEmptyClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.scheduleClick(ctx.currentTime, 1650, 0.025, 0.25);
  }

  public playHitmarker(isHeadshot: boolean) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isHeadshot ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(isHeadshot ? 1480 : 880, now);
    osc.frequency.exponentialRampToValueAtTime(
      isHeadshot ? 2100 : 520,
      now + (isHeadshot ? 0.09 : 0.05),
    );
    gain.gain.setValueAtTime(this.volume * (isHeadshot ? 0.35 : 0.22), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isHeadshot ? 0.11 : 0.06));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playShellClink() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.26;
    const freq = 3400 + Math.random() * 800;
    this.scheduleClick(now, freq, 0.025, 0.08);
  }

  public playSwitch() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.scheduleClick(ctx.currentTime, 760, 0.035, 0.18);
  }

  public playDamageTaken() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.16);
    gain.gain.setValueAtTime(this.volume * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playOutcome(victory: boolean) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = victory ? [523.25, 659.25, 783.99, 1046.5] : [330, 293.66, 220];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.09;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(this.volume * 0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  private scheduleClick(time: number, freq: number, duration: number, level: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.45, time + duration);
    gain.gain.setValueAtTime(this.volume * level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }
}

export const soundEngine = new SoundEngine();
