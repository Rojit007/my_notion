import { describe, it, expect, vi } from 'vitest';
import { CommandManager } from '@/commands/CommandManager';
import type { ICommand } from '@/commands/types';

function makeCommand(onExecute?: () => void, onUndo?: () => void, type = 'TEST'): ICommand {
  return {
    type,
    execute: vi.fn(onExecute),
    undo: vi.fn(onUndo),
  };
}

describe('CommandManager', () => {
  it('executes a command immediately', () => {
    const mgr = new CommandManager();
    const cmd = makeCommand();
    mgr.execute(cmd);
    expect(cmd.execute).toHaveBeenCalledOnce();
  });

  it('canUndo after execute, canRedo after undo', () => {
    const mgr = new CommandManager();
    expect(mgr.canUndo()).toBe(false);
    expect(mgr.canRedo()).toBe(false);

    mgr.execute(makeCommand());
    expect(mgr.canUndo()).toBe(true);
    expect(mgr.canRedo()).toBe(false);

    mgr.undo();
    expect(mgr.canUndo()).toBe(false);
    expect(mgr.canRedo()).toBe(true);

    mgr.redo();
    expect(mgr.canUndo()).toBe(true);
    expect(mgr.canRedo()).toBe(false);
  });

  it('undo calls command.undo()', () => {
    const mgr = new CommandManager();
    const cmd = makeCommand();
    mgr.execute(cmd);
    mgr.undo();
    expect(cmd.undo).toHaveBeenCalledOnce();
  });

  it('redo re-executes after undo', () => {
    const mgr = new CommandManager();
    const cmd = makeCommand();
    mgr.execute(cmd);
    mgr.undo();
    mgr.redo();
    expect(cmd.execute).toHaveBeenCalledTimes(2);
  });

  it('new execute clears redo stack', () => {
    const mgr = new CommandManager();
    mgr.execute(makeCommand());
    mgr.undo();
    expect(mgr.canRedo()).toBe(true);
    mgr.execute(makeCommand());
    expect(mgr.canRedo()).toBe(false);
  });

  it('respects maxHistory limit by dropping oldest', () => {
    const mgr = new CommandManager(3);
    mgr.execute(makeCommand());
    mgr.execute(makeCommand());
    mgr.execute(makeCommand());
    mgr.execute(makeCommand()); // drops first
    expect(mgr.undoCount()).toBe(3);
  });

  it('mergeWith coalesces consecutive same-target commands', () => {
    const mgr = new CommandManager();
    let value = 0;

    // cmd1: sets value to 5, merges with any MOVE cmd to produce cmd that sets value to 10
    const merged: ICommand = {
      type: 'MOVE',
      execute: vi.fn(() => { value = 10; }),
      undo: vi.fn(() => { value = 0; }),
    };
    const cmd1: ICommand = {
      type: 'MOVE',
      execute: vi.fn(() => { value = 5; }),
      undo: vi.fn(() => { value = 0; }),
      mergeWith: (other: ICommand) => other.type === 'MOVE' ? merged : null,
    };
    const cmd2: ICommand = {
      type: 'MOVE',
      execute: vi.fn(() => { value = 10; }),
      undo: vi.fn(() => { value = 0; }),
    };

    mgr.execute(cmd1);
    mgr.execute(cmd2);

    // Should have merged: only 1 entry in the stack
    expect(mgr.undoCount()).toBe(1);
    expect(value).toBe(10);

    mgr.undo();
    expect(value).toBe(0);
  });

  it('onChange callback fires on execute/undo/redo', () => {
    const onChange = vi.fn();
    const mgr = new CommandManager(100, onChange);
    mgr.execute(makeCommand());
    expect(onChange).toHaveBeenCalledTimes(1);
    mgr.undo();
    expect(onChange).toHaveBeenCalledTimes(2);
    mgr.redo();
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('clear() resets both stacks', () => {
    const mgr = new CommandManager();
    mgr.execute(makeCommand());
    mgr.clear();
    expect(mgr.canUndo()).toBe(false);
    expect(mgr.undoCount()).toBe(0);
  });

  it('undo/redo on empty stacks does nothing', () => {
    const mgr = new CommandManager();
    expect(() => mgr.undo()).not.toThrow();
    expect(() => mgr.redo()).not.toThrow();
  });
});
