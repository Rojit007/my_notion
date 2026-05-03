import type { ICommand } from './types';
import type { EditorStore } from '@/store';
import type { GameObjectState } from '@/store/types';

export class AddObjectCommand implements ICommand {
  readonly type = 'ADD_OBJECT';

  constructor(
    private readonly store: EditorStore,
    private readonly object: GameObjectState,
  ) {}

  execute() {
    this.store.addObject(this.object);
  }

  undo() {
    this.store.removeObject(this.object.id);
  }
}
