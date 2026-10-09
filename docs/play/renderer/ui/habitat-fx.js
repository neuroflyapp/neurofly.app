// habitat-fx.js — the Habitat game's layer over the terrarium: discovery
// cards, floating rewards, the rank-up banner, the care bubble above the fly
// and the red-light tint of optogenetics; and its short synthesized sounds.
// Observer side only: plain DOM over the canvas, never in the fly's eye.

import { h, icon } from './dom.js';
import { t } from '../i18n.js';

// ---- sound: a few soft tones, synthesized (no audio files) ---------------------------------------
const TUNES = {
  coin: [[880, 0, 0.09], [1320, 0.06, 0.12]],
  card: [[1047, 0, 0.12], [1319, 0.07, 0.12], [1568, 0.14, 0.2]],
  discovery: [[659, 0, 0.16], [988, 0.1, 0.16], [1319, 0.2, 0.32]],
  quest: [[523, 0, 0.14], [659, 0.1, 0.14], [784, 0.2, 0.14], [1047, 0.3, 0.4]],
  level: [[392, 0, 0.16], [523, 0.12, 0.16], [659, 0.24, 0.16], [784, 0.36, 0.16], [1047, 0.5, 0.6]],
  hatch: [[740, 0, 0.08], [554, 0.08, 0.08], [880, 0.16, 0.22]],
  shutter: [[1760, 0, 0.04], [1175, 0.05, 0.06]],
  soft: [[440, 0, 0.18]],
};

// On a touch device the big moments can be felt as well (same switch as the sound).
const VIBES = { discovery: 22, card: 10, quest: [18, 40, 18], level: [25, 45, 25, 45, 50], hatch: 28 };

export class HabitatSound {
  constructor() { this.enabled = true; this.ctx = null; this.touch = matchMedia?.('(pointer: coarse)').matches ?? false; }
  play(name) {
    if (!this.enabled || !TUNES[name]) return;
    if (this.touch && VIBES[name]) try { navigator.vibrate?.(VIBES[name]); } catch { /* not allowed here */ }
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime + 0.01;
      for (const [freq, at, dur] of TUNES[name]) {
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + at);
        gain.gain.linearRampToValueAtTime(0.07, now + at + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(now + at);
        osc.stop(now + at + dur + 0.05);
      }
    } catch { /* no audio on this device: silent game */ }
  }
  dispose() { try { this.ctx?.close(); } catch { /* already closed */ } this.ctx = null; }
}

// ---- the layer ------------------------------------------------------------------------------------
// Rewards arrive in bursts: one discovery brings its neuron cards, points and
// perhaps a new rank. The layer directs them so a player meets one thing at a
// time: big moments as cards in order of importance, with a breath between
// them (one at a time on a phone, where the sheet covers half the view);
// small news as one-line pills; the points of a burst as a single float.
// Nothing starts while a dialog is open, so no card times out unseen.
const BREATH_MS = 700, POINTS_MS = 900, MAX_QUEUE = 4, PILL_MS = 3800, MAX_PILLS = 2;
// An everyday card that waited this long behind bigger ones is old news: a pill.
const STALE_MS = 9000, STALE_PRIORITY = 55;

export class HabitatOverlay {
  constructor(host, { flyPosition }) {
    this.host = host;
    this.flyPosition = flyPosition;       // () => { x, y, visible } in host pixels, or null
    this.el = h('div', { class: 'hab-overlay', 'aria-live': 'polite' });
    this.cards = h('div', { class: 'hab-cards' });
    this.pills = h('div', { class: 'hab-pills' });
    this.bubble = h('div', { class: 'hab-bubble', hidden: true });
    this.tint = h('div', { class: 'hab-redlight', hidden: true });
    this.hint = h('div', { class: 'hab-hint-bar', hidden: true });
    this.el.append(this.tint, h('div', { class: 'hab-stack' }, this.hint, this.cards, this.pills), this.bubble);
    host.append(this.el);
    this.queue = [];
    this.active = [];          // items on screen
    this.nextAt = 0;
    this.pumpTimer = null;
    this.points = { xp: 0, leaves: 0, timer: null };
    this.order = 0;
    this.bubbleKey = null;
    this.bubbleXY = [NaN, NaN];
  }

