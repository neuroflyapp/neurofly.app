// Footfall diagram for the Methods page, from a real NeuroFly run: the MaleCNS
// nerve cord with its stepping rules driving the modelled legs (DNp09 at
// 30 Hz on both sides, as in the app's locomotor test). Writes an SVG figure.
//   node tools/footfall.mjs <path-to-app-windows-folder>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const APP = process.argv[2] || process.env.NEUROFLY_APP;
if (!APP) throw new Error('Usage: node tools/footfall.mjs <path-to-app-windows-folder>');
const imp = (p) => import(pathToFileURL(path.join(APP, p)).href);
const { loadBrainData } = await imp('src/data.js');
const { LocomotorSim } = await imp('src/locomotor.js');
const { SixLegDynamics } = await imp('src/legdynamics.js');
const { Fly } = await imp('src/flymodel.js');

const data = loadBrainData();
const geometries = new Fly({ x: 0, y: 0 }).legDynamics.legs.map((l) => l.geometry);
const sim = new LocomotorSim(data.locomotor), body = new SixLegDynamics(geometries);
for (const side of ['left', 'right']) sim.setDescending('DNp09', side, 30);
const HZ = 120, WARM = 3, SPAN = 2.5;
const rows = [];
let forward = 0;
for (let t = 0; t < (WARM + SPAN) * HZ; t++) {
  sim.feedback = body.feedback;
  sim.step(t % 3 === 2 ? 9 : 8);
  const m = body.advance(sim.commands, 1 / HZ);
  if (t >= WARM * HZ) { rows.push(body.feedback.map((f) => (f.contact ? 1 : 0))); forward += m.forward; }
}

// Tripod A (RF, LM, RH) above tripod B (LF, RM, LH). Leg order in data: RF LF RM LM RH LH.
const order = [[0, 'RF', 'Right front'], [3, 'LM', 'Left middle'], [4, 'RH', 'Right hind'],
  [1, 'LF', 'Left front'], [2, 'RM', 'Right middle'], [5, 'LH', 'Left hind']];
const W = 760, L = 132, R = 16, T = 26, rowH = 26, gap = 12, B = 44;
const H = T + rowH * 6 + gap + B;
const X = (i) => L + (i / rows.length) * (W - L - R);
const colors = ['#0b7a47', '#2a78d6'];
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="ff-title ff-desc" font-family="Segoe UI, system-ui, -apple-system, Helvetica, Arial, sans-serif">
<title id="ff-title">Footfall pattern of the simulated fly</title>
<desc id="ff-desc">Ground contact of each of the six legs over ${SPAN} seconds of walking in a NeuroFly simulation run. Filled bars mark ground contact. The rows are grouped into the two tripods of a fly's alternating gait: right front, left middle and right hind above, left front, right middle and left hind below. In the model the legs step irregularly and the two groups alternate only loosely.</desc>
<rect width="${W}" height="${H}" fill="#ffffff"/>\n`;
order.forEach(([leg, code, name], r) => {
  const y = T + r * rowH + (r >= 3 ? gap : 0);
  svg += `<text x="${L - 12}" y="${y + rowH / 2 + 4.5}" text-anchor="end" font-size="13" fill="#3c4a45"><tspan font-weight="650" fill="#15201c">${code}</tspan>  ${name}</text>\n`;
  svg += `<rect x="${L}" y="${y + 4}" width="${W - L - R}" height="${rowH - 8}" rx="3" fill="#f3f4f0"/>\n`;
  let start = -1;
  for (let i = 0; i <= rows.length; i++) {
    const on = i < rows.length && rows[i][leg];
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      svg += `<rect x="${X(start).toFixed(1)}" y="${y + 4}" width="${(X(i) - X(start)).toFixed(1)}" height="${rowH - 8}" rx="3" fill="${colors[r < 3 ? 0 : 1]}"/>\n`;
      start = -1;
    }
  }
});
const axisY = T + rowH * 6 + gap + 8;
svg += `<line x1="${L}" x2="${W - R}" y1="${axisY}" y2="${axisY}" stroke="#b9c1ba"/>\n`;
for (let s = 0; s <= SPAN; s += 0.5) {
  const x = L + (s / SPAN) * (W - L - R);
  svg += `<line x1="${x}" x2="${x}" y1="${axisY}" y2="${axisY + 5}" stroke="#b9c1ba"/><text x="${x}" y="${axisY + 20}" text-anchor="middle" font-size="12" fill="#62716b">${s.toFixed(1)} s</text>\n`;
}
svg += `<text x="${L - 12}" y="${T - 10}" text-anchor="end" font-size="11.5" fill="#62716b" letter-spacing=".06em">TRIPOD A</text>
<text x="${L - 12}" y="${T + rowH * 3 + gap - 4}" text-anchor="end" font-size="11.5" fill="#62716b" letter-spacing=".06em">TRIPOD B</text>
</svg>\n`;
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/img/footfall.svg');
fs.writeFileSync(out, svg);
let swings = 0;
for (let leg = 0; leg < 6; leg++) for (let i = 1; i < rows.length; i++) if (rows[i - 1][leg] && !rows[i][leg]) swings++;
console.log(`written ${out}; ${SPAN} s, ${(swings / 6 / SPAN).toFixed(2)} steps/s per leg, ${(forward / SPAN).toFixed(1)} units/s`);
