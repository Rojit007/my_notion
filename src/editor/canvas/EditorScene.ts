import type { GameObjectState } from '@/store/types';
import type { GameBridge } from './GameBridge';

// EditorScene — Phaser.Scene subclass for the EDITOR mode canvas.
// Physics is DISABLED. Objects are placed declaratively from the Zustand store.
// Source of truth is always the store, not Phaser's internal state.

type PhaserType = typeof import('phaser');

interface PhaserSpriteExt extends Phaser.GameObjects.Rectangle {
  _gfId: string;
  _selectionOutline?: Phaser.GameObjects.Graphics;
}

export class EditorScene extends (class {} as PhaserType['Scene']) {
  private bridge: GameBridge;
  private objectMap = new Map<string, PhaserSpriteExt>();
  private draggingIds = new Set<string>();
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private gridEnabled = true;
  private gridSize = 16;
  private isDragSelecting = false;
  private dragSelectStart = { x: 0, y: 0 };

  constructor(bridge: GameBridge) {
    super({ key: 'EditorScene' });
    this.bridge = bridge;
  }

  preload() {}

  create() {
    this.bridge.registerEditorScene(this as unknown as import('./GameBridge').PhaserEditorScene);

    // Grid
    this.gridGraphics = this.add.graphics();
    this.drawGrid();

    // Selection overlay
    this.selectionGraphics = this.add.graphics();
    this.selectionGraphics.setDepth(1000);

    // Camera controls (pan with middle mouse / space)
    this.cameras.main.setBackgroundColor('#0A0D1A');

    // Input events
    this.setupInput();

    this.bridge.emit({ type: 'sceneReady' });
  }

  update() {
    if (this.isDragSelecting) {
      this.drawDragSelection();
    }
  }

  // ---- Object reconciliation ---------------------------------

  reconcileObjects(objects: Record<string, GameObjectState>) {
    const currentIds = new Set(Object.keys(objects));
    const existingIds = new Set(this.objectMap.keys());

    // Additions
    for (const id of currentIds) {
      if (!existingIds.has(id)) this.createPhaserObject(objects[id]);
    }

    // Deletions
    for (const id of existingIds) {
      if (!currentIds.has(id)) this.destroyPhaserObject(id);
    }

    // Updates — skip objects being dragged (Phaser is authoritative during drag)
    for (const id of currentIds) {
      if (existingIds.has(id) && !this.draggingIds.has(id)) {
        this.updatePhaserObject(objects[id]);
      }
    }
  }

  private createPhaserObject(obj: GameObjectState) {
    const { x, y, scaleX, scaleY, rotation } = obj.transform;
    let w = 64, h = 64;

    // Use shape dimensions if available
    if (obj.shapeData) {
      w = obj.shapeData.radius ? obj.shapeData.radius * 2 : 64;
      h = obj.shapeData.radius ? obj.shapeData.radius * 2 : 64;
    }

    const pObj = this.add.rectangle(x, y, w * scaleX, h * scaleY, 0x6366F1, 0.7) as unknown as PhaserSpriteExt;
    pObj._gfId = obj.id;
    pObj.setRotation(rotation);
    pObj.setVisible(obj.visible);
    pObj.setInteractive({ draggable: true });
    pObj.setDepth(obj.transform.depth);

    this.objectMap.set(obj.id, pObj);
    this.setupObjectInput(pObj, obj.id);
  }

  private destroyPhaserObject(id: string) {
    const pObj = this.objectMap.get(id);
    if (pObj) {
      pObj._selectionOutline?.destroy();
      pObj.destroy();
      this.objectMap.delete(id);
    }
  }

  private updatePhaserObject(obj: GameObjectState) {
    const pObj = this.objectMap.get(obj.id);
    if (!pObj) return;
    pObj.setPosition(obj.transform.x, obj.transform.y);
    pObj.setRotation(obj.transform.rotation);
    pObj.setScale(obj.transform.scaleX, obj.transform.scaleY);
    pObj.setVisible(obj.visible);
    pObj.setAlpha(obj.spriteData?.alpha ?? 1);
  }

  // ---- Selection overlay -------------------------------------

  updateSelection(ids: string[]) {
    this.selectionGraphics.clear();

    for (const [id, pObj] of this.objectMap) {
      if (ids.includes(id)) {
        this.drawSelectionOutline(pObj);
      }
    }

    // Update drag interactivity (selected objects should be draggable)
    for (const [id, pObj] of this.objectMap) {
      if (ids.includes(id)) {
        pObj.setInteractive({ draggable: true });
      }
    }
  }

