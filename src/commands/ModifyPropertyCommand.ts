import type { ICommand } from './types';
import type { EditorStore } from '@/store';
import type { GameObjectState } from '@/store/types';

export class ModifyPropertyCommand implements ICommand {
  readonly type = 'MODIFY_PROPERTY';
  private readonly prevSnapshot: Partial<GameObjectState>;

  constructor(
    private readonly store: EditorStore,
    private readonly objectId: string,
    private readonly patch: Partial<GameObjectState>,
  ) {
    const obj = store.getObject(objectId);
    // Capture only the keys being modified
    const prev: Partial<GameObjectState> = {};
    for (const key of Object.keys(patch) as (keyof GameObjectState)[]) {
      (prev as Record<string, unknown>)[key] = structuredClone(obj?.[key]);
    }
    this.prevSnapshot = prev;
  }

  execute() {
    this.store.updateObject(this.objectId, this.patch);
  }

  undo() {
    this.store.updateObject(this.objectId, this.prevSnapshot);
  }
}
