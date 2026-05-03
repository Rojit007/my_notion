import type { BlockDefinition, BlockType, BlockCategory } from '@/store/types';

export const BLOCK_CATEGORIES: BlockCategory[] = ['event', 'condition', 'action'];

export const BLOCK_DEFINITIONS: Partial<Record<BlockType, BlockDefinition>> = {
  // ---- Events ----
  event_on_start: {
    type: 'event_on_start', category: 'event', label: 'On Start', color: '#F59E0B',
    description: 'Fires once when the scene starts',
    inputPorts: [], outputPorts: [{ id: 'flow_out', label: '', type: 'flow' }],
    params: [],
  },
  event_on_update: {
    type: 'event_on_update', category: 'event', label: 'On Update', color: '#F59E0B',
    description: 'Fires every frame',
    inputPorts: [], outputPorts: [{ id: 'flow_out', label: '', type: 'flow' }],
    params: [],
  },
  event_on_collision: {
    type: 'event_on_collision', category: 'event', label: 'On Collision', color: '#F59E0B',
    description: 'Fires when this object collides with another',
    inputPorts: [], outputPorts: [{ id: 'flow_out', label: '', type: 'flow' }],
    params: [],
  },
  event_on_key_press: {
    type: 'event_on_key_press', category: 'event', label: 'On Key Press', color: '#F59E0B',
    description: 'Fires when a key is pressed',
    inputPorts: [], outputPorts: [{ id: 'flow_out', label: '', type: 'flow' }],
    params: [{ key: 'key', label: 'Key', inputType: 'select', options: ['SPACE', 'LEFT', 'RIGHT', 'UP', 'DOWN', 'W', 'A', 'S', 'D', 'ENTER', 'ESC'], default: 'SPACE' }],
  },
  event_on_timer: {
    type: 'event_on_timer', category: 'event', label: 'On Timer', color: '#F59E0B',
    description: 'Fires after a delay',
    inputPorts: [], outputPorts: [{ id: 'flow_out', label: '', type: 'flow' }],
    params: [
      { key: 'delay', label: 'Delay (ms)', inputType: 'number', default: 1000 },
      { key: 'loop',  label: 'Loop',       inputType: 'boolean', default: false },
    ],
  },
  event_on_pointer_down: {
    type: 'event_on_pointer_down', category: 'event', label: 'On Click', color: '#F59E0B',
    description: 'Fires when the object is clicked',
    inputPorts: [], outputPorts: [{ id: 'flow_out', label: '', type: 'flow' }],
    params: [],
  },

  // ---- Conditions ----
  cond_if_variable: {
    type: 'cond_if_variable', category: 'condition', label: 'If Variable', color: '#22D3EE',
    description: 'Check if a variable meets a condition',
    inputPorts: [{ id: 'flow_in', label: '', type: 'flow' }],
    outputPorts: [{ id: 'flow_true', label: 'True', type: 'flow' }, { id: 'flow_false', label: 'False', type: 'flow' }],
    params: [
      { key: 'varName',  label: 'Variable', inputType: 'text',   default: 'score' },
      { key: 'operator', label: 'Op',       inputType: 'select', options: ['>', '<', '>=', '<=', '==', '!='], default: '>=' },
      { key: 'value',    label: 'Value',    inputType: 'number', default: 0 },
    ],
  },
  cond_if_key_held: {
    type: 'cond_if_key_held', category: 'condition', label: 'If Key Held', color: '#22D3EE',
    description: 'True while a key is held',
    inputPorts: [{ id: 'flow_in', label: '', type: 'flow' }],
    outputPorts: [{ id: 'flow_true', label: 'True', type: 'flow' }, { id: 'flow_false', label: 'False', type: 'flow' }],
    params: [{ key: 'key', label: 'Key', inputType: 'select', options: ['LEFT', 'RIGHT', 'UP', 'DOWN', 'W', 'A', 'S', 'D', 'SPACE'], default: 'RIGHT' }],
  },

  // ---- Actions ----
  action_move: {
    type: 'action_move', category: 'action', label: 'Set Velocity', color: '#6366F1',
    description: 'Set the object velocity',
    inputPorts: [{ id: 'flow_in', label: '', type: 'flow' }],
    outputPorts: [{ id: 'flow_out', label: '', type: 'flow' }],
    params: [
      { key: 'velocityX', label: 'Vel X', inputType: 'number', default: 0 },
      { key: 'velocityY', label: 'Vel Y', inputType: 'number', default: 0 },
    ],
  },
  action_jump: {
    type: 'action_jump', category: 'action', label: 'Jump', color: '#6366F1',
    description: 'Apply upward velocity',
    inputPorts: [{ id: 'flow_in', label: '', type: 'flow' }],
    outputPorts: [{ id: 'flow_out', label: '', type: 'flow' }],
    params: [{ key: 'force', label: 'Force', inputType: 'number', default: -400 }],
  },
  action_set_variable: {
    type: 'action_set_variable', category: 'action', label: 'Set Variable', color: '#6366F1',
    description: 'Set a variable to a value',
    inputPorts: [{ id: 'flow_in', label: '', type: 'flow' }],
    outputPorts: [{ id: 'flow_out', label: '', type: 'flow' }],
    params: [
      { key: 'varName', label: 'Variable', inputType: 'text',   default: 'score' },
      { key: 'value',   label: 'Value',    inputType: 'number', default: 0 },
    ],
  },
  action_add_variable: {
    type: 'action_add_variable', category: 'action', label: 'Add to Variable', color: '#6366F1',
    description: 'Add a value to a variable',
    inputPorts: [{ id: 'flow_in', label: '', type: 'flow' }],
    outputPorts: [{ id: 'flow_out', label: '', type: 'flow' }],
    params: [
      { key: 'varName', label: 'Variable', inputType: 'text',   default: 'score' },
      { key: 'amount',  label: 'Amount',   inputType: 'number', default: 1 },
    ],
  },
  action_play_animation: {
    type: 'action_play_animation', category: 'action', label: 'Play Animation', color: '#6366F1',
    description: 'Play a sprite animation',
    inputPorts: [{ id: 'flow_in', label: '', type: 'flow' }],
    outputPorts: [{ id: 'flow_out', label: '', type: 'flow' }],
    params: [{ key: 'animKey', label: 'Anim', inputType: 'text', default: 'walk' }],
  },
  action_play_sound: {
    type: 'action_play_sound', category: 'action', label: 'Play Sound', color: '#6366F1',
    description: 'Play an audio asset',
    inputPorts: [{ id: 'flow_in', label: '', type: 'flow' }],
    outputPorts: [{ id: 'flow_out', label: '', type: 'flow' }],
    params: [
      { key: 'soundKey', label: 'Sound',  inputType: 'text',   default: 'jump' },
      { key: 'volume',   label: 'Volume', inputType: 'number', default: 1 },
    ],
  },
  action_change_scene: {
    type: 'action_change_scene', category: 'action', label: 'Change Scene', color: '#6366F1',
    description: 'Switch to another scene',
    inputPorts: [{ id: 'flow_in', label: '', type: 'flow' }],
    outputPorts: [],
    params: [{ key: 'targetScene', label: 'Scene', inputType: 'text', default: 'Level2' }],
  },
  action_destroy_self: {
    type: 'action_destroy_self', category: 'action', label: 'Destroy Self', color: '#6366F1',
    description: 'Remove this object from the scene',
    inputPorts: [{ id: 'flow_in', label: '', type: 'flow' }],
    outputPorts: [],
    params: [],
  },
  action_set_visible: {
    type: 'action_set_visible', category: 'action', label: 'Set Visible', color: '#6366F1',
    description: 'Show or hide an object',
    inputPorts: [{ id: 'flow_in', label: '', type: 'flow' }],
    outputPorts: [{ id: 'flow_out', label: '', type: 'flow' }],
    params: [{ key: 'visible', label: 'Visible', inputType: 'boolean', default: true }],
  },
  action_wait: {
    type: 'action_wait', category: 'action', label: 'Wait', color: '#6366F1',
    description: 'Pause execution for a duration',
    inputPorts: [{ id: 'flow_in', label: '', type: 'flow' }],
    outputPorts: [{ id: 'flow_out', label: '', type: 'flow' }],
    params: [{ key: 'duration', label: 'Duration (ms)', inputType: 'number', default: 1000 }],
  },
};
