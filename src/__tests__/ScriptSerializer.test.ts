import { describe, it, expect } from 'vitest';
import { serializeScript, compileScriptToJS } from '@/editor/scripting/ScriptSerializer';
import type { ScriptGraph, ScriptBlock, ScriptWire } from '@/store/types';

function makeGraph(
  blocks: ScriptBlock[],
  wires: ScriptWire[] = [],
): ScriptGraph {
  return {
    id: 'g1',
    projectId: 'proj1',
    name: 'TestScript',
    blocks: Object.fromEntries(blocks.map(b => [b.id, b])),
    wires,
    variables: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

const eventOnStart = (): ScriptBlock => ({
  id: 'ev1', type: 'event_on_start', category: 'event',
  x: 0, y: 0, params: {},
});

const eventOnKeyPress = (): ScriptBlock => ({
  id: 'ev1', type: 'event_on_key_press', category: 'event',
  x: 0, y: 0, params: { key: 'Space' },
});

const actionMove = (id = 'a1'): ScriptBlock => ({
  id, type: 'action_move', category: 'action',
  x: 100, y: 0, params: { velocityX: 5, velocityY: 0 },
});

const actionJump = (id = 'a2'): ScriptBlock => ({
  id, type: 'action_jump', category: 'action',
  x: 200, y: 0, params: { force: -400 },
});

const actionPlaySound = (id = 'a3'): ScriptBlock => ({
  id, type: 'action_play_sound', category: 'action',
  x: 300, y: 0, params: { soundKey: 'jump', volume: 1 },
});

const condKeyHeld = (): ScriptBlock => ({
  id: 'c1', type: 'cond_if_key_held', category: 'condition',
  x: 50, y: 100, params: { key: 'ArrowLeft' },
});

const condVariable = (): ScriptBlock => ({
  id: 'c2', type: 'cond_if_variable', category: 'condition',
  x: 50, y: 200, params: { varName: 'score', operator: '>=', value: 100 },
});

const wireFlow = (fromBlockId: string, toBlockId: string): ScriptWire => ({
  id: `${fromBlockId}-${toBlockId}`,
  fromBlockId, fromPortId: 'flow_out',
  toBlockId, toPortId: 'flow_in',
});

const wireCondition = (fromBlockId: string, toBlockId: string): ScriptWire => ({
  id: `cond-${fromBlockId}-${toBlockId}`,
  fromBlockId, fromPortId: 'value_out',
  toBlockId, toPortId: 'condition_in',
});

describe('serializeScript', () => {
  it('returns empty events for graph with no event blocks', () => {
    const graph = makeGraph([actionMove()]);
    expect(serializeScript(graph).events).toHaveLength(0);
  });

  it('creates one event for event_on_start with no actions', () => {
    const ir = serializeScript(makeGraph([eventOnStart()]));
    expect(ir.events).toHaveLength(1);
    expect(ir.events[0].trigger).toBe('event_on_start');
    expect(ir.events[0].actions).toHaveLength(0);
    expect(ir.events[0].condition).toBeNull();
  });

  it('chains actions via flow wires in order', () => {
    const graph = makeGraph(
      [eventOnStart(), actionMove(), actionJump()],
      [wireFlow('ev1', 'a1'), wireFlow('a1', 'a2')],
    );
    const { actions } = serializeScript(graph).events[0];
    expect(actions).toHaveLength(2);
    expect(actions[0].op).toBe('action_move');
    expect(actions[1].op).toBe('action_jump');
  });

  it('preserves action params in IR args', () => {
    const graph = makeGraph(
      [eventOnStart(), actionJump()],
      [wireFlow('ev1', 'a2')],
    );
    const { actions } = serializeScript(graph).events[0];
    expect(actions[0].args).toMatchObject({ force: -400 });
  });

  it('captures triggerArgs from event block params', () => {
    const ir = serializeScript(makeGraph([eventOnKeyPress()]));
    expect(ir.events[0].triggerArgs).toMatchObject({ key: 'Space' });
  });

  it('captures condition block connected via condition_in wire', () => {
    const graph = makeGraph(
      [eventOnStart(), actionMove(), condKeyHeld()],
      [wireFlow('ev1', 'a1'), wireCondition('c1', 'ev1')],
    );
    const { condition } = serializeScript(graph).events[0];
    expect(condition).not.toBeNull();
    expect(condition?.op).toBe('cond_if_key_held');
    expect(condition?.args).toMatchObject({ key: 'ArrowLeft' });
  });

  it('uses variable condition args correctly', () => {
    const graph = makeGraph(
      [eventOnStart(), condVariable()],
      [wireCondition('c2', 'ev1')],
    );
    const { condition } = serializeScript(graph).events[0];
    expect(condition?.op).toBe('cond_if_variable');
    expect(condition?.args).toMatchObject({ varName: 'score', operator: '>=', value: 100 });
  });

  it('guards against cycles in flow chain (no infinite loop)', () => {
    // ev1 → a1 → ev1 (cycle back to event)
    const graph = makeGraph(
      [eventOnStart(), actionMove()],
      [wireFlow('ev1', 'a1'), wireFlow('a1', 'ev1')],
    );
    expect(() => serializeScript(graph)).not.toThrow();
    expect(serializeScript(graph).events[0].actions).toHaveLength(1);
  });

  it('handles multiple independent event blocks', () => {
    const ev2: ScriptBlock = {
      id: 'ev2', type: 'event_on_update', category: 'event', x: 0, y: 200, params: {},
    };
    const ir = serializeScript(makeGraph([eventOnStart(), ev2]));
    expect(ir.events).toHaveLength(2);
    expect(ir.events.map(e => e.trigger)).toContain('event_on_update');
  });

  it('propagates correct id and name to IRScript', () => {
    const ir = serializeScript(makeGraph([]));
    expect(ir.id).toBe('g1');
    expect(ir.name).toBe('TestScript');
  });
});

describe('compileScriptToJS', () => {
  it('returns empty string for graph with no event blocks', () => {
    expect(compileScriptToJS(makeGraph([]))).toBe('');
  });

  it('wraps output in IIFE with api parameter', () => {
    const js = compileScriptToJS(makeGraph([eventOnStart()]));
    expect(js).toContain('(function(api)');
    expect(js.trimEnd()).toMatch(/\)$/);
  });

  it('generates api.onStart for event_on_start', () => {
    const graph = makeGraph(
      [eventOnStart(), actionMove()],
      [wireFlow('ev1', 'a1')],
    );
    const js = compileScriptToJS(graph);
    expect(js).toContain('api.onStart(function()');
    expect(js).toContain('api.setVelocity(5, 0)');
  });

  it('generates api.onKeyPress for event_on_key_press', () => {
    const graph = makeGraph(
      [eventOnKeyPress(), actionJump()],
      [wireFlow('ev1', 'a2')],
    );
    const js = compileScriptToJS(graph);
    expect(js).toContain('api.onKeyPress("Space"');
    expect(js).toContain('api.jump(-400)');
  });

  it('generates api.playSound for action_play_sound', () => {
    const graph = makeGraph(
      [eventOnStart(), actionPlaySound()],
      [wireFlow('ev1', 'a3')],
    );
    const js = compileScriptToJS(graph);
    expect(js).toContain('api.playSound("jump", 1)');
  });

  it('wraps actions in if-guard when condition block present', () => {
    const graph = makeGraph(
      [eventOnStart(), actionJump(), condKeyHeld()],
      [wireFlow('ev1', 'a2'), wireCondition('c1', 'ev1')],
    );
    const js = compileScriptToJS(graph);
    expect(js).toContain('if (api.isKeyDown("ArrowLeft"))');
    expect(js).toContain('api.jump(');
  });

  it('generates variable condition expression', () => {
    const graph = makeGraph(
      [eventOnStart(), condVariable()],
      [wireCondition('c2', 'ev1')],
    );
    const js = compileScriptToJS(graph);
    expect(js).toContain('api.getVar("score") >= 100');
  });
});
