'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { useEditorStore } from '@/store';

const FPS = 12;
const FRAME_W = 48;
const FRAME_H = 48;

interface AnimationDef {
  id: string;
  name: string;
  frameStart: number;
  frameEnd: number;
  loop: boolean;
  frameRate: number;
}

/* ---- Frame cell ---- */
function FrameCell({ index, src, selected, onClick }: {
  index: number; src?: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 relative rounded overflow-hidden border transition-all duration-100"
      style={{
        width: FRAME_W, height: FRAME_H,
        background: 'var(--color-bg-s3)',
        borderColor: selected ? 'var(--color-accent)' : 'var(--color-border-default)',
        boxShadow: selected ? '0 0 8px rgba(99,102,241,0.4)' : 'none',
      }}
    >
      {src ? (
        <img src={src} alt={`frame-${index}`} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
      ) : (
        <span className="text-2xs absolute bottom-0.5 right-1" style={{ color: 'var(--color-text-t)', fontFamily: 'var(--font-mono)' }}>
          {index}
        </span>
      )}
      <span
        className="absolute bottom-0 left-0 right-0 text-center"
        style={{ fontSize: 9, background: 'rgba(0,0,0,0.55)', color: 'var(--color-text-t)' }}
      >
        {index}
      </span>
    </button>
  );
}

