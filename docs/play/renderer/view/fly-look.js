// fly-look.js — the observed fly's finer look, for the person watching:
// compound eyes with facets, veined wings, a fine bristly surface.
//
// Observer only. Applied to the first fly's body, which is on the display
// layer alone (never in her own eye). Only materials change, never geometry,
// and no alpha test is added, so the shadow map her eye sees holds exactly
// the same depth as before. Other flies, which her eye does see, keep the
// plain materials of flymodel.js.

import * as THREE from '../../node_modules/three/build/three.module.js';

function canvasTexture(w, h, draw, { colorSpace = THREE.SRGBColorSpace } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = colorSpace;
  tex.anisotropy = 4;
  return tex;
}

// A fixed pseudo-random stream (no Math.random: the look is the same every time).
function stream(seed) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}

// Red compound eye: ~ommatidia as a hexagonal lattice, each facet a little
// lighter in its centre, dark seams between them.
function eyeTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#5a0a07';
    g.fillRect(0, 0, w, h);
    const r = 5.2, dx = r * Math.sqrt(3), dy = r * 1.5;
    const rand = stream(0x3e7e);
    for (let row = -1, y = 0; y < h + r; row++, y = row * dy) {
      for (let x = (row & 1) ? dx / 2 : 0; x < w + dx; x += dx) {
        const shade = 0.85 + 0.25 * rand();
        const grad = g.createRadialGradient(x - 1, y - 1, 0.5, x, y, r);
        grad.addColorStop(0, `rgb(${Math.round(225 * shade)},${Math.round(60 * shade)},${Math.round(42 * shade)})`);
        grad.addColorStop(0.7, `rgb(${Math.round(150 * shade)},${Math.round(22 * shade)},${Math.round(16 * shade)})`);
        grad.addColorStop(1, '#2a0403');
        g.fillStyle = grad;
        g.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = Math.PI / 6 + k * Math.PI / 3;
          g.lineTo(x + Math.cos(a) * (r - 0.6), y + Math.sin(a) * (r - 0.6));
        }
        g.closePath();
        g.fill();
      }
    }
  });
}

// Wing membrane with the veins of a Drosophila wing (L1-L6 and two cross
// veins), drawn in the wing's own outline space (see flymodel wingMesh).
function wingTexture() {
  return canvasTexture(128, 384, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    // membrane: faint, a touch of iridescence towards the tip
    const m = g.createLinearGradient(0, 0, 0, h);
    m.addColorStop(0, 'rgba(225,235,255,0.18)');
    m.addColorStop(0.55, 'rgba(235,225,255,0.24)');
    m.addColorStop(1, 'rgba(225,255,240,0.20)');
    g.fillStyle = m;
    g.fillRect(0, 0, w, h);
    // veins: from the hinge (canvas top = the wing's base at the thorax)
    // towards the distal margin; the leading edge (L1) on the left (u = 0)
    g.strokeStyle = 'rgba(48,34,20,0.9)';
    g.lineCap = 'round';
    const base = [w * 0.5, h * 0.02];
    const Y = (f) => h * (1 - f);    // f: share of the way from the tip (0) to the hinge (1)
    const vein = (tx, ty, width, cx = (base[0] + tx) / 2, cy = (base[1] + ty) / 2) => {
      g.lineWidth = width;
      g.beginPath(); g.moveTo(...base); g.quadraticCurveTo(cx, cy, tx, ty); g.stroke();
    };
    vein(w * 0.08, Y(0.40), 2.6, w * 0.12, Y(0.75));    // L1, the leading edge
    vein(w * 0.18, Y(0.06), 2.0, w * 0.22, Y(0.55));    // L2
    vein(w * 0.46, Y(0.01), 1.8, w * 0.42, Y(0.50));    // L3
    vein(w * 0.72, Y(0.04), 1.8, w * 0.62, Y(0.52));    // L4
    vein(w * 0.90, Y(0.22), 1.6, w * 0.80, Y(0.60));    // L5
    vein(w * 0.86, Y(0.70), 1.4, w * 0.72, Y(0.86));    // L6
    g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(w * 0.40, Y(0.46)); g.lineTo(w * 0.56, Y(0.44)); g.stroke();   // anterior cross vein
    g.beginPath(); g.moveTo(w * 0.62, Y(0.30)); g.lineTo(w * 0.80, Y(0.36)); g.stroke();   // posterior cross vein
  });
}

// A fine, bristly relief for the body (bump map, linear data).
function bristleBump() {
  const tex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#808080';
    g.fillRect(0, 0, w, h);
    const rand = stream(0xb15e);
    for (let k = 0; k < 2600; k++) {
      const x = rand() * w, y = rand() * h, len = 1.5 + rand() * 3.5, a = -Math.PI / 2 + (rand() - 0.5) * 0.9;
      g.strokeStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '0,0,0'},${0.25 + rand() * 0.35})`;
      g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
    }
  }, { colorSpace: THREE.NoColorSpace });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

let shared = null;

// Gives `model` (from buildFlyModel) the observer's finer materials.
export function enhanceFlyLook(model) {
  if (typeof document === 'undefined') return model;
  shared ??= { eye: eyeTexture(), wing: wingTexture(), bump: bristleBump() };
  const eyeLook = new THREE.MeshPhongMaterial({ color: 0xffffff, map: shared.eye, specular: new THREE.Color(0.75, 0.6, 0.6), shininess: 110 });
  // The outline's own coordinates are its UVs (x -2.6..2.6, y -16.5 tip ..
  // 0 hinge): mapped onto the texture, mirrored for the right wing so the
  // leading edge is on the outside of both.
  const wingLook = (mirror) => {
    const map = shared.wing.clone();
    map.repeat.set((mirror ? -1 : 1) / 5.2, 1 / 16.5);
    map.offset.set(0.5, 1);
    map.needsUpdate = true;
    return new THREE.MeshPhongMaterial({ color: 0xffffff, map, specular: new THREE.Color(0.06, 0.06, 0.07), shininess: 30,
      transparent: true, side: THREE.DoubleSide, depthWrite: false, emissive: new THREE.Color(0.02, 0.025, 0.04) });
  };
  const wings = { left: wingLook(false), right: wingLook(true) };
  model.root.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry, type = geo.type, r = geo.parameters?.radius;
    if (type === 'SphereGeometry' && r === 2.0) { o.material = eyeLook; return; }
    if (type === 'ExtrudeGeometry' && o.parent === model.foldedWings) { o.material = o.position.x > 0 ? wings.right : wings.left; return; }
    if (type === 'SphereGeometry' && (r === 4.6 || r === 3.0 || r === 5.0)) {
      const m = o.material.clone();
      m.bumpMap = shared.bump;
      m.bumpScale = 0.35;
      m.shininess = Math.max(m.shininess, 30);
      o.material = m;
    }
  });
  return model;
}
