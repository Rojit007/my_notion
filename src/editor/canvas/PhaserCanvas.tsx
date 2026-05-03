'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/store';
import { GameBridge } from './GameBridge';
import { EditorScene } from './EditorScene';
import { PlayScene } from './PlayScene';
import { MoveObjectCommand } from '@/commands/MoveObjectCommand';
import { AddObjectCommand } from '@/commands/AddObjectCommand';
import { createGameObject } from '@/store';

export function PhaserCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const bridgeRef = useRef<GameBridge | null>(null);

  const mode = useEditorStore(s => s.mode);
  const zoom = useEditorStore(s => s.zoom);
  const gridEnabled = useEditorStore(s => s.gridEnabled);
  const gridSize = useEditorStore(s => s.gridSize);
  const commandManager = useEditorStore(s => s.commandManager);
  const store = useEditorStore();

  // ---- Mount Phaser once ----
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const bridge = new GameBridge();
    bridgeRef.current = bridge;

    // Listen for Phaser → React events
    const unsub = bridge.on(event => {
      switch (event.type) {
        case 'objectMoved':
          commandManager.execute(
            new MoveObjectCommand(store, event.id, event.x, event.y)
          );
          break;
        case 'objectSelected':
          store.setSelectedObjects(event.ids);
          break;
        case 'selectionCleared':
          store.setSelectedObjects([]);
          break;
        case 'objectDropped': {
          const activeScene = store.getActiveScene();
          const layerId = activeScene?.layerIds[0] ?? '';
          const newObj = createGameObject('sprite', `Sprite ${Date.now()}`, event.x, event.y, layerId);
          if (newObj.spriteData) newObj.spriteData.assetId = event.assetId;
          commandManager.execute(new AddObjectCommand(store, newObj));
          store.setSelectedObjects([newObj.id]);
          break;
        }
      }
    });

    // Dynamic Phaser import (avoids SSR window access)
    import('phaser').then(Phaser => {
      if (!containerRef.current || gameRef.current) return;

      const editorScene = new EditorScene(bridge);
      const playScene = new PlayScene(bridge);

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: containerRef.current.clientWidth || 960,
        height: containerRef.current.clientHeight || 540,
        backgroundColor: '#0A0D1A',
        physics: {
          default: 'matter',
          matter: { debug: false, gravity: { x: 0, y: 0 } },
        },
        scene: [editorScene, playScene],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        input: { mouse: { preventDefaultWheel: false } },
      });

      gameRef.current = game;
    });

    return () => {
      unsub();
      gameRef.current?.destroy(true);
      gameRef.current = null;
      bridgeRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Sync mode changes ----
  useEffect(() => {
    bridgeRef.current?.setMode(mode);
  }, [mode]);

  // ---- Sync zoom ----
  useEffect(() => {
    bridgeRef.current?.setZoom(zoom);
  }, [zoom]);

  // ---- Sync grid ----
  useEffect(() => {
    bridgeRef.current?.setGrid(gridEnabled, gridSize);
  }, [gridEnabled, gridSize]);

  // ---- Subscribe to object changes and sync to Phaser ----
  useEffect(() => {
    const unsubObjects = useEditorStore.subscribe(
      s => s.project?.scenes[s.activeSceneId]?.objects,
      objects => bridgeRef.current?.syncObjects(objects),
      { equalityFn: (a, b) => a === b }
    );
    return unsubObjects;
  }, []);

  // ---- Subscribe to selection changes ----
  useEffect(() => {
    const unsubSel = useEditorStore.subscribe(
      s => s.selectedObjectIds,
      ids => bridgeRef.current?.setSelection(ids),
    );
    return unsubSel;
  }, []);

  // ---- Drag-and-drop from Asset Library ----
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('application/gameforge-asset');
    if (!assetId || !bridgeRef.current) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    bridgeRef.current.emit({ type: 'objectDropped', assetId, x, y });
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full canvas-grid"
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      onContextMenu={e => e.preventDefault()}
    />
  );
}
