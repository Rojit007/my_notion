// ============================================================
// GameForge Studio — Complete TypeScript Interfaces
// This file is the contract between all modules.
// ============================================================

// ---- Primitives ------------------------------------------------

export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---- Transform -------------------------------------------------

export interface Transform {
  x: number;
  y: number;
  rotation: number; // radians
  scaleX: number;
  scaleY: number;
  originX: number; // 0-1 pivot
  originY: number;
  depth: number;   // within layer z-ordering
}

export const defaultTransform = (): Transform => ({
  x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
  originX: 0.5, originY: 0.5, depth: 0,
});

// ---- Physics ---------------------------------------------------

export type BodyShape = 'rectangle' | 'circle' | 'polygon';
export type BodyType  = 'dynamic' | 'static' | 'sensor';

export interface PhysicsBody {
  enabled: boolean;
  bodyType: BodyType;
  shape: BodyShape;
  width: number | null;
  height: number | null;
  radius: number | null;
  vertices: Vector2[] | null;
  mass: number;
  friction: number;
  frictionAir: number;
  restitution: number;
  isSensor: boolean;
  gravityScale: number;
  offsetX: number;
  offsetY: number;
  collisionCategory: number;
  collisionMask: number;
}

export const defaultPhysicsBody = (): PhysicsBody => ({
  enabled: false, bodyType: 'dynamic', shape: 'rectangle',
  width: null, height: null, radius: null, vertices: null,
  mass: 1, friction: 0.1, frictionAir: 0.01, restitution: 0,
  isSensor: false, gravityScale: 1,
  offsetX: 0, offsetY: 0,
  collisionCategory: 1, collisionMask: 0xFFFFFFFF,
});

// ---- Sprite Data -----------------------------------------------

export type BlendMode = 'NORMAL' | 'ADD' | 'MULTIPLY' | 'SCREEN';

export interface AnimationClip {
  id: string;
  name: string;
  assetId: string;
  frames: (string | number)[];
  frameRate: number;
  repeat: number; // -1 = infinite
  yoyo: boolean;
}

export interface SpriteData {
  assetId: string;
  frameKey: string | number | null;
  tint: string;
  alpha: number;
  flipX: boolean;
  flipY: boolean;
  blendMode: BlendMode;
  currentAnimation: string | null; // AnimationClip.id
  animations: AnimationClip[];
}

// ---- Text Data -------------------------------------------------

export interface TextData {
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  wordWrap: boolean;
  wordWrapWidth: number;
  stroke: string | null;
  strokeThickness: number;
}

// ---- Shape Data ------------------------------------------------

export interface ShapeData {
  fillColor: string;
  fillAlpha: number;
  strokeColor: string;
  strokeWidth: number;
  strokeAlpha: number;
  // For rectangles: width/height from transform; circle uses radius
  radius: number | null;
}

// ---- Audio Data ------------------------------------------------

export interface AudioData {
  assetId: string;
  autoplay: boolean;
  loop: boolean;
  volume: number;
  rate: number;
  spatial: boolean;
  maxDistance: number;
}

// ---- Game Object -----------------------------------------------

export type GameObjectType =
  | 'sprite'
  | 'rectangle'
  | 'circle'
  | 'text'
  | 'audio'
  | 'group'
  | 'zone'
  | 'tilemap';

export interface GameObjectState {
  id: string;
  name: string;
  type: GameObjectType;
  layerId: string;
  parentId: string | null;
  visible: boolean;
  locked: boolean;
  active: boolean;
  tags: string[];
  transform: Transform;
  physics: PhysicsBody | null;
  spriteData: SpriteData | null;
  textData: TextData | null;
  shapeData: ShapeData | null;
  audioData: AudioData | null;
  scriptIds: string[];
}

// ---- Layer -----------------------------------------------------

export interface LayerState {
  id: string;
  name: string;
  index: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  objectIds: string[];
}

// ---- Scene -----------------------------------------------------

export interface SceneState {
  id: string;
  name: string;
  index: number;
  backgroundColor: string;
  width: number;
  height: number;
  gravity: Vector2;
  camera: {
    scrollX: number;
    scrollY: number;
    zoom: number;
    followTarget: string | null;
    bounds: Rect | null;
  };
  layerIds: string[];
  layers: Record<string, LayerState>;
  objects: Record<string, GameObjectState>;
}

// ---- Asset -----------------------------------------------------

export type AssetType = 'image' | 'spritesheet' | 'audio' | 'tileset' | 'font';

