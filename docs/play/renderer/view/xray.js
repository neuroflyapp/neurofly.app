// xray.js — her simulated brain floating above her in the terrarium, lit by
// her spikes as they happen: what she does and the neurons doing it, in one
// picture.
//
// Observer only: DISPLAY_LAYER alone and no shadow, so neither her eye nor
// the shadow map her eye sees contains it. The spikes are the brain view's
// drawing sample (snapshot `spikes`), not every spike; the positions are the
// neurons' measured positions, drawn small. One draw call.

import * as THREE from '../../node_modules/three/build/three.module.js';
import { DISPLAY_LAYER } from '../../src/world.js';
import { spritePoints } from './brain.js';

const BASE_ALPHA = 0.32, BASE_SIZE = 1;
const FLASH_S = 0.35;          // how long a spike stays lit (wall time)
const HEIGHT = 26;             // above her back, world units
const WIDTH = 46;              // the brain's width on screen, world units

export class BrainXray {
  // data: BrainView.xrayData() — { positions, colors, isGF, radius }
  constructor(scene, data) {
    const n = data.positions.length / 3;
    this.n = n;
    this.points = spritePoints(n, { round: true });
    const a = this.points.geometry.attributes;
    a.position.array.set(data.positions);
    for (let i = 0; i < 3 * n; i++) a.color.array[i] = data.colors[i];
    a.pSize.array.fill(BASE_SIZE);
    a.pAlpha.array.fill(BASE_ALPHA);
    this.points.material.size = 0.6;
    this.points.material.depthTest = false;   // a hologram: never hidden in the plants
    this.points.renderOrder = 10;
    this.points.layers.set(DISPLAY_LAYER);
    this.points.castShadow = false;
    this.points.frustumCulled = false;
    this.isGF = data.isGF;
    this.group = new THREE.Group();
    const s = WIDTH / (2 * Math.max(1, data.radius));
    this.points.scale.setScalar(s);
    this.group.add(this.points);
    this.group.visible = false;
    scene.add(this.group);
    this.lit = new Float32Array(n);    // seconds of light left per neuron
    this.active = new Set();
  }

  set visible(on) { this.group.visible = on; }
  get visible() { return this.group.visible; }

  // Spikes from the latest snapshot (indices; the brain view's sample).
  addSpikes(indices) {
    if (!this.group.visible || !indices) return;
    const a = this.points.geometry.attributes;
    for (let k = 0; k < indices.length; k++) {
      const i = indices[k];
      if (i < 0 || i >= this.n) continue;
      this.lit[i] = FLASH_S;
      this.active.add(i);
      a.pSize.array[i] = this.isGF[i] ? 6 : 2.6;
      a.pAlpha.array[i] = 1;
    }
    a.pSize.needsUpdate = true; a.pAlpha.needsUpdate = true;
  }

  // Follows her and faces the camera, as the connectome view shows it.
  update(dt, fly, camera) {
    if (!this.group.visible || !fly) return;
    this.group.position.set(fly.x, fly.y, (fly.z || 0) + HEIGHT);
    this.group.quaternion.copy(camera.quaternion);
    if (!this.active.size) return;
    const a = this.points.geometry.attributes;
    for (const i of this.active) {
      const left = (this.lit[i] -= dt);
      if (left <= 0) { this.active.delete(i); a.pSize.array[i] = BASE_SIZE; a.pAlpha.array[i] = BASE_ALPHA; continue; }
      const q = left / FLASH_S;
      a.pAlpha.array[i] = BASE_ALPHA + (1 - BASE_ALPHA) * q;
      a.pSize.array[i] = BASE_SIZE + ((this.isGF[i] ? 6 : 2.6) - BASE_SIZE) * q;
    }
    a.pSize.needsUpdate = true; a.pAlpha.needsUpdate = true;
  }
}
