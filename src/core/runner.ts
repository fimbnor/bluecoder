import type { AgentAdapter } from '../adapters/types';
import type { Workflow, WorkflowAction } from './workflow';

export async function runWorkflow(
  workflow: Workflow,
  adapter: AgentAdapter,
  emit: (action: WorkflowAction) => void,
  signal: AbortSignal,
): Promise<void> {
  if (workflow.status !== 'running')
    throw new Error('Aprovação e início explícitos são obrigatórios.');
  // Live execution needs its own tool permissions; this starter intentionally has no live runtime.
  if (adapter.mode !== 'mock') throw new Error('Integrações reais ainda não estão habilitadas.');
  for (const task of workflow.tasks) {
    if (signal.aborted) return;
    if (task.status === 'completed') continue;
    emit({ type: 'task_started', taskId: task.id });
    try {
      const result = await adapter.execute(task, workflow, signal);
      if (signal.aborted) return;
      emit({ type: 'task_completed', taskId: task.id, result: result.summary });
    } catch (error) {
      if (signal.aborted) return;
      emit({
        type: 'task_failed',
        taskId: task.id,
        error: error instanceof Error ? error.message : 'Erro na simulação.',
      });
      return;
    }
  }
  if (!signal.aborted) emit({ type: 'complete' });
}