export interface FrameData {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AssetState {
  id: string;
  projectId: string;
  name: string;
  type: AssetType;
  mimeType: string;
  fileSize: number;
  url: string;
  thumbnailUrl: string | null;
  tags: string[];
  // Image / Spritesheet
  width?: number;
  height?: number;
  // Spritesheet-specific
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
  frames?: FrameData[];
  // Audio
  durationMs?: number;
  // Derived (not persisted, generated on load)
  previewUrl?: string;
  createdAt: string;
}

// ---- Visual Scripting ------------------------------------------

export type ScriptEventType =
  | 'event_on_start'
  | 'event_on_update'
  | 'event_on_collision'
  | 'event_on_overlap'
  | 'event_on_key_press'
  | 'event_on_key_release'
  | 'event_on_pointer_down'
  | 'event_on_pointer_up'
  | 'event_on_timer'
  | 'event_on_animation_complete'
  | 'event_on_custom';

export type ScriptConditionType =
  | 'cond_if_variable'
  | 'cond_if_health'
  | 'cond_if_score'
  | 'cond_if_distance'
  | 'cond_if_key_held'
  | 'cond_if_object_active';

export type ScriptActionType =
  | 'action_move'
  | 'action_jump'
  | 'action_set_velocity'
  | 'action_apply_force'
  | 'action_set_position'
  | 'action_set_variable'
  | 'action_add_variable'
  | 'action_play_animation'
  | 'action_stop_animation'
  | 'action_play_sound'
  | 'action_stop_sound'
  | 'action_change_scene'
  | 'action_create_object'
  | 'action_destroy_self'
  | 'action_set_active'
  | 'action_set_visible'
  | 'action_emit_event'
  | 'action_wait';

export type BlockType = ScriptEventType | ScriptConditionType | ScriptActionType;
export type BlockCategory = 'event' | 'condition' | 'action';

export interface ScriptBlock {
  id: string;
  type: BlockType;
  category: BlockCategory;
  x: number;
  y: number;
  params: Record<string, string | number | boolean>;
}

export interface ScriptWire {
  id: string;
  fromBlockId: string;
  fromPortId: string;
  toBlockId: string;
  toPortId: string;
}

export interface ScriptVariable {
  name: string;
  valueType: 'number' | 'string' | 'boolean';
  defaultValue: string | number | boolean;
  scope: 'scene' | 'global';
}

export interface ScriptGraph {
  id: string;
  projectId: string;
  name: string;
  blocks: Record<string, ScriptBlock>;
  wires: ScriptWire[];
  variables: ScriptVariable[];
  createdAt: string;
  updatedAt: string;
}

// ---- Block Definitions (for palette) ---------------------------

export interface BlockPortDef {
  id: string;
  label: string;
  type: 'flow' | 'value_number' | 'value_string' | 'value_boolean' | 'value_object';
}

export interface BlockParamDef {
  key: string;
  label: string;
  inputType: 'text' | 'number' | 'select' | 'key_picker' | 'boolean' | 'asset_picker' | 'object_picker';
  options?: string[];
  default: string | number | boolean;
}

export interface BlockDefinition {
  type: BlockType;
  category: BlockCategory;
  label: string;
  description: string;
  color: string;
  inputPorts: BlockPortDef[];
  outputPorts: BlockPortDef[];
  params: BlockParamDef[];
}

// ---- Project Settings ------------------------------------------

export interface ProjectSettings {
  canvasWidth: number;
  canvasHeight: number;
  targetFPS: number;
  backgroundColor: string;
  defaultStartScene: string | null;
  physics: {
    enabled: boolean;
    gravity: Vector2;
    debug: boolean;
  };
}

export const defaultProjectSettings = (): ProjectSettings => ({
  canvasWidth: 960,
  canvasHeight: 540,
  targetFPS: 60,
  backgroundColor: '#1a1a2e',
  defaultStartScene: null,
  physics: { enabled: true, gravity: { x: 0, y: 300 }, debug: false },
});

// ---- Project State (in-memory) ---------------------------------

export interface ProjectState {
  id: string;
  userId: string;
  name: string;
  description: string;
  thumbnailUrl: string | null;
  slug: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
  publishedUrl: string | null;
  settings: ProjectSettings;
  sceneIds: string[];
  scenes: Record<string, SceneState>;
  assets: Record<string, AssetState>;
  scripts: Record<string, ScriptGraph>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ---- Editor UI State (not persisted) ---------------------------

export type EditorTool = 'select' | 'move' | 'scale' | 'rotate' | 'pan' | 'physics_editor' | 'script_editor';
export type EditorMode = 'editor' | 'play';

export interface EditorState {
  mode: EditorMode;
  activeTool: EditorTool;
  activeSceneId: string;
  activeLayerId: string;
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
  isPanelOpen: {
    hierarchy: boolean;
    properties: boolean;
    assets: boolean;
    scripting: boolean;
    timeline: boolean;
  };
  activeAssetTab: 'sprites' | 'audio' | 'animations' | 'scripts';
  activePropertyTab: 'transform' | 'physics' | 'renderer' | 'scripts';
  isSaving: boolean;
  isPlaying: boolean;
  isDirty: boolean;
}

// ---- History / Undo-Redo ---------------------------------------

export interface SerializedCommand {
  type: string;
  payload: unknown;
  timestamp: number;
}

export interface HistoryState {
  past: SerializedCommand[];
  future: SerializedCommand[];
  maxHistory: number;
}

// ---- Build Job -------------------------------------------------

export interface BuildJobState {
  id: string;
  projectId: string;
  status: 'queued' | 'building' | 'uploading' | 'done' | 'failed';
  progress: number;
  outputUrl: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---- Template --------------------------------------------------

export type GenreType =
  | 'platformer'
  | 'top-down'
  | 'puzzle'
  | 'runner'
  | 'shooter'
  | 'rpg'
  | 'racing'
  | 'arcade';

export interface GameTemplate {
  id: string;
  name: string;
  description: string;
  genre: GenreType;
  thumbnailUrl: string;
  previewGifUrl?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sceneData: Omit<SceneState, 'id' | 'index'>;
}

// ---- Compound Store State -------------------------------------

export interface StoreState extends ProjectState, EditorState {
  history: HistoryState;
}
