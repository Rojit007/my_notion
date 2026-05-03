import type { GameBridge } from './GameBridge';

// PlayScene — the GAME runtime inside the editor.
// Physics is ENABLED. Scripts execute. Animations run.
// On Stop: destroyed entirely, no state leaks back to editor.

type PhaserType = typeof import('phaser');

export class PlayScene extends (class {} as PhaserType['Scene']) {
  private bridge: GameBridge;

  constructor(bridge: GameBridge) {
    super({ key: 'PlayScene' });
    this.bridge = bridge;
  }

  preload() {}

  create() {
    this.bridge.registerPlayScene(this as unknown as import('./GameBridge').PhaserPlayScene);
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Display "Play Mode" indicator
    this.add.text(
      this.scale.width / 2, 30,
      '▶ PLAY MODE', {
        fontSize: '14px', color: '#22D3EE',
        fontFamily: 'JetBrains Mono, monospace',
      }
    ).setOrigin(0.5);
  }

  update() {}
}
