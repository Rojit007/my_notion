import type { IRScript, IREvent } from '@/editor/scripting/ScriptSerializer';

// Runtime API surface exposed to compiled scripts
export interface ScriptAPI {
  onStart(fn: () => void): void;
  onUpdate(fn: (dt: number) => void): void;
  onKeyPress(key: string, fn: () => void): void;
  onKeyRelease(key: string, fn: () => void): void;
  onCollision(tag: string, fn: () => void): void;
  move(target: string, dx: number, dy: number): void;
  setVelocity(target: string, vx: number, vy: number): void;
  jump(target: string, force: number): void;
  playSound(asset: string): void;
  stopSound(asset: string): void;
  setVar(name: string, value: unknown): void;
  getVar(name: string): unknown;
  changeScene(sceneName: string): void;
  spawn(template: string, x: number, y: number): void;
  destroy(target: string): void;
  showMessage(text: string): void;
  isKeyDown(key: string): boolean;
}

type EventHandler = (...args: unknown[]) => void;

export class ScriptRuntime {
  private startHandlers: Array<() => void> = [];
  private updateHandlers: Array<(dt: number) => void> = [];
  private keyPressHandlers: Map<string, Array<() => void>> = new Map();
  private keyReleaseHandlers: Map<string, Array<() => void>> = new Map();
  private collisionHandlers: Map<string, Array<() => void>> = new Map();
  private variables: Map<string, unknown> = new Map();
  private keysDown: Set<string> = new Set();
  private phaserScene: Phaser.Scene | null = null;
  private onChangeScene?: (name: string) => void;
  private onShowMessage?: (text: string) => void;

  bind(scene: Phaser.Scene, opts?: {
    onChangeScene?: (name: string) => void;
    onShowMessage?: (text: string) => void;
  }) {
    this.phaserScene = scene;
    this.onChangeScene = opts?.onChangeScene;
    this.onShowMessage = opts?.onShowMessage;
  }

  buildAPI(): ScriptAPI {
    return {
      onStart: fn => this.startHandlers.push(fn),
      onUpdate: fn => this.updateHandlers.push(fn),
      onKeyPress: (key, fn) => {
        if (!this.keyPressHandlers.has(key)) this.keyPressHandlers.set(key, []);
        this.keyPressHandlers.get(key)!.push(fn);
      },
      onKeyRelease: (key, fn) => {
        if (!this.keyReleaseHandlers.has(key)) this.keyReleaseHandlers.set(key, []);
        this.keyReleaseHandlers.get(key)!.push(fn);
      },
      onCollision: (tag, fn) => {
        if (!this.collisionHandlers.has(tag)) this.collisionHandlers.set(tag, []);
        this.collisionHandlers.get(tag)!.push(fn);
      },
      isKeyDown: key => this.keysDown.has(key),
      move: (target, dx, dy) => {
        const obj = this.findObject(target) as Phaser.GameObjects.Sprite | undefined;
        if (obj) obj.setPosition((obj.x ?? 0) + dx, (obj.y ?? 0) + dy);
      },
      setVelocity: (target, vx, vy) => {
        const obj = this.findObject(target);
        if (obj && 'setVelocity' in obj) (obj as Phaser.Physics.Matter.Sprite).setVelocity(vx, vy);
      },
      jump: (target, force) => {
        const obj = this.findObject(target);
        if (obj && 'setVelocityY' in obj) (obj as Phaser.Physics.Matter.Sprite).setVelocityY(-force);
      },
      playSound: asset => this.phaserScene?.sound.play(asset),
      stopSound: asset => this.phaserScene?.sound.stopByKey(asset),
      setVar: (name, value) => this.variables.set(name, value),
      getVar: name => this.variables.get(name),
      changeScene: name => this.onChangeScene?.(name),
      spawn: (template, x, y) => {
        if (!this.phaserScene) return;
        this.phaserScene.add.sprite(x, y, template);
      },
      destroy: target => this.findObject(target)?.destroy(),
      showMessage: text => this.onShowMessage?.(text),
    };
  }

