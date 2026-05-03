import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  ProjectState, SceneState, GameObjectState, AssetState,
  ScriptGraph, EditorTool, EditorMode, Transform, PhysicsBody,
} from './types';
import { defaultProjectSettings, defaultTransform } from './types';
import { CommandManager } from '@/commands/CommandManager';
import { uuid } from '@/lib/uuid';

// ---- Store interface -----------------------------------------

export interface EditorStore {
  // ---- Project state ----
  project: ProjectState | null;
  activeSceneId: string;

  // ---- Editor UI state ----
  mode: EditorMode;
  activeTool: EditorTool;
  selectedObjectIds: string[];
  hoveredObjectId: string | null;
  clipboard: GameObjectState[] | null;
  gridEnabled: boolean;
  gridSize: number;
  snapEnabled: boolean;
  rulersEnabled: boolean;
  zoom: number;
  panX: number;
  panY: number;
  isSaving: boolean;
  isDirty: boolean;
  isPanelOpen: {
    hierarchy: boolean;
    properties: boolean;
    assets: boolean;
    scripting: boolean;
    timeline: boolean;
  };
  activeAssetTab: 'sprites' | 'audio' | 'animations' | 'scripts';

  // ---- Undo/Redo ----
  commandManager: CommandManager;
  canUndo: boolean;
  canRedo: boolean;

  // ---- Derived helpers (not state, but exposed for commands) ----
  getObject: (id: string) => GameObjectState | undefined;
  getActiveScene: () => SceneState | undefined;

  // ---- Project actions ----
  loadProject: (project: ProjectState) => void;
  setActiveScene: (sceneId: string) => void;

  // ---- Object mutations (called by commands, not UI directly) ----
  addObject: (obj: GameObjectState) => void;
  removeObject: (id: string) => void;
  updateObject: (id: string, patch: Partial<GameObjectState>) => void;
  updateObjectTransform: (id: string, patch: Partial<Transform>) => void;
  updateObjectPhysics: (id: string, patch: Partial<PhysicsBody>) => void;

  // ---- Editor UI actions ----
  setMode: (mode: EditorMode) => void;
  setActiveTool: (tool: EditorTool) => void;
  setSelectedObjects: (ids: string[]) => void;
  toggleObjectSelection: (id: string) => void;
  setHoveredObject: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setGridEnabled: (v: boolean) => void;
  setSnapEnabled: (v: boolean) => void;
  togglePanel: (panel: keyof EditorStore['isPanelOpen']) => void;
  setActiveAssetTab: (tab: EditorStore['activeAssetTab']) => void;
  setIsSaving: (v: boolean) => void;
  setIsDirty: (v: boolean) => void;

  // ---- Copy/Paste ----
  copySelected: () => void;
  paste: () => void;

  // ---- Asset actions ----
  addAsset: (asset: AssetState) => void;
  removeAsset: (id: string) => void;
  updateAsset: (id: string, patch: Partial<AssetState>) => void;

  // ---- Script actions ----
  addScript: (script: ScriptGraph) => void;
  updateScript: (id: string, patch: Partial<ScriptGraph>) => void;
  removeScript: (id: string) => void;

  // ---- Undo/Redo ----
  undo: () => void;
  redo: () => void;
  _refreshHistory: () => void;
}

// ---- Helpers ---------------------------------------------------

