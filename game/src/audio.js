// Synthesised sound: no audio files. A sawtooth engine hum whose pitch
// follows throttle and airspeed, wind noise that grows with speed, a two-note
// chime for a ring, and a low thud for landing or a crash. Everything starts
// on the player's first gesture, so browsers allow it.
export function createAudio() {
  let context = null;
  let engineOsc = null;
  let engineGain = null;
  let windGain = null;
  let windSource = null;
  let started = false;

  function start() {
    if (started) return;
    started = true;
    try {
      context = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(context.destination);
      engineOsc.start();

      // Looping wind: white noise through a band-pass filter.
      const length = context.sampleRate * 2;
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      windSource = context.createBufferSource();
      windSource.buffer = buffer;
      windSource.loop = true;
      const windFilter = context.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 700;
      windFilter.Q.value = 0.6;
      windGain = context.createGain();
      windGain.gain.value = 0;
      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(context.destination);
      windSource.start();
    } catch {
      context = null;
    }
  }

  function tone(frequency, at, duration, volume) {
    if (!context) return;
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  }

  return {
    start,
    /** Called every frame while flying; silent on the title screen. */
    setEngine(throttle, speed, flying) {
      if (!context || !engineGain) return;
      const now = context.currentTime;
      engineOsc.frequency.setTargetAtTime(48 + throttle * 70 + speed * 0.5, now, 0.1);
      engineGain.gain.setTargetAtTime(flying ? 0.03 + throttle * 0.05 : 0, now, 0.1);
      windGain.gain.setTargetAtTime(flying ? Math.min(0.06, speed * 0.0009) : 0, now, 0.15);
    },
    ring() {
      if (!context) return;
      const now = context.currentTime;
      tone(660, now, 0.35, 0.16);
      tone(990, now + 0.09, 0.45, 0.16);
    },
    thud(hard) {
      if (!context) return;
      const now = context.currentTime;
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hard ? 70 : 110, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.25);
      const gain = context.createGain();
      gain.gain.setValueAtTime(hard ? 0.5 : 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    },
  };
}
