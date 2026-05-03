import type { ICommand } from './types';
import type { EditorStore } from '@/store';
import type { GameObjectState } from '@/store/types';

export class DeleteObjectCommand implements ICommand {
  readonly type = 'DELETE_OBJECT';
  private readonly snapshot: GameObjectState;

  constructor(
    private readonly store: EditorStore,
    private readonly objectId: string,
  ) {
    const obj = store.getObject(objectId);
    if (!obj) throw new Error(`Object ${objectId} not found`);
    this.snapshot = structuredClone(obj);
  }

  execute() {
    this.store.removeObject(this.objectId);
  }

  undo() {
    this.store.addObject(this.snapshot);
  }
}
