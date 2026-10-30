import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockAdapter } from '../adapters/mock';
import type { AgentAdapter } from '../adapters/types';
import { createWorkflow, defaultPreferences, transition } from './workflow';
import type { WorkflowAction } from './workflow';
import { runWorkflow } from './runner';

const plan = () =>
  createWorkflow('Criar onboarding com aprovação manual', 'bluecoder', defaultPreferences);
const running = () => transition(transition(plan(), { type: 'approve' }), { type: 'start' });
afterEach(() => vi.useRealTimers());

describe('mock runner', () => {
  it('rejects unapproved plans and live integrations', async () => {
    const execute = vi.fn();
    const adapter: AgentAdapter = { ...mockAdapter, execute };
    await expect(
      runWorkflow(plan(), adapter, vi.fn(), new AbortController().signal),
    ).rejects.toThrow('Aprovação');
    await expect(
      runWorkflow(running(), { ...adapter, mode: 'live' }, vi.fn(), new AbortController().signal),
    ).rejects.toThrow('reais');
    expect(execute).not.toHaveBeenCalled();
  });

  it('executes remaining tasks in order and preserves completed checkpoints', async () => {
    let workflow = running();
    workflow = transition(workflow, { type: 'task_started', taskId: 'architecture' });
    workflow = transition(workflow, {
      type: 'task_completed',
      taskId: 'architecture',
      result: 'Checkpoint',
    });
    const execute = vi.fn().mockResolvedValue({ summary: 'Simulated' });
    await runWorkflow(
      workflow,
      { ...mockAdapter, execute },
      (action) => {
        workflow = transition(workflow, action);
      },
      new AbortController().signal,
    );
    expect(execute.mock.calls.map((call) => call[0].id)).toEqual(['implementation', 'validation']);
    expect(workflow.status).toBe('completed');
    expect(workflow.tasks[0].result).toBe('Checkpoint');
  });

  it('aborts promptly without recording a late result or completion', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const events: WorkflowAction[] = [];
    const run = runWorkflow(
      running(),
      mockAdapter,
      (event) => events.push(event),
      controller.signal,
    );
    controller.abort();
    await run;
    await vi.runAllTimersAsync();
    expect(events).toEqual([{ type: 'task_started', taskId: 'architecture' }]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('records failures without attempting the next task', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('Unavailable'));
    const events: WorkflowAction[] = [];
    await runWorkflow(
      running(),
      { ...mockAdapter, execute },
      (e) => events.push(e),
      new AbortController().signal,
    );
    expect(execute).toHaveBeenCalledTimes(1);
    expect(events.at(-1)).toEqual({
      type: 'task_failed',
      taskId: 'architecture',
      error: 'Unavailable',
    });
  });
});
