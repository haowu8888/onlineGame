/* 音色参数是固定效果数据；播放逻辑只负责调度与 Web Audio 生命周期。 */
const SHARED_SOUND_EFFECTS = Object.freeze({
  click: [{ frequency: 800, duration: 0.08, type: 'square', gain: 0.3 }],
  hover: [{ frequency: 600, duration: 0.05, gain: 0.15 }],
  success: [{ frequency: 523, duration: 0.12 }, { frequency: 659, duration: 0.12, delay: 100 }, { frequency: 784, duration: 0.2, delay: 200 }],
  error: [{ frequency: 200, duration: 0.15, type: 'square', gain: 0.3 }, { frequency: 150, duration: 0.2, type: 'square', gain: 0.3, delay: 120 }],
  levelup: [{ frequency: 440, duration: 0.1 }, { frequency: 554, duration: 0.1, delay: 80 }, { frequency: 659, duration: 0.1, delay: 160 }, { frequency: 880, duration: 0.3, delay: 240 }],
  coin: [{ frequency: 988, duration: 0.06, type: 'square', gain: 0.25 }, { frequency: 1319, duration: 0.1, type: 'square', gain: 0.25, delay: 60 }],
  hit: [{ noise: true, duration: 0.1 }, { frequency: 150, duration: 0.1, type: 'sawtooth', gain: 0.3 }],
  impact: [{ noise: true, duration: 0.045, gain: 0.08 },
    { frequency: 160, ramp: 65, duration: 0.085, type: 'triangle', gain: 0.16 }],
  critical: [{ noise: true, duration: 0.065, gain: 0.13 },
    { frequency: 240, ramp: 48, duration: 0.16, type: 'triangle', gain: 0.23 },
    { frequency: 1250, ramp: 620, duration: 0.08, type: 'sine', gain: 0.06 }],
  heal: [{ frequency: 440, duration: 0.15, gain: 0.3, ramp: 880 }],
  card: [{ noise: true, duration: 0.06, gain: 0.2 }, { frequency: 400, duration: 0.06, gain: 0.2 }],
  dash: [{ noise: true, duration: 0.09, gain: 0.12 }, { frequency: 720, ramp: 220, duration: 0.12, type: 'triangle', gain: 0.1 }],
  defeat: [{ frequency: 440, duration: 0.2, type: 'sawtooth' }, { frequency: 349, duration: 0.2, type: 'sawtooth', delay: 180 }, { frequency: 262, duration: 0.4, type: 'sawtooth', delay: 360 }],
  achievement: [{ frequency: 659, duration: 0.1 }, { frequency: 784, duration: 0.1, delay: 100 }, { frequency: 988, duration: 0.1, delay: 200 }, { frequency: 1175, duration: 0.3, type: 'triangle', delay: 300 }],
  purchase: [{ frequency: 523, duration: 0.08, type: 'triangle' }, { frequency: 659, duration: 0.08, type: 'triangle', delay: 70 }, { frequency: 784, duration: 0.15, type: 'triangle', delay: 140 }],
  wave: [{ frequency: 330, duration: 0.1, type: 'square' }, { frequency: 440, duration: 0.15, type: 'square', delay: 80 }],
});

class SharedSoundController {
  constructor(options) {
    this.storage = options.storage;
    this.createContext = options.createContext;
    this.schedule = options.schedule;
    this.canStartAudio = options.canStartAudio;
    this.context = null;
    this.noiseBuffer = null;
    this.enabled = this.storage.get('sound_enabled', true);
    this.volume = this.storage.get('sound_volume', 0.3);
  }

  getContext() {
    if (!this.context) this.context = this.createContext();
    if (this.context.state === 'suspended') {
      this.context.resume().catch(error => console.error('恢复音频播放失败:', error));
    }
    return this.context;
  }

  play(name) {
    const effects = SHARED_SOUND_EFFECTS[name];
    if (!effects || !this.enabled || this.volume === 0 || !this.canStartAudio()) return;
    for (const effect of effects) {
      if (effect.delay) this.schedule(() => this.playEffect(effect), effect.delay);
      else this.playEffect(effect);
    }
  }

  // 音效只是点缀：音频环境不可用时记录一次错误，不打断调用方（例如 showToast）。
  playEffect(effect) {
    if (!this.enabled || this.volume === 0) return;
    try {
      this.renderEffect(effect);
    } catch (error) {
      if (!this.reported) console.error('播放音效失败:', error);
      this.reported = true;
    }
  }

  renderEffect(effect) {
    const context = this.getContext();
    const source = effect.noise ? this.createNoise(effect.duration) : this.createTone(effect);
    const gain = context.createGain();
    const END_GAIN = 0.001;
    const DEFAULT_GAIN = 0.4;
    gain.gain.setValueAtTime((effect.gain ?? DEFAULT_GAIN) * this.volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(END_GAIN, context.currentTime + effect.duration);
    source.connect(gain);
    gain.connect(context.destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(context.currentTime);
    source.stop(context.currentTime + effect.duration);
  }

  createTone(effect) {
    const context = this.context;
    const oscillator = context.createOscillator();
    oscillator.type = effect.type ?? 'sine';
    oscillator.frequency.setValueAtTime(effect.frequency, context.currentTime);
    if (effect.ramp) oscillator.frequency.linearRampToValueAtTime(effect.ramp, context.currentTime + effect.duration);
    return oscillator;
  }

  createNoise(duration) {
    const context = this.context;
    const length = Math.floor(context.sampleRate * duration);
    if (!this.noiseBuffer || this.noiseBuffer.length < length) {
      this.noiseBuffer = context.createBuffer(1, length, context.sampleRate);
      const samples = this.noiseBuffer.getChannelData(0);
      for (let index = 0; index < length; index++) samples[index] = Math.random() * 2 - 1;
    }
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    return source;
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    this.storage.set('sound_enabled', this.enabled);
  }

  isEnabled() {
    return this.enabled;
  }

  setVolume(value) {
    if (!Number.isFinite(value)) throw new TypeError('音量必须为有限数字');
    this.volume = clamp(value, 0, 1);
    this.storage.set('sound_volume', this.volume);
  }

  getVolume() {
    return this.volume;
  }
}

window.SoundManager = new SharedSoundController({
  storage: Storage,
  schedule: (callback, delay) => setTimeout(callback, delay),
  canStartAudio: () => !navigator.userActivation || navigator.userActivation.hasBeenActive,
  createContext: () => {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error('当前浏览器不支持 Web Audio');
    return new Context();
  },
});

function initSoundToggle() {
  const button = document.createElement('button');
  button.className = 'sound-toggle';
  const update = () => {
    const enabled = SoundManager.isEnabled();
    button.textContent = enabled ? '🔊' : '🔇';
    button.classList.toggle('muted', !enabled);
    button.setAttribute('aria-label', enabled ? '关闭音效' : '开启音效');
    button.setAttribute('aria-pressed', String(enabled));
  };
  button.addEventListener('click', () => {
    SoundManager.setEnabled(!SoundManager.isEnabled());
    update();
    SoundManager.play('click');
  });
  update();
  document.body.appendChild(button);
}

document.addEventListener('DOMContentLoaded', initSoundToggle);
