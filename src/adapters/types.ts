import type { Task, Workflow } from '../core/workflow';

export interface AgentCapabilities {
  planning: boolean;
  fileEdits: boolean;
  commandExecution: boolean;
  review: boolean;
}

export interface AgentAdapter {
  readonly id: string;
  readonly name: string;
  readonly mode: 'mock' | 'live';
  readonly capabilities: AgentCapabilities;
  execute(task: Task, brief: Workflow, signal: AbortSignal): Promise<{ summary: string }>;
}
