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
    for (const g of view.groups) {
      const m = g.object.material;
      if (g.tier === 'bg') { m.opacity = params.bgOpacity; m.size *= params.bgSize; }
      else if (g.tier === 'other') { m.opacity = params.otherOpacity; m.size *= params.otherSize; }
      else { m.opacity = params.namedOpacity; m.size *= params.namedSize; }
      m.map = dot; m.alphaTest = 0.02; m.needsUpdate = true;
    }
    view.scene.traverse((o) => {
      if (o.isPoints && o !== view.highlightCloud && !o.material.map) { o.material.map = dot; o.material.needsUpdate = true; }
    });
    view.glowLines.material.transparent = true;
    view.glowLines.material.opacity = params.glowOpacity;
    for (const node of view.flashPool) node.scale.multiplyScalar(params.flashSize);
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
    for (const node of view.flashPool) if (node.scale.x > P.flashSize * 1.6) node.scale.setScalar(P.flashSize * 1.6);
    view.frame((f + 100000) * (1000 / P.fps));
    view.ring.visible = false;
    // BrainView sets camera y from its zoom; keep the framing offset on top.
    view.camera.position.y += P.camY;
    view.camera.lookAt(P.camX, P.camY, 0);
    view.renderer.render(view.scene, view.camera);
    return f;
  },
};
