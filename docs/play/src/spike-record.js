// spike-record.js — the exact spikes around a behaviour, for replaying them.
//
// The spike bus is a drawing sample (six spikes per millisecond); a replay of
// how a decision formed needs every spike. SpikeRecorder keeps the last
// ~1 s of all spikes (neuron and millisecond) in a ring; when an event is
// explained, ReplayStore freezes the window around it once the moments after
// it have been simulated too. Read-only on the network: the simulation
// calls record() after each millisecond and nothing here is read back by it,
// so runs with and without a recorder are identical.

export const REPLAY_BEFORE_MS = 500;
export const REPLAY_AFTER_MS = 150;
export const REPLAYS_KEPT = 6;

export class SpikeRecorder {
  constructor(capacity = 1 << 17) {
    this.capacity = capacity;               // a power of two
    this.mask = capacity - 1;
    this.neuron = new Int32Array(capacity);
    this.ms = new Float64Array(capacity);
    this.head = 0;                          // next write
    this.count = 0;
  }

  reset() { this.head = 0; this.count = 0; }

  // The spikes of one simulated millisecond (`spiked[0..n)`).
  record(ms, spiked, n) {
    let head = this.head;
    const neuron = this.neuron, stamp = this.ms, mask = this.mask;
    for (let s = 0; s < n; s++) {
      neuron[head] = spiked[s];
      stamp[head] = ms;
      head = (head + 1) & mask;
    }
    this.head = head;
    this.count = Math.min(this.capacity, this.count + n);
  }

  // Spikes with fromMs <= ms <= toMs, oldest first. `complete` is false when
  // the ring no longer reaches back to fromMs (a very busy second).
  window(fromMs, toMs) {
    let k = 0, i = this.head;
    while (k < this.count) {
      const j = (i - 1) & this.mask;
      if (this.ms[j] < fromMs) break;
      i = j; k++;
    }
    const complete = k < this.count || this.count === 0 || (this.count < this.capacity);
    const neurons = [], times = [];
    for (let q = 0, j = i; q < k; q++, j = (j + 1) & this.mask) {
      const t = this.ms[j];
      if (t > toMs) break;
      neurons.push(this.neuron[j]);
      times.push(t - fromMs);
    }
    return { neurons: Int32Array.from(neurons), ms: Uint16Array.from(times), fromMs, toMs, complete };
  }
}

// Frozen windows around the latest explained events.
export class ReplayStore {
  constructor(recorder, { before = REPLAY_BEFORE_MS, after = REPLAY_AFTER_MS, kept = REPLAYS_KEPT } = {}) {
    this.recorder = recorder;
    this.before = before; this.after = after; this.kept = kept;
    this.pending = [];
    this.items = [];
  }

  reset() { this.pending = []; this.items = []; this.recorder.reset(); }

  // An event at neural time `atMs`, identified by its kind and loop time `t`.
  mark(kind, t, atMs) { this.pending.push({ kind, t, atMs }); }

  // Called after each simulated step: freezes windows whose aftermath is in.
  update(nowMs) {
    while (this.pending.length && nowMs >= this.pending[0].atMs + this.after) {
      const p = this.pending.shift();
      const w = this.recorder.window(p.atMs - this.before, p.atMs + this.after);
      this.items.push({ kind: p.kind, t: p.t, beforeMs: this.before, afterMs: this.after, ...w });
      if (this.items.length > this.kept) this.items.shift();
    }
  }

  // The frozen window of the event (kind, t), or null. `pending` when it is
  // still being recorded.
  get(kind, t) {
    const hit = this.items.find((r) => r.kind === kind && Math.abs(r.t - t) < 1e-6);
    if (hit) return hit;
    return this.pending.some((r) => r.kind === kind && Math.abs(r.t - t) < 1e-6) ? { pending: true } : null;
  }
}
