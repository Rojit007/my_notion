'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, Eye, EyeOff, Lock, Unlock, MoreHorizontal,
  Plus, ImageIcon, Volume2, Camera, Type, Layers, Box,
} from 'lucide-react';
import { useEditorStore, createGameObject } from '@/store';
import { AddObjectCommand } from '@/commands/AddObjectCommand';
import type { GameObjectState, GameObjectType } from '@/store/types';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

function ObjectTypeIcon({ type }: { type: GameObjectType }) {
  const icons: Record<GameObjectType, React.ReactNode> = {
    sprite:    <ImageIcon size={12} />,
    audio:     <Volume2 size={12} />,
    text:      <Type size={12} />,
    rectangle: <Box size={12} />,
    circle:    <Box size={12} />,
    group:     <Layers size={12} />,
    zone:      <Box size={12} />,
    tilemap:   <Layers size={12} />,
  };
  const colors: Record<GameObjectType, string> = {
    sprite: 'var(--color-obj-sprite)', audio: 'var(--color-obj-audio)',
    text: 'var(--color-text-s)', rectangle: 'var(--color-obj-physics)',
    circle: 'var(--color-obj-physics)', group: 'var(--color-text-t)',
    zone: 'var(--color-accent-c)', tilemap: 'var(--color-obj-script)',
  };
  return <span style={{ color: colors[type] ?? 'var(--color-text-t)' }}>{icons[type]}</span>;
}

function HierarchyRow({
  obj, depth, isSelected, onSelect, onToggleVisible, onToggleLock,
}: {
  obj: GameObjectState; depth: number; isSelected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onToggleVisible: (id: string) => void;
  onToggleLock: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
      className="flex items-center gap-1 cursor-pointer select-none relative group"
      style={{
        height: 'var(--hierarchy-row-height)',
        paddingLeft: `${12 + depth * 16}px`,
        paddingRight: '8px',
        background: isSelected ? 'var(--color-bg-s3)' : hovered ? 'var(--color-bg-s2)' : 'transparent',
        borderLeft: isSelected ? '2.5px solid var(--color-accent)' : '2.5px solid transparent',
        transition: 'background 100ms ease, border-color 100ms ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={e => onSelect(obj.id, e.shiftKey || e.metaKey || e.ctrlKey)}
    >
      {/* Chevron placeholder */}
      <span className="w-3 shrink-0" style={{ color: 'var(--color-text-t)' }}>
        <ChevronRight size={10} />
      </span>

      {/* Type icon */}
      <span className="shrink-0">
        <ObjectTypeIcon type={obj.type} />
      </span>

      {/* Name */}
      <span
        className="flex-1 truncate text-xs ml-1"
        style={{
          color: obj.visible ? (isSelected ? 'var(--color-text-p)' : 'var(--color-text-s)') : 'var(--color-text-t)',
          fontStyle: !obj.visible ? 'italic' : 'normal',
          fontWeight: isSelected ? 500 : 400,
        }}
      >
        {obj.name}
      </span>

      {/* Action icons — visible on hover */}
      <div
        className="flex items-center gap-0.5 shrink-0"
        style={{ opacity: hovered || isSelected ? 1 : 0, transition: 'opacity 120ms ease' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          className="p-0.5 rounded transition-colors duration-100 hover:text-text-p"
          style={{ color: 'var(--color-text-t)' }}
          onClick={() => onToggleVisible(obj.id)}
          title={obj.visible ? 'Hide' : 'Show'}
        >
          {obj.visible ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>
        <button
          className="p-0.5 rounded transition-colors duration-100 hover:text-text-p"
          style={{ color: 'var(--color-text-t)' }}
          onClick={() => onToggleLock(obj.id)}
          title={obj.locked ? 'Unlock' : 'Lock'}
        >
          {obj.locked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>
      </div>
    </motion.div>
  );
}

const ADD_OBJECT_TYPES: { type: GameObjectType; label: string }[] = [
  { type: 'sprite',    label: 'Sprite' },
  { type: 'rectangle', label: 'Rectangle' },
  { type: 'circle',    label: 'Circle' },
  { type: 'text',      label: 'Text' },
  { type: 'zone',      label: 'Zone (Trigger)' },
  { type: 'audio',     label: 'Audio Source' },
];

export function SceneHierarchyPanel() {
  const project = useEditorStore(s => s.project);
  const activeSceneId = useEditorStore(s => s.activeSceneId);
  const selectedObjectIds = useEditorStore(s => s.selectedObjectIds);
  const commandManager = useEditorStore(s => s.commandManager);
  const store = useEditorStore();

  const scene = project?.scenes[activeSceneId];
  const objects = scene ? Object.values(scene.objects) : [];

  const handleSelect = (id: string, multi: boolean) => {
    if (multi) store.toggleObjectSelection(id);
    else store.setSelectedObjects([id]);
  };

  const handleToggleVisible = (id: string) => {
    const obj = store.getObject(id);
    if (obj) store.updateObject(id, { visible: !obj.visible });
  };

  const handleToggleLock = (id: string) => {
    const obj = store.getObject(id);
    if (obj) store.updateObject(id, { locked: !obj.locked });
  };

  const handleAddObject = (type: GameObjectType) => {
    const layerId = scene?.layerIds[0] ?? '';
    const count = objects.filter(o => o.type === type).length + 1;
    const newObj = createGameObject(type, `${type} ${count}`, 0, 0, layerId);
    commandManager.execute({ type: 'ADD_OBJECT', execute: () => store.addObject(newObj), undo: () => store.removeObject(newObj.id) });
    store.setSelectedObjects([newObj.id]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="panel-header flex items-center justify-between px-3" style={{ height: 36, flexShrink: 0 }}>
        <span className="text-2xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-t)' }}>
          Hierarchy
        </span>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex items-center justify-center w-5 h-5 rounded transition-colors duration-100 hover:text-text-p"
              style={{ color: 'var(--color-text-t)' }}
            >
              <Plus size={13} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="glass-strong rounded-lg py-1 min-w-40"
              style={{ zIndex: 'var(--z-dropdown)', boxShadow: 'var(--shadow-glass)' }}
              sideOffset={4}
              align="end"
            >
              {ADD_OBJECT_TYPES.map(({ type, label }) => (
                <DropdownMenu.Item
                  key={type}
                  className="flex items-center gap-2 px-3 text-sm cursor-pointer outline-none transition-colors duration-100"
                  style={{ height: 28, color: 'var(--color-text-s)' }}
                  onSelect={() => handleAddObject(type)}
                >
                  <ObjectTypeIcon type={type} />
                  {label}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Scene name */}
      <div className="px-3 py-1 border-b" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-s1)' }}>
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-s)' }}>
          {scene?.name ?? 'No Scene'}
        </span>
      </div>

      {/* Object list */}
      <div className="flex-1 overflow-y-auto">
        {objects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2" style={{ color: 'var(--color-text-t)' }}>
            <Layers size={24} />
            <span className="text-xs">No objects yet</span>
            <span className="text-2xs">Click + to add one</span>
          </div>
        ) : (
          <AnimatePresence>
            {objects.map(obj => (
              <HierarchyRow
                key={obj.id}
                obj={obj}
                depth={0}
                isSelected={selectedObjectIds.includes(obj.id)}
                onSelect={handleSelect}
                onToggleVisible={handleToggleVisible}
                onToggleLock={handleToggleLock}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
