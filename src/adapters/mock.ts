import type { AgentAdapter } from './types';

export const mockAdapter: AgentAdapter = {
  id: 'mock',
  name: 'BlueCoder Demo',
  mode: 'mock',
  capabilities: { planning: true, fileEdits: false, commandExecution: false, review: true },
  async execute(task, brief, signal) {
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException('Execução interrompida', 'AbortError'));
      };
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort);
        resolve();
      }, 1400);
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort, { once: true });
    });
    const summaries = {
      architect: `Abordagem simulada para ${brief.project}, considerando ${brief.preferences.stack}.`,
      coder: 'Contrato de implementação percorrido. Nenhum arquivo foi criado ou modificado.',
      qa: 'Fluxo demonstrativo revisado. Testes reais e revisão de diff dependem de uma integração futura.',
    };
    return { summary: summaries[task.agent] };
  },
};
