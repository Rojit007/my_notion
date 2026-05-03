'use client';

import { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { useEditorStore } from '@/store';
import { PhaserCanvas } from './canvas/PhaserCanvas';
import { MainToolbar } from './toolbar/MainToolbar';
import { SceneHierarchyPanel } from './panels/SceneHierarchy';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { AssetLibraryPanel } from './panels/AssetLibrary';
import { ScriptEditorPanel } from './panels/ScriptEditor';

export function EditorShell({ projectId }: { projectId: string }) {
  const mode = useEditorStore(s => s.mode);
  const canUndo = useEditorStore(s => s.canUndo);
  const canRedo = useEditorStore(s => s.canRedo);
  const undo = useEditorStore(s => s.undo);
  const redo = useEditorStore(s => s.redo);
  const setActiveTool = useEditorStore(s => s.setActiveTool);
  const copySelected = useEditorStore(s => s.copySelected);
  const paste = useEditorStore(s => s.paste);

  // Global keyboard shortcuts
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if (ctrl && e.key === 'c') { e.preventDefault(); copySelected(); }
      if (ctrl && e.key === 'v') { e.preventDefault(); paste(); }
      if (e.key === 'v') setActiveTool('select');
      if (e.key === 'g') setActiveTool('move');
      if (e.key === 'h') setActiveTool('pan');
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [undo, redo, setActiveTool, copySelected, paste]);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden" style={{ background: 'var(--color-bg-base)' }}>
      {/* Top Toolbar */}
      <motion.div
        initial={{ y: -48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="shrink-0"
        style={{ height: 'var(--panel-top-height)', zIndex: 'var(--z-topbar)' }}
      >
        <MainToolbar projectId={projectId} />
      </motion.div>

      {/* Main body — resizable panels */}
      <div className="flex flex-1 min-h-0">
        <PanelGroup orientation="horizontal" id="gf-h-layout">
          {/* Left: Scene Hierarchy */}
          <motion.div
            initial={{ x: -260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="contents"
          >
            <Panel
              defaultSize={18}
              minSize={13}
              maxSize={28}
              className="panel flex flex-col border-r"
              style={{ borderColor: 'var(--color-border-default)' }}
            >
              <SceneHierarchyPanel />
            </Panel>
          </motion.div>

          <PanelResizeHandle className="w-1 hover:bg-accent transition-colors duration-150 cursor-col-resize"
            style={{ background: 'var(--color-border-default)' }} />

          {/* Center: Canvas + Bottom panels */}
          <Panel defaultSize={60} minSize={30}>
            <PanelGroup orientation="vertical" id="gf-v-layout">
              {/* Canvas */}
              <Panel defaultSize={75} minSize={40}>
                <div className="relative w-full h-full">
                  <PhaserCanvas />
                  {/* Play mode cyan border */}
                  <AnimatePresence>
                    {mode === 'play' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="pointer-events-none absolute inset-0"
                        style={{ border: '2px solid var(--color-accent-c)', zIndex: 10 }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </Panel>

              <PanelResizeHandle className="h-1 hover:bg-accent transition-colors duration-150 cursor-row-resize"
                style={{ background: 'var(--color-border-default)' }} />

              {/* Bottom: Asset Library */}
              <motion.div
                initial={{ y: 220, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="contents"
              >
                <Panel
                  defaultSize={25}
                  minSize={14}
                  maxSize={40}
                  className="panel border-t flex flex-col"
                  style={{ borderColor: 'var(--color-border-default)' }}
                >
                  <AssetLibraryPanel />
                </Panel>
              </motion.div>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1 hover:bg-accent transition-colors duration-150 cursor-col-resize"
            style={{ background: 'var(--color-border-default)' }} />

          {/* Right: Properties / Scripts */}
          <motion.div
            initial={{ x: 280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="contents"
          >
            <Panel
              defaultSize={20}
              minSize={14}
              maxSize={30}
              className="panel flex flex-col border-l"
              style={{ borderColor: 'var(--color-border-default)' }}
            >
              <PropertiesPanel />
            </Panel>
          </motion.div>
        </PanelGroup>
      </div>

      {/* Script Editor overlay (full panel, shown when scripting tab active) */}
      <ScriptEditorPanel />
    </div>
  );
}
