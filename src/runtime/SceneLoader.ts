import type { SceneState, GameObjectState, AssetState } from '@/store/types';
import type { ScriptRuntime } from './ScriptRuntime';

// Loads a SceneState JSON into a Phaser scene
export class SceneLoader {
  constructor(
    private scene: Phaser.Scene,
    private scriptRuntime: ScriptRuntime,
  ) {}

  load(sceneState: SceneState, assets: Record<string, AssetState>) {
    this.preloadAssets(assets);
  }

  private preloadAssets(assets: Record<string, AssetState>) {
    for (const asset of Object.values(assets)) {
      if (asset.type === 'image' || asset.type === 'spritesheet') {
        if (asset.url) this.scene.load.image(asset.id, asset.url);
      } else if (asset.type === 'audio') {
        if (asset.url) this.scene.load.audio(asset.id, asset.url);
      }
    }
  }

  create(sceneState: SceneState) {
    const { settings } = this.scene.game as { settings?: { backgroundColor?: string } };
    void settings;

    for (const obj of Object.values(sceneState.objects)) {
      this.createObject(obj);
    }
  }

  private createObject(obj: GameObjectState): Phaser.GameObjects.GameObject | null {
    const { x, y, rotation, scaleX, scaleY } = obj.transform;

    switch (obj.type) {
      case 'sprite': {
        const assetId = obj.spriteData?.assetId;
        if (!assetId) return null;
        const sprite = this.scene.add.sprite(x, y, assetId);
        sprite.setRotation(Phaser.Math.DegToRad(rotation));
        sprite.setScale(scaleX, scaleY);
        sprite.setAlpha(obj.spriteData?.alpha ?? 1);
        sprite.name = obj.name;

        if (obj.physics && this.scene.matter) {
          const matterSprite = this.scene.matter.add.gameObject(sprite, {
            isStatic: obj.physics.bodyType === 'static',
            restitution: obj.physics.restitution,
            friction: obj.physics.friction,
            mass: obj.physics.mass,
            isSensor: obj.physics.isSensor,
          });
          return matterSprite;
        }
        return sprite;
      }
      case 'rectangle': {
        const shape = obj.shapeData;
        const fillNum = shape?.fillColor ? parseInt(shape.fillColor.replace('#', ''), 16) : 0xffffff;
        const w = obj.transform.scaleX * 64;
        const h = obj.transform.scaleY * 64;
        const rect = this.scene.add.rectangle(x, y, w, h, fillNum);
        rect.setRotation(Phaser.Math.DegToRad(rotation));
        rect.name = obj.name;
        return rect;
      }
      case 'circle': {
        const shape = obj.shapeData;
        const fillNum = shape?.fillColor ? parseInt(shape.fillColor.replace('#', ''), 16) : 0xffffff;
        const radius = shape?.radius ?? 32;
        const circle = this.scene.add.circle(x, y, radius, fillNum);
        circle.name = obj.name;
        return circle;
      }
      case 'text': {
        const td = obj.textData;
        const text = this.scene.add.text(x, y, td?.content ?? '', {
          fontSize: `${td?.fontSize ?? 16}px`,
          color: td?.color ?? '#ffffff',
          fontFamily: td?.fontFamily ?? 'Inter',
        });
        text.name = obj.name;
        return text;
      }
      default:
        return null;
    }
  }
}
