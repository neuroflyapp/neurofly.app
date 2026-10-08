// Failure-aware local persistence, shared by Electron, Android and browsers.
// Failed reads and conflicting tabs never authorize replacing an unknown save.
import { SAVE_KEY, LEGACY_KEY, newGame, decodeGame, migrateLegacy } from './habitat-game.js';

export class HabitatStorage {
  constructor(storage) {
    this.storage = storage;
    this.raw = null;
    this.blocked = false;
    this.status = null;
  }

  load() {
    try { this.raw = this.storage().getItem(SAVE_KEY); }
    catch { this.blocked = true; this.status = 'storage'; return newGame(); }
    if (this.raw !== null) {
      try { return decodeGame(this.raw); }
      catch { this.blocked = true; this.status = 'unreadable'; return newGame(); }
    }
    try {
      const legacy = this.storage().getItem(LEGACY_KEY);
      if (legacy) { const state = migrateLegacy(legacy); this.status = 'migrated'; return state; }
    } catch { /* Original legacy key is never touched. */ }
    return newGame();
  }

  save(state) {
    if (this.blocked) return false;
    try {
      const text = JSON.stringify(state);
      // Best-effort conflict detection, not an atomic cross-tab transaction.
      if (this.storage().getItem(SAVE_KEY) !== this.raw) {
        this.blocked = true; this.status = 'conflict'; return false;
      }
      if (text !== this.raw) this.storage().setItem(SAVE_KEY, text);
      this.raw = text; this.status = null; return true;
    } catch { this.status = 'storage'; return false; }
  }

  replace(text) {
    const state = decodeGame(text), clean = JSON.stringify(state);
    // Explicit, confirmed import. Do not replace in-memory progress before this succeeds.
    this.storage().setItem(SAVE_KEY, clean);
    this.raw = clean; this.blocked = false; this.status = null; return state;
  }
}
