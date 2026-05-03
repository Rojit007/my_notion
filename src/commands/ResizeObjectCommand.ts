import type { ICommand } from './types';
import type { EditorStore } from '@/store';

export class ResizeObjectCommand implements ICommand {
  readonly type = 'RESIZE_OBJECT';
  private readonly prevScaleX: number;
  private readonly prevScaleY: number;
  private readonly prevX: number;
  private readonly prevY: number;

  constructor(
    private readonly store: EditorStore,
    private readonly objectId: string,
    private readonly newScaleX: number,
    private readonly newScaleY: number,
    private readonly newX: number,
    private readonly newY: number,
    prevScaleX?: number,
    prevScaleY?: number,
    prevX?: number,
    prevY?: number,
  ) {
    const obj = store.getObject(objectId);
    this.prevScaleX = prevScaleX ?? obj?.transform.scaleX ?? 1;
    this.prevScaleY = prevScaleY ?? obj?.transform.scaleY ?? 1;
    this.prevX = prevX ?? obj?.transform.x ?? 0;
    this.prevY = prevY ?? obj?.transform.y ?? 0;
  }

  execute() {
    this.store.updateObjectTransform(this.objectId, {
      scaleX: this.newScaleX, scaleY: this.newScaleY,
      x: this.newX, y: this.newY,
    });
  }

  undo() {
    this.store.updateObjectTransform(this.objectId, {
      scaleX: this.prevScaleX, scaleY: this.prevScaleY,
      x: this.prevX, y: this.prevY,
    });
  }

  mergeWith(other: ICommand): ICommand | null {
    if (other.type !== 'RESIZE_OBJECT') return null;
    const o = other as ResizeObjectCommand;
    if (o.objectId !== this.objectId) return null;
    return new ResizeObjectCommand(
      this.store, this.objectId,
      o.newScaleX, o.newScaleY, o.newX, o.newY,
      this.prevScaleX, this.prevScaleY, this.prevX, this.prevY,
    );
  }
}
