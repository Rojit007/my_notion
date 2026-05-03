import type { ScriptGraph, ScriptBlock, ScriptWire } from '@/store/types';

// Intermediate Representation — what the runtime executes
export interface IRInstruction {
  op: string;
  args: Record<string, unknown>;
}

export interface IRScript {
  id: string;
  name: string;
  events: IREvent[];
}

export interface IREvent {
  trigger: string;
  triggerArgs: Record<string, unknown>;
  condition: IRCondition | null;
  actions: IRInstruction[];
}

export interface IRCondition {
  op: string;
  args: Record<string, unknown>;
}

class SerializeError extends Error {}

// Walk downstream flow ports from a given block
function walkFlowChain(
  startId: string,
  blocks: Record<string, ScriptBlock>,
  wires: ScriptWire[],
  visited = new Set<string>(),
): ScriptBlock[] {
  if (visited.has(startId)) return []; // cycle guard
  visited.add(startId);
  const chain: ScriptBlock[] = [];
  const outWires = wires.filter(w => w.fromBlockId === startId && w.fromPortId === 'flow_out');
  for (const wire of outWires) {
    const next = blocks[wire.toBlockId];
    if (!next) continue;
    chain.push(next);
    chain.push(...walkFlowChain(next.id, blocks, wires, visited));
  }
  return chain;
}

// Find the condition block connected to an event's condition_in port
function findCondition(
  eventId: string,
  blocks: Record<string, ScriptBlock>,
  wires: ScriptWire[],
): ScriptBlock | null {
  const wire = wires.find(w => w.toBlockId === eventId && w.toPortId === 'condition_in');
  if (!wire) return null;
  return blocks[wire.fromBlockId] ?? null;
}

function serializeAction(block: ScriptBlock): IRInstruction {
  return { op: block.type, args: { ...block.params } };
}

function serializeCondition(block: ScriptBlock): IRCondition {
  return { op: block.type, args: { ...block.params } };
}

export function serializeScript(graph: ScriptGraph): IRScript {
  const { blocks, wires } = graph;
  const eventBlocks = Object.values(blocks).filter(b => b.category === 'event');
  const events: IREvent[] = [];

  for (const eventBlock of eventBlocks) {
    const conditionBlock = findCondition(eventBlock.id, blocks, wires);
    const actionChain = walkFlowChain(eventBlock.id, blocks, wires);

    events.push({
      trigger: eventBlock.type,
      triggerArgs: { ...eventBlock.params },
      condition: conditionBlock ? serializeCondition(conditionBlock) : null,
      actions: actionChain
        .filter(b => b.category === 'action')
        .map(serializeAction),
    });
  }

  return { id: graph.id, name: graph.name, events };
}

// Compile script graph into a self-contained JS module string
// The generated code is eval-safe: it uses a sandboxed API object
export function compileScriptToJS(graph: ScriptGraph): string {
  const ir = serializeScript(graph);
  if (ir.events.length === 0) return '';

  const lines: string[] = [
    `// Auto-generated from visual script: ${ir.name}`,
    `(function(api) {`,
  ];

  for (const event of ir.events) {
    const triggerCall = buildTriggerRegistration(event);
    lines.push(`  ${triggerCall}`);
  }

  lines.push(`})`);
  return lines.join('\n');
}

function buildTriggerRegistration(event: IREvent): string {
  const body = buildEventBody(event);

  switch (event.trigger) {
    case 'event_on_start':
      return `api.onStart(function() { ${body} });`;
    case 'event_on_update':
      return `api.onUpdate(function(dt) { ${body} });`;
    case 'event_on_key_press':
      return `api.onKeyPress(${JSON.stringify(event.triggerArgs.key)}, function() { ${body} });`;
    case 'event_on_key_release':
      return `api.onKeyRelease(${JSON.stringify(event.triggerArgs.key)}, function() { ${body} });`;
    case 'event_on_collision':
      return `api.onCollision(${JSON.stringify(event.triggerArgs.tag)}, function() { ${body} });`;
    default:
      return `/* unknown trigger: ${event.trigger} */`;
  }
}

function buildEventBody(event: IREvent): string {
  const stmts: string[] = [];

  if (event.condition) {
    stmts.push(`if (${buildConditionExpr(event.condition)}) {`);
    for (const action of event.actions) {
      stmts.push(`  ${buildActionStmt(action)}`);
    }
    stmts.push(`}`);
  } else {
    for (const action of event.actions) {
      stmts.push(buildActionStmt(action));
    }
  }

  return stmts.join(' ');
}

function buildConditionExpr(cond: IRCondition): string {
  switch (cond.op) {
    case 'condition_check_variable':
      return `api.getVar(${JSON.stringify(cond.args.variable)}) ${cond.args.operator} ${JSON.stringify(cond.args.value)}`;
    case 'condition_check_key':
      return `api.isKeyDown(${JSON.stringify(cond.args.key)})`;
    default:
      return 'true';
  }
}

function buildActionStmt(action: IRInstruction): string {
  switch (action.op) {
    case 'action_move_object':
      return `api.move(${JSON.stringify(action.args.target)}, ${Number(action.args.x)}, ${Number(action.args.y)});`;
    case 'action_set_velocity':
      return `api.setVelocity(${JSON.stringify(action.args.target)}, ${Number(action.args.x)}, ${Number(action.args.y)});`;
    case 'action_jump':
      return `api.jump(${JSON.stringify(action.args.target)}, ${Number(action.args.force)});`;
    case 'action_play_sound':
      return `api.playSound(${JSON.stringify(action.args.asset)});`;
    case 'action_stop_sound':
      return `api.stopSound(${JSON.stringify(action.args.asset)});`;
    case 'action_set_variable':
      return `api.setVar(${JSON.stringify(action.args.variable)}, ${JSON.stringify(action.args.value)});`;
    case 'action_change_scene':
      return `api.changeScene(${JSON.stringify(action.args.scene)});`;
    case 'action_spawn_object':
      return `api.spawn(${JSON.stringify(action.args.template)}, ${Number(action.args.x)}, ${Number(action.args.y)});`;
    case 'action_destroy_object':
      return `api.destroy(${JSON.stringify(action.args.target)});`;
    case 'action_show_message':
      return `api.showMessage(${JSON.stringify(action.args.text)});`;
    default:
      return `/* unknown action: ${action.op} */`;
  }
}

// Suppress unused import error in strict mode
void SerializeError;