  get phone() { return document.body.classList.contains('mobile'); }

  // A card over the terrarium: { tone, eyebrow, title, text, chips, rewards,
  // action, iconName, ms, priority, exclusive, full, keep }. Higher priority
  // first; an exclusive card (the welcome) shows alone; `keep` never shrinks
  // to a pill.
  card(spec) { this._enqueue({ type: 'card', priority: 10, ...spec }); }

  banner(eyebrow, title, sub, priority = 20) { this._enqueue({ type: 'banner', eyebrow, title, sub, priority }); }

  _enqueue(item) {
    item.order = this.order++;
    item.queuedAt = performance.now();
    this.queue.push(item);
    this.queue.sort((a, b) => b.priority - a.priority || a.order - b.order);
    // A long burst: the least important waiting cards become pills.
    while (this.queue.length > MAX_QUEUE) {
      const drop = this.queue.pop();
      if (drop.type === 'card') this.pill(drop.title, { iconName: drop.iconName, tone: drop.tone });
    }
    this._pump();
  }

  _pump() {
    clearTimeout(this.pumpTimer);
    this.pumpTimer = null;
    if (!this.queue.length || !this.el.isConnected) return;
    const wait = (ms) => { this.pumpTimer = setTimeout(() => this._pump(), ms); };
    if (document.querySelector('dialog[open]') || !this.hint.hidden) { wait(600); return; }
    const now = performance.now();
    if (now < this.nextAt) { wait(this.nextAt - now); return; }
    const next = this.queue[0];
    const limit = this.phone ? 1 : 2;
    if (this.active.some((x) => x.exclusive) || (next.exclusive && this.active.length) || this.active.length >= limit) return;
    this.queue.shift();
    if (next.type === 'card' && !next.keep && next.priority < STALE_PRIORITY && now - next.queuedAt > STALE_MS) {
      this.pill(next.title, { iconName: next.iconName, tone: next.tone === 'common' ? 'leaf' : 'card' });
      this._pump();
      return;
    }
    if (next.type === 'banner') this._showBanner(next); else this._showCard(next);
    if (this.queue.length) wait(BREATH_MS);
  }

  _done(item) {
    this.active = this.active.filter((x) => x !== item);
    this.nextAt = performance.now() + BREATH_MS;
    this._pump();
  }

  _showCard(item) {
    const { tone = 'discovery', eyebrow, title, text, chips = [], rewards = [], action = null, iconName = 'spark', full = false } = item;
    const ms = item.ms ?? (this.phone ? 6000 : 7000);
    this.active.push(item);
    const close = h('button', { type: 'button', class: 'hab-card-close', 'aria-label': t('Close') }, icon('close', 14));
    const el = h('div', { class: `hab-card tone-${tone}${full ? ' full' : ''}`, role: 'status' },
      h('div', { class: 'hab-card-icon' }, icon(iconName, 22)),
      h('div', { class: 'hab-card-body' },
        h('div', { class: 'hab-card-eyebrow' }, eyebrow),
        h('div', { class: 'hab-card-title' }, title),
        text ? h('div', { class: 'hab-card-text' }, text) : null,
        chips.length ? h('div', { class: 'hab-chips' }, ...chips.map((c) => h('span', { class: 'hab-chip' }, c))) : null,
        rewards.length || action ? h('div', { class: 'hab-card-foot' },
          ...rewards.map((r) => h('span', { class: 'hab-reward' }, r)),
          action ? h('button', { type: 'button', class: 'btn small hab-card-action', onclick: () => { action.onclick(); remove(); } }, action.label) : null) : null),
      close);
    let timer = null;
    const remove = () => {
      clearTimeout(timer);
      if (!el.isConnected || el.classList.contains('out')) return;
      el.classList.add('out');
      setTimeout(() => { el.remove(); this._done(item); }, 260);
    };
    close.addEventListener('click', remove);
    el.addEventListener('pointerenter', () => clearTimeout(timer));
    el.addEventListener('pointerleave', () => { timer = setTimeout(remove, 2500); });
    this.cards.append(el);
    timer = setTimeout(remove, ms);
  }

