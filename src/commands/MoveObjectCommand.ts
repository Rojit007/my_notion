import type { ICommand } from './types';
import type { EditorStore } from '@/store';

export class MoveObjectCommand implements ICommand {
  readonly type = 'MOVE_OBJECT';
  private readonly prevX: number;
  private readonly prevY: number;

  constructor(
    private readonly store: EditorStore,
    private readonly objectId: string,
    private readonly newX: number,
    private readonly newY: number,
    prevX?: number,
    prevY?: number,
  ) {
    const obj = store.getObject(objectId);
    this.prevX = prevX ?? obj?.transform.x ?? 0;
    this.prevY = prevY ?? obj?.transform.y ?? 0;
  }

  execute() {
    this.store.updateObjectTransform(this.objectId, { x: this.newX, y: this.newY });
  }

  undo() {
    this.store.updateObjectTransform(this.objectId, { x: this.prevX, y: this.prevY });
  }

  mergeWith(other: ICommand): ICommand | null {
    if (other.type !== 'MOVE_OBJECT') return null;
    const o = other as MoveObjectCommand;
    if (o.objectId !== this.objectId) return null;
    return new MoveObjectCommand(this.store, this.objectId, o.newX, o.newY, this.prevX, this.prevY);
  }
}
