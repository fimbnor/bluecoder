import { z } from 'zod';

export const preferencesSchema = z.object({
  control: z.enum(['guided', 'automatic', 'expert']),
  stack: z.string().trim().min(1).max(160),
  conventions: z.string().max(1000),
  risk: z.enum(['low', 'balanced']),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences: Preferences = {
  control: 'guided',
  stack: 'Tauri 2 · React · TypeScript · Rust',
  conventions: 'Tipagem estrita, componentes acessíveis e testes para regras de negócio.',
  risk: 'low',
};

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  agent: z.enum(['architect', 'coder', 'qa']),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  result: z.string().optional(),
});
export type Task = z.infer<typeof taskSchema>;
export const workflowSchema = z.object({
  id: z.string(),
  objective: z.string().min(12).max(2000),
  project: z.string().min(1).max(80),
  createdAt: z.string(),
  preferences: preferencesSchema,
  criteria: z.array(z.string()).min(1),
  tasks: z.array(taskSchema).min(1),
  status: z.enum(['awaiting_approval', 'approved', 'running', 'paused', 'completed']),
  events: z.array(z.object({ at: z.string(), message: z.string() })),
});
export type Workflow = z.infer<typeof workflowSchema>;

export function createWorkflow(
  objective: string,
  project: string,
  preferences: Preferences,
): Workflow {
  const at = new Date().toISOString();
  return workflowSchema.parse({
    id: crypto.randomUUID(),
    objective: objective.trim(),
    project: project.trim(),
    createdAt: at,
    preferences: { ...preferences },
    status: 'awaiting_approval',
    criteria: [
      `Objetivo registrado: ${objective.trim()}`,
      `Planejamento alinhado à stack ${preferences.stack}.`,
      'Todas as etapas simuladas concluídas, com resultados registrados para revisão.',
    ],
    tasks: [
      {
        id: 'architecture',
        agent: 'architect',
        title: 'Definir a abordagem',
        detail: 'Organizar o objetivo, as decisões técnicas e os limites do trabalho.',
        status: 'pending',
      },
      {
        id: 'implementation',
        agent: 'coder',
        title: 'Simular a implementação',
        detail: 'Percorrer o contrato do agente sem executar comandos ou alterar arquivos.',
        status: 'pending',
      },
      {
        id: 'validation',
        agent: 'qa',
        title: 'Revisar a entrega simulada',
        detail: 'Conferir as etapas e preparar o relatório de demonstração.',
        status: 'pending',
      },
    ],
    events: [{ at, message: 'Plano criado. Aguardando aprovação explícita.' }],
  });
}

export type WorkflowAction =
  | { type: 'approve' }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'task_started'; taskId: string }
  | { type: 'task_completed'; taskId: string; result: string }
  | { type: 'task_failed'; taskId: string; error: string }
  | { type: 'complete' };

// All execution transitions pass through this gate, including mock adapters.
export function transition(workflow: Workflow, action: WorkflowAction): Workflow {
  const record = (next: Workflow, message: string): Workflow => ({
    ...next,
    events: [...workflow.events, { at: new Date().toISOString(), message }],
  });
  switch (action.type) {
    case 'approve':
      return workflow.status === 'awaiting_approval'
        ? record({ ...workflow, status: 'approved' }, 'Plano aprovado pelo usuário.')
        : workflow;
    case 'start':
      return ['approved', 'paused'].includes(workflow.status)
        ? record(
            {
              ...workflow,
              status: 'running',
              tasks: workflow.tasks.map((t) =>
                t.status === 'failed' ? { ...t, status: 'pending', result: undefined } : t,
              ),
            },
            'Execução simulada iniciada.',
          )
        : workflow;
    case 'pause':
      return workflow.status === 'running'
        ? record(
            {
              ...workflow,
              status: 'paused',
              tasks: workflow.tasks.map((t) =>
                t.status === 'running' ? { ...t, status: 'pending' } : t,
              ),
            },
            'Execução pausada. Etapas concluídas foram preservadas.',
          )
        : workflow;
    case 'task_started': {
      const next = workflow.tasks.find((t) => t.status !== 'completed');
      if (workflow.status !== 'running' || next?.id !== action.taskId || next.status !== 'pending')
        return workflow;
      return record(
        {
          ...workflow,
          tasks: workflow.tasks.map((t) =>
            t.id === action.taskId ? { ...t, status: 'running' } : t,
          ),
        },
        `${next.title}: em andamento.`,
      );
    }
    case 'task_completed':
    case 'task_failed': {
      if (workflow.status !== 'running') return workflow;
      const task = workflow.tasks.find((t) => t.id === action.taskId);
      if (task?.status !== 'running') return workflow;
      const failed = action.type === 'task_failed';
      return record(
        {
          ...workflow,
          status: failed ? 'paused' : workflow.status,
          tasks: workflow.tasks.map((t) =>
            t.id !== action.taskId
              ? t
              : {
                  ...t,
                  status: failed ? 'failed' : 'completed',
                  result: failed ? action.error : action.result,
                },
          ),
        },
        `${task.title}: ${failed ? 'falhou; aguardando retomada' : 'concluída na simulação'}.`,
      );
    }
    case 'complete':
      return workflow.status === 'running' && workflow.tasks.every((t) => t.status === 'completed')
        ? record(
            { ...workflow, status: 'completed' },
            'Demonstração concluída. Nenhum arquivo foi alterado e nenhum teste de código foi executado.',
          )
        : workflow;
  }
}

const savedSchema = z.object({
  version: z.literal(1),
  project: z.string().trim().min(1).max(80),
  preferences: preferencesSchema,
  workflow: workflowSchema.nullable(),
});
export type Workspace = z.infer<typeof savedSchema>;
export const storageKey = 'bluecoder.workspace.v1';
export const defaultWorkspace: Workspace = {
  version: 1,
  project: 'bluecoder',
  preferences: defaultPreferences,
  workflow: null,
};

export function restoreWorkspace(raw: string | null): Workspace {
  if (!raw) return structuredClone(defaultWorkspace);
  try {
    const saved = savedSchema.parse(JSON.parse(raw));
    if (saved.workflow?.status === 'running') {
      saved.workflow = transition(saved.workflow, { type: 'pause' });
    }
    return saved;
  } catch {
    return structuredClone(defaultWorkspace);
  }
}

export function exportReport(workflow: Workflow): string {
  return [
    `# BlueCoder — ${workflow.project}`,
    '',
    '> Relatório de simulação. Nenhum código foi gerado, arquivo alterado ou teste executado.',
    '',
    '## Objetivo',
    workflow.objective,
    '',
    '## Stack',
    workflow.preferences.stack,
    '',
    '## Critérios do plano',
    ...workflow.criteria.map((c) => `- ${c}`),
    '',
    '## Etapas',
    ...workflow.tasks.map((t) => `- ${t.title} [${t.status}]: ${t.result ?? 'Sem resultado.'}`),
    '',
    '## Registro',
    ...workflow.events.map((e) => `- ${e.at}: ${e.message}`),
    '',
  ].join('\n');
}