  private findObject(name: string): Phaser.GameObjects.GameObject | undefined {
    return this.phaserScene?.children.list.find(
      (o): o is Phaser.GameObjects.Sprite => 'name' in o && (o as Phaser.GameObjects.Sprite).name === name
    );
  }

  loadScripts(scripts: IRScript[]) {
    const api = this.buildAPI();
    for (const script of scripts) {
      for (const event of script.events) {
        this.registerEvent(event, api);
      }
    }
  }

  private registerEvent(event: IREvent, api: ScriptAPI) {
    const run = () => {
      if (event.condition && !this.evaluateCondition(event.condition, api)) return;
      for (const action of event.actions) {
        this.executeAction(action, api);
      }
    };

    switch (event.trigger) {
      case 'event_on_start':
        api.onStart(run);
        break;
      case 'event_on_update':
        api.onUpdate(() => run());
        break;
      case 'event_on_key_press':
        api.onKeyPress(String(event.triggerArgs.key ?? ''), run);
        break;
      case 'event_on_key_release':
        api.onKeyRelease(String(event.triggerArgs.key ?? ''), run);
        break;
      case 'event_on_collision':
        api.onCollision(String(event.triggerArgs.tag ?? ''), run);
        break;
    }
  }

  private evaluateCondition(cond: { op: string; args: Record<string, unknown> }, api: ScriptAPI): boolean {
    switch (cond.op) {
      case 'condition_check_variable': {
        const val = api.getVar(String(cond.args.variable));
        const op = String(cond.args.operator ?? '==');
        const target = cond.args.value;
        if (op === '==') return val == target; // eslint-disable-line eqeqeq
        if (op === '!=') return val != target; // eslint-disable-line eqeqeq
        if (op === '>') return Number(val) > Number(target);
        if (op === '<') return Number(val) < Number(target);
        return false;
      }
      case 'condition_check_key':
        return api.isKeyDown(String(cond.args.key));
      default:
        return true;
    }
  }

  private executeAction(action: { op: string; args: Record<string, unknown> }, api: ScriptAPI) {
    switch (action.op) {
      case 'action_move_object':
        api.move(String(action.args.target), Number(action.args.x), Number(action.args.y));
        break;
      case 'action_set_velocity':
        api.setVelocity(String(action.args.target), Number(action.args.x), Number(action.args.y));
        break;
      case 'action_jump':
        api.jump(String(action.args.target), Number(action.args.force));
        break;
      case 'action_play_sound':
        api.playSound(String(action.args.asset));
        break;
      case 'action_stop_sound':
        api.stopSound(String(action.args.asset));
        break;
      case 'action_set_variable':
        api.setVar(String(action.args.variable), action.args.value);
        break;
      case 'action_change_scene':
        api.changeScene(String(action.args.scene));
        break;
      case 'action_spawn_object':
        api.spawn(String(action.args.template), Number(action.args.x), Number(action.args.y));
        break;
      case 'action_destroy_object':
        api.destroy(String(action.args.target));
        break;
      case 'action_show_message':
        api.showMessage(String(action.args.text));
        break;
    }
  }

  // Called by the Phaser scene's update()
  update(dt: number) {
    for (const fn of this.updateHandlers) fn(dt);
  }

  // Called by the Phaser scene's create() after preload
  start() {
    for (const fn of this.startHandlers) fn();
  }

  // Called on keyboard events
  handleKeyPress(key: string) {
    this.keysDown.add(key);
    for (const fn of this.keyPressHandlers.get(key) ?? []) fn();
  }

  handleKeyRelease(key: string) {
    this.keysDown.delete(key);
    for (const fn of this.keyReleaseHandlers.get(key) ?? []) fn();
  }

  // Called on Matter.js collision events
  handleCollision(tag: string) {
    for (const fn of this.collisionHandlers.get(tag) ?? []) fn();
  }
}
