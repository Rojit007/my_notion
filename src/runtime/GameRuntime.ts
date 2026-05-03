import type { ProjectState } from '@/store/types';
import { SceneLoader } from './SceneLoader';
import { ScriptRuntime } from './ScriptRuntime';
import { serializeScript } from '@/editor/scripting/ScriptSerializer';

// Standalone game runtime — receives a deep copy of ProjectState, never references editor state
export class GameRuntime {
  private game: Phaser.Game | null = null;

  async start(project: ProjectState, container: HTMLElement) {
    const { default: Phaser } = await import('phaser');

    const settings = project.settings;
    const startSceneId = settings.defaultStartScene ?? project.sceneIds[0];
    if (!startSceneId) return;

    const sceneState = project.scenes[startSceneId];
    if (!sceneState) return;

    const scriptRuntime = new ScriptRuntime();

    // Compile all scripts attached to the start scene's objects
    const scriptIRs = Object.values(project.scripts).map(g => serializeScript(g));

    class RuntimeScene extends Phaser.Scene {
      private loader!: SceneLoader;

      constructor() {
        super({ key: 'RuntimeScene' });
      }

      preload() {
        this.loader = new SceneLoader(this, scriptRuntime);
        this.loader.load(sceneState, project.assets);
      }

      create() {
        this.loader.create(sceneState);
        scriptRuntime.bind(this);
        scriptRuntime.loadScripts(scriptIRs);
        scriptRuntime.start();

        // Keyboard listeners
        this.input.keyboard?.on('keydown', (e: KeyboardEvent) => scriptRuntime.handleKeyPress(e.key));
        this.input.keyboard?.on('keyup', (e: KeyboardEvent) => scriptRuntime.handleKeyRelease(e.key));

        // Matter collision events
        this.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
          for (const pair of event.pairs) {
            const aLabel = (pair.bodyA as MatterJS.BodyType & { label?: string }).label ?? '';
            const bLabel = (pair.bodyB as MatterJS.BodyType & { label?: string }).label ?? '';
            scriptRuntime.handleCollision(aLabel);
            scriptRuntime.handleCollision(bLabel);
          }
        });
      }

      update(_time: number, delta: number) {
        scriptRuntime.update(delta / 1000);
      }
    }

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
      width: settings.canvasWidth,
      height: settings.canvasHeight,
      backgroundColor: settings.backgroundColor,
      physics: {
        default: 'matter',
        matter: {
          gravity: settings.physics?.gravity ?? { x: 0, y: 300 },
          debug: settings.physics?.debug ?? false,
        },
      },
      scene: [RuntimeScene],
    });
  }

  destroy() {
    this.game?.destroy(true);
    this.game = null;
  }
}
