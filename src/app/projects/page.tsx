'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Clock, Layers, ExternalLink, Trash2, Copy,
  Rocket, LayoutGrid, Search, ChevronDown, Gamepad2,
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { NewProjectModal } from '@/components/ui/NewProjectModal';

const GENRE_COLORS: Record<string, string> = {
  platformer: '#6366F1', rpg: '#A855F7', shooter: '#EF4444',
  puzzle: '#10B981', racing: '#F59E0B', adventure: '#22D3EE',
  strategy: '#EC4899', arcade: '#FCD34D',
};

const GENRE_GRADIENTS: Record<string, string> = {
  platformer: 'linear-gradient(135deg, #1a1060, #312e9b)',
  rpg:        'linear-gradient(135deg, #280a4a, rgba(124,58,237,0.4))',
  shooter:    'linear-gradient(135deg, #1a0505, rgba(220,38,38,0.4))',
  puzzle:     'linear-gradient(135deg, #052018, rgba(16,185,129,0.4))',
  racing:     'linear-gradient(135deg, #1a1005, rgba(245,158,11,0.4))',
  adventure:  'linear-gradient(135deg, #051a1a, rgba(34,211,238,0.4))',
  arcade:     'linear-gradient(135deg, #1a0a05, rgba(252,211,77,0.4))',
};

