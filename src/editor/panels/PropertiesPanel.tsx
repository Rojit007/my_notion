'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Zap, Box, ImageIcon, Code2 } from 'lucide-react';
import { useEditorStore } from '@/store';
import { ModifyPropertyCommand } from '@/commands/ModifyPropertyCommand';
import type { GameObjectState, PhysicsBody, BodyShape } from '@/store/types';

/* ---- Reusable property row ---- */
function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3" style={{ minHeight: 'var(--property-row-height)' }}>
      <span
        className="text-2xs font-medium uppercase tracking-wider shrink-0"
        style={{ width: 'var(--property-label-width)', color: 'var(--color-text-t)' }}
      >
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/* ---- Number scrub input ---- */
function NumInput({
  value, onChange, step = 1, suffix,
}: {
  value: number; onChange: (v: number) => void; step?: number; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1 flex-1">
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        step={step}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full text-xs rounded px-2 outline-none transition-all duration-100"
        style={{
          height: 24, background: 'var(--color-bg-s2)',
          border: '1px solid var(--color-border-default)',
          color: 'var(--color-text-p)', fontFamily: 'var(--font-mono)',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
        onBlur={e => (e.target.style.borderColor = 'var(--color-border-default)')}
      />
      {suffix && <span className="text-2xs" style={{ color: 'var(--color-text-t)' }}>{suffix}</span>}
    </div>
  );
}

/* ---- XY pair input ---- */
function XYInput({ x, y, onChangeX, onChangeY }: { x: number; y: number; onChangeX: (v: number) => void; onChangeY: (v: number) => void }) {
  return (
    <div className="flex gap-1 flex-1">
      <div className="flex items-center gap-1 flex-1">
        <span className="text-2xs font-bold" style={{ color: '#EF4444', width: 10 }}>X</span>
        <NumInput value={x} onChange={onChangeX} />
      </div>
      <div className="flex items-center gap-1 flex-1">
        <span className="text-2xs font-bold" style={{ color: '#10B981', width: 10 }}>Y</span>
        <NumInput value={y} onChange={onChangeY} />
      </div>
    </div>
  );
}

/* ---- Collapsible section ---- */
function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
      <button
        className="flex items-center gap-2 w-full px-3 text-left transition-colors duration-100"
        style={{ height: 32, background: 'var(--color-bg-s2)' }}
        onClick={() => setOpen(o => !o)}
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: 'var(--color-text-t)', display: 'flex' }}
        >
          <ChevronRight size={12} />
        </motion.span>
        <span style={{ color: 'var(--color-text-t)' }}>{icon}</span>
        <span className="text-2xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-t)' }}>
          {title}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="py-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---- Toggle switch ---- */
function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <PropRow label={label}>
      <button
        onClick={() => onChange(!value)}
        className="relative flex items-center w-8 h-4 rounded-full transition-colors duration-200"
        style={{ background: value ? 'var(--color-accent)' : 'var(--color-bg-s4)', boxShadow: value ? '0 0 8px var(--color-accent-glow)' : 'none' }}
      >
        <motion.div
          animate={{ x: value ? 16 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute w-3 h-3 rounded-full bg-white"
        />
      </button>
    </PropRow>
  );
}

