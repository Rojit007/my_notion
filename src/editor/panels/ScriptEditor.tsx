'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Zap, GitBranch, Play as PlayIcon } from 'lucide-react';
import { useEditorStore } from '@/store';
import { BLOCK_DEFINITIONS, BLOCK_CATEGORIES } from '../scripting/blockDefinitions';
import type { ScriptBlock, ScriptWire, BlockType, BlockCategory } from '@/store/types';
import { uuid } from '@/lib/uuid';

/* ---- Block node on the canvas ---- */
function BlockNode({
  block, isSelected, onSelect, onDrag,
}: {
  block: ScriptBlock; isSelected: boolean;
  onSelect: (id: string) => void;
  onDrag: (id: string, dx: number, dy: number) => void;
}) {
  const def = BLOCK_DEFINITIONS[block.type];
  const dragStart = useRef({ x: 0, y: 0 });

  const categoryColors: Record<BlockCategory, string> = {
    event:     '#F59E0B',
    condition: '#22D3EE',
    action:    '#6366F1',
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(block.id);
    dragStart.current = { x: e.clientX, y: e.clientY };

    const onMove = (me: MouseEvent) => {
      onDrag(block.id, me.clientX - dragStart.current.x, me.clientY - dragStart.current.y);
      dragStart.current = { x: me.clientX, y: me.clientY };
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
      className="absolute rounded-lg select-none cursor-grab active:cursor-grabbing"
      style={{
        left: block.x, top: block.y, width: 180,
        background: 'var(--color-bg-s2)',
        border: `1.5px solid ${isSelected ? categoryColors[block.category] : 'var(--color-border-default)'}`,
        boxShadow: isSelected ? `0 0 12px ${categoryColors[block.category]}40` : 'var(--shadow-card)',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-2 rounded-t-lg"
        style={{ height: 28, background: `${categoryColors[block.category]}20`, borderBottom: `1px solid ${categoryColors[block.category]}30` }}
      >
        <span style={{ color: categoryColors[block.category] }}>
          {block.category === 'event' ? <Zap size={11} /> : block.category === 'condition' ? <GitBranch size={11} /> : <PlayIcon size={11} />}
        </span>
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-p)' }}>
          {def?.label ?? block.type}
        </span>
      </div>

      {/* Params */}
      {def?.params.map(p => (
        <div key={p.key} className="flex items-center gap-1 px-2 py-1">
          <span className="text-2xs" style={{ color: 'var(--color-text-t)', width: 50 }}>{p.label}</span>
          {p.inputType === 'select' ? (
            <select
              defaultValue={block.params[p.key] as string ?? String(p.default)}
              className="flex-1 text-xs rounded px-1 outline-none"
              style={{ height: 20, background: 'var(--color-bg-s3)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-p)' }}
            >
              {p.options?.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type={p.inputType === 'number' ? 'number' : 'text'}
              defaultValue={block.params[p.key] as string ?? String(p.default)}
              className="flex-1 text-xs rounded px-1 outline-none"
              style={{ height: 20, background: 'var(--color-bg-s3)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-p)', fontFamily: 'var(--font-mono)' }}
            />
          )}
        </div>
      ))}

      {/* Flow port indicators */}
      <div className="flex justify-between px-2 pb-1.5">
        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-border-strong)' }} title="In" />
        <div className="w-2 h-2 rounded-full" style={{ background: categoryColors[block.category] }} title="Out" />
      </div>
    </motion.div>
  );
}

/* ---- Block palette sidebar ---- */
function BlockPalette({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const byCategory = BLOCK_CATEGORIES.map(cat => ({
    cat,
    blocks: Object.values(BLOCK_DEFINITIONS).filter(d => d.category === cat),
  }));

  const catColors: Record<BlockCategory, string> = {
    event: '#F59E0B', condition: '#22D3EE', action: '#6366F1',
  };

  return (
    <div className="w-44 shrink-0 border-r overflow-y-auto" style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-bg-s1)' }}>
      <div className="px-3 py-2">
        <span className="text-2xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-t)' }}>Blocks</span>
      </div>
      {byCategory.map(({ cat, blocks }) => (
        <div key={cat}>
          <div className="px-3 py-1">
            <span className="text-2xs font-semibold uppercase" style={{ color: catColors[cat] }}>{cat}</span>
          </div>
          {blocks.map(def => (
            <button
              key={def.type}
              className="flex items-center gap-2 w-full px-3 text-left transition-colors duration-100 hover:bg-bg-s2"
              style={{ height: 26 }}
              onClick={() => onAdd(def.type)}
            >
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: catColors[cat] }} />
              <span className="text-xs truncate" style={{ color: 'var(--color-text-s)' }}>{def.label}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ScriptEditorPanel() {
  const isPanelOpen = useEditorStore(s => s.isPanelOpen.scripting);
  const togglePanel = useEditorStore(s => s.togglePanel);
  const project = useEditorStore(s => s.project);
  const addScript = useEditorStore(s => s.addScript);
  const updateScript = useEditorStore(s => s.updateScript);

  const [activeScriptId, setActiveScriptId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const activeScript = activeScriptId ? project?.scripts[activeScriptId] : null;

  const handleAddBlock = useCallback((type: BlockType) => {
    if (!activeScriptId || !project?.scripts[activeScriptId]) return;
    const def = BLOCK_DEFINITIONS[type];
    if (!def) return;
    const newBlock: ScriptBlock = {
      id: uuid(), type, category: def.category,
      x: 80 + Math.random() * 200, y: 80 + Math.random() * 200,
      params: Object.fromEntries(def.params.map(p => [p.key, p.default])),
    };
    const script = project.scripts[activeScriptId];
    updateScript(activeScriptId, {
      blocks: { ...script.blocks, [newBlock.id]: newBlock },
    });
  }, [activeScriptId, project, updateScript]);

  const handleDragBlock = useCallback((blockId: string, dx: number, dy: number) => {
    if (!activeScriptId || !project?.scripts[activeScriptId]) return;
    const script = project.scripts[activeScriptId];
    const block = script.blocks[blockId];
    if (!block) return;
    updateScript(activeScriptId, {
      blocks: { ...script.blocks, [blockId]: { ...block, x: block.x + dx, y: block.y + dy } },
    });
  }, [activeScriptId, project, updateScript]);

  const handleNewScript = () => {
    const newScript = {
      id: uuid(),
      projectId: project?.id ?? '',
      name: `Script ${Object.keys(project?.scripts ?? {}).length + 1}`,
      blocks: {},
      wires: [],
      variables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addScript(newScript);
    setActiveScriptId(newScript.id);
  };

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 flex flex-col"
          style={{ zIndex: 'var(--z-modal)', background: 'var(--color-bg-base)' }}
        >
          {/* Header */}
          <div className="panel-header flex items-center justify-between px-4 shrink-0" style={{ height: 48 }}>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-sm" style={{ color: 'var(--color-text-p)' }}>Script Editor</span>
              {/* Script tabs */}
              <div className="flex gap-1">
                {project && Object.values(project.scripts).map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveScriptId(s.id)}
                    className="px-2 rounded text-xs transition-colors duration-100"
                    style={{
                      height: 24,
                      background: activeScriptId === s.id ? 'var(--color-accent-dim)' : 'var(--color-bg-s2)',
                      color: activeScriptId === s.id ? 'var(--color-accent-light)' : 'var(--color-text-s)',
                      border: `1px solid ${activeScriptId === s.id ? 'rgba(99,102,241,0.4)' : 'var(--color-border-default)'}`,
                    }}
                  >
                    {s.name}
                  </button>
                ))}
                <button
                  onClick={handleNewScript}
                  className="flex items-center gap-1 px-2 rounded text-xs transition-colors duration-100 hover:text-text-p"
                  style={{ height: 24, color: 'var(--color-text-t)', border: '1px dashed var(--color-border-default)' }}
                >
                  <Plus size={11} /> New
                </button>
              </div>
            </div>
            <button
              onClick={() => togglePanel('scripting')}
              className="flex items-center justify-center w-7 h-7 rounded transition-colors duration-100 hover:bg-bg-s2"
              style={{ color: 'var(--color-text-t)' }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-1 min-h-0">
            <BlockPalette onAdd={handleAddBlock} />

            {/* Canvas */}
            <div className="flex-1 relative overflow-hidden canvas-grid">
              {!activeScript ? (
                <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--color-text-t)' }}>
                  <Zap size={40} />
                  <span className="text-sm">Select or create a script</span>
                  <button
                    onClick={handleNewScript}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all duration-150"
                    style={{ background: 'var(--color-accent)', color: 'white', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}
                  >
                    <Plus size={14} /> New Script
                  </button>
                </div>
              ) : (
                <div className="absolute inset-0">
                  <AnimatePresence>
                    {Object.values(activeScript.blocks).map(block => (
                      <BlockNode
                        key={block.id}
                        block={block}
                        isSelected={selectedBlockId === block.id}
                        onSelect={setSelectedBlockId}
                        onDrag={handleDragBlock}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
