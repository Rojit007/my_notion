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
      condition: conditionBlock
        ? { op: conditionBlock.type, args: { ...conditionBlock.params } }
        : null,
      actions: actionChain
        .filter(b => b.category === 'action')
        .map(b => ({ op: b.type, args: { ...b.params } })),
    });
  }

  return { id: graph.id, name: graph.name, events };
}

// Compile script graph into a self-contained JS module string
// The generated code uses a sandboxed API object — no eval() of user strings
export function compileScriptToJS(graph: ScriptGraph): string {
  const ir = serializeScript(graph);
  if (ir.events.length === 0) return '';

  const lines: string[] = [
    `// Auto-generated from visual script: ${ir.name}`,
    `(function(api) {`,
  ];

  for (const event of ir.events) {
    lines.push(`  ${buildTriggerRegistration(event)}`);
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
    case 'event_on_pointer_down':
      return `api.onPointerDown(function() { ${body} });`;
    case 'event_on_timer':
      return `api.onTimer(${Number(event.triggerArgs.delay)}, ${!!event.triggerArgs.loop}, function() { ${body} });`;
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
    case 'cond_if_variable':
      return `api.getVar(${JSON.stringify(cond.args.varName)}) ${cond.args.operator} ${JSON.stringify(cond.args.value)}`;
    case 'cond_if_key_held':
      return `api.isKeyDown(${JSON.stringify(cond.args.key)})`;
    case 'cond_if_health':
      return `api.getHealth() ${cond.args.operator} ${Number(cond.args.value)}`;
    case 'cond_if_score':
      return `api.getScore() ${cond.args.operator} ${Number(cond.args.value)}`;
    case 'cond_if_object_active':
      return `api.isActive(${JSON.stringify(cond.args.target)})`;
    default:
      return 'true';
  }
}

function buildActionStmt(action: IRInstruction): string {
  switch (action.op) {
    case 'action_move':
      return `api.setVelocity(${Number(action.args.velocityX)}, ${Number(action.args.velocityY)});`;
    case 'action_jump':
      return `api.jump(${Number(action.args.force)});`;
    case 'action_set_velocity':
      return `api.setVelocity(${Number(action.args.velocityX)}, ${Number(action.args.velocityY)});`;
    case 'action_apply_force':
      return `api.applyForce(${Number(action.args.forceX)}, ${Number(action.args.forceY)});`;
    case 'action_set_position':
      return `api.setPosition(${Number(action.args.x)}, ${Number(action.args.y)});`;
    case 'action_set_variable':
      return `api.setVar(${JSON.stringify(action.args.varName)}, ${JSON.stringify(action.args.value)});`;
    case 'action_add_variable':
      return `api.addVar(${JSON.stringify(action.args.varName)}, ${Number(action.args.amount)});`;
    case 'action_play_animation':
      return `api.playAnim(${JSON.stringify(action.args.animKey)});`;
    case 'action_stop_animation':
      return `api.stopAnim();`;
    case 'action_play_sound':
      return `api.playSound(${JSON.stringify(action.args.soundKey)}, ${Number(action.args.volume ?? 1)});`;
    case 'action_stop_sound':
      return `api.stopSound(${JSON.stringify(action.args.soundKey)});`;
    case 'action_change_scene':
      return `api.changeScene(${JSON.stringify(action.args.targetScene)});`;
    case 'action_create_object':
      return `api.spawn(${JSON.stringify(action.args.template)}, ${Number(action.args.x)}, ${Number(action.args.y)});`;
    case 'action_destroy_self':
      return `api.destroySelf();`;
    case 'action_set_active':
      return `api.setActive(${JSON.stringify(action.args.target)}, ${!!action.args.active});`;
    case 'action_set_visible':
      return `api.setVisible(${JSON.stringify(action.args.target)}, ${!!action.args.visible});`;
    case 'action_emit_event':
      return `api.emit(${JSON.stringify(action.args.eventName)});`;
    case 'action_wait':
      return `api.wait(${Number(action.args.duration)});`;
    default:
      return `/* unknown action: ${action.op} */`;
  }
}
