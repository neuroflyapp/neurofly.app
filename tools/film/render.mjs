// Render a neurofly.app film deterministically, frame by frame, from
// NeuroFly's own BrainView and the running model: the FlyWire brain circuit,
// with spikes recorded from an actual simulation run (the app's drawing
// sample), including one looming stimulus. Encoded with ffmpeg: constant
// frame rate, H.264 High, faststart, in 1080p and 720p.
//   node render.mjs --still=0,240,300
//   node render.mjs
import fs from 'node:fs/promises';
import fss from 'node:fs';
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
const OUT = path.resolve(HERE, arg('out', 'out'));
const NAME = arg('name', 'hero');
await fs.mkdir(OUT, { recursive: true });

const W = Number(arg('w', 1920)), H = Number(arg('h', 1080)), SS = Number(arg('ss', 2));
const FPS = 30, SECONDS = Number(arg('seconds', 20)), N = FPS * SECONDS;
const LOOM_AT = Number(arg('loom', 8.5));
const params = {
  N, fps: FPS, pixelRatio: SS, flashBudget: Number(arg('budget', 8)),
  bgOpacity: Number(arg('bg', 0.42)), otherOpacity: Number(arg('other', 0.38)), namedOpacity: Number(arg('named', 0.55)),
  bgSize: Number(arg('bgsize', 1.6)), otherSize: Number(arg('othersize', 1.2)), namedSize: Number(arg('namedsize', 0.55)),
  glowOpacity: Number(arg('glow', 0.5)), flashSize: Number(arg('flash', 0.8)),
  lineOpacity: Number(arg('lines', 0.045)),
  yaw: Number(arg('yaw', 0)), sway: Number(arg('sway', 0.42)), tilt: Number(arg('tilt', -0.2)), tiltWobble: Number(arg('wobble', 0.05)),
  offsetX: Number(arg('ox', 0)), offsetY: Number(arg('oy', 0)), zoom: Number(arg('zoom', 19)), breathe: Number(arg('breathe', 1.0)),
  camX: Number(arg('camx', -3.2)), camY: Number(arg('camy', 0)),
};

// ---- the simulation run: spikes per film frame --------------------------------------
console.log('loading NeuroFly data and running the model…');
const data = loadBrainData();
const loop = new ClosedLoop({ data, bounds: { width: 1100, height: 700 }, seed: Number(arg('seed', 11)), empty: true,
  spikeBus: true, instruments: false, hour: 12 });
for (let k = 0; k < 120 * 3; k++) loop.tick(1 / 120);          // settle 3 s
loop.spikeBus.drain();
const spikes = [];
const PRE = 30;                                                  // frames rendered before capture (glow steady state)
let events = 0;
for (let f = -PRE; f < N; f++) {
  if (f === Math.round(LOOM_AT * FPS)) loop.handle({ name: 'stim.loom', args: { strength: 1 } });
  for (let k = 0; k < 4; k++) loop.tick(1 / 120);
  spikes.push(Array.from(loop.spikeBus.drain()));
  events = loop.sim.gfSpikeCount;
}
console.log(`simulated ${(N + PRE) / FPS} s; giant-fiber spikes in the run: ${events}; mean sampled spikes/frame ${(spikes.reduce((s, x) => s + x.length, 0) / spikes.length).toFixed(1)}`);

// The view's own subset of links (all 784k would paint the frame white): every
// 30th connection plus every 5th of the named command populations.
const featured = new Set(['lc4', 'lplc2', 'gf', 'dna01', 'dna02', 'dnp09', 'escw']);
const circuit = { neurons: data.circuit.neurons,
  edges: data.circuit.edges.filter((e, i) => i % 30 === 0 || (i % 5 === 0 && featured.has(data.circuit.neurons[e[0]]?.role))) };

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
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
await page.goto(`http://127.0.0.1:${server.address().port}/stage/stage.html`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.stage);
const info = await page.evaluate(({ d, p }) => window.stage.init(d, p), { d: { points: data.points, circuit }, p: params });
console.log('stage:', JSON.stringify(info).slice(0, 300));

const render = (f) => page.evaluate(({ f, s }) => window.stage.renderFrame(f, s), { f, s: spikes[f + PRE] });
for (let f = -PRE; f < 0; f++) await render(f);
const shot = () => page.screenshot({ type: 'jpeg', quality: 94 });
const stills = arg('still', null);
if (stills) {
  const want = new Set(stills.split(',').map(Number));
  const last = Math.max(...want);
  for (let f = 0; f <= last; f++) {
    await render(f);
    if (want.has(f)) { await fs.writeFile(path.join(OUT, `${NAME}-still-${f}.jpg`), await shot()); console.log('still', f); }
  }
} else {
  const common = ['-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-g', String(FPS * 2), '-movflags', '+faststart', '-an', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709'];
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-vcodec', 'mjpeg', '-i', 'pipe:0',
    '-filter_complex', `[0:v]scale=${W}:${H}:flags=lanczos,format=yuv420p,split=2[a][b];[b]scale=${Math.round(W * 2 / 3)}:${Math.round(H * 2 / 3)}:flags=lanczos[c]`,
    '-map', '[a]', ...common, '-crf', arg('crf', '21'), path.join(OUT, `${NAME}-1080.mp4`),
    '-map', '[c]', ...common, '-crf', arg('crf720', '23'), path.join(OUT, `${NAME}-720.mp4`)];
  const enc = spawn(FFMPEG, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = ''; enc.stderr.on('data', (b) => { err = (err + b).slice(-4000); });
  const t0 = Date.now();
  for (let f = 0; f < N; f++) {
    await render(f);
    const jpg = await shot();
    if (f === Number(arg('posterAt', 0))) await fs.writeFile(path.join(OUT, `${NAME}-poster.jpg`), jpg);
    if (!enc.stdin.write(jpg)) await once(enc.stdin, 'drain');
    if (f % 60 === 0) console.log(`frame ${f}/${N} ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  enc.stdin.end();
  const [code] = await once(enc, 'close');
  if (code) throw new Error(`ffmpeg ${code}: ${err}`);
  console.log('done', fss.statSync(path.join(OUT, `${NAME}-1080.mp4`)).size, fss.statSync(path.join(OUT, `${NAME}-720.mp4`)).size);
}
await browser.close();
server.close();
