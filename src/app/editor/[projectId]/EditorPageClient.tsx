'use client';

import { useEffect } from 'react';
import { useEditorStore, createDefaultScene } from '@/store';
import { EditorShell } from '@/editor/EditorShell';
import { trpc } from '@/lib/trpc/client';
import type { ProjectState } from '@/store/types';
import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';

function EditorLoader({ projectId }: { projectId: string }) {
  const loadProject = useEditorStore(s => s.loadProject);
  const project = useEditorStore(s => s.project);

  const { data, isLoading, error } = trpc.project.get.useQuery({ id: projectId });

  useEffect(() => {
    if (!data) return;

    // Convert DB record → in-memory ProjectState
    const scenes: ProjectState['scenes'] = {};
    const sceneIds: string[] = [];

    for (const dbScene of data.scenes) {
      const sceneData = dbScene.data as Record<string, unknown>;
      const defaultScene = createDefaultScene(dbScene.name, dbScene.index);

      const scene = {
        ...defaultScene,
        id: dbScene.id,
        name: dbScene.name,
        index: dbScene.index,
        ...(sceneData ?? {}),
      };

      // Hydrate game objects from DB rows
      for (const dbObj of dbScene.gameObjects) {
        const objData = dbObj.data as Record<string, unknown>;
        scene.objects[dbObj.id] = {
          id: dbObj.id,
          name: dbObj.name,
          type: dbObj.type as 'sprite',
          layerId: scene.layerIds[0] ?? '',
          parentId: null,
          visible: true,
          locked: false,
          active: true,
          tags: [],
          physics: null,
          spriteData: null,
          textData: null,
          shapeData: null,
          audioData: null,
          scriptIds: [],
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, originX: 0.5, originY: 0.5, depth: 0 },
          ...(objData ?? {}),
        };
        // Add to layer
        if (scene.layers[scene.layerIds[0] ?? '']) {
          const layerId = scene.layerIds[0]!;
          if (!scene.layers[layerId].objectIds.includes(dbObj.id)) {
            scene.layers[layerId].objectIds.push(dbObj.id);
          }
        }
      }

      scenes[dbScene.id] = scene;
      sceneIds.push(dbScene.id);
    }

    // Assets
    const assets: ProjectState['assets'] = {};
    for (const a of data.assets) {
      assets[a.id] = {
        id: a.id, projectId: a.projectId, name: a.name,
        type: a.type as 'image', mimeType: a.mimeType, fileSize: a.fileSize,
        url: a.url, thumbnailUrl: a.thumbnailUrl, tags: a.tags,
        createdAt: a.createdAt.toISOString(),
        ...(a.meta as object ?? {}),
      };
    }

    // Scripts
    const scripts: ProjectState['scripts'] = {};
    for (const s of data.scripts) {
      const sd = s.data as Record<string, unknown>;
      scripts[s.id] = {
        id: s.id, projectId: s.projectId, name: s.name,
        blocks: (sd?.blocks as Record<string, unknown> ?? {}) as ProjectState['scripts'][string]['blocks'],
        wires: (sd?.wires as unknown[] ?? []) as ProjectState['scripts'][string]['wires'],
        variables: (sd?.variables as unknown[] ?? []) as ProjectState['scripts'][string]['variables'],
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      };
    }

    const projectState: ProjectState = {
      id: data.id,
      userId: data.userId,
      name: data.name,
      description: data.description ?? '',
      thumbnailUrl: data.thumbnailUrl,
      slug: data.slug,
      status: data.status as 'draft',
      publishedAt: data.publishedAt?.toISOString() ?? null,
      publishedUrl: data.publishedUrl,
      settings: (data.settings as unknown as ProjectState['settings']) ?? {
        canvasWidth: 960, canvasHeight: 540, targetFPS: 60,
        backgroundColor: '#1a1a2e', defaultStartScene: sceneIds[0] ?? null,
        physics: { enabled: true, gravity: { x: 0, y: 300 }, debug: false },
      },
      sceneIds,
      scenes,
      assets,
      scripts,
      version: 1,
      createdAt: data.createdAt.toISOString(),
      updatedAt: data.updatedAt.toISOString(),
    };

    loadProject(projectState);
  }, [data, loadProject]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" style={{ background: 'var(--color-bg-base)' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Gamepad2 size={48} style={{ color: 'var(--color-accent)' }} />
        </motion.div>
        <p className="text-sm" style={{ color: 'var(--color-text-s)' }}>Loading project…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3" style={{ background: 'var(--color-bg-base)' }}>
        <p className="text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load project</p>
        <p className="text-xs" style={{ color: 'var(--color-text-t)' }}>{error.message}</p>
      </div>
    );
  }

  if (!project) return null;

  return <EditorShell projectId={projectId} />;
}

export function EditorPageClient({ projectId }: { projectId: string }) {
  return <EditorLoader projectId={projectId} />;
}
