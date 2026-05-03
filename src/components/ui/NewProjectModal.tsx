'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gamepad2, Sword, Puzzle, Zap, Car, Star } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import { toast } from './Toast';

interface Template {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  gradient: string;
  color: string;
  settings: {
    canvasWidth: number;
    canvasHeight: number;
    backgroundColor: string;
    physics: { enabled: boolean; gravity: { x: number; y: number }; debug: boolean };
  };
}

const TEMPLATES: Template[] = [
  {
    id: 'platformer', label: 'Platformer', icon: <Gamepad2 size={22} />,
    description: 'Side-scrolling with gravity, jump & platforms',
    gradient: 'linear-gradient(135deg, #1a1060 0%, #312e9b 100%)', color: '#6366F1',
    settings: { canvasWidth: 960, canvasHeight: 540, backgroundColor: '#1a1a2e', physics: { enabled: true, gravity: { x: 0, y: 600 }, debug: false } },
  },
  {
    id: 'top-down', label: 'Top-Down RPG', icon: <Sword size={22} />,
    description: 'Top-down view with 8-directional movement',
    gradient: 'linear-gradient(135deg, #280a4a 0%, #6d28d9 100%)', color: '#A855F7',
    settings: { canvasWidth: 960, canvasHeight: 540, backgroundColor: '#0a1a0a', physics: { enabled: true, gravity: { x: 0, y: 0 }, debug: false } },
  },
  {
    id: 'puzzle', label: 'Puzzle', icon: <Puzzle size={22} />,
    description: 'Grid-based logic puzzles & match games',
    gradient: 'linear-gradient(135deg, #052018 0%, #10b981 100%)', color: '#10B981',
    settings: { canvasWidth: 800, canvasHeight: 600, backgroundColor: '#0a1f0f', physics: { enabled: false, gravity: { x: 0, y: 0 }, debug: false } },
  },
  {
    id: 'runner', label: 'Infinite Runner', icon: <Zap size={22} />,
    description: 'Auto-scrolling endless runner with obstacles',
    gradient: 'linear-gradient(135deg, #1a1005 0%, #f59e0b 100%)', color: '#F59E0B',
    settings: { canvasWidth: 960, canvasHeight: 400, backgroundColor: '#1a1005', physics: { enabled: true, gravity: { x: 0, y: 800 }, debug: false } },
  },
  {
    id: 'racing', label: 'Racing', icon: <Car size={22} />,
    description: 'Top-down racing with physics-based vehicles',
    gradient: 'linear-gradient(135deg, #1a0505 0%, #ef4444 100%)', color: '#EF4444',
    settings: { canvasWidth: 1024, canvasHeight: 576, backgroundColor: '#1a0505', physics: { enabled: true, gravity: { x: 0, y: 0 }, debug: false } },
  },
  {
    id: 'blank', label: 'Blank Canvas', icon: <Star size={22} />,
    description: 'Start from scratch with a clean slate',
    gradient: 'linear-gradient(135deg, #0d1020 0%, #1c2a3a 100%)', color: '#8B92B3',
    settings: { canvasWidth: 960, canvasHeight: 540, backgroundColor: '#090b14', physics: { enabled: true, gravity: { x: 0, y: 300 }, debug: false } },
  },
];

export function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('platformer');
  const router = useRouter();

  const createProject = trpc.project.create.useMutation({
    onSuccess: data => {
      toast.success('Project created!', `"${name.trim()}" is ready.`);
      onCreated();
      router.push(`/editor/${data.id}`);
    },
    onError: err => toast.error('Failed to create project', err.message),
  });

  const template = TEMPLATES.find(t => t.id === selectedTemplate)!;

  const handleCreate = () => {
    if (!name.trim()) return;
    createProject.mutate({ name: name.trim(), genre: selectedTemplate });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'var(--color-bg-overlay)', zIndex: 'var(--z-modal-overlay)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="glass-strong rounded-2xl w-full mx-4 flex flex-col"
        style={{ maxWidth: 600, maxHeight: '90vh', boxShadow: 'var(--shadow-modal)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-p)', fontFamily: 'var(--font-display)' }}>
            New Game
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-bg-s2"
            style={{ color: 'var(--color-text-t)' }}
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-t)' }}>Game Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="My Awesome Game"
              className="w-full rounded-lg px-3 outline-none text-sm transition-all"
              style={{
                height: 40, background: 'var(--color-bg-s2)',
                border: '1px solid var(--color-border-default)', color: 'var(--color-text-p)',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.2)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--color-border-default)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Template grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-t)' }}>Start from Template</label>
            <div className="grid grid-cols-3 gap-2.5">
              {TEMPLATES.map(t => (
                <motion.button
                  key={t.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedTemplate(t.id)}
                  className="relative overflow-hidden rounded-xl text-left transition-all duration-150"
                  style={{
                    border: `1.5px solid ${selectedTemplate === t.id ? t.color : 'var(--color-border-default)'}`,
                    boxShadow: selectedTemplate === t.id ? `0 0 18px ${t.color}35` : 'none',
                    background: 'var(--color-bg-s2)',
                  }}
                >
                  <div className="h-16 flex items-center justify-center" style={{ background: t.gradient }}>
                    <span style={{ color: 'rgba(255,255,255,0.85)' }}>{t.icon}</span>
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-text-p)' }}>{t.label}</div>
                    <div className="text-2xs leading-relaxed" style={{ color: 'var(--color-text-t)' }}>{t.description}</div>
                  </div>
                  <AnimatePresence>
                    {selectedTemplate === t.id && (
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: t.color, boxShadow: `0 0 8px ${t.color}60` }}
                      >
                        ✓
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Selected template details */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedTemplate}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="rounded-xl p-3 flex items-center gap-4"
              style={{ background: 'var(--color-bg-s2)', border: `1px solid ${template.color}30` }}
            >
              <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: template.gradient, boxShadow: `0 0 12px ${template.color}30` }}>
                <span style={{ color: 'rgba(255,255,255,0.9)' }}>{template.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-text-p)' }}>{template.label}</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xs" style={{ color: 'var(--color-text-t)', fontFamily: 'var(--font-mono)' }}>
                    {template.settings.canvasWidth}×{template.settings.canvasHeight}
                  </span>
                  <span className="text-2xs" style={{ color: 'var(--color-text-t)' }}>
                    Gravity: {template.settings.physics.gravity.y > 0 ? `↓${template.settings.physics.gravity.y}` : 'None'}
                  </span>
                  {!template.settings.physics.enabled && (
                    <span className="text-2xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(139,146,179,0.15)', color: 'var(--color-text-t)' }}>No physics</span>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 pb-5 pt-2 border-t shrink-0" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <button
            onClick={onClose}
            className="px-4 text-sm rounded-lg transition-colors hover:bg-bg-s2"
            style={{ height: 36, color: 'var(--color-text-s)', border: '1px solid var(--color-border-default)' }}
          >
            Cancel
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={!name.trim() || createProject.isPending}
            onClick={handleCreate}
            className="px-5 text-sm font-semibold rounded-lg text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              height: 36,
              background: `linear-gradient(135deg, ${template.color}, #A855F7)`,
              boxShadow: name.trim() ? `0 0 16px ${template.color}50` : 'none',
            }}
          >
            {createProject.isPending ? 'Creating…' : 'Create Game'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
