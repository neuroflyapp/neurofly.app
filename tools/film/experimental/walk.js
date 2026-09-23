// Walking film stage for neurofly.app: the app's own TerrariumView, fed frame
// by frame with snapshots from a simulation run (brain, nerve cord with its
// stepping rules, body). Only the camera is the film's: close, at leg height,
// slowly circling the fly.
import { TerrariumView } from '/renderer/view/terrarium.js';

// The terrarium's sky follows the wall clock; the film is set at late morning.
Date.prototype.getHours = function () { return 10; };
Date.prototype.getMinutes = function () { return 30; };

let view, P;
window.stage = {
  init(layout, params) {
    P = params;
    view = new TerrariumView(document.getElementById('terrarium'), {
      layout, onPointer() {}, onCommand() {}, onVision() {}, onTap() {},
    });
    view.visionEnabled = false;
    view.renderer.setPixelRatio(params.pixelRatio);
    view.cameraMode = 'film';
    view.resize();
    return { bounds: view.bounds };
  },
  renderFrame(snap, f) {
    view.applySnapshot(snap);
    const fly = snap.fly, t = f / P.fps;
    const a = P.angle0 + P.orbit * t;
    const c = view.camera;
    const tx = fly.x + Math.cos(a) * P.dist, ty = fly.y + Math.sin(a) * P.dist, tz = (fly.z || 0) + P.height;
    if (!this.placed) { c.position.set(tx, ty, tz); this.placed = true; }
    const k = P.follow;
    c.position.x += (tx - c.position.x) * k; c.position.y += (ty - c.position.y) * k; c.position.z += (tz - c.position.z) * k;
    this.look ??= { x: fly.x, y: fly.y };
    this.look.x += (fly.x - this.look.x) * k; this.look.y += (fly.y - this.look.y) * k;
    c.lookAt(this.look.x, this.look.y, (fly.z || 0) + P.lookZ);
    c.fov = P.fov; c.updateProjectionMatrix();
    view.frame(1 / P.fps, t);
    return { x: fly.x, y: fly.y, state: fly.state };
  },
};