/* ---- Animation row ---- */
function AnimRow({ anim, selected, frameCount, spriteUrl, onSelect, onDelete }: {
  anim: AnimationDef;
  selected: boolean;
  frameCount: number;
  spriteUrl?: string;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(anim.frameStart);
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const togglePlay = useCallback(() => {
    if (playing) {
      if (rafRef.current) clearTimeout(rafRef.current);
      setPlaying(false);
      setCurrentFrame(anim.frameStart);
    } else {
      setPlaying(true);
      let frame = anim.frameStart;
      const tick = () => {
        frame = frame >= anim.frameEnd ? (anim.loop ? anim.frameStart : anim.frameEnd) : frame + 1;
        setCurrentFrame(frame);
        if (frame < anim.frameEnd || anim.loop) {
          rafRef.current = setTimeout(tick, 1000 / anim.frameRate);
        } else {
          setPlaying(false);
        }
      };
      rafRef.current = setTimeout(tick, 1000 / anim.frameRate);
    }
  }, [playing, anim]);

  const frames = Array.from({ length: anim.frameEnd - anim.frameStart + 1 }, (_, i) => anim.frameStart + i);

  return (
    <div
      className="border-b"
      style={{ borderColor: 'var(--color-border-subtle)' }}
    >
      {/* Row header */}
      <div
        className="flex items-center gap-1 px-2 cursor-pointer select-none hover:bg-bg-s2 transition-colors duration-75"
        style={{
          height: 32,
          background: selected ? 'rgba(99,102,241,0.1)' : 'transparent',
          borderLeft: selected ? '2px solid var(--color-accent)' : '2px solid transparent',
        }}
        onClick={onSelect}
      >
        <button
          className="shrink-0 p-0.5 rounded hover:bg-bg-s3"
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
        >
          {expanded ? <ChevronDown size={11} style={{ color: 'var(--color-text-t)' }} /> : <ChevronRight size={11} style={{ color: 'var(--color-text-t)' }} />}
        </button>
        <span className="text-xs flex-1 truncate" style={{ color: 'var(--color-text-p)' }}>{anim.name}</span>
        <span className="text-2xs" style={{ color: 'var(--color-text-t)', fontFamily: 'var(--font-mono)' }}>
          {anim.frameStart}–{anim.frameEnd} @ {anim.frameRate}fps
        </span>
        <button
          className="shrink-0 p-0.5 rounded hover:bg-bg-s3 transition-colors"
          onClick={e => { e.stopPropagation(); togglePlay(); }}
        >
          {playing
            ? <Square size={11} style={{ color: 'var(--color-accent-c)' }} />
            : <Play size={11} style={{ color: 'var(--color-accent)' }} />}
        </button>
        <button
          className="shrink-0 p-0.5 rounded hover:bg-bg-s3 transition-colors opacity-0 group-hover:opacity-100"
          onClick={e => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 size={10} style={{ color: 'var(--color-danger)' }} />
        </button>
      </div>

      {/* Expanded frame strip */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto">
              {frames.map(fi => (
                <FrameCell
                  key={fi}
                  index={fi}
                  selected={playing && fi === currentFrame}
                  onClick={() => setCurrentFrame(fi)}
                />
              ))}
              {frames.length === 0 && (
                <span className="text-xs" style={{ color: 'var(--color-text-t)' }}>No frames in range</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---- Main panel ---- */
export function AnimationTimelinePanel() {
  const selectedIds = useEditorStore(s => s.selectedObjectIds);
  const activeSceneId = useEditorStore(s => s.activeSceneId);
  const project = useEditorStore(s => s.project);

  const [animations, setAnimations] = useState<AnimationDef[]>([]);
  const [selectedAnimId, setSelectedAnimId] = useState<string | null>(null);

  const selectedObj = project && activeSceneId
    ? Object.values(project.scenes[activeSceneId]?.objects ?? {}).find(o => selectedIds.includes(o.id))
    : null;

  const spriteUrl = selectedObj?.spriteData?.assetId
    ? project?.assets[selectedObj.spriteData.assetId]?.url
    : undefined;

  const addAnimation = useCallback(() => {
    const id = crypto.randomUUID();
    setAnimations(prev => [...prev, {
      id, name: `Anim ${prev.length + 1}`,
      frameStart: 0, frameEnd: FPS - 1,
      loop: true, frameRate: FPS,
    }]);
    setSelectedAnimId(id);
  }, []);

  const deleteAnimation = useCallback((id: string) => {
    setAnimations(prev => prev.filter(a => a.id !== id));
    setSelectedAnimId(prev => prev === id ? null : prev);
  }, []);

  const selectedAnim = animations.find(a => a.id === selectedAnimId);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-base)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 shrink-0"
        style={{ height: 36, borderBottom: '1px solid var(--color-border-default)' }}
      >
        <span className="text-2xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-t)' }}>
          Animations
        </span>
        {selectedObj && (
          <button
            onClick={addAnimation}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors hover:bg-bg-s2"
            style={{ color: 'var(--color-accent)' }}
          >
            <Plus size={11} /> New
          </button>
        )}
      </div>

      {!selectedObj ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2" style={{ color: 'var(--color-text-t)' }}>
          <span className="text-xs">Select a sprite object to edit animations</span>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* Animation list */}
          <div className="w-1/2 overflow-y-auto border-r" style={{ borderColor: 'var(--color-border-default)' }}>
            {animations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 gap-2" style={{ color: 'var(--color-text-t)' }}>
                <span className="text-xs">No animations</span>
                <button onClick={addAnimation} className="text-xs" style={{ color: 'var(--color-accent)' }}>+ Add one</button>
              </div>
            ) : (
              animations.map(anim => (
                <AnimRow
                  key={anim.id}
                  anim={anim}
                  selected={anim.id === selectedAnimId}
                  frameCount={anim.frameEnd - anim.frameStart + 1}
                  spriteUrl={spriteUrl}
                  onSelect={() => setSelectedAnimId(anim.id)}
                  onDelete={() => deleteAnimation(anim.id)}
                />
              ))
            )}
          </div>

          {/* Inspector for selected animation */}
          <div className="w-1/2 overflow-y-auto p-3">
            {selectedAnim ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-2xs uppercase tracking-widest block mb-1" style={{ color: 'var(--color-text-t)' }}>Name</label>
                  <input
                    value={selectedAnim.name}
                    onChange={e => setAnimations(prev => prev.map(a => a.id === selectedAnim.id ? { ...a, name: e.target.value } : a))}
                    className="w-full text-xs rounded px-2 outline-none"
                    style={{ height: 24, background: 'var(--color-bg-s3)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-p)', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['frameStart', 'frameEnd', 'frameRate'] as const).map(field => (
                    <div key={field}>
                      <label className="text-2xs uppercase tracking-widest block mb-1 capitalize" style={{ color: 'var(--color-text-t)' }}>
                        {field.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <input
                        type="number"
                        value={selectedAnim[field]}
                        onChange={e => setAnimations(prev => prev.map(a => a.id === selectedAnim.id ? { ...a, [field]: Number(e.target.value) } : a))}
                        className="w-full text-xs rounded px-2 outline-none"
                        style={{ height: 24, background: 'var(--color-bg-s3)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-p)', fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-2xs uppercase tracking-widest block mb-1" style={{ color: 'var(--color-text-t)' }}>Loop</label>
                    <button
                      onClick={() => setAnimations(prev => prev.map(a => a.id === selectedAnim.id ? { ...a, loop: !a.loop } : a))}
                      className="w-full text-xs rounded px-2 text-left transition-colors"
                      style={{
                        height: 24,
                        background: selectedAnim.loop ? 'rgba(99,102,241,0.2)' : 'var(--color-bg-s3)',
                        border: `1px solid ${selectedAnim.loop ? 'var(--color-accent)' : 'var(--color-border-default)'}`,
                        color: selectedAnim.loop ? 'var(--color-accent)' : 'var(--color-text-t)',
                      }}
                    >
                      {selectedAnim.loop ? 'Looping' : 'One-shot'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--color-text-t)' }}>Select an animation to edit</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