  _showBanner(item) {
    this.active.push(item);
    const el = h('div', { class: 'hab-banner' }, h('div', { class: 'hab-banner-ring' }),
      h('div', { class: 'hab-banner-eyebrow' }, item.eyebrow), h('div', { class: 'hab-banner-title' }, item.title),
      item.sub ? h('div', { class: 'hab-banner-sub' }, item.sub) : null);
    this.el.append(el);
    setTimeout(() => el.classList.add('out'), 2400);
    setTimeout(() => { el.remove(); this._done(item); }, 2800);
  }

  // A standing instruction over the terrarium (placing a garden piece);
  // cards and pills wait meanwhile. null removes it.
  setHint(text, onCancel = null) {
    this.hint.hidden = !text;
    this.el.classList.toggle('hinting', Boolean(text));
    if (!text) { this.hint.replaceChildren(); this._pump(); return; }
    this.hint.replaceChildren(icon('target', 15), h('span', {}, text),
      onCancel ? h('button', { type: 'button', class: 'btn small', onclick: onCancel }, t('Cancel')) : null);
  }

  // One line of news at the top: { iconName, tone, onclick }.
  pill(text, { iconName = 'spark', tone = 'card', onclick = null } = {}) {
    while (this.pills.children.length >= MAX_PILLS) this.pills.firstChild.remove();
    const el = h(onclick ? 'button' : 'div', { class: `hab-pill tone-${tone}`, ...(onclick ? { type: 'button' } : {}) },
      icon(iconName, 14), h('span', {}, text));
    if (onclick) el.addEventListener('click', () => { onclick(); el.remove(); });
    this.pills.append(el);
    setTimeout(() => el.classList.add('out'), PILL_MS);
    setTimeout(() => el.remove(), PILL_MS + 300);
  }

  // Points of one burst rise as one float: "+45 XP · +5 leaves".
  addPoints(xp = 0, leaves = 0) {
    const p = this.points;
    p.xp += xp; p.leaves += leaves;
    if (p.timer) return;
    p.timer = setTimeout(() => {
      const parts = [p.xp ? `+${p.xp} XP` : null, p.leaves ? `+${p.leaves} ${t('leaves')}` : null].filter(Boolean);
      if (parts.length) this.float(parts.join(' · '), p.xp ? 'xp' : 'leaf');
      p.xp = 0; p.leaves = 0; p.timer = null;
    }, POINTS_MS);
  }

  // The neurons deciding what the fly just started, as a tag over her head
  // for two seconds ({ text, color: [r, g, b] }).
  whisper(text, color = [0, 1, 0.25]) {
    const p = this.flyPosition();
    if (!p?.visible) return;
    const rgb = `rgb(${color.map((c) => Math.round(c * 255)).join(',')})`;
    // Not under the cards: below them if the fly stands in their column.
    let y = p.y - 46;
    const stack = this.cards.parentElement.getBoundingClientRect(), host = this.host.getBoundingClientRect();
    if (stack.height > 0 && p.x > stack.left - host.left - 60 && p.x < stack.right - host.left + 60) y = Math.max(y, stack.bottom - host.top + 34);
    const el = h('div', { class: 'hab-whisper', style: { left: `${Math.round(p.x)}px`, top: `${Math.round(y)}px`, '--w': rgb } },
      icon('bolt', 12), h('span', {}, text));
    this.el.append(el);
    setTimeout(() => el.remove(), 2400);
  }