const emptyProject = (): ProjectState => ({
  id: uuid(),
  userId: '',
  name: 'Untitled Game',
  description: '',
  thumbnailUrl: null,
  slug: uuid(),
  status: 'draft',
  publishedAt: null,
  publishedUrl: null,
  settings: defaultProjectSettings(),
  sceneIds: [],
  scenes: {},
  assets: {},
  scripts: {},
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ---- Store creation --------------------------------------------

export const useEditorStore = create<EditorStore>()(
  subscribeWithSelector(
    immer((set, get) => {
      const commandManager = new CommandManager(100, () => get()._refreshHistory());

      return {
        // ---- Initial state ----
        project: null,
        activeSceneId: '',
        mode: 'editor',
        activeTool: 'select',
        selectedObjectIds: [],
        hoveredObjectId: null,
        clipboard: null,
        gridEnabled: true,
        gridSize: 16,
        snapEnabled: true,
        rulersEnabled: true,
        zoom: 1,
        panX: 0,
        panY: 0,
        isSaving: false,
        isDirty: false,
        isPanelOpen: {
          hierarchy: true,
          properties: true,
          assets: true,
          scripting: false,
          timeline: false,
        },
        activeAssetTab: 'sprites',
        commandManager,
        canUndo: false,
        canRedo: false,

        // ---- Derived helpers ----
        getObject(id) {
          const state = get();
          return state.project?.scenes[state.activeSceneId]?.objects[id];
        },
        getActiveScene() {
          const state = get();
          return state.project?.scenes[state.activeSceneId];
        },

        // ---- Project actions ----
        loadProject(project) {
          set(state => {
            state.project = project;
            state.activeSceneId = project.sceneIds[0] ?? '';
            state.isDirty = false;
          });
          commandManager.clear();
        },

        setActiveScene(sceneId) {
          set(state => {
            state.activeSceneId = sceneId;
            state.selectedObjectIds = [];
          });
        },

        // ---- Object mutations ----
        addObject(obj) {
          set(state => {
            if (!state.project) return;
            const scene = state.project.scenes[state.activeSceneId];
            if (!scene) return;
            scene.objects[obj.id] = obj;
            // Add to first layer if not specified
            const firstLayerId = scene.layerIds[0];
            if (firstLayerId && !obj.layerId) {
              obj.layerId = firstLayerId;
              scene.layers[firstLayerId]?.objectIds.push(obj.id);
            } else if (obj.layerId && scene.layers[obj.layerId]) {
              scene.layers[obj.layerId].objectIds.push(obj.id);
            }
            state.isDirty = true;
          });
        },

        removeObject(id) {
          set(state => {
            if (!state.project) return;
            const scene = state.project.scenes[state.activeSceneId];
            if (!scene) return;
            const obj = scene.objects[id];
            if (obj?.layerId && scene.layers[obj.layerId]) {
              const layer = scene.layers[obj.layerId];
              layer.objectIds = layer.objectIds.filter(oid => oid !== id);
            }
            delete scene.objects[id];
            state.selectedObjectIds = state.selectedObjectIds.filter(sid => sid !== id);
            state.isDirty = true;
          });
        },

        updateObject(id, patch) {
          set(state => {
            if (!state.project) return;
            const obj = state.project.scenes[state.activeSceneId]?.objects[id];
            if (obj) Object.assign(obj, patch);
            state.isDirty = true;
          });
        },

        updateObjectTransform(id, patch) {
          set(state => {
            if (!state.project) return;
            const obj = state.project.scenes[state.activeSceneId]?.objects[id];
            if (obj) Object.assign(obj.transform, patch);
            state.isDirty = true;
          });
        },

        updateObjectPhysics(id, patch) {
          set(state => {
            if (!state.project) return;
            const obj = state.project.scenes[state.activeSceneId]?.objects[id];
            if (obj) {
              if (!obj.physics) {
                obj.physics = {
                  enabled: true, bodyType: 'dynamic', shape: 'rectangle',
                  width: null, height: null, radius: null, vertices: null,
                  mass: 1, friction: 0.1, frictionAir: 0.01, restitution: 0,
                  isSensor: false, gravityScale: 1, offsetX: 0, offsetY: 0,
                  collisionCategory: 1, collisionMask: 0xFFFFFFFF,
                };
              }
              Object.assign(obj.physics, patch);
            }
            state.isDirty = true;
          });
        },

        // ---- Editor UI ----
        setMode(mode) {
          set(state => { state.mode = mode; });
        },

        setActiveTool(tool) {
          set(state => { state.activeTool = tool; });
        },

        setSelectedObjects(ids) {
          set(state => { state.selectedObjectIds = ids; });
        },

        toggleObjectSelection(id) {
          set(state => {
            const idx = state.selectedObjectIds.indexOf(id);
            if (idx >= 0) state.selectedObjectIds.splice(idx, 1);
            else state.selectedObjectIds.push(id);
          });
        },

        setHoveredObject(id) {
          set(state => { state.hoveredObjectId = id; });
        },

        setZoom(zoom) {
          set(state => { state.zoom = Math.min(Math.max(zoom, 0.1), 4); });
        },

        setPan(x, y) {
          set(state => { state.panX = x; state.panY = y; });
        },

        setGridEnabled(v) { set(state => { state.gridEnabled = v; }); },
        setSnapEnabled(v) { set(state => { state.snapEnabled = v; }); },

        togglePanel(panel) {
          set(state => {
            state.isPanelOpen[panel] = !state.isPanelOpen[panel];
          });
        },

        setActiveAssetTab(tab) { set(state => { state.activeAssetTab = tab; }); },
        setIsSaving(v) { set(state => { state.isSaving = v; }); },
        setIsDirty(v) { set(state => { state.isDirty = v; }); },

        copySelected() {
          const { selectedObjectIds, project, activeSceneId } = get();
          if (!project || selectedObjectIds.length === 0) return;
          const scene = project.scenes[activeSceneId];
          if (!scene) return;
          const copies = selectedObjectIds
            .map(id => scene.objects[id])
            .filter(Boolean)
            .map(obj => structuredClone(obj!));
          set(state => { state.clipboard = copies; });
        },

        paste() {
          const { clipboard } = get();
          if (!clipboard || clipboard.length === 0) return;
          const newIds: string[] = [];
          clipboard.forEach(obj => {
            const newObj: GameObjectState = {
              ...structuredClone(obj),
              id: uuid(),
              name: `${obj.name} (copy)`,
              transform: { ...obj.transform, x: obj.transform.x + 20, y: obj.transform.y + 20 },
            };
            get().addObject(newObj);
            newIds.push(newObj.id);
          });
          get().setSelectedObjects(newIds);
        },

        // ---- Asset actions ----
        addAsset(asset) {
          set(state => {
            if (!state.project) return;
            state.project.assets[asset.id] = asset;
          });
        },

        removeAsset(id) {
          set(state => {
            if (!state.project) return;
            delete state.project.assets[id];
          });
        },

        updateAsset(id, patch) {
          set(state => {
            if (!state.project) return;
            const asset = state.project.assets[id];
            if (asset) Object.assign(asset, patch);
          });
        },

        // ---- Script actions ----
        addScript(script) {
          set(state => {
            if (!state.project) return;
            state.project.scripts[script.id] = script;
          });
        },

        updateScript(id, patch) {
          set(state => {
            if (!state.project) return;
            const script = state.project.scripts[id];
            if (script) Object.assign(script, patch);
          });
        },

        removeScript(id) {
          set(state => {
            if (!state.project) return;
            delete state.project.scripts[id];
          });
        },

        // ---- Undo/Redo ----
        undo() { commandManager.undo(); },
        redo() { commandManager.redo(); },

        _refreshHistory() {
          set(state => {
            state.canUndo = commandManager.canUndo();
            state.canRedo = commandManager.canRedo();
          });
        },
      };
    })
  )
);

// Helper to create a default scene with one layer
export function createDefaultScene(name: string, index: number): SceneState {
  const layerId = uuid();
  return {
    id: uuid(),
    name,
    index,
    backgroundColor: '#1a1a2e',
    width: 960,
    height: 540,
    gravity: { x: 0, y: 300 },
    camera: { scrollX: 0, scrollY: 0, zoom: 1, followTarget: null, bounds: null },
    layerIds: [layerId],
    layers: {
      [layerId]: { id: layerId, name: 'Layer 1', index: 0, visible: true, locked: false, opacity: 1, objectIds: [] },
    },
    objects: {},
  };
}

// Helper to create a new game object at a position
export function createGameObject(
  type: GameObjectState['type'],
  name: string,
  x: number,
  y: number,
  layerId: string,
): GameObjectState {
  return {
    id: uuid(),
    name,
    type,
    layerId,
    parentId: null,
    visible: true,
    locked: false,
    active: true,
    tags: [],
    transform: { ...defaultTransform(), x, y },
    physics: null,
    spriteData: type === 'sprite' ? {
      assetId: '', frameKey: null, tint: '#ffffff', alpha: 1,
      flipX: false, flipY: false, blendMode: 'NORMAL',
      currentAnimation: null, animations: [],
    } : null,
    textData: type === 'text' ? {
      content: 'Text', fontFamily: 'Arial', fontSize: 24, color: '#ffffff',
      bold: false, italic: false, align: 'left', wordWrap: false, wordWrapWidth: 200,
      stroke: null, strokeThickness: 0,
    } : null,
    shapeData: (type === 'rectangle' || type === 'circle') ? {
      fillColor: '#6366F1', fillAlpha: 1,
      strokeColor: '#818CF8', strokeWidth: 2, strokeAlpha: 1,
      radius: type === 'circle' ? 32 : null,
    } : null,
    audioData: type === 'audio' ? {
      assetId: '', autoplay: false, loop: false, volume: 1, rate: 1, spatial: false, maxDistance: 500,
    } : null,
    scriptIds: [],
  };
}
