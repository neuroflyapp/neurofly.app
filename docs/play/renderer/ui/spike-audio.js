// spike-audio.js — listen to neurons, as electrophysiologists do: every spike
// of the chosen cells (exact, from the worker's spike record) as a click.
//
// Observer only: it reads the snapshot's `listen` field and sends nothing
// back. Each snapshot's spikes become one short audio buffer that plays
// right after the previous one, so the clicks keep their millisecond timing
// within a snapshot; a gap (a slow page, a pause) is silence, never a burst.

const CLICK_MS = 1.2;

export class SpikeAudio {
  constructor() {
    this.ac = null;
    this.out = null;
    this.next = 0;
    this.wave = null;
  }

  // Must run inside a user gesture (browsers unlock audio only then).
  start() {
    if (!this.ac) {
      const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!AC) return false;
      this.ac = new AC();
      this.out = this.ac.createGain();
      this.out.gain.value = 0.5;
      this.out.connect(this.ac.destination);
      // One extracellular spike: a fast positive peak, a slower trough.
      const n = Math.round((CLICK_MS / 1000) * this.ac.sampleRate);
      this.wave = new Float32Array(n);
      for (let k = 0; k < n; k++) {
        const x = k / n;
        this.wave[k] = Math.exp(-((x - 0.18) ** 2) / 0.006) - 0.45 * Math.exp(-((x - 0.45) ** 2) / 0.03);
      }
    }
    this.ac.resume?.();
    this.next = 0;
    return true;
  }

  // Many cells at once sound like a multi-unit recording: quieter clicks.
  static amplitude(cells) { return 0.7 / Math.sqrt(Math.max(1, cells / 3)); }

  // listen: { spanMs, ms: Uint16Array of offsets within the span, count }
  feed(listen) {
    if (!listen?.spanMs) return;
    // within its millisecond, a fixed spread by order (no randomness)
    const times = Float32Array.from(listen.ms, (ms, q) => ms + ((q * 0.618) % 1));
    this.play(listen.spanMs, times, SpikeAudio.amplitude(listen.count));
  }

  // Clicks at `times` (ms from now's buffer start), `amp` each (or amps[q]).
  play(spanMs, times, amp, amps = null) {
    const ac = this.ac;
    if (!ac || ac.state !== 'running' || !(spanMs > 0)) return;
    const sr = ac.sampleRate, len = Math.max(1, Math.round((spanMs / 1000) * sr));
    const buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0), w = this.wave;
    const perMs = sr / 1000;
    for (let q = 0; q < times.length; q++) {
      const at = Math.min(len - 1, Math.max(0, Math.floor(times[q] * perMs))), a = amps ? amps[q] : amp;
      for (let k = 0; k < w.length && at + k < len; k++) d[at + k] += a * w[k];
    }
    for (let i = 0; i < len; i++) d[i] = Math.tanh(d[i] * 1.6);   // overlapping clicks never clip
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(this.out);
    const now = ac.currentTime;
    if (this.next < now + 0.02 || this.next > now + 0.4) this.next = now + 0.06;
    src.start(this.next);
    this.next += len / sr;
  }

  stop() { this.next = 0; }
}
