'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Search, ImageIcon, Volume2, Film, FileCode2, Trash2, X } from 'lucide-react';
import { useEditorStore } from '@/store';
import type { AssetState, AssetType } from '@/store/types';
import { uuid } from '@/lib/uuid';

/* ---- Asset Thumbnail ---- */
function AssetThumbnail({ asset, onDragStart, onDelete }: {
  asset: AssetState;
  onDragStart: (e: React.DragEvent, assetId: string) => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const typeColors: Record<AssetType, string> = {
    image: 'var(--color-obj-sprite)', spritesheet: 'var(--color-obj-sprite)',
    audio: 'var(--color-obj-audio)', tileset: 'var(--color-obj-script)',
    font: 'var(--color-text-s)',
  };
  const typeIcons: Record<AssetType, React.ReactNode> = {
    image: <ImageIcon size={20} />, spritesheet: <ImageIcon size={20} />,
    audio: <Volume2 size={20} />, tileset: <Film size={20} />,
    font: <FileCode2 size={20} />,
  };

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, asset.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: 80, height: 80 }}
    >
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: [0.22, 1.1, 0.36, 1] }}
      className="relative rounded-md overflow-hidden cursor-grab active:cursor-grabbing w-full h-full"
      style={{
        background: 'var(--color-bg-s2)',
        border: `1px solid ${hovered ? 'rgba(99,102,241,0.4)' : 'var(--color-border-subtle)'}`,
        boxShadow: hovered ? '0 0 0 1px rgba(99,102,241,0.25), 0 4px 16px rgba(99,102,241,0.15)' : 'none',
        transform: hovered ? 'scale(1.04)' : 'scale(1)',
        transition: 'transform 200ms cubic-bezier(0.22,1.1,0.36,1), border-color 150ms ease, box-shadow 150ms ease',
      }}
    >
      {/* Preview */}
      {asset.previewUrl ? (
        <img
          src={asset.previewUrl}
          alt={asset.name}
          className="w-full h-full object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ color: typeColors[asset.type] ?? 'var(--color-text-t)' }}>
          {typeIcons[asset.type]}
        </div>
      )}

      {/* Bottom label */}
      <div
        className="absolute bottom-0 inset-x-0 px-1 py-0.5"
        style={{ background: 'linear-gradient(to top, rgba(9,11,20,0.9) 0%, transparent 100%)' }}
      >
        <span className="text-2xs truncate block" style={{ color: 'var(--color-text-p)' }}>{asset.name}</span>
      </div>

      {/* Type indicator dot */}
      <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: typeColors[asset.type] }} />

      {/* Hover overlay — delete button */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-start justify-end p-1"
            style={{ background: 'rgba(9,11,20,0.5)' }}
          >
            <button
              className="p-0.5 rounded"
              style={{ color: 'var(--color-danger)', background: 'rgba(239,68,68,0.15)' }}
              onClick={e => { e.stopPropagation(); onDelete(asset.id); }}
            >
              <Trash2 size={10} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </div>
  );
}

/* ---- Upload zone ---- */
function UploadZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback((files: FileList | File[]) => {
    const valid = Array.from(files).filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('audio/')
    );
    if (valid.length) onFiles(valid);
  }, [onFiles]);

  return (
    <motion.div
      className="flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all duration-150 mx-2 my-1"
      style={{
        height: 60,
        border: `1.5px dashed ${dragOver ? 'var(--color-accent)' : 'var(--color-border-default)'}`,
        background: dragOver ? 'var(--color-accent-dim)' : 'transparent',
      }}
      whileTap={{ scale: 0.98 }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
    >
      <Upload size={16} style={{ color: dragOver ? 'var(--color-accent)' : 'var(--color-text-t)' }} />
      <span className="text-2xs mt-1" style={{ color: dragOver ? 'var(--color-accent-light)' : 'var(--color-text-t)' }}>
        Drop or click to upload
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,audio/*"
        multiple
        className="hidden"
        onChange={e => e.target.files && processFiles(e.target.files)}
      />
    </motion.div>
  );
}

const TABS: { id: string; label: string; icon: React.ReactNode; filter: (a: AssetState) => boolean }[] = [
  { id: 'all',       label: 'All',    icon: null,               filter: () => true },
  { id: 'sprites',   label: 'Sprites', icon: <ImageIcon size={11} />, filter: a => a.type === 'image' || a.type === 'spritesheet' },
  { id: 'audio',     label: 'Audio',  icon: <Volume2 size={11} />,   filter: a => a.type === 'audio' },
  { id: 'tilesets',  label: 'Tiles',  icon: <Film size={11} />,      filter: a => a.type === 'tileset' },
];

export function AssetLibraryPanel() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const project = useEditorStore(s => s.project);
  const addAsset = useEditorStore(s => s.addAsset);
  const removeAsset = useEditorStore(s => s.removeAsset);

  const allAssets = project ? Object.values(project.assets) : [];
  const tab = TABS.find(t => t.id === activeTab)!;
  const filtered = allAssets.filter(a => tab.filter(a) && a.name.toLowerCase().includes(search.toLowerCase()));

  const handleFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      const previewUrl = URL.createObjectURL(file);
      const type: AssetType = file.type.startsWith('audio/') ? 'audio' : 'image';
      const asset: AssetState = {
        id: uuid(),
        projectId: project?.id ?? '',
        name: file.name.replace(/\.[^.]+$/, ''),
        type,
        mimeType: file.type,
        fileSize: file.size,
        url: previewUrl,
        thumbnailUrl: null,
        tags: [],
        previewUrl,
        createdAt: new Date().toISOString(),
      };
      addAsset(asset);
    }
  }, [project, addAsset]);

  const handleDragStart = (e: React.DragEvent, assetId: string) => {
    e.dataTransfer.setData('application/gameforge-asset', assetId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center border-b shrink-0" style={{ height: 'var(--asset-tab-height)', borderColor: 'var(--color-border-default)', background: 'var(--color-bg-s1)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="relative flex items-center gap-1 px-3 text-xs h-full transition-colors duration-100"
            style={{ color: activeTab === t.id ? 'var(--color-text-p)' : 'var(--color-text-t)' }}
          >
            {t.icon}{t.label}
            {activeTab === t.id && (
              <motion.div
                layoutId="asset-tab-indicator"
                className="absolute bottom-0 inset-x-0 h-0.5"
                style={{ background: 'var(--color-accent)' }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </button>
        ))}
        {/* Search */}
        <div className="flex items-center gap-1 ml-auto mr-2 px-2 rounded" style={{ height: 24, background: 'var(--color-bg-s2)', border: '1px solid var(--color-border-default)' }}>
          <Search size={11} style={{ color: 'var(--color-text-t)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="bg-transparent outline-none text-xs w-24"
            style={{ color: 'var(--color-text-p)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: 'var(--color-text-t)' }}>
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Upload zone */}
      <UploadZone onFiles={handleFiles} />

      {/* Asset grid */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 gap-1" style={{ color: 'var(--color-text-t)' }}>
            <ImageIcon size={20} />
            <span className="text-xs">No assets yet</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            <AnimatePresence>
              {filtered.map(asset => (
                <AssetThumbnail
                  key={asset.id}
                  asset={asset}
                  onDragStart={handleDragStart}
                  onDelete={removeAsset}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
