// Render the walking film: a NeuroFly simulation run (seeded, deterministic)
// in the furnished terrarium, rendered frame by frame with the app's own
// TerrariumView and a close camera. The window is chosen from a pre-scan of the
// same deterministic run as the stretch where she walks the most.
//   node render-walk.mjs --scan              list walking stretches
//   node render-walk.mjs --start=41.5 --still=0,90
//   node render-walk.mjs --start=41.5
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = process.env.NEUROFLY_APP;
if (!APP) throw new Error('Set NEUROFLY_APP to the windows folder of the NeuroFly app repository');
const require = createRequire(`${APP}/package.json`);
const { chromium } = require('playwright-core');
const { loadBrainData } = await import(pathToFileURL(`${APP}/src/data.js`).href);
const { ClosedLoop } = await import(pathToFileURL(`${APP}/src/closed-loop.js`).href);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const OUT = path.resolve(HERE, 'out');
await fs.mkdir(OUT, { recursive: true });
const W = Number(arg('w', 1920)), H = Number(arg('h', 1080)), FPS = 30, SECONDS = Number(arg('seconds', 12));
const SEED = Number(arg('seed', 4)), HORIZON = Number(arg('horizon', 180));

const data = loadBrainData();
const make = () => {
  const loop = new ClosedLoop({ data, bounds: { width: W, height: H }, seed: SEED, spikeBus: false, instruments: false, hour: 10.5 });
  loop.ambient = { ...loop.ambient, sleepy: false, activity: 1, typing: 0 };
  return loop;
};

if (process.argv.includes('--scan')) {
  const loop = make();
  const walking = [];
  for (let k = 0; k < HORIZON * FPS; k++) {
    for (let j = 0; j < 4; j++) loop.tick(1 / 120);
    walking.push(loop.fly.state === 'walking' && loop.fly.backwardTimer <= 0 ? 1 : 0);
  }
  const win = SECONDS * FPS, best = [];
  for (let s = 0; s + win <= walking.length; s += FPS / 2) {
    let n = 0; for (let k = s; k < s + win; k++) n += walking[k];
    best.push([s / FPS, n / win]);
  }
  best.sort((a, b) => b[1] - a[1]);
  console.log('best walking stretches (start s, fraction):', best.slice(0, 8).map(([s, f]) => `${s}:${f.toFixed(2)}`).join('  '));
  process.exit(0);
}

const START = Number(arg('start', 0));
const loop = make();
for (let k = 0; k < START * 120; k++) loop.tick(1 / 120);
const params = { fps: FPS, pixelRatio: Number(arg('ss', 2)), dist: Number(arg('dist', 62)), height: Number(arg('height', 18)),
  lookZ: Number(arg('lookz', 5)), fov: Number(arg('fov', 34)), angle0: Number(arg('angle', 2.4)), orbit: Number(arg('orbit', 0.12)),
  follow: Number(arg('follow', 0.08)) };

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer(async (req, res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = name.startsWith('/stage/') ? path.join(HERE, name.slice(7)) : path.join(APP, name);
    if (!mime[path.extname(file)]) throw new Error('type');
    res.setHeader('Content-Type', mime[path.extname(file)]);
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-webgl', '--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('page:', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/stage/walk.html`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.stage);
console.log('stage', JSON.stringify(await page.evaluate(({ l, p }) => window.stage.init(l, p), { l: loop.world.layout(), p: params })));

const N = SECONDS * FPS;
const step = async (f) => {
  for (let j = 0; j < 4; j++) loop.tick(1 / 120);
  const s = loop.snapshot();
  const snap = { fly: s.fly, poses: s.poses, objects: s.objects, env: s.env, firePos: s.firePos, scentPos: s.scentPos, food: s.food };
  return page.evaluate(({ snap, f }) => window.stage.renderFrame(snap, f), { snap, f });
};
const shot = () => page.screenshot({ type: 'jpeg', quality: 94 });
const stills = arg('still', null);
if (stills) {
  const want = new Set(stills.split(',').map(Number));
  for (let f = 0; f <= Math.max(...want); f++) {
    const r = await step(f);
    if (want.has(f)) { await fs.writeFile(path.join(OUT, `walk-still-${f}.jpg`), await shot()); console.log('still', f, JSON.stringify(r)); }
  }
} else {
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-vcodec', 'mjpeg', '-i', 'pipe:0',
    '-vf', `scale=${W}:${H}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-profile:v', 'high',
    '-pix_fmt', 'yuv420p', '-r', String(FPS), '-an', '-movflags', '+faststart', path.join(OUT, 'walk-master.mp4')];
  const enc = spawn(FFMPEG, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = ''; enc.stderr.on('data', (b) => { err = (err + b).slice(-3000); });
  const t0 = Date.now(), states = {};
  for (let f = 0; f < N; f++) {
    const r = await step(f);
    states[r.state] = (states[r.state] || 0) + 1;
    const jpg = await shot();
    if (f === Number(arg('posterAt', 45))) await fs.writeFile(path.join(OUT, 'walk-poster.jpg'), jpg);
    if (!enc.stdin.write(jpg)) await once(enc.stdin, 'drain');
    if (f % 60 === 0) console.log(`frame ${f}/${N} ${((Date.now() - t0) / 1000).toFixed(0)} s ${r.state}`);
  }
  enc.stdin.end();
  const [code] = await once(enc, 'close');
  if (code) throw new Error(`ffmpeg ${code}: ${err}`);
  console.log('done; states', JSON.stringify(states));
}
await browser.close();
server.close();
