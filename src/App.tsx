import { useEffect, useReducer, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Bot,
  Boxes,
  Braces,
  Check,
  CheckCheck,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleDot,
  Code2,
  FileCheck2,
  FileText,
  FolderGit2,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  Monitor,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow as WorkflowIcon,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { mockAdapter } from './adapters/mock';
import { runWorkflow } from './core/runner';
import {
  createWorkflow,
  exportReport,
  preferencesSchema,
  restoreWorkspace,
  storageKey,
  transition,
} from './core/workflow';
import type { Preferences, Task, Workflow, WorkflowAction, Workspace } from './core/workflow';

type View = 'workspace' | 'agents' | 'activity' | 'settings';
type Action =
  | { type: 'create'; objective: string }
  | { type: 'workflow'; id: string; action: WorkflowAction }
  | { type: 'reset' }
  | { type: 'settings'; project: string; preferences: Preferences };

function reducer(state: Workspace, action: Action): Workspace {
  switch (action.type) {
    case 'create':
      return {
        ...state,
        workflow: createWorkflow(action.objective, state.project, state.preferences),
      };
    case 'workflow':
      return state.workflow?.id === action.id
        ? { ...state, workflow: transition(state.workflow, action.action) }
        : state;
    case 'reset':
      return { ...state, workflow: null };
    case 'settings':
      return { ...state, project: action.project, preferences: action.preferences };
  }
}

const controlLabels = { guided: 'Guiado', automatic: 'Automático', expert: 'Especialista' };
const agentInfo: Record<
  Task['agent'],
  { name: string; role: string; icon: LucideIcon; color: string }
> = {
  architect: { name: 'Architect', role: 'Planejamento e decisões', icon: Boxes, color: 'violet' },
  coder: { name: 'Coder', role: 'Implementação', icon: Code2, color: 'blue' },
  qa: { name: 'QA Reviewer', role: 'Validação e revisão', icon: ShieldCheck, color: 'green' },
};

function Pill({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    try {
      return restoreWorkspace(localStorage.getItem(storageKey));
    } catch {
      return restoreWorkspace(null);
    }
  });
  const [view, setView] = useState<View>('workspace');
  const [storageError, setStorageError] = useState(false);
  const [notice, setNotice] = useState('');
  const workflowId = state.workflow?.id;
  const workflowStatus = state.workflow?.status;

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);

  useEffect(() => {
    if (!state.workflow || workflowStatus !== 'running') return;
    const controller = new AbortController();
    const workflow = state.workflow;
    void runWorkflow(
      workflow,
      mockAdapter,
      (action) => {
        dispatch({ type: 'workflow', id: workflow.id, action });
      },
      controller.signal,
    ).catch(() => {
      dispatch({ type: 'workflow', id: workflow.id, action: { type: 'pause' } });
      setNotice('Não foi possível iniciar a simulação. O plano foi preservado para retomada.');
    });
    return () => controller.abort();
    // Each run owns its task snapshot. Task events must not restart the runner.
  }, [workflowId, workflowStatus]);

  const act = (action: WorkflowAction) => {
    if (state.workflow) dispatch({ type: 'workflow', id: state.workflow.id, action });
  };

  const nav: { id: View; label: string; icon: LucideIcon }[] = [
    { id: 'workspace', label: 'Workspace', icon: LayoutDashboard },
    { id: 'agents', label: 'Agentes', icon: Bot },
    { id: 'activity', label: 'Atividade', icon: Activity },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => setView('workspace')}
          aria-label="BlueCoder: abrir workspace"
        >
          <span className="brand-mark">
            <Braces size={23} strokeWidth={2.5} />
          </span>
          <span>
            Blue<span className="brand-light">Coder</span>
            <small>DEVELOPMENT WORKSPACE</small>
          </span>
        </button>
        <div className="workspace-switch">
          <span className="workspace-avatar">B</span>
          <span>
            Meu workspace<small>Ambiente local</small>
          </span>
          <LockKeyhole size={13} />
        </div>
        <p className="nav-label">DESENVOLVER</p>
        <nav aria-label="Navegação principal">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? 'active' : ''}`}
              onClick={() => setView(id)}
              aria-current={view === id ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === 'agents' && <span className="nav-count">3</span>}
              {id === 'workspace' && view === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="project-nav">
          <p className="nav-label">PROJETO ATUAL</p>
          <button onClick={() => setView('settings')} className="project-link">
            <FolderGit2 size={17} />
            <span>{state.project}</span>
            <ChevronRight size={14} />
          </button>
          <div className="project-branch">
            <span className="branch-line" />
            <GitBranch size={12} /> contexto de demonstração
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="local-note">
            <span className="local-icon">
              <Monitor size={18} />
            </span>
            <strong>Seu código. Seu controle.</strong>
            <p>Planeje e revise antes de executar.</p>
            <span>
              <span className="status-dot" /> Local-first, por princípio
            </span>
          </div>
          <button
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
            aria-current={view === 'settings' ? 'page' : undefined}
          >
            <Settings2 size={18} />
            <span>Preferências</span>
          </button>
          <div className="sidebar-footer">
            <span className="user-avatar">D</span>
            <span>
              Desenvolvedor<small>Workspace pessoal</small>
            </span>
            <span className="version">v0.1</span>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Meu workspace</span>
            <ChevronRight size={14} />
            <strong>
              {view === 'workspace'
                ? 'Visão geral'
                : view === 'agents'
                  ? 'Agentes'
                  : view === 'activity'
                    ? 'Atividade'
                    : 'Preferências'}
            </strong>
          </div>
          <div className="topbar-status">
            <span className="runtime-label">
              <span className="status-dot" />
              {isTauri() ? 'Desktop local' : 'Preview no navegador'}
            </span>
            <Pill tone="demo">
              <CircleDot size={12} /> Modo demonstração
            </Pill>
          </div>
        </header>
        <main>
          {storageError && (
            <div className="alert" role="alert">
              O armazenamento local está indisponível. Este trabalho será perdido ao fechar a
              janela.
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button
                className="icon-button"
                aria-label="Fechar aviso"
                onClick={() => setNotice('')}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {view === 'workspace' && (
            <WorkspaceView
              state={state}
              onCreate={(objective) => dispatch({ type: 'create', objective })}
              act={act}
              onReset={() => dispatch({ type: 'reset' })}
              onSettings={() => setView('settings')}
            />
          )}
          {view === 'agents' && <AgentsView />}
          {view === 'activity' && <ActivityView workflow={state.workflow} />}
          {view === 'settings' && (
            <SettingsView
              state={state}
              onSave={(project, preferences) => {
                dispatch({ type: 'settings', project, preferences });
                setNotice(
                  'Preferências salvas neste dispositivo. Serão aplicadas aos novos planos.',
                );
              }}
            />
          )}
          <footer className="page-footer">
            <span>
              <Braces size={13} /> Feito para construir com intenção.
            </span>
            <span>BlueCoder · Protótipo 0.1.0</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function WorkspaceView({
  state,
  onCreate,
  act,
  onReset,
  onSettings,
}: {
  state: Workspace;
  onCreate: (objective: string) => void;
  act: (action: WorkflowAction) => void;
  onReset: () => void;
  onSettings: () => void;
}) {
  const workflow = state.workflow;
  const activeStep = !workflow
    ? 0
    : workflow.status === 'awaiting_approval' || workflow.status === 'approved'
      ? 1
      : workflow.status === 'completed'
        ? 3
        : 2;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span /> SEU PRÓXIMO PASSO COMEÇA AQUI
          </div>
          <h1>
            Da ideia ao código.
            <br />
            <span>Com você no controle.</span>
          </h1>
          <p>Um objetivo claro. Os agentes certos. Cada decisão, no seu ritmo.</p>
        </div>
        <div className="heading-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-node node-a">
            <Boxes size={22} />
          </div>
          <div className="art-node node-b">
            <ShieldCheck size={20} />
          </div>
          <div className="art-core">
            <Braces size={37} />
          </div>
          <span className="art-spark" />
        </div>
      </div>
      <div className="journey" aria-label="Etapas do fluxo">
        {['Defina o objetivo', 'Revise o plano', 'Acompanhe a execução', 'Revise a entrega'].map(
          (label, index) => (
            <div
              key={label}
              className={`journey-step ${index === activeStep ? 'current' : index < activeStep ? 'done' : ''}`}
            >
              <span className="step-number">
                {index < activeStep ? <Check size={13} /> : `0${index + 1}`}
              </span>
              <span>{label}</span>
              {index < 3 && <ChevronRight size={14} className="journey-arrow" />}
            </div>
          ),
        )}
      </div>
      <div className="workspace-grid">
        <div className="work-column">
          <section className="panel project-panel">
            <span className="project-icon">
              <FolderGit2 size={21} />
            </span>
            <div className="project-title">
              <strong>{workflow?.project ?? state.project}</strong>
              <span>Contexto demonstrativo · nenhum arquivo conectado</span>
            </div>
            <button className="text-button" onClick={onSettings}>
              Configurar <ArrowRight size={14} />
            </button>
          </section>
          {!workflow ? (
            <ObjectiveForm onCreate={onCreate} preferences={state.preferences} />
          ) : (
            <BriefPanel workflow={workflow} act={act} onReset={onReset} />
          )}
          <section className="trust-strip">
            <ShieldCheck size={20} />
            <div>
              <strong>Aprovação antes da ação.</strong>
              <p>Você revisa o plano e decide quando começar. Nenhum provedor está conectado.</p>
            </div>
            <LockKeyhole size={15} />
          </section>
        </div>
        <aside className="context-column" aria-label="Contexto da execução">
          <section className="panel agents-panel">
            <div className="panel-heading">
              <h2>
                <Bot size={17} /> Sua equipe de agentes
              </h2>
              <Pill>DEMO</Pill>
            </div>
            <p className="panel-description">Papéis especializados, um objetivo em comum.</p>
            <div className="agent-list">
              {Object.entries(agentInfo).map(([id, info]) => {
                const task = workflow?.tasks.find((t) => t.agent === id);
                return (
                  <div className="agent-row" key={id}>
                    <span className={`agent-icon ${info.color}`}>
                      <info.icon size={19} />
                    </span>
                    <div>
                      <strong>{info.name}</strong>
                      <small>{info.role}</small>
                    </div>
                    {task?.status === 'running' ? (
                      <LoaderCircle size={15} className="spin accent" aria-label="Executando" />
                    ) : task?.status === 'completed' ? (
                      <CircleCheck size={15} className="success" aria-label="Concluído" />
                    ) : (
                      <span className="idle-dot" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="agent-footnote">
              <span className="status-dot amber" /> Adaptador simulado · sem chamadas de API
            </div>
          </section>
          <section className="panel session-panel">
            <div className="panel-heading">
              <h2>
                <Settings2 size={16} /> Nesta sessão
              </h2>
            </div>
            <dl>
              <div>
                <dt>Nível de controle</dt>
                <dd>{controlLabels[workflow?.preferences.control ?? state.preferences.control]}</dd>
              </div>
              <div>
                <dt>Aprovação</dt>
                <dd>
                  <ShieldCheck size={13} /> Manual
                </dd>
              </div>
              <div>
                <dt>Execução</dt>
                <dd>Simulada</dd>
              </div>
              <div>
                <dt>Persistência</dt>
                <dd>Este dispositivo</dd>
              </div>
            </dl>
            <button onClick={onSettings} className="text-button">
              Ajustar preferências <ArrowRight size={13} />
            </button>
          </section>
          <div className="tip-card">
            <Sparkles size={17} />
            <div>
              <strong>Clareza é um bom começo.</strong>
              <p>
                Descreva o resultado esperado e os limites. Um bom plano começa com um objetivo
                específico.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function ObjectiveForm({
  onCreate,
  preferences,
}: {
  onCreate: (objective: string) => void;
  preferences: Preferences;
}) {
  const [objective, setObjective] = useState('');
  const [error, setError] = useState('');
  const examples = [
    'Criar o onboarding de um novo projeto',
    'Adicionar aprovação antes da execução',
    'Estruturar os adaptadores de agentes',
  ];
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (objective.trim().length < 12) {
      setError('Descreva o objetivo com pelo menos 12 caracteres.');
      return;
    }
    onCreate(objective);
  };
  return (
    <section className="panel objective-panel">
      <div className="section-heading">
        <span className="section-icon">
          <Sparkles size={18} />
        </span>
        <div>
          <h2>O que vamos construir?</h2>
          <p>Conte o objetivo. Vamos organizar os próximos passos.</p>
        </div>
        <Pill tone="subtle">NOVO OBJETIVO</Pill>
      </div>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="objective">
          Objetivo do projeto
        </label>
        <div className="textarea-wrap">
          <textarea
            id="objective"
            placeholder="Ex.: Quero criar um fluxo de onboarding para conectar um repositório, escolher a stack e gerar um plano de execução…"
            value={objective}
            maxLength={2000}
            onChange={(event) => {
              setObjective(event.target.value);
              setError('');
            }}
            aria-describedby={error ? 'objective-error' : 'objective-hint'}
            aria-invalid={Boolean(error)}
          />
          <div className="textarea-meta">
            <span>
              <FileText size={13} /> Resultado esperado + contexto + limites
            </span>
            <span>{objective.length}/2000</span>
          </div>
        </div>
        {error && (
          <p className="field-error" id="objective-error" role="alert">
            {error}
          </p>
        )}
        <div className="suggestions">
          <span>PRECISA DE UMA IDEIA?</span>
          {examples.map((example) => (
            <button
              type="button"
              key={example}
              onClick={() => {
                setObjective(example);
                setError('');
              }}
            >
              <Plus size={12} />
              {example}
            </button>
          ))}
        </div>
        <div className="stack-context">
          <span className="stack-icon">
            <LayersIcon />
          </span>
          <div>
            <span>STACK DE REFERÊNCIA</span>
            <strong>{preferences.stack}</strong>
          </div>
          <Pill tone="subtle">Local-first</Pill>
        </div>
        <div className="compose-footer">
          <p id="objective-hint">
            <LockKeyhole size={13} /> Planejamento demonstrativo, sem acesso ao repositório.
          </p>
          <button className="button primary" type="submit">
            Gerar plano <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </section>
  );
}

function LayersIcon() {
  return <Boxes size={19} />;
}

function BriefPanel({
  workflow,
  act,
  onReset,
}: {
  workflow: Workflow;
  act: (action: WorkflowAction) => void;
  onReset: () => void;
}) {
  const completed = workflow.tasks.filter((t) => t.status === 'completed').length;
  const labels: Record<Workflow['status'], string> = {
    awaiting_approval: 'Aguardando aprovação',
    approved: 'Plano aprovado',
    running: 'Simulação em andamento',
    paused: 'Execução pausada',
    completed: 'Simulação concluída',
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([exportReport(workflow)], { type: 'text/markdown;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bluecoder-relatorio-demo.md';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="panel brief-panel">
      <div className="section-heading">
        <span className="section-icon">
          <FileCheck2 size={18} />
        </span>
        <div>
          <h2>Seu plano de execução</h2>
          <p>Um caminho claro antes do primeiro passo.</p>
        </div>
        <Pill tone={workflow.status === 'completed' ? 'green' : 'demo'}>
          {labels[workflow.status]}
        </Pill>
      </div>
      <div className="brief-content">
        <div className="brief-objective">
          <span className="small-label">OBJETIVO</span>
          <p>{workflow.objective}</p>
        </div>
        <div className="brief-meta">
          <span>
            <Braces size={13} />
            {workflow.preferences.stack}
          </span>
          <span>
            <ShieldCheck size={13} />
            {workflow.preferences.risk === 'low' ? 'Menor risco' : 'Risco equilibrado'}
          </span>
        </div>
        <p className="conventions">
          {workflow.preferences.conventions || 'Sem convenções adicionais.'}
        </p>
        <div className="subheading">
          <h3>
            <ListChecks size={16} /> Etapas planejadas
          </h3>
          <span>
            {completed}/{workflow.tasks.length} concluídas
          </span>
        </div>
        <div className="task-list">
          {workflow.tasks.map((task, index) => (
            <div key={task.id} className={`task-row task-${task.status}`}>
              <span className="task-state">
                {task.status === 'completed' ? (
                  <Check size={16} />
                ) : task.status === 'running' ? (
                  <LoaderCircle className="spin" size={16} />
                ) : task.status === 'failed' ? (
                  <X size={16} />
                ) : (
                  `0${index + 1}`
                )}
              </span>
              <div>
                <strong>{task.title}</strong>
                <p>{task.result ?? task.detail}</p>
                <small>
                  {agentInfo[task.agent].name} <span>·</span>{' '}
                  {task.status === 'pending'
                    ? 'Aguardando'
                    : task.status === 'running'
                      ? 'Simulando'
                      : task.status === 'completed'
                        ? 'Concluída na simulação'
                        : 'Falhou'}
                </small>
              </div>
            </div>
          ))}
        </div>
        <details className="criteria">
          <summary>
            Critérios de aceite do plano <ChevronRight size={14} />
          </summary>
          <ul>
            {workflow.criteria.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </details>
        {workflow.status === 'completed' && (
          <div className="completion" role="status">
            <CircleCheck size={20} />
            <div>
              <strong>O fluxo demonstrativo foi concluído.</strong>
              <p>
                Nenhum código foi gerado ou testado. O relatório registra as etapas para você
                revisar.
              </p>
            </div>
          </div>
        )}
        {workflow.status === 'paused' && (
          <div className="inline-note" role="status">
            <Pause size={15} /> Plano preservado. Retome a partir da primeira etapa pendente.
          </div>
        )}
      </div>
      <div className="brief-actions">
        {workflow.status !== 'running' && (
          <button className="button secondary" onClick={onReset}>
            <RotateCcw size={14} /> Novo objetivo
          </button>
        )}
        {workflow.status === 'awaiting_approval' && (
          <button className="button primary" onClick={() => act({ type: 'approve' })}>
            <CheckCheck size={16} /> Aprovar plano
          </button>
        )}
        {workflow.status === 'approved' && (
          <button className="button primary" onClick={() => act({ type: 'start' })}>
            <Play size={15} /> Iniciar simulação
          </button>
        )}
        {workflow.status === 'paused' && (
          <button className="button primary" onClick={() => act({ type: 'start' })}>
            <Play size={15} /> Retomar simulação
          </button>
        )}
        {workflow.status === 'running' && (
          <>
            <span className="running-caption">
              <LoaderCircle size={14} className="spin" /> Somente simulação
            </span>
            <button className="button secondary" onClick={() => act({ type: 'pause' })}>
              <Pause size={15} /> Pausar
            </button>
          </>
        )}
        {workflow.status === 'completed' && (
          <button className="button primary" onClick={download}>
            <ArrowDownToLine size={16} /> Exportar relatório
          </button>
        )}
      </div>
    </section>
  );
}

function PageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="simple-heading">
      <div className="eyebrow">
        <span />
        {eyebrow}
      </div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

function AgentsView() {
  return (
    <>
      <PageTitle
        eyebrow="ORQUESTRAÇÃO COM CONTROLE"
        title="Uma equipe. Várias perspectivas."
        description="O protótipo demonstra a colaboração entre papéis. Integrações reais serão conectadas em uma próxima etapa."
      />
      <div className="agents-grid">
        {Object.entries(agentInfo).map(([id, info]) => (
          <section className="panel agent-card" key={id}>
            <span className={`agent-icon ${info.color}`}>
              <info.icon size={25} />
            </span>
            <Pill tone="demo">Simulado</Pill>
            <h2>{info.name}</h2>
            <p>{info.role}</p>
            <div className="capability">
              <Check size={14} />
              {id === 'architect'
                ? 'Estruturação do plano'
                : id === 'coder'
                  ? 'Contrato de execução demonstrativo'
                  : 'Relatório das etapas simuladas'}
            </div>
            <div className="capability muted">
              <LockKeyhole size={14} />
              Sem acesso a arquivos ou comandos
            </div>
          </section>
        ))}
      </div>
      <section className="panel integration-panel">
        <div className="section-heading">
          <span className="section-icon">
            <Terminal size={19} />
          </span>
          <div>
            <h2>Próximas integrações</h2>
            <p>Adaptadores neutros, com capacidades e permissões explícitas.</p>
          </div>
        </div>
        <div className="integration-row">
          <strong>Codex</strong>
          <span>Integração oficial a implementar</span>
          <Pill>Não conectado</Pill>
        </div>
        <div className="integration-row">
          <strong>Claude Code</strong>
          <span>Integração oficial a implementar</span>
          <Pill>Não conectado</Pill>
        </div>
        <p className="integration-note">
          <ShieldCheck size={15} /> Nenhuma credencial é solicitada ou armazenada neste protótipo.
        </p>
      </section>
    </>
  );
}

function ActivityView({ workflow }: { workflow: Workflow | null }) {
  return (
    <>
      <PageTitle
        eyebrow="CADA PASSO, REGISTRADO"
        title="Atividade do projeto"
        description="Acompanhe as decisões, aprovações e resultados da simulação atual."
      />
      <section className="panel activity-panel">
        <div className="panel-heading">
          <h2>
            <Activity size={17} /> Registro da sessão
          </h2>
          <Pill>{workflow ? `${workflow.events.length} eventos` : 'Sem eventos'}</Pill>
        </div>
        {workflow ? (
          <ol className="event-list">
            {workflow.events.map((event, i) => (
              <li key={`${event.at}-${i}`}>
                <span className="event-dot">
                  <Circle size={8} />
                </span>
                <div>
                  <p>{event.message}</p>
                  <time dateTime={event.at}>{new Date(event.at).toLocaleString('pt-BR')}</time>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-state">
            <WorkflowIcon size={32} />
            <h3>A história começa com um objetivo.</h3>
            <p>Crie um plano no workspace para começar o registro.</p>
          </div>
        )}
      </section>
    </>
  );
}

function SettingsView({
  state,
  onSave,
}: {
  state: Workspace;
  onSave: (project: string, preferences: Preferences) => void;
}) {
  const [error, setError] = useState('');
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = preferencesSchema.safeParse(Object.fromEntries(data));
    const project = String(data.get('project') ?? '').trim();
    if (!result.success || !project || project.length > 80) {
      setError('Preencha o nome do projeto e uma stack válida.');
      return;
    }
    onSave(project, result.data);
    setError('');
  };
  return (
    <>
      <PageTitle
        eyebrow="DO SEU JEITO"
        title="Preferências do workspace"
        description="Defina o contexto dos novos planos. As preferências ficam neste dispositivo."
      />
      <form className="panel settings-panel" onSubmit={save}>
        <div className="panel-heading">
          <h2>
            <Settings2 size={17} /> Projeto e planejamento
          </h2>
          <Pill tone="green">Local</Pill>
        </div>
        <div className="settings-fields">
          <label>
            Nome do projeto
            <input name="project" required maxLength={80} defaultValue={state.project} />
            <small>Rótulo de demonstração. Não conecta nem lê uma pasta real.</small>
          </label>
          <label>
            Stack preferida
            <input name="stack" required maxLength={160} defaultValue={state.preferences.stack} />
          </label>
          <div className="field-grid">
            <label>
              Nível de controle
              <select name="control" defaultValue={state.preferences.control}>
                <option value="guided">Guiado</option>
                <option value="automatic">Automático</option>
                <option value="expert">Especialista</option>
              </select>
              <small>
                Registra sua preferência no plano. A execução continua manual neste protótipo.
              </small>
            </label>
            <label>
              Tolerância a risco
              <select name="risk" defaultValue={state.preferences.risk}>
                <option value="low">Menor risco</option>
                <option value="balanced">Equilibrado</option>
              </select>
              <small>Contexto para o planejamento dos agentes.</small>
            </label>
          </div>
          <label>
            Convenções de desenvolvimento
            <textarea
              name="conventions"
              maxLength={1000}
              rows={3}
              defaultValue={state.preferences.conventions}
            />
          </label>
          <div className="settings-safety">
            <ShieldCheck size={19} />
            <div>
              <strong>Aprovação manual neste protótipo</strong>
              <p>
                Todos os planos precisam de aprovação explícita. Modos smart e autopilot ainda não
                estão implementados.
              </p>
            </div>
          </div>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="brief-actions">
          <span className="muted">Não armazene senhas ou tokens nestes campos.</span>
          <button type="submit" className="button primary">
            <Check size={16} /> Salvar preferências
          </button>
        </div>
      </form>
    </>
  );
}
