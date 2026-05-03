import type { ICommand } from './types';

export class CommandManager {
  private past: ICommand[] = [];
  private future: ICommand[] = [];
  private readonly maxHistory: number;
  private onChangeCallback?: () => void;

  constructor(maxHistory = 100, onChange?: () => void) {
    this.maxHistory = maxHistory;
    this.onChangeCallback = onChange;
  }

  execute(command: ICommand): void {
    // Attempt merge with last command (e.g., rapid drag sequences)
    const last = this.past[this.past.length - 1];
    if (last?.mergeWith) {
      const merged = last.mergeWith(command);
      if (merged) {
        this.past[this.past.length - 1] = merged;
        merged.execute();
        this.future = [];
        this.onChangeCallback?.();
        return;
      }
    }

    command.execute();
    this.past.push(command);
    if (this.past.length > this.maxHistory) this.past.shift();
    this.future = [];
    this.onChangeCallback?.();
  }

  undo(): void {
    const command = this.past.pop();
    if (!command) return;
    command.undo();
    this.future.unshift(command);
    this.onChangeCallback?.();
  }

  redo(): void {
    const command = this.future.shift();
    if (!command) return;
    command.execute();
    this.past.push(command);
    this.onChangeCallback?.();
  }

  canUndo(): boolean { return this.past.length > 0; }
  canRedo(): boolean { return this.future.length > 0; }
  undoCount(): number { return this.past.length; }
  redoCount(): number { return this.future.length; }

  clear(): void {
    this.past = [];
    this.future = [];
    this.onChangeCallback?.();
  }
}
