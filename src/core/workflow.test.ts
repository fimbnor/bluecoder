import { describe, expect, it } from 'vitest';
import {
  createWorkflow,
  defaultPreferences,
  defaultWorkspace,
  exportReport,
  restoreWorkspace,
  transition,
} from './workflow';

const plan = () =>
  createWorkflow('Criar onboarding com aprovação manual', 'bluecoder', defaultPreferences);

describe('approval and ordered execution', () => {
  it('cannot start, finish tasks or finish a workflow before approval', () => {
    const workflow = plan();
    for (const action of [
      { type: 'start' as const },
      { type: 'task_started' as const, taskId: 'architecture' },
      { type: 'task_completed' as const, taskId: 'architecture', result: 'Invalid result' },
      { type: 'complete' as const },
    ])
      expect(transition(workflow, action)).toBe(workflow);
  });

  it('requires tasks to start in order and complete before delivery', () => {
    let workflow = transition(transition(plan(), { type: 'approve' }), { type: 'start' });
    expect(transition(workflow, { type: 'task_started', taskId: 'implementation' })).toBe(workflow);
    expect(transition(workflow, { type: 'complete' })).toBe(workflow);
    for (const task of workflow.tasks) {
      workflow = transition(workflow, { type: 'task_started', taskId: task.id });
      workflow = transition(workflow, {
        type: 'task_completed',
        taskId: task.id,
        result: 'Simulated',
      });
    }
    workflow = transition(workflow, { type: 'complete' });
    expect(workflow.status).toBe('completed');
    expect(workflow.events.at(-1)?.message).toContain('Nenhum arquivo foi alterado');
  });

  it('preserves completed checkpoints on pause and ignores late results', () => {
    let workflow = transition(transition(plan(), { type: 'approve' }), { type: 'start' });
    workflow = transition(workflow, { type: 'task_started', taskId: 'architecture' });
    workflow = transition(workflow, {
      type: 'task_completed',
      taskId: 'architecture',
      result: 'Done',
    });
    workflow = transition(workflow, { type: 'task_started', taskId: 'implementation' });
    workflow = transition(workflow, { type: 'pause' });
    expect(workflow.tasks.map((t) => t.status)).toEqual(['completed', 'pending', 'pending']);
    expect(
      transition(workflow, { type: 'task_completed', taskId: 'implementation', result: 'Late' }),
    ).toBe(workflow);
    expect(transition(workflow, { type: 'start' }).status).toBe('running');
  });

  it('records adapter failures and resets failed tasks on retry', () => {
    let workflow = transition(transition(plan(), { type: 'approve' }), { type: 'start' });
    workflow = transition(workflow, { type: 'task_started', taskId: 'architecture' });
    workflow = transition(workflow, {
      type: 'task_failed',
      taskId: 'architecture',
      error: 'Adapter unavailable',
    });
    expect(workflow.status).toBe('paused');
    expect(workflow.tasks[0].result).toBe('Adapter unavailable');
    const retry = transition(workflow, { type: 'start' });
    expect(retry.tasks[0].status).toBe('pending');
    expect(retry.tasks[0].result).toBeUndefined();
  });
});

describe('local persistence and truthful reports', () => {
  it('recovers interrupted runs as paused and retains checkpoints', () => {
    let workflow = transition(transition(plan(), { type: 'approve' }), { type: 'start' });
    workflow = transition(workflow, { type: 'task_started', taskId: 'architecture' });
    const restored = restoreWorkspace(JSON.stringify({ ...defaultWorkspace, workflow }));
    expect(restored.workflow?.status).toBe('paused');
    expect(restored.workflow?.tasks[0].status).toBe('pending');
  });

  it.each([
    'invalid json',
    '{}',
    '{"version":99}',
    '{"version":1,"workflow":{"status":"running"}}',
  ])('recovers invalid storage: %s', (raw) => {
    expect(restoreWorkspace(raw)).toEqual(defaultWorkspace);
  });

  it('rejects empty objectives and snapshots preferences', () => {
    expect(() => createWorkflow(' ', 'bluecoder', defaultPreferences)).toThrow();
    const preferences = { ...defaultPreferences };
    const workflow = createWorkflow('Criar um novo onboarding', 'bluecoder', preferences);
    preferences.stack = 'Different stack';
    expect(workflow.preferences.stack).toBe(defaultPreferences.stack);
  });

  it('labels the exported report as a simulation with no real tests', () => {
    const report = exportReport(plan());
    expect(report).toContain('Nenhum código foi gerado, arquivo alterado ou teste executado');
    expect(report).toContain('## Registro');
    expect(report).toContain('Aguardando aprovação explícita');
  });
});
