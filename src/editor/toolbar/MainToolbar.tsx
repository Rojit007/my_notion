'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointer2, Move, RotateCw, Maximize2, Hand,
  Play, Square, Undo2, Redo2, Save, Rocket,
  Grid3x3, Magnet, Eye,
} from 'lucide-react';
import { useEditorStore } from '@/store';
import type { EditorTool } from '@/store/types';
import { exportProject, downloadBlob } from '@/export/ProjectExporter';
import { PublishModal } from '@/components/ui/PublishModal';
import { toast } from '@/components/ui/Toast';

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  active?: boolean;
  variant?: 'default' | 'primary' | 'danger' | 'success';
  disabled?: boolean;
  onClick: () => void;
}

function ToolbarButton({ icon, label, shortcut, active, variant = 'default', disabled, onClick }: ToolbarButtonProps) {
  const base = 'relative flex items-center justify-center rounded-md transition-all duration-150 select-none';
  const size = 'w-9 h-9';

  const variantStyles = {
    default: active
      ? 'bg-accent/15 border border-accent/35 text-accent-light shadow-[0_0_12px_rgba(99,102,241,0.2)]'
      : 'text-text-s hover:bg-bg-s2 hover:text-text-p',
    primary: 'bg-accent text-white shadow-[0_0_20px_rgba(99,102,241,0.40)] hover:shadow-[0_0_28px_rgba(99,102,241,0.55)] hover:bg-accent-hover',
    danger: 'bg-danger text-white shadow-[0_0_20px_rgba(239,68,68,0.40)] hover:shadow-[0_0_28px_rgba(239,68,68,0.55)]',
    success: 'bg-success text-white shadow-[0_0_16px_rgba(16,185,129,0.35)]',
  };

  return (
    <button
      title={shortcut ? `${label} (${shortcut})` : label}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${size} ${variantStyles[variant]} ${disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
    >
      {icon}
    </button>
  );
}

const TOOLS: { id: EditorTool; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { id: 'select', icon: <MousePointer2 size={16} />, label: 'Select', shortcut: 'V' },
  { id: 'move',   icon: <Move size={16} />,          label: 'Move',   shortcut: 'G' },
  { id: 'scale',  icon: <Maximize2 size={16} />,     label: 'Scale',  shortcut: 'S' },
  { id: 'rotate', icon: <RotateCw size={16} />,      label: 'Rotate', shortcut: 'R' },
  { id: 'pan',    icon: <Hand size={16} />,           label: 'Pan',    shortcut: 'H' },
];

export function MainToolbar({ projectId }: { projectId: string }) {
  const mode = useEditorStore(s => s.mode);
  const activeTool = useEditorStore(s => s.activeTool);
  const canUndo = useEditorStore(s => s.canUndo);
  const canRedo = useEditorStore(s => s.canRedo);
  const isSaving = useEditorStore(s => s.isSaving);
  const isDirty = useEditorStore(s => s.isDirty);
  const gridEnabled = useEditorStore(s => s.gridEnabled);
  const snapEnabled = useEditorStore(s => s.snapEnabled);

  const setMode = useEditorStore(s => s.setMode);
  const setActiveTool = useEditorStore(s => s.setActiveTool);
  const undo = useEditorStore(s => s.undo);
  const redo = useEditorStore(s => s.redo);
  const setGridEnabled = useEditorStore(s => s.setGridEnabled);
  const setSnapEnabled = useEditorStore(s => s.setSnapEnabled);

  const project = useEditorStore(s => s.project);
  const isPlaying = mode === 'play';
  const [showPublish, setShowPublish] = useState(false);

  const handleExport = async () => {
    if (!project) return;
    try {
      const result = await exportProject(project);
      downloadBlob(result.blob, result.filename);
      toast.success('Export ready', `${result.filename} downloaded.`);
    } catch {
      toast.error('Export failed', 'Could not bundle the project.');
    }
  };

  return (
    <div
      className="flex items-center px-3 gap-1 border-b"
      style={{
        height: 'var(--panel-top-height)',
        background: 'linear-gradient(180deg, #111627 0%, #0D1020 100%)',
        borderColor: 'var(--color-border-default)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-3 pr-3 border-r" style={{ borderColor: 'var(--color-border-default)' }}>
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-accent text-white font-bold text-sm shadow-[0_0_16px_rgba(99,102,241,0.4)]">
          GF
        </div>
        <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
          GameForge
        </span>
      </div>

      {/* Tool selector */}
      <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-lg mr-2" style={{ background: 'var(--color-bg-s1)' }}>
        {TOOLS.map(t => (
          <ToolbarButton
            key={t.id}
            icon={t.icon}
            label={t.label}
            shortcut={t.shortcut}
            active={activeTool === t.id && !isPlaying}
            disabled={isPlaying}
            onClick={() => setActiveTool(t.id)}
          />
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-6 mx-1" style={{ background: 'var(--color-border-default)' }} />

      {/* Undo / Redo */}
      <ToolbarButton icon={<Undo2 size={15} />} label="Undo" shortcut="Ctrl+Z" disabled={!canUndo || isPlaying} onClick={undo} />
      <ToolbarButton icon={<Redo2 size={15} />} label="Redo" shortcut="Ctrl+Y" disabled={!canRedo || isPlaying} onClick={redo} />

      {/* Separator */}
      <div className="w-px h-6 mx-1" style={{ background: 'var(--color-border-default)' }} />

      {/* View toggles */}
      <ToolbarButton icon={<Grid3x3 size={15} />} label="Toggle Grid" shortcut="Ctrl+'" active={gridEnabled} onClick={() => setGridEnabled(!gridEnabled)} />
      <ToolbarButton icon={<Magnet size={15} />} label="Toggle Snap" shortcut="Ctrl+;" active={snapEnabled} onClick={() => setSnapEnabled(!snapEnabled)} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Save status */}
      <div className="flex items-center gap-1.5 mr-3 text-xs" style={{ color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        {isSaving ? (
          <span className="flex items-center gap-1 text-accent-c">
            <span className="animate-spin-smooth inline-block w-3 h-3 rounded-full border border-accent-c border-t-transparent" />
            Saving…
          </span>
        ) : isDirty ? (
          <span style={{ color: 'var(--color-warning)' }}>● Unsaved</span>
        ) : (
          <span style={{ color: 'var(--color-success)' }}>✓ Saved</span>
        )}
      </div>

      {/* Play / Stop */}
      <AnimatePresence mode="wait">
        {isPlaying ? (
          <motion.div key="stop" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.15 }}>
            <ToolbarButton icon={<Square size={15} />} label="Stop" variant="danger" onClick={() => setMode('editor')} />
          </motion.div>
        ) : (
          <motion.div key="play" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.15 }}>
            <ToolbarButton icon={<Play size={15} />} label="Play" shortcut="Ctrl+P" variant="primary" onClick={() => setMode('play')} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Separator */}
      <div className="w-px h-6 mx-2" style={{ background: 'var(--color-border-default)' }} />

      {/* Export + Publish */}
      <button
        className="flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium transition-all duration-150 active:scale-95"
        style={{ color: 'var(--color-text-s)', background: 'var(--color-bg-s2)', border: '1px solid var(--color-border-default)' }}
        onClick={handleExport}
        title="Download game as ZIP"
      >
        <Rocket size={13} />
        Export
      </button>
      <button
        className="flex items-center gap-1.5 px-3 h-8 rounded-md text-white text-sm font-medium transition-all duration-150 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #6366F1, #A855F7)',
          boxShadow: '0 0 16px rgba(99,102,241,0.3)',
        }}
        onClick={() => setShowPublish(true)}
        disabled={!project}
      >
        <Rocket size={14} />
        Publish
      </button>

      <AnimatePresence>
        {showPublish && project && (
          <PublishModal
            projectId={project.id}
            projectName={project.name}
            onClose={() => setShowPublish(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
