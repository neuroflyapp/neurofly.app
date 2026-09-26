// Film stage for neurofly.app: NeuroFly's own BrainView showing the running
// model's brain — 7,270 simulated FlyWire neurons at their measured positions
// plus ~23,000 context somata — driven by spikes recorded from an actual
// simulation run (a drawing sample, exactly as in the app). The camera sways
// periodically, so the first and last frames join into a seamless loop.
import * as THREE from '/node_modules/three/build/three.module.js';
import { BrainView } from '/renderer/view/brain.js';

let view, P = null;
const TAU = Math.PI * 2;

// Soft round sprite for every point cloud (the app draws square points,
// which read as pixels at film resolution).
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  r.addColorStop(0.75, 'rgba(255,255,255,0.25)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

window.stage = {
  init(data, params) {
    P = params;
    view = new BrainView(document.getElementById('brain'), { points: data.points, circuit: data.circuit, onPick: () => {} });
    view.hovering = true;                       // no idle auto-rotation: the camera path below is exact
    view.renderer.setPixelRatio(params.pixelRatio || 1);
    view.synapseLines.material.opacity = params.lineOpacity;
    view.resize();
    const dot = dotTexture();
    // All populations are ranges of one point cloud (BrainView.spritePoints):
    // opacity through the view, size per point, one round dot texture.
    const size = view.cloud.geometry.attributes.pSize;
    view.groups.forEach((g, gi) => {
      const [opacity, scale] = g.tier === 'bg' ? [params.bgOpacity, params.bgSize]
        : g.tier === 'other' ? [params.otherOpacity, params.otherSize] : [params.namedOpacity, params.namedSize];
      view.setGroupOpacity(gi, opacity);
      for (let i = g.start; i < g.start + g.count; i++) size.array[i] *= scale;
    });
    size.needsUpdate = true;
    view.cloud.material.map = dot; view.cloud.material.alphaTest = 0.02; view.cloud.material.needsUpdate = true;
    // Spikes glow with the same soft dot instead of reading as flat discs.
    view.scene.traverse((o) => {
      if (o.isPoints && o !== view.highlightCloud && !o.material.map) { o.material.map = dot; o.material.needsUpdate = true; }
    });
    view.glowLines.material.transparent = true;
    view.glowLines.material.opacity = params.glowOpacity;
    view.ring.material.opacity = 0.12;
    return { groups: view.groups.length, named: view.groups.filter((g) => g.tier === 'named').map((g) => `${g.key}:${g.count}`) };
  },
  // Loop phase u = f / N; spikes: neuron indices that fired during this frame.
  renderFrame(f, spikes) {
    const u = f / P.N;
    view.group.rotation.y = P.yaw + P.sway * Math.sin(TAU * u);
    view.group.rotation.x = P.tilt + P.tiltWobble * Math.sin(TAU * u + 0.9);
    view.group.position.y = P.offsetY;
    view.group.position.x = P.offsetX;
    view.zoom = P.zoom + P.breathe * Math.cos(TAU * u);
    view.camera.position.z = view.zoom;
    view.camera.position.x = P.camX;
    view.fearTarget = 0; view.fear = 0;
    view.flashBudget = P.flashBudget;
    if (spikes?.length) view.addSpikes(spikes);
    // A giant-fiber spike keeps its glow but not the app's oversized marker
    // sphere and wireframe ring, which read as props at film scale.
    const fs = view.flashPoints.geometry.attributes.pSize, cap = view.flashSize * P.flashSize * 1.6;
    let capped = false;
    for (let i = 0; i < fs.count; i++) if (fs.array[i] > cap) { fs.array[i] = cap; capped = true; }
    if (capped) fs.needsUpdate = true;
    view.frame((f + 100000) * (1000 / P.fps));
    view.ring.visible = false;
    // BrainView sets camera y from its zoom; keep the framing offset on top.
    view.camera.position.y += P.camY;
    view.camera.lookAt(P.camX, P.camY, 0);
    view.renderer.render(view.scene, view.camera);
    return f;
  },
};
