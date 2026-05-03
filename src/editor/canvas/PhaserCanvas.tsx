'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditorStore } from '@/store';
import { GameBridge } from './GameBridge';
import { EditorScene } from './EditorScene';
import { PlayScene } from './PlayScene';
import { MoveObjectCommand } from '@/commands/MoveObjectCommand';
import { AddObjectCommand } from '@/commands/AddObjectCommand';
import { createGameObject } from '@/store';
import type { GameRuntime } from '@/runtime/GameRuntime';

export function PhaserCanvas() {
  const containerRef  = useRef<HTMLDivElement>(null);
  const playRef       = useRef<HTMLDivElement>(null);
  const gameRef       = useRef<import('phaser').Game | null>(null);
  const bridgeRef     = useRef<GameBridge | null>(null);
  const runtimeRef    = useRef<GameRuntime | null>(null);

  const mode            = useEditorStore(s => s.mode);
  const zoom            = useEditorStore(s => s.zoom);
  const gridEnabled     = useEditorStore(s => s.gridEnabled);
  const gridSize        = useEditorStore(s => s.gridSize);
  const commandManager  = useEditorStore(s => s.commandManager);
  const store           = useEditorStore();

  // ---- Mount editor Phaser once ----
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const bridge = new GameBridge();
    bridgeRef.current = bridge;

    const unsub = bridge.on(event => {
      switch (event.type) {
        case 'objectMoved':
          commandManager.execute(new MoveObjectCommand(store, event.id, event.x, event.y));
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

    import('phaser').then(Phaser => {
      if (!containerRef.current || gameRef.current) return;
      const editorScene = new EditorScene(bridge);
      const playScene   = new PlayScene(bridge);

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
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
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

  // ---- Play/Stop: mount or destroy GameRuntime ----
  useEffect(() => {
    if (mode === 'play') {
      const project = store.project;
      if (!project || !playRef.current) return;
      const snapshot = structuredClone(project);

      import('@/runtime/GameRuntime').then(({ GameRuntime }) => {
        if (!playRef.current || runtimeRef.current) return;
        const rt = new GameRuntime();
        runtimeRef.current = rt;
        rt.start(snapshot, playRef.current);
      });
    } else {
      runtimeRef.current?.destroy();
      runtimeRef.current = null;
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Sync zoom / grid to editor scene ----
  useEffect(() => { bridgeRef.current?.setZoom(zoom); }, [zoom]);
  useEffect(() => { bridgeRef.current?.setGrid(gridEnabled, gridSize); }, [gridEnabled, gridSize]);

  // ---- Sync objects slice to Phaser editor scene ----
  useEffect(() => {
    return useEditorStore.subscribe(
      s => s.project?.scenes[s.activeSceneId]?.objects,
      objects => { if (store.mode === 'editor') bridgeRef.current?.syncObjects(objects); },
      { equalityFn: (a, b) => a === b },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Sync selection ----
  useEffect(() => {
    return useEditorStore.subscribe(
      s => s.selectedObjectIds,
      ids => bridgeRef.current?.setSelection(ids),
    );
  }, []);

  // ---- Drop assets from library ----
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('application/gameforge-asset');
    if (!assetId || !bridgeRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    bridgeRef.current.emit({ type: 'objectDropped', assetId, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const bgColor = store.project?.settings.backgroundColor ?? '#0A0D1A';

  return (
    <div
      className="relative w-full h-full canvas-grid"
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Editor Phaser canvas lives here */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Play mode runtime overlay */}
      <AnimatePresence>
        {mode === 'play' && (
          <motion.div
            key="play-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
            style={{ background: bgColor, zIndex: 20 }}
          >
            <div ref={playRef} className="w-full h-full" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
