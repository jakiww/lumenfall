// audio.js — synthesized sound for LUMENFALL.
// One job: every sound the game makes, built from WebAudio oscillators
// and noise — no audio files, no network. Music is a slow ambient loop
// scheduled from the game update; SFX are one-shot envelopes.

/** Create the audio engine. It stays silent until resume() runs on a user gesture. */
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = 0;
  let beat = 0;
  let chordIndex = 0;

  // Am — F — C — G, slow and warm. Each chord is a set of MIDI notes.
  const CHORDS = [
    [57, 60, 64],
    [53, 57, 60],
    [48, 55, 60],
    [55, 59, 62],
  ];
  // Pentatonic pluck notes the loop sprinkles over the pad.
  const PLUCK_SCALE = [69, 72, 74, 76, 79, 81, 84];

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
    } catch {
      return false;
    }
    return true;
  }

  /** Call from any user gesture; browsers block audio before one. */
  function resume() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, dur, type, vol, slideTo, delay = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, filterFreq, delay = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  function padNote(midi, dur) {
    if (!ctx || muted) return;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const t0 = ctx.currentTime;
    for (const detune of [-4, 4]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.5, t0 + dur * 0.3);
      gain.gain.linearRampToValueAtTime(0, t0 + dur);
      osc.connect(gain);
      gain.connect(musicGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    }
  }

  /** Advance the music loop; call every frame with dt in seconds. */
  function update(dt) {
    if (!ctx || muted || ctx.state !== 'running') return;
    musicTimer += dt;
    const BEAT = 0.42;
    while (musicTimer >= BEAT) {
      musicTimer -= BEAT;
      beat++;
      if (beat % 8 === 0) {
        const chord = CHORDS[chordIndex % CHORDS.length];
        chordIndex++;
        for (const note of chord) padNote(note, BEAT * 8.5);
      }
      if (beat % 2 === 1) {
        const scale = PLUCK_SCALE[(beat * 7 + chordIndex * 3) % PLUCK_SCALE.length];
        tone(440 * Math.pow(2, (scale - 69) / 12), 0.5, 'sine', 0.05);
      }
    }
  }

  return {
    resume,
    update,

    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },

    shoot() {
      tone(720, 0.09, 'square', 0.06, 320);
    },
    hit() {
      noise(0.06, 0.1, 2400);
      tone(190, 0.06, 'triangle', 0.08, 120);
    },
    kill() {
      tone(420, 0.22, 'sawtooth', 0.09, 70);
      noise(0.18, 0.12, 1200);
    },
    pickup() {
      tone(880, 0.07, 'sine', 0.07);
      tone(1320, 0.1, 'sine', 0.06, undefined, 0.05);
    },
    dash() {
      noise(0.16, 0.1, 3200);
    },
    hurt() {
      tone(140, 0.25, 'sawtooth', 0.14, 60);
      noise(0.12, 0.1, 700);
    },
    waveStart() {
      tone(196, 0.5, 'triangle', 0.12, 392);
      tone(294, 0.5, 'sine', 0.07, undefined, 0.08);
    },
    waveClear() {
      [784, 988, 1175].forEach((f, i) => tone(f, 0.22, 'sine', 0.08, undefined, i * 0.07));
    },
    boss() {
      tone(98, 0.9, 'sawtooth', 0.14, 49);
      tone(103, 0.9, 'sawtooth', 0.12, 52, 0.05);
      noise(0.7, 0.08, 500);
    },
    upgrade() {
      [660, 880, 990, 1320].forEach((f, i) => tone(f, 0.14, 'sine', 0.08, undefined, i * 0.06));
    },
    win() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, 'triangle', 0.1, undefined, i * 0.12));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, 'triangle', 0.1, undefined, i * 0.16));
    },
  };
}
