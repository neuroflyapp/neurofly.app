// explore.js — the browser version for a first-time visitor: a calm "Explore"
// layout (the full Studio one click away), a hands-on tour, and an answer
// to every touch: what the fly sensed, which neurons that reached, and what
// she did — or, honestly, why nothing visible followed.
//
// Observer side only. The tour and the feedback send nothing on their own:
// every model input comes from a button the visitor presses or a touch on
// the terrarium, exactly as without them. Texts name "the fly" (no she/he).

import { h, icon } from './dom.js';
import { t } from '../i18n.js';
import { GROUP_COLORS } from '../view/brain.js';
import { SAVE_KEY, LEGACY_KEY } from '../../src/habitat-game.js';

const LAYOUT_KEY = 'neurocause.webLayout';
const TOUR_KEY = 'neurocause.webGuide.v2';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* a convenience only */ } },
};

// What a stimulus is, for the fly, and where it enters her brain. `group` is
// a connectome-view population, `pop` a worker population (indices on request).
const SENSES = {
  loom: { icon: 'loom', sense: 'A shadow rushes at the eyes', group: 'loom', note: 'Seen by the looming detectors LC4/LPLC2',
    none: 'No escape this time: the giant fiber stayed below threshold. A faster, closer shadow works better.' },
  puff: { icon: 'wind', sense: 'A gust of air at the antennae', pop: 'joW', color: [0.55, 1, 0.75], note: 'Felt by the wind neurons of the antennae (JO-C/D/E)',
    none: 'Felt, but wind alone does not trigger an escape: that is how this circuit is wired.' },
  sound: { icon: 'sound', sense: 'A buzz close by', pop: 'joA', color: [0.62, 1, 0.36], note: 'Heard by the hearing neurons of the antennae (JO-A/B)',
    none: 'Heard: the hearing neurons fired, without a visible reaction this time.' },
  dust: { icon: 'groom', sense: 'Dust on the antennae', group: 'joF', note: 'Felt by the touch neurons of the antennae (JO-F)',
    none: 'The dust is felt; head grooming usually follows within a few seconds.' },
  sugar: { icon: 'drop', sense: 'Sugar at the mouthparts', group: 'sugar', note: 'Tasted by the sugar neurons',
    none: 'No proboscis this time: the taste circuit stayed below threshold or the fly was busy.' },
  bitter: { icon: 'drop', sense: 'Bitter at the mouthparts', group: 'bitter', note: 'Tasted by the bitter neurons',
    none: 'The proboscis stays in: bitter neurons hold the feeding motor neurons back.' },
  drop: { icon: 'drop', sense: 'A drop of sugar lies in the terrarium',
    none: 'The fly has to find the drop: watch whether it walks over and drinks.' },
  tap: { icon: 'hand', sense: 'Your tap: a puff of air at the antennae', pop: 'joW', color: [0.55, 1, 0.75], note: 'Felt by the wind neurons of the antennae (JO-C/D/E)',
    none: 'Felt, but wind alone does not trigger an escape: that is how the fly is wired. Drag the fly and let go, or swipe quickly at it.' },
  far: { icon: 'hand', sense: 'Too far away: the air from your tap does not reach the antennae.',
    none: 'Tap close to the fly, drag it and let go, or swipe quickly at it.' },
  flick: { icon: 'hand', sense: 'Flicked away', group: 'gf', note: 'The flick drives the giant fiber, the escape command', none: '' },
  grab: { icon: 'hand', sense: 'Held between your fingers', none: '' },
  cells: { icon: 'bolt', sense: 'You stimulated neurons in the brain view', none: 'Activity spread through their synapses; no behaviour followed this time.' },
};

// A behaviour, in a few words, with the neurons that decided it.
const RESULTS = {
  takeoff: 'Escape! One spike of the giant fiber launched the takeoff.',
  dart: 'Flinched away: the looming detectors fired.',
  spontaneousFlight: 'Flew off, without an outside trigger.',
  headGrooming: 'Head grooming, driven by DNg12.',
  legGrooming: 'Leg rubbing, driven by DNg11.',
  backward: 'Walking backward, driven by MDN.',
  walk: 'Starts walking, driven by DNp09.',
  proboscis: 'Proboscis out: the taste circuit said yes.',
  feeding: 'Drinking.',
};

