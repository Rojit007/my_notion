'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Gamepad2, Sword, Puzzle, Zap } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';

const TEMPLATES = [
  {
    id: 'platformer', label: 'Platformer', icon: <Gamepad2 size={24} />,
    description: 'Side-scrolling with gravity, jump, and platforms',
    gradient: 'linear-gradient(135deg, #1a1060, #312e9b)',
    color: '#6366F1',
  },
  {
    id: 'top-down', label: 'Top-Down', icon: <Sword size={24} />,
    description: 'Top-down view with 8-directional movement',
    gradient: 'linear-gradient(135deg, #280a4a, rgba(168,85,247,0.6))',
    color: '#A855F7',
  },
  {
    id: 'puzzle', label: 'Puzzle', icon: <Puzzle size={24} />,
    description: 'Grid-based logic puzzles and match games',
    gradient: 'linear-gradient(135deg, #052018, rgba(16,185,129,0.5))',
    color: '#10B981',
  },
  {
    id: 'runner', label: 'Infinite Runner', icon: <Zap size={24} />,
    description: 'Auto-scrolling endless runner with obstacles',
    gradient: 'linear-gradient(135deg, #1a1005, rgba(245,158,11,0.5))',
    color: '#F59E0B',
  },
];

export function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('platformer');
  const router = useRouter();

  const createProject = trpc.project.create.useMutation({
    onSuccess: data => {
      onCreated();
      router.push(`/editor/${data.id}`);
    },
  });

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
      style={{ background: 'var(--color-bg-overlay)', zIndex: 'var(--z-modal-overlay)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="glass-strong rounded-2xl w-full max-w-lg mx-4"
        style={{ boxShadow: 'var(--shadow-modal)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-p)', fontFamily: 'var(--font-display)' }}>
            New Game
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-100 hover:bg-bg-s2"
            style={{ color: 'var(--color-text-t)' }}
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-t)' }}>
              Game Name
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="My Awesome Game"
              className="w-full rounded-lg px-3 outline-none text-sm transition-all duration-100"
              style={{
                height: 40, background: 'var(--color-bg-s2)',
                border: '1px solid var(--color-border-default)',
                color: 'var(--color-text-p)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-accent)', e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.2)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border-default)', e.target.style.boxShadow = 'none')}
            />
          </div>

          {/* Template grid */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-t)' }}>
              Start from Template
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {TEMPLATES.map(t => (
                <motion.button
                  key={t.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedTemplate(t.id)}
                  className="relative overflow-hidden rounded-xl text-left transition-all duration-150"
                  style={{
                    border: `1.5px solid ${selectedTemplate === t.id ? t.color : 'var(--color-border-default)'}`,
                    boxShadow: selectedTemplate === t.id ? `0 0 16px ${t.color}30` : 'none',
                    background: 'var(--color-bg-s2)',
                  }}
                >
                  {/* Gradient strip */}
                  <div className="h-14 flex items-center justify-center" style={{ background: t.gradient }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>{t.icon}</span>
                  </div>
                  <div className="p-2.5">
                    <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-text-p)' }}>{t.label}</div>
                    <div className="text-2xs" style={{ color: 'var(--color-text-t)' }}>{t.description}</div>
                  </div>
                  {selectedTemplate === t.id && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: t.color }}>
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 pb-5">
          <button
            onClick={onClose}
            className="px-4 text-sm rounded-lg transition-colors duration-100 hover:bg-bg-s2"
            style={{ height: 36, color: 'var(--color-text-s)', border: '1px solid var(--color-border-default)' }}
          >
            Cancel
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={!name.trim() || createProject.isPending}
            onClick={handleCreate}
            className="px-5 text-sm font-medium rounded-lg text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              height: 36,
              background: 'linear-gradient(135deg, #6366F1, #A855F7)',
              boxShadow: name.trim() ? '0 0 16px rgba(99,102,241,0.35)' : 'none',
            }}
          >
            {createProject.isPending ? 'Creating…' : 'Create Game'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