  private drawSelectionOutline(pObj: PhaserSpriteExt) {
    const g = this.selectionGraphics;
    const b = pObj.getBounds();
    g.lineStyle(1.5, 0x6366F1, 1);
    g.strokeRect(b.x, b.y, b.width, b.height);
    // Corner handles
    const hs = 6;
    g.fillStyle(0xffffff, 1);
    [[b.x, b.y], [b.right - hs, b.y], [b.x, b.bottom - hs], [b.right - hs, b.bottom - hs],
     [b.centerX - hs / 2, b.y], [b.centerX - hs / 2, b.bottom - hs],
     [b.x, b.centerY - hs / 2], [b.right - hs, b.centerY - hs / 2]].forEach(([hx, hy]) => {
      g.fillRect(hx, hy, hs, hs);
    });
  }

  // ---- Grid --------------------------------------------------

  setGrid(enabled: boolean, size: number) {
    this.gridEnabled = enabled;
    this.gridSize = size;
    this.drawGrid();
  }

  private drawGrid() {
    const g = this.gridGraphics;
    g.clear();
    if (!this.gridEnabled) return;

    const cam = this.cameras.main;
    const w = this.scale.width;
    const h = this.scale.height;
    const gs = this.gridSize;

    // Minor grid
    g.lineStyle(1, 0xffffff, 0.025);
    for (let x = 0; x < w + gs; x += gs) g.lineBetween(x, 0, x, h);
    for (let y = 0; y < h + gs; y += gs) g.lineBetween(0, y, w, y);

    // Major grid (every 8 cells)
    const major = gs * 8;
    g.lineStyle(1, 0xffffff, 0.055);
    for (let x = 0; x < w + major; x += major) g.lineBetween(x, 0, x, h);
    for (let y = 0; y < h + major; y += major) g.lineBetween(0, y, w, y);
  }

  // ---- Input -------------------------------------------------

  private setupInput() {
    // Click on empty area → deselect
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.rightButtonDown()) return;
      if (!ptr.downElement || (ptr.downElement as HTMLElement).tagName === 'CANVAS') {
        this.bridge.emit({ type: 'selectionCleared' });
      }
    });

    // Zoom with scroll
    this.input.on('wheel', (_ptr: unknown, _gos: unknown, _dx: unknown, dy: number) => {
      const cam = this.cameras.main;
      const newZoom = Math.min(Math.max(cam.zoom - dy * 0.001, 0.1), 4);
      cam.setZoom(newZoom);
    });

    // Pan with space + drag
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.input.setDefaultCursor('grab');
    });
    this.input.keyboard?.on('keyup-SPACE', () => {
      this.input.setDefaultCursor('default');
    });

    // Drag manager
    this.input.on('drag', (ptr: Phaser.Input.Pointer, go: PhaserSpriteExt, x: number, y: number) => {
      if (!go._gfId) return;
      go.x = x;
      go.y = y;
      this.draggingIds.add(go._gfId);
      this.updateSelection([go._gfId]); // keep selection outline updated during drag
    });

    this.input.on('dragend', (ptr: Phaser.Input.Pointer, go: PhaserSpriteExt) => {
      if (!go._gfId) return;
      const id = go._gfId;
      this.draggingIds.delete(id);
      // Emit to bridge so React Command pattern picks it up
      this.bridge.emit({ type: 'objectMoved', id, x: go.x, y: go.y });
    });
  }

  private setupObjectInput(pObj: PhaserSpriteExt, id: string) {
    pObj.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.rightButtonDown()) return;
      if (ptr.event.shiftKey) {
        // Multi-select handled by React via store
        const state = typeof window !== 'undefined'
          ? (window as Window & { __gfSelectedIds?: string[] }).__gfSelectedIds ?? []
          : [];
        this.bridge.emit({ type: 'objectSelected', ids: [...state, id] });
      } else {
        this.bridge.emit({ type: 'objectSelected', ids: [id] });
      }
    });

    pObj.on('pointerover', () => {
      this.input.setDefaultCursor('move');
    });

    pObj.on('pointerout', () => {
      this.input.setDefaultCursor('default');
    });
  }

  private drawDragSelection() {
    // Visual marquee select (future: implement proper marquee)
  }
}