export function setupExplore(ctx, panels = []) {
  if (ctx.api?.platform !== 'web') return null;
  // Someone new gets the tour first, whichever link brought them (the website's
  // links open a workspace): it runs in Live, where its controls are, and the
  // linked workspace opens after it. A Habitat save means they have been here.
  const params = new URLSearchParams(location.search);
  const firstVisit = params.get('tour') === '1' || (!store.get(TOUR_KEY) && !store.get(SAVE_KEY) && !store.get(LEGACY_KEY));
  const asked = params.get('workspace');
  const after = { to: firstVisit && asked !== 'live' && panels.some((p) => p.id === asked) ? asked : null };
  document.body.classList.add('browser-experience');
  const terrarium = document.getElementById('terrarium');
  const touch = () => ctx.touch || document.body.classList.contains('mobile');

  // ---- layout: Explore (default) or the full Studio ----
  ctx.layout = store.get(LAYOUT_KEY) === 'studio' ? 'studio' : 'explore';
  const applyLayout = () => document.body.classList.toggle('explore', ctx.layout === 'explore');
  applyLayout();
  ctx.setLayout = (mode) => {
    ctx.layout = mode === 'studio' ? 'studio' : 'explore';
    store.set(LAYOUT_KEY, ctx.layout);
    applyLayout();
    if (ctx.layout === 'explore' && ['data', 'model', 'specimens'].includes(ctx.shell?.active)) ctx.shell.select('live');
    ctx.shell?.rebuild?.();
    setTimeout(() => window.dispatchEvent(new Event('resize')), 30);
  };

  // Explore shows the fly up close: easier to touch, and it reacts in view.
  if (ctx.layout === 'explore' && !document.body.classList.contains('mobile')) ctx.views.terrarium?.setCameraMode?.('follow');

  // ---- feedback: a ripple where you touched, a bubble at the fly ----
  const ripple = h('div', { class: 'tap-ripple', 'aria-hidden': 'true' });
  const bubble = h('div', { class: 'react', role: 'status', 'aria-live': 'polite', hidden: true });
  terrarium.append(ripple, bubble);
  let current = null;            // { kind, until, decided, t0 }
  let follow = null, hideTimer = null;

  function rippleAt(clientX, clientY) {
    const r = terrarium.getBoundingClientRect();     // on a touch, not per frame
    ripple.style.left = `${clientX - r.left}px`;
    ripple.style.top = `${clientY - r.top}px`;
    ripple.classList.remove('on');
    void ripple.offsetWidth;
    ripple.classList.add('on');
  }

  function placeBubble() {
    const p = ctx.views.terrarium?.flyScreenPosition?.();
    const w = terrarium.clientWidth, hgt = terrarium.clientHeight;
    const x = p?.visible ? p.x : w / 2, y = p?.visible ? p.y : hgt * 0.4;
    // above the fly, inside the view; the transform moves on the compositor
    const bx = Math.max(12, Math.min(w - bubble.offsetWidth - 12, x - bubble.offsetWidth / 2));
    const by = Math.max(64, Math.min(hgt - bubble.offsetHeight - 12, y - bubble.offsetHeight - 46));
    bubble.style.transform = `translate(${Math.round(bx)}px, ${Math.round(by)}px)`;
  }

  function showBubble(kind, extra = {}) {
    const s = SENSES[kind];
    if (!s) return;
    if (ctx.shell?.active === 'habitat') return;       // the game has its own voice
    current = { kind, t0: ctx.snap?.t ?? 0, decided: false };
    const result = h('div', { class: 'react-result' });
    const brainBtn = s.group || s.pop
      ? h('button', { class: 'react-brain', type: 'button', onclick: () => { ctx.showBrain?.(); } }, icon('brain', 13), t('In the brain'))
      : null;
    bubble.replaceChildren(...[h('div', { class: 'react-sense' }, icon(s.icon, 15), h('b', {}, t(s.sense))),
      s.note ? h('div', { class: 'react-note' }, t(s.note)) : null, result, document.body.classList.contains('mobile') ? brainBtn : null].filter(Boolean));
    bubble.dataset.kind = kind;
    bubble.hidden = false;
    bubble.classList.remove('settled');
    current.result = result;
    placeBubble();
    clearInterval(follow);
    follow = setInterval(placeBubble, 100);
    clearTimeout(hideTimer);
    // what she did, or why nothing visible followed
    hideTimer = setTimeout(() => decide(null), extra.waitMs ?? (kind === 'drop' ? 9000 : kind === 'dust' ? 6000 : 2600));
    pingBrain(s);
  }

  function decide(event) {
    if (!current || current.decided) return;
    current.decided = true;
    const s = SENSES[current.kind];
    const text = event ? RESULTS[event.kind] : s?.none;
    if (text) {
      current.result.replaceChildren(icon(event ? 'spark' : 'help', 14), h('span', {}, t(text)));
      current.result.classList.toggle('none', !event);
      bubble.classList.add('settled');
    }
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideBubble, text ? (event ? 3600 : 5200) : 600);
  }

  function hideBubble() {
    bubble.hidden = true;
    clearInterval(follow);
    follow = null;
    current = null;
  }

  // The stimulated neurons light up in the connectome view, named, unless
  // the visitor is looking at something else there.
  let ownHighlight = null;
  async function pingBrain(s) {
    const brain = ctx.views.brain;
    if (!brain || !(s.group || s.pop) || brain.replay) return;
    if (brain.highlight && brain.highlight !== ownHighlight && brain.highlight.until - brain.highlight.t > 0.3) return;
    let indices;
    if (s.pop) indices = await ctx.request('populationIndices', { population: s.pop });
    if (s.pop && !indices?.length) return;
    const count = indices?.length ?? brain.groups.find((g) => g.key === s.group)?.indices?.length ?? 0;
    ctx.highlight({ groups: s.group ? [s.group] : undefined, indices, color: s.color ?? GROUP_COLORS[s.group] ?? [1, 1, 1], duration: 3.2,
      note: `${t(s.note)} · ${count === 1 ? t('1 cell') : t('{n} cells', { n: count.toLocaleString() })}` });
    ownHighlight = brain.highlight;
  }

  // Behaviour that follows a touch answers it.
  ctx.onFrame((snap) => {
    if (!current || current.decided || !snap.events?.length) return;
    const e = snap.events.find((x) => RESULTS[x.kind] && x.t >= current.t0 - 0.05);
    if (e) decide(e);
  });

  // Every stimulus a panel sends (buttons, keys, the tour) gets an answer.
  const base = ctx.command;
  ctx.command = function command(name, args, opts) {
    const a = args ?? {};
    if (name === 'stim.loom' && (a.strength ?? 0.6) > 0.05) showBubble('loom');
    else if (name === 'stim.burst') showBubble(a.channel === 'sound' ? 'sound' : 'puff');
    else if (name === 'antenna.dust' && (a.amount ?? 1) > 0) showBubble('dust');
    else if (name === 'taste.offer') showBubble((a.bitter ?? 0) > (a.sugar ?? 0) ? 'bitter' : 'sugar');
    else if (name === 'food.add') showBubble('drop');
    else if (name === 'stim.cells') showBubble('cells');
    return base.call(this, name, args, opts);
  };

  // Touches on the terrarium (terrarium.js reports them; it also sends them).
  function interaction(d = {}) {
    if (Number.isFinite(d.clientX)) rippleAt(d.clientX, d.clientY);
    const f = ctx.snap?.fly;
    if (d.type === 'fly-grab') { showBubble('grab'); return; }
    if (d.type === 'fly-release') {
      const moved = d.world && d.start ? Math.hypot(d.world.x - d.start.x, d.world.y - d.start.y) : 0;
      showBubble(moved > 18 ? 'flick' : 'tap');
      return;
    }
    if (d.type === 'ground-tap' && d.world && f) {
      // the closed loop reaches the antennae within 520 units (injectTap)
      showBubble(Math.hypot(d.world.x - f.x, d.world.y - f.y) < 500 ? 'tap' : 'far');
    }
  }

  // ---- the tour: do it, see it, understand it ----
  const tour = buildTour(ctx, { touch, after });

  // The help button opens the tour's start; the full reference stays in it.
  ctx.showBrowserGuide = () => { tour.start(); return true; };
  return {
    firstVisit,
    interaction,
    maybeStartTour() { if (firstVisit) { store.set(TOUR_KEY, '1'); tour.start(); } },
    rebuild() { tour.relabel(); },
  };
}

