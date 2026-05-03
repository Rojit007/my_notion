'use client';

import type { GameObjectState } from '@/store/types';

// ---- Event types emitted from Phaser → React ----
export type BridgeEvent =
  | { type: 'objectMoved'; id: string; x: number; y: number }
  | { type: 'objectSelected'; ids: string[] }
  | { type: 'objectDropped'; assetId: string; x: number; y: number }
  | { type: 'selectionCleared' }
  | { type: 'sceneReady' };

type BridgeListener = (event: BridgeEvent) => void;

/**
 * GameBridge — the ONLY translation layer between Phaser and React.
 *
 * Direction 1: React → Phaser  (via syncObjects, setMode, setSelection)
 * Direction 2: Phaser → React  (via emit + listeners; always goes through Command pattern)
 *
 * Never import React hooks here. Never import Phaser here (loaded dynamically).
 */
export class GameBridge {
  private listeners: BridgeListener[] = [];
  private editorSceneRef: WeakRef<PhaserEditorScene> | null = null;
  private playSceneRef: WeakRef<PhaserPlayScene> | null = null;

  // ---- Register scenes (called from scene create()) ----
  registerEditorScene(scene: PhaserEditorScene) {
    this.editorSceneRef = new WeakRef(scene);
  }
  registerPlayScene(scene: PhaserPlayScene) {
    this.playSceneRef = new WeakRef(scene);
  }

  // ---- React → Phaser ----
  syncObjects(objects: Record<string, GameObjectState> | undefined) {
    const scene = this.editorSceneRef?.deref();
    if (objects && scene) scene.reconcileObjects(objects);
  }

  setMode(mode: 'editor' | 'play') {
    const editor = this.editorSceneRef?.deref();
    const play = this.playSceneRef?.deref();
    if (mode === 'play') {
      editor?.scene.pause();
      play?.scene.resume();
    } else {
      play?.scene.pause();
      editor?.scene.resume();
    }
  }

  setSelection(ids: string[]) {
    const scene = this.editorSceneRef?.deref();
    if (scene) scene.updateSelection(ids);
  }

  setZoom(zoom: number) {
    const scene = this.editorSceneRef?.deref();
    if (scene) scene.cameras.main.setZoom(zoom);
  }

  setGrid(enabled: boolean, size: number) {
    const scene = this.editorSceneRef?.deref();
    if (scene) scene.setGrid(enabled, size);
  }

  // ---- Phaser → React ----
  emit(event: BridgeEvent) {
    this.listeners.forEach(l => l(event));
  }

  on(listener: BridgeListener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }
}

// ---- Minimal interface contracts (implemented in EditorScene/PlayScene) ----

export interface PhaserEditorScene {
  scene: { pause(): void; resume(): void };
  cameras: { main: { setZoom(z: number): void } };
  reconcileObjects(objects: Record<string, GameObjectState>): void;
  updateSelection(ids: string[]): void;
  setGrid(enabled: boolean, size: number): void;
}

export interface PhaserPlayScene {
  scene: { pause(): void; resume(): void };
}