  // A short text rising from the fly (or the middle of the view).
  float(text, kind = 'xp') {
    const p = this.flyPosition();
    const x = p?.visible ? p.x : this.host.clientWidth / 2;
    let y = p?.visible ? p.y - 24 : this.host.clientHeight * 0.3;
    // Never over the cards and pills at the top (read once per float, not per frame).
    const stack = this.cards.parentElement.getBoundingClientRect();
    if (stack.height > 0) y = Math.max(y, stack.bottom - this.host.getBoundingClientRect().top + 40);
    const el = h('div', { class: `hab-float ${kind}`, style: { left: `${Math.round(x)}px`, top: `${Math.round(y)}px` } }, text);
    this.el.append(el);
    setTimeout(() => el.remove(), 1600);
  }

  // The most urgent need as a small bubble above the fly (null hides it).
  setBubble(need) {
    const key = need?.key ?? null;
    if (key === this.bubbleKey) return;
    this.bubbleKey = key;
    this.bubble.hidden = !need;
    if (need) this.bubble.replaceChildren(icon(need.icon, 15), h('span', {}, need.label));
  }

  // Every snapshot: keep the bubble over her head (only when shown).
  follow() {
    if (this.bubble.hidden) return;
    const p = this.flyPosition();
    if (!p?.visible) { this.bubble.style.opacity = '0'; return; }
    const x = Math.round(p.x), y = Math.round(p.y - 30);
    if (x === this.bubbleXY[0] && y === this.bubbleXY[1]) return;
    this.bubbleXY = [x, y];
    this.bubble.style.opacity = '';
    this.bubble.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  }

  setRedLight(on) { this.tint.hidden = !on; }

  flash() {
    const el = h('div', { class: 'hab-flash' });
    this.el.append(el);
    setTimeout(() => el.remove(), 500);
  }

  dispose() {
    clearTimeout(this.pumpTimer);
    clearTimeout(this.points.timer);
    this.el.remove();
    this.queue = [];
    this.active = [];
  }
}

// ---- the photo: the terrarium picture with a caption band and the logo ----------------------------
const loadImage = (src) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

export async function composePhoto({ imageUrl, title, lines = [], footer = '' }) {
  const shot = await loadImage(imageUrl);
  if (!shot) return null;
  const scale = Math.min(1, 1920 / shot.width);
  const w = Math.round(shot.width * scale), h = Math.round(shot.height * scale);
  const band = Math.round(Math.max(130, h * 0.22));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  g.drawImage(shot, 0, 0, w, h);
  const fade = g.createLinearGradient(0, h - band * 1.6, 0, h);
  fade.addColorStop(0, 'rgba(8,12,13,0)');
  fade.addColorStop(1, 'rgba(8,12,13,0.92)');
  g.fillStyle = fade;
  g.fillRect(0, h - band * 1.6, w, band * 1.6);
  const pad = Math.round(band * 0.22), unit = band / 130;
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#f9f6f1';
  g.font = `700 ${Math.round(34 * unit)}px "Segoe UI", system-ui, sans-serif`;
  let y = h - band + Math.round(42 * unit);
  g.fillText(title, pad, y);
  g.font = `${Math.round(17 * unit)}px "Segoe UI", system-ui, sans-serif`;
  for (const [k, line] of lines.entries()) {
    y += Math.round(25 * unit);
    g.fillStyle = k === 0 ? '#00ff41' : '#c9d6d1';
    g.fillText(line, pad, y);
  }
  if (footer) {
    g.font = `${Math.round(12.5 * unit)}px "Segoe UI", system-ui, sans-serif`;
    g.fillStyle = '#8ea39d';
    g.fillText(footer, pad, y + Math.round(23 * unit));
  }
  const logo = await loadImage(new URL('../../assets/brand/neurocause-logo.svg', import.meta.url).href);
  if (logo) {
    const lh = Math.round(28 * unit), lw = Math.round(lh * (logo.width / logo.height || 5.3));
    g.globalAlpha = 0.92;
    g.drawImage(logo, w - pad - lw, h - band + Math.round(18 * unit), lw, lh);
    g.globalAlpha = 1;
  }
  return canvas.toDataURL('image/png');
}
