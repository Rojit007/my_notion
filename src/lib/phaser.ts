// Dynamic import wrapper — Phaser touches `window` on import, breaks SSR.
// Always use this instead of: import Phaser from 'phaser'

let phaserCache: typeof import('phaser') | null = null;

export async function loadPhaser() {
  if (phaserCache) return phaserCache;
  phaserCache = await import('phaser');
  return phaserCache;
}

export default loadPhaser;