// ---- tour -------------------------------------------------------------------------------
function buildTour(ctx, { touch, after }) {
  const spot = h('div', { class: 'tour-spot', hidden: true, 'aria-hidden': 'true' });
  const card = h('div', { class: 'tour-card', role: 'dialog', 'aria-modal': 'false', hidden: true });
  document.body.append(spot, card);
  let index = -1, step = null, track = null, offFrame = null, waitHint = null, lastEscape = null;

  const mobile = () => document.body.classList.contains('mobile');
  const sendLoom = () => {
    if (ctx.snap?.fly?.state === 'flying') { setStatus(t('The fly is in the air. Try again once it has landed.')); return; }
    ctx.command('stim.loom', { strength: 0.95 });
    setTimeout(() => ctx.command('stim.loom', { strength: 0 }), 650);
  };
  const giveSugar = () => ctx.command('taste.offer', { sugar: 1, bitter: 0, durationS: 3 });

  const STEPS = [
    { id: 'welcome',
      title: () => t('A fly, wired from real data'),
      text: () => t('This fruit fly is driven by {n} simulated neurons, connected as measured in a real fly brain. Everything it does is computed right now, in your browser. Five short steps show you how to play with it.',
        { n: (ctx.data?.circuit?.neurons?.length ?? 7270).toLocaleString() }),
      buttons: () => [[t("Let's go"), next, 'primary'], [t('Explore on my own'), finish, 'ghost']],
      foot: true },
    { id: 'startle', target: 'fly', count: true,
      title: () => t('Startle it'),
      text: () => (touch() ? t('Swipe quickly over the fly, or press the button: a shadow rushes at its eyes.')
        : t('Move the mouse quickly at the fly, or press the button: a shadow rushes at its eyes.')),
      buttons: () => [[t('Cast a shadow'), sendLoom, 'primary']],
      wait: ['takeoff'],
      success: () => t('Escaped! One single spike of the giant fiber, a command neuron, launched the takeoff.') },
    { id: 'slowmo', target: 'brain', count: true,
      title: () => t('What happened in the brain'),
      text: () => t('That half second, twenty times slower: first the looming detectors of the eyes fire (blue), a few milliseconds later the giant fiber (yellow), and the fly takes off. Every dot is a computed spike.'),
      // the connectome view grows for this step on a desktop (tour-brain)
      enter: () => { document.body.classList.add('tour-brain'); relayout(); ctx.showBrain?.(); if (lastEscape) setTimeout(() => replay(lastEscape), 250); },
      leave: () => { document.body.classList.remove('tour-brain'); relayout(); },
      buttons: () => [[t('Next'), next, 'primary']] },
    { id: 'feed', target: mobile() ? 'fly' : 'try-sugar', count: true,
      title: () => t('Give it sugar'),
      text: () => t('A drop of sugar at its mouthparts. Will the taste circuit decide to drink?'),
      enter: () => { ctx.mobile?.brain && ctx.mobileShow?.('brain'); },
      buttons: () => [[t('Give sugar'), giveSugar, 'primary']],
      wait: ['proboscis', 'feeding'],
      success: () => t('Proboscis out! Sugar neurons, relay cells and motor neurons decided it, along measured synapses.') },
    { id: 'why', target: 'why', count: true,
      // the escape just seen, opened with its causal chain
      enter: () => {
        const newest = [...(ctx.state.lastEvents ?? [])].reverse().find((e) => e.kind === 'takeoff') ?? lastEscape;
        if (newest) ctx.openEvent?.(newest);
        setTimeout(() => document.querySelector('.why-list .event.open')?.scrollIntoView({ block: 'nearest' }), 60);
      },
      title: () => t('Why did it do that?'),
      text: () => t('Every action gets its cause here: the stimulus, the neurons, the synapses. Open an entry; "Slow motion" replays its spikes, and underlined words explain themselves.'),
      buttons: () => [[t('Next'), next, 'primary']] },
    { id: 'more', target: mobile() ? 'nav' : 'rail', count: true,
      title: () => t('Now it is your turn'),
      text: () => t('Habitat: look after the fly like a pet. Stimulate: wind, sound, heat. Circuit: switch neurons off. Lab: experiments from the literature. Feel: can a fly feel anything? "Studio" at the top shows every tool.'),
      // a link's workspace is where this ends; otherwise the game is one tap away
      buttons: () => (after.to
        ? [[after.to === 'habitat' ? t('Play the Habitat') : after.to === 'experiments' ? t('Open the Lab') : t('Next'), finish, 'primary']]
        : [[t('Play the Habitat'), () => { after.to = 'habitat'; finish(); }, 'primary'], [t('Done'), finish, 'ghost']]) },
  ];
  const counted = STEPS.filter((s) => s.count);

  function targetRect(name) {
    if (name === 'fly') {
      const p = ctx.views.terrarium?.flyScreenCircle?.(34);
      const el = document.getElementById('terrarium');
      if (!p?.visible || !el) return null;
      const r = el.getBoundingClientRect();
      const rad = Math.max(54, Math.min(Math.min(r.width, r.height) * 0.42, p.r));
      return { left: r.left + p.x - rad, top: r.top + p.y - rad, width: 2 * rad, height: 2 * rad, round: true };
    }
    if (name === 'why' && mobile()) name = document.body.classList.contains('m-sheet-open') ? 'sheet' : 'nav-why';
    const el = name === 'brain' ? document.getElementById('brain')
      : name === 'sheet' ? document.getElementById('sheet')
        : name === 'why' ? document.getElementById('why')
        : name === 'rail' ? document.getElementById('rail')
          : name === 'nav' ? document.getElementById('mnav')
            : name === 'nav-why' ? document.querySelector('#mnav [data-kind="why"]')
              : name === 'try-sugar' ? document.querySelector('[data-try="sugar"]') : null;
    if (!el || !el.offsetParent) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 ? { left: r.left - 6, top: r.top - 6, width: r.width + 12, height: r.height + 12 } : null;
  }

  // moveCard false: only the spotlight follows the fly; a button that wandered
  // along with it would slip away under the pointer.
  function place(moveCard = true) {
    if (!step) return;
    const r = step.target ? targetRect(step.target) : null;
    spot.hidden = !r;
    document.body.classList.toggle('tour-dim', !r);
    if (r) {
      spot.classList.toggle('round', Boolean(r.round));
      Object.assign(spot.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    }
    if (!moveCard) return;
    // the card beside the target, never over it; on phones docked at an edge
    const W = window.innerWidth, H = window.innerHeight, cw = card.offsetWidth, ch = card.offsetHeight, m = 14;
    let x, y;
    if (!r) { x = (W - cw) / 2; y = (H - ch) / 2; }
    else if (mobile()) {
      x = (W - cw) / 2;
      y = r.top + r.height / 2 > H / 2 ? Math.max(m, r.top - ch - m) : Math.min(H - ch - m - 70, r.top + r.height + m);
    } else if (r.left + r.width + m + cw < W - m) { x = r.left + r.width + m; y = r.top + r.height / 2 - ch / 2; }
    else if (r.left - m - cw > m) { x = r.left - m - cw; y = r.top + r.height / 2 - ch / 2; }
    else { x = r.left + r.width / 2 - cw / 2; y = r.top + r.height + m + ch < H ? r.top + r.height + m : r.top - ch - m; }
    x = Math.max(m, Math.min(W - cw - m, x));
    y = Math.max(m, Math.min(H - ch - m, y));
    card.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  let statusEl = null;
  function setStatus(text, ok = false) {
    if (!statusEl) return;
    statusEl.replaceChildren(...(ok ? [icon('spark', 14)] : []), h('span', {}, text));
    statusEl.classList.toggle('ok', ok);
    statusEl.hidden = !text;
    place();
  }

  function render() {
    const n = counted.indexOf(step);
    statusEl = h('div', { class: 'tour-status', hidden: true });
    const dots = n >= 0 ? h('div', { class: 'tour-dots', 'aria-label': t('Step {i} of {n}', { i: n + 1, n: counted.length }) },
      ...counted.map((_, i) => h('i', { class: i < n ? 'done' : i === n ? 'now' : '' }))) : null;
    const skip = step.id !== 'welcome' ? h('button', { class: 'tour-skip', type: 'button', onclick: finish, 'aria-label': t('End the tour') }, icon('close', 14)) : null;
    card.replaceChildren(...[
      h('div', { class: 'tour-top' }, dots ?? h('span', { class: 'tour-kicker' }, t('Welcome')), skip),
      h('h3', {}, step.title()),
      h('p', {}, step.text()),
      statusEl,
      h('div', { class: 'tour-actions' }, ...step.buttons().map(([label, fn, kind]) => h('button', { class: `btn ${kind === 'ghost' ? 'ghost' : 'primary'}`, type: 'button', onclick: fn }, label))),
      step.foot ? h('p', { class: 'tour-foot' }, t('Free and without an account. By using it you accept the '),
        h('a', { href: '../software-terms.html', target: '_blank', rel: 'noopener' }, t('software terms')), t(' and the '),
        h('a', { href: '../privacy.html', target: '_blank', rel: 'noopener' }, t('privacy notice')), '.',
        ' ', h('button', { class: 'tour-link', type: 'button', onclick: () => { finish(); ctx.showHelp?.(); } }, t('All controls'))) : null].filter(Boolean));
  }

  const relayout = () => setTimeout(() => window.dispatchEvent(new Event('resize')), 30);
  function go(i) {
    step?.leave?.();
    clearInterval(track); clearTimeout(waitHint); offFrame?.();
    track = null; offFrame = null;
    index = i;
    step = STEPS[i];
    if (!step) { finish(); return; }
    card.hidden = false;
    document.body.classList.add('touring');
    render();
    step.enter?.();
    requestAnimationFrame(() => place());
    if (step.target === 'fly') track = setInterval(() => place(false), 120);      // the fly moves
    else for (const ms of [120, 400, 750]) setTimeout(place, ms);    // while a sheet or the brain opens
    if (step.wait) {
      offFrame = ctx.onFrame((snap) => {
        const e = snap.events?.find((x) => step.wait.includes(x.kind));
        if (!e) return;
        if (e.kind === 'takeoff') lastEscape = e;
        offFrame?.(); offFrame = null;
        clearTimeout(waitHint);
        card.classList.add('success');
        setStatus(step.success(), true);
        const box = card.querySelector('.tour-actions');
        box.replaceChildren(h('button', { class: 'btn primary', type: 'button', onclick: next }, t('Next')));
        setTimeout(() => card.classList.remove('success'), 900);
      });
      waitHint = setTimeout(() => setStatus(t('Nothing yet? Press the button: it always works.')), 15000);
    }
  }

  async function replay(e) {
    for (let k = 0; k < 8; k++) {
      const r = await ctx.replayEvent?.(e);
      if (r !== 'pending') return;
      await new Promise((res) => setTimeout(res, 300));
    }
  }

  function next() { go(index + 1); }
  function finish() {
    step?.leave?.();
    // what the tour opened on a phone closes again
    if (ctx.mobile?.open === 'why') ctx.mobileShow?.('why');
    if (ctx.mobile?.brain) ctx.mobileShow?.('brain');
    clearInterval(track); clearTimeout(waitHint); offFrame?.();
    track = null; offFrame = null; step = null; index = -1;
    card.hidden = true; spot.hidden = true;
    document.body.classList.remove('touring', 'tour-dim');
    // however the tour ended, the workspace the link asked for opens now
    const to = after.to;
    after.to = null;
    if (to) { if (ctx.mobile?.active) ctx.mobileShow?.(to); else ctx.shell?.select(to); }
  }

  window.addEventListener('resize', () => { if (step) place(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && step) finish(); });
  return {
    start() {
      // from the help button, possibly with a sheet or the brain open on a phone
      const open = ctx.mobile?.open;
      if (open) ctx.mobileShow?.(open);
      if (ctx.mobile?.brain) ctx.mobileShow?.('brain');
      lastEscape = null;
      go(0);
    },
    relabel() { if (step) { render(); place(); } },
  };
}