/* ---- Physics body shape visualiser ---- */
function PhysicsBodyEditor({ physics, onChange }: { physics: PhysicsBody; onChange: (p: Partial<PhysicsBody>) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const SIZE = 120;
  const SHAPE_OPTIONS: BodyShape[] = ['rectangle', 'circle', 'polygon'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const pad = 16;
    const w = physics.width ?? SIZE - pad * 2;
    const h = physics.height ?? SIZE - pad * 2;
    const r = physics.radius ?? (SIZE - pad * 2) / 2;

    // Background
    ctx.fillStyle = '#0D1020';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Grid dots
    ctx.fillStyle = 'rgba(99,102,241,0.12)';
    for (let gx = 8; gx < SIZE; gx += 12)
      for (let gy = 8; gy < SIZE; gy += 12)
        ctx.fillRect(gx, gy, 1.5, 1.5);

    const isSensor = physics.isSensor;
    const bodyColor = isSensor ? 'rgba(34,211,238,0.25)' : 'rgba(99,102,241,0.25)';
    const strokeColor = isSensor ? '#22D3EE' : '#6366F1';

    ctx.save();
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash(isSensor ? [4, 3] : []);

    if (physics.shape === 'circle') {
      const scaledR = Math.min(r / 2, (SIZE - pad * 2) / 2);
      ctx.beginPath();
      ctx.arc(cx, cy, scaledR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // crosshair
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = `${strokeColor}60`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - scaledR, cy); ctx.lineTo(cx + scaledR, cy);
      ctx.moveTo(cx, cy - scaledR); ctx.lineTo(cx, cy + scaledR);
      ctx.stroke();
    } else if (physics.shape === 'rectangle') {
      const scaledW = Math.min(w, SIZE - pad * 2);
      const scaledH = Math.min(h, SIZE - pad * 2);
      ctx.beginPath();
      ctx.roundRect(cx - scaledW / 2, cy - scaledH / 2, scaledW, scaledH, 3);
      ctx.fill();
      ctx.stroke();
    } else {
      // Triangle for polygon
      const side = Math.min(SIZE - pad * 2, 72);
      const th = (Math.sqrt(3) / 2) * side;
      ctx.beginPath();
      ctx.moveTo(cx, cy - th / 2);
      ctx.lineTo(cx + side / 2, cy + th / 2);
      ctx.lineTo(cx - side / 2, cy + th / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Body type badge
    ctx.restore();
    ctx.fillStyle = strokeColor;
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.fillText(physics.bodyType, 6, SIZE - 6);
  }, [physics]);

  return (
    <div className="px-3 pb-2 space-y-2">
      {/* Shape picker */}
      <div className="flex gap-1">
        {SHAPE_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => onChange({ shape: s })}
            className="flex-1 text-2xs py-1 rounded transition-all capitalize"
            style={{
              background: physics.shape === s ? 'var(--color-accent)' : 'var(--color-bg-s3)',
              color: physics.shape === s ? '#fff' : 'var(--color-text-t)',
              border: `1px solid ${physics.shape === s ? 'var(--color-accent)' : 'var(--color-border-default)'}`,
              boxShadow: physics.shape === s ? '0 0 8px rgba(99,102,241,0.4)' : 'none',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Visual preview */}
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="w-full rounded-lg"
        style={{ border: '1px solid var(--color-border-default)', imageRendering: 'pixelated', aspectRatio: '1/1' }}
      />

      {/* Shape-specific dims */}
      {physics.shape === 'rectangle' && (
        <div className="flex gap-1">
          <div className="flex-1">
            <p className="text-2xs mb-0.5" style={{ color: 'var(--color-text-t)' }}>W</p>
            <NumInput value={physics.width ?? 64} onChange={v => onChange({ width: v })} />
          </div>
          <div className="flex-1">
            <p className="text-2xs mb-0.5" style={{ color: 'var(--color-text-t)' }}>H</p>
            <NumInput value={physics.height ?? 64} onChange={v => onChange({ height: v })} />
          </div>
        </div>
      )}
      {physics.shape === 'circle' && (
        <div>
          <p className="text-2xs mb-0.5" style={{ color: 'var(--color-text-t)' }}>Radius</p>
          <NumInput value={physics.radius ?? 32} onChange={v => onChange({ radius: v })} />
        </div>
      )}

      {/* Offset */}
      <div className="flex gap-1">
        <div className="flex-1">
          <p className="text-2xs mb-0.5" style={{ color: 'var(--color-text-t)' }}>Offset X</p>
          <NumInput value={physics.offsetX} onChange={v => onChange({ offsetX: v })} />
        </div>
        <div className="flex-1">
          <p className="text-2xs mb-0.5" style={{ color: 'var(--color-text-t)' }}>Offset Y</p>
          <NumInput value={physics.offsetY} onChange={v => onChange({ offsetY: v })} />
        </div>
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const selectedObjectIds = useEditorStore(s => s.selectedObjectIds);
  const project = useEditorStore(s => s.project);
  const activeSceneId = useEditorStore(s => s.activeSceneId);
  const commandManager = useEditorStore(s => s.commandManager);
  const store = useEditorStore();

  const selectedId = selectedObjectIds[0];
  const obj = selectedId ? project?.scenes[activeSceneId]?.objects[selectedId] : null;

  const commit = useCallback(<T extends Partial<GameObjectState>>(patch: T) => {
    if (!selectedId) return;
    commandManager.execute(new ModifyPropertyCommand(store, selectedId, patch));
  }, [selectedId, commandManager, store]);

  const updateTransform = useCallback((field: string, value: number) => {
    if (!selectedId) return;
    store.updateObjectTransform(selectedId, { [field]: value });
  }, [selectedId, store]);

  const updatePhysics = useCallback((patch: Partial<PhysicsBody>) => {
    if (!selectedId) return;
    store.updateObjectPhysics(selectedId, patch);
  }, [selectedId, store]);

  if (!obj) {
    return (
      <div className="flex flex-col h-full">
        <div className="panel-header flex items-center px-3" style={{ height: 36, flexShrink: 0 }}>
          <span className="text-2xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-t)' }}>
            Properties
          </span>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-2" style={{ color: 'var(--color-text-t)' }}>
          <Box size={28} />
          <span className="text-xs">Select an object</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="panel-header flex items-center justify-between px-3" style={{ height: 36, flexShrink: 0 }}>
        <span className="text-xs font-medium truncate" style={{ color: 'var(--color-text-p)' }}>
          {obj.name}
        </span>
        <span
          className="text-2xs px-1.5 py-0.5 rounded"
          style={{
            background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)',
            border: '1px solid rgba(99,102,241,0.3)',
          }}
        >
          {obj.type}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Transform */}
        <Section title="Transform" icon={<Box size={11} />}>
          <PropRow label="Position">
            <XYInput
              x={obj.transform.x} y={obj.transform.y}
              onChangeX={v => updateTransform('x', v)}
              onChangeY={v => updateTransform('y', v)}
            />
          </PropRow>
          <PropRow label="Scale">
            <XYInput
              x={obj.transform.scaleX} y={obj.transform.scaleY}
              onChangeX={v => updateTransform('scaleX', v)}
              onChangeY={v => updateTransform('scaleY', v)}
            />
          </PropRow>
          <PropRow label="Rotation">
            <NumInput value={obj.transform.rotation * (180 / Math.PI)} onChange={v => updateTransform('rotation', v * (Math.PI / 180))} suffix="°" />
          </PropRow>
          <PropRow label="Depth">
            <NumInput value={obj.transform.depth} onChange={v => updateTransform('depth', v)} step={1} />
          </PropRow>
        </Section>

        {/* Renderer */}
        {obj.spriteData && (
          <Section title="Renderer" icon={<ImageIcon size={11} />}>
            <PropRow label="Alpha">
              <NumInput value={obj.spriteData.alpha} onChange={v => store.updateObject(obj.id, { spriteData: { ...obj.spriteData!, alpha: Math.min(1, Math.max(0, v)) } })} step={0.05} />
            </PropRow>
            <PropRow label="Flip X">
              <Toggle value={obj.spriteData.flipX} onChange={v => store.updateObject(obj.id, { spriteData: { ...obj.spriteData!, flipX: v } })} label="Flip X" />
            </PropRow>
            <PropRow label="Flip Y">
              <Toggle value={obj.spriteData.flipY} onChange={v => store.updateObject(obj.id, { spriteData: { ...obj.spriteData!, flipY: v } })} label="Flip Y" />
            </PropRow>
          </Section>
        )}

        {/* Physics */}
        <Section title="Physics" icon={<Zap size={11} />} defaultOpen={false}>
          <Toggle
            label="Enabled"
            value={obj.physics?.enabled ?? false}
            onChange={v => updatePhysics({ enabled: v })}
          />
          {obj.physics?.enabled && (
            <>
              <PropRow label="Body type">
                <select
                  value={obj.physics.bodyType}
                  onChange={e => updatePhysics({ bodyType: e.target.value as PhysicsBody['bodyType'] })}
                  className="w-full text-xs rounded px-2 outline-none"
                  style={{ height: 24, background: 'var(--color-bg-s2)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-p)' }}
                >
                  <option value="dynamic">Dynamic</option>
                  <option value="static">Static</option>
                  <option value="sensor">Sensor</option>
                </select>
              </PropRow>

              {/* Visual body shape editor */}
              <PhysicsBodyEditor physics={obj.physics} onChange={updatePhysics} />

              <PropRow label="Mass"><NumInput value={obj.physics.mass} onChange={v => updatePhysics({ mass: v })} step={0.1} /></PropRow>
              <PropRow label="Friction"><NumInput value={obj.physics.friction} onChange={v => updatePhysics({ friction: v })} step={0.01} /></PropRow>
              <PropRow label="Air fric."><NumInput value={obj.physics.frictionAir} onChange={v => updatePhysics({ frictionAir: v })} step={0.005} /></PropRow>
              <PropRow label="Bounce"><NumInput value={obj.physics.restitution} onChange={v => updatePhysics({ restitution: Math.min(1, Math.max(0, v)) })} step={0.05} /></PropRow>
              <PropRow label="Grav. scale"><NumInput value={obj.physics.gravityScale} onChange={v => updatePhysics({ gravityScale: v })} step={0.1} /></PropRow>
              <Toggle label="Sensor" value={obj.physics.isSensor} onChange={v => updatePhysics({ isSensor: v })} />
            </>
          )}
        </Section>

        {/* Scripts attached */}
        <Section title="Scripts" icon={<Code2 size={11} />} defaultOpen={false}>
          {obj.scriptIds.length === 0 ? (
            <div className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-t)' }}>
              No scripts attached
            </div>
          ) : (
            obj.scriptIds.map(sid => (
              <div key={sid} className="flex items-center gap-2 px-3 py-1">
                <Code2 size={11} style={{ color: 'var(--color-obj-script)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-s)', fontFamily: 'var(--font-mono)' }}>
                  {project?.scripts[sid]?.name ?? sid}
                </span>
              </div>
            ))
          )}
          <button
            className="flex items-center gap-1 mx-3 my-1 px-2 text-xs rounded transition-colors duration-100"
            style={{ height: 24, color: 'var(--color-accent-light)', border: '1px dashed rgba(99,102,241,0.4)' }}
          >
            + Attach Script
          </button>
        </Section>
      </div>
    </div>
  );
}