function ProjectCard({ project, onDelete }: {
  project: {
    id: string; name: string; description: string | null;
    thumbnailUrl: string | null; slug: string; status: string;
    updatedAt: Date; _count: { scenes: number };
  };
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const genre = 'platformer'; // TODO: extract from project settings

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
      className="relative rounded-xl overflow-hidden cursor-pointer"
      style={{
        background: 'var(--color-bg-s1)',
        border: `1px solid ${hovered ? 'rgba(99,102,241,0.25)' : 'var(--color-border-subtle)'}`,
        boxShadow: hovered ? '0 8px 32px rgba(99,102,241,0.20), 0 0 0 1px rgba(99,102,241,0.15)' : 'var(--shadow-card)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 250ms cubic-bezier(0.25, 1, 0.5, 1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div
        className="relative overflow-hidden"
        style={{ height: 130, background: GENRE_GRADIENTS[genre] ?? GENRE_GRADIENTS.platformer }}
      >
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.name}
            className="w-full h-full object-cover"
            style={{ transform: hovered ? 'scale(1.05)' : 'scale(1)', transition: 'transform 400ms ease' }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Gamepad2 size={40} style={{ color: 'rgba(255,255,255,0.15)' }} />
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <span
            className="text-2xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{
              background: project.status === 'published' ? 'var(--color-success-dim)' : 'rgba(0,0,0,0.5)',
              color: project.status === 'published' ? 'var(--color-success)' : 'var(--color-text-t)',
              border: `1px solid ${project.status === 'published' ? 'rgba(16,185,129,0.4)' : 'var(--color-border-default)'}`,
            }}
          >
            {project.status === 'published' ? '● Live' : '○ Draft'}
          </span>
        </div>
        {/* Genre badge */}
        <div className="absolute bottom-2 left-2">
          <span
            className="text-2xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{
              background: `${GENRE_COLORS[genre]}20`,
              color: GENRE_COLORS[genre],
              border: `1px solid ${GENRE_COLORS[genre]}40`,
            }}
          >
            {genre}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate mb-1" style={{ color: 'var(--color-text-p)' }}>
          {project.name}
        </h3>
        <div className="flex items-center gap-3 text-2xs" style={{ color: 'var(--color-text-t)' }}>
          <span className="flex items-center gap-0.5">
            <Clock size={10} />
            {new Date(project.updatedAt).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-0.5">
            <Layers size={10} />
            {project._count.scenes} scene{project._count.scenes !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Hover actions */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="flex gap-1.5 px-3 pb-3"
          >
            <Link
              href={`/editor/${project.id}`}
              className="flex-1 flex items-center justify-center gap-1 rounded-md text-xs font-medium transition-all duration-150 text-white"
              style={{ height: 28, background: 'var(--color-accent)', boxShadow: '0 0 12px rgba(99,102,241,0.3)' }}
              onClick={e => e.stopPropagation()}
            >
              Open Editor
            </Link>
            <button
              className="flex items-center justify-center w-7 rounded-md transition-colors duration-100 hover:bg-bg-s3"
              style={{ height: 28, color: 'var(--color-text-t)', border: '1px solid var(--color-border-default)' }}
              title="Duplicate"
            >
              <Copy size={11} />
            </button>
            <button
              className="flex items-center justify-center w-7 rounded-md transition-colors duration-100"
              style={{ height: 28, color: 'var(--color-danger)', background: 'var(--color-danger-dim)', border: '1px solid rgba(239,68,68,0.3)' }}
              title="Delete"
              onClick={e => { e.stopPropagation(); onDelete(project.id); }}
            >
              <Trash2 size={11} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function NewProjectCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      layout
      className="rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-200"
      style={{
        minHeight: 220, background: 'transparent',
        border: `1.5px dashed ${hovered ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
        color: hovered ? 'var(--color-accent-light)' : 'var(--color-text-t)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 4px 20px rgba(99,102,241,0.1)' : 'none',
        cursor: 'pointer',
      }}
      whileTap={{ scale: 0.98 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <motion.div
        animate={{ scale: hovered ? 1.1 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        <Plus size={32} />
      </motion.div>
      <span className="text-sm font-medium">New Game</span>
    </motion.button>
  );
}

export default function ProjectsDashboard() {
  const [showNewModal, setShowNewModal] = useState(false);
  const [search, setSearch] = useState('');

  const { data: projects, isLoading, refetch } = trpc.project.list.useQuery();
  const deleteProject = trpc.project.delete.useMutation({ onSuccess: () => refetch() });

  const filtered = projects?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-base)' }}>
      {/* Top Nav */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-8"
        style={{ height: 60, background: 'rgba(9,11,20,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm shadow-[0_0_16px_rgba(99,102,241,0.4)]" style={{ background: 'var(--color-accent)' }}>
            GF
          </div>
          <span className="font-bold text-base text-gradient-accent" style={{ fontFamily: 'var(--font-display)' }}>
            GameForge Studio
          </span>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2 px-4 rounded-lg text-sm font-medium text-white"
          style={{ height: 36, background: 'linear-gradient(135deg, #6366F1, #A855F7)', boxShadow: '0 0 16px rgba(99,102,241,0.3)' }}
          onClick={() => setShowNewModal(true)}
        >
          <Plus size={15} /> New Game
        </motion.button>
      </nav>

      {/* Hero heading */}
      <div className="px-8 pt-10 pb-6">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl font-bold mb-1"
          style={{ color: 'var(--color-text-p)', fontFamily: 'var(--font-display)' }}
        >
          Your Games
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="text-sm"
          style={{ color: 'var(--color-text-s)' }}
        >
          {projects?.length ?? 0} game{projects?.length !== 1 ? 's' : ''} in your studio
        </motion.p>
      </div>

      {/* Filter / Search bar */}
      <div className="px-8 pb-6 flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 rounded-lg flex-1 max-w-xs" style={{ height: 36, background: 'var(--color-bg-s2)', border: '1px solid var(--color-border-default)' }}>
          <Search size={14} style={{ color: 'var(--color-text-t)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search games…"
            className="bg-transparent outline-none text-sm flex-1"
            style={{ color: 'var(--color-text-p)' }}
          />
        </div>
        <button className="flex items-center gap-1 px-3 text-sm rounded-lg transition-colors duration-100 hover:bg-bg-s2" style={{ height: 36, color: 'var(--color-text-s)', border: '1px solid var(--color-border-default)' }}>
          Sort: Recent <ChevronDown size={13} />
        </button>
      </div>

      {/* Game grid */}
      <div className="px-8 pb-16">
        {isLoading ? (
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton rounded-xl" style={{ height: 220 }} />
            ))}
          </div>
        ) : (
          <motion.div
            layout
            className="grid gap-5"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            <AnimatePresence>
              {filtered.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <ProjectCard
                    project={p as Parameters<typeof ProjectCard>[0]['project']}
                    onDelete={id => deleteProject.mutate({ id })}
                  />
                </motion.div>
              ))}
              <NewProjectCard key="new" onClick={() => setShowNewModal(true)} />
            </AnimatePresence>
          </motion.div>
        )}

        {!isLoading && filtered.length === 0 && search === '' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4" style={{ color: 'var(--color-text-t)' }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
              <Rocket size={56} style={{ color: 'var(--color-accent-dim)' }} />
            </motion.div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-s)' }}>No games yet</h2>
            <p className="text-sm">Create your first game to get started</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white mt-2"
              style={{ background: 'linear-gradient(135deg, #6366F1, #A855F7)', boxShadow: '0 0 24px rgba(99,102,241,0.35)' }}
              onClick={() => setShowNewModal(true)}
            >
              <Plus size={16} /> Start from Template
            </motion.button>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      <AnimatePresence>
        {showNewModal && (
          <NewProjectModal
            onClose={() => setShowNewModal(false)}
            onCreated={() => { setShowNewModal(false); refetch(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
