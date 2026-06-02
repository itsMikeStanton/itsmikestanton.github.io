'use strict';

let snd, muted = false;
const MASTER_VOL = 0.5;

(function initAudio() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = MASTER_VOL;
    master.connect(ctx.destination);

    const resume = () => { if (ctx.state === 'suspended') ctx.resume(); };
    document.addEventListener('click', resume);
    document.addEventListener('keydown', resume);

    const noiseBuf = (() => {
      const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return b;
    })();

    function mkNoise(freq, dur, vol, t = ctx.currentTime) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t); src.stop(t + dur);
    }

    function mkTone(freq, dur, vol, type = 'sine', t = ctx.currentTime) {
      const osc = ctx.createOscillator(); osc.type = type; osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + dur);
    }

    snd = {
      key:     () => mkNoise(3200, 0.035, 0.12),
      tick:    () => mkNoise(2000, 0.018, 0.065),
      hover:   () => mkTone(300 + Math.random()*180, 0.07, 0.09),
      barTick: (p) => mkTone(160 + p*520, 0.04, 0.065, 'square'),
      done:    () => { mkTone(620, 0.12, 0.13); mkTone(860, 0.1, 0.09, 'sine', ctx.currentTime+0.08); },
      glitch:  () => {
        const t    = ctx.currentTime;
        const freq = 480 + Math.random() * 280;

        // two detuned sawtooths — beating creates grit
        const osc1 = ctx.createOscillator();
        osc1.type  = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, t);
        osc1.frequency.setValueAtTime(freq * (0.4 + Math.random() * 1.0), t + 0.35 + Math.random() * 0.2);

        const osc2 = ctx.createOscillator();
        osc2.type  = 'sawtooth';
        osc2.frequency.setValueAtTime(freq * (1 + 0.03 + Math.random() * 0.05), t);

        // heavy bandpass noise for gritty fuzz bed
        const nSrc = ctx.createBufferSource();
        nSrc.buffer = noiseBuf; nSrc.loop = true;
        const nFilt = ctx.createBiquadFilter();
        nFilt.type = 'bandpass'; nFilt.frequency.value = freq * 0.8; nFilt.Q.value = 1.6;
        const nGain = ctx.createGain(); nGain.gain.value = 1.3;
        nSrc.connect(nFilt); nFilt.connect(nGain);

        // brutal waveshaper — near-square-wave clipping
        const shaper = ctx.createWaveShaper();
        const amt    = 200 + Math.random() * 180;
        const curve  = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
          const x = (i * 2) / 256 - 1;
          curve[i] = ((Math.PI + amt) * x) / (Math.PI + amt * Math.abs(x));
        }
        shaper.curve = curve;
        shaper.oversample = '4x';

        const mix = ctx.createGain(); mix.gain.value = 1;
        osc1.connect(mix); osc2.connect(mix); nGain.connect(mix);
        mix.connect(shaper);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.022, t + 0.32);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
        shaper.connect(g); g.connect(master);

        const dur = 2.0;
        osc1.start(t); osc1.stop(t + dur);
        osc2.start(t); osc2.stop(t + dur);
        nSrc.start(t); nSrc.stop(t + dur);
      },
      wipe: (ms) => {
        const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass';
        f.frequency.setValueAtTime(60, ctx.currentTime);
        f.frequency.linearRampToValueAtTime(8000, ctx.currentTime + ms/1000);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms/1000);
        s.connect(f); f.connect(g); g.connect(master);
        s.start(); s.stop(ctx.currentTime + ms/1000);
      },
      boot: () => {
        mkTone(60,  0.25, 0.14, 'sawtooth');
        mkTone(90,  0.2,  0.10, 'square',   ctx.currentTime + 0.3);
        mkTone(140, 0.3,  0.12, 'sine',     ctx.currentTime + 0.55);
        mkTone(220, 0.4,  0.10, 'sine',     ctx.currentTime + 0.9);
        mkNoise(1200, 0.8, 0.08, ctx.currentTime + 1.4);
      },
      mute: (m) => {
        master.gain.setTargetAtTime(m ? 0 : MASTER_VOL, ctx.currentTime, 0.06);
      },
    };
  } catch(e) {
    snd = new Proxy({}, { get: () => () => {} });
  }
})();

function toggleMute() {
  muted = !muted;
  snd.mute(muted);
  const el = document.getElementById('sound-toggle');
  if (el) el.textContent = muted ? '[MUTED]' : '[SOUND]';
}
