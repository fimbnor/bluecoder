# BlueCoder architecture

## Layers

1. **Desktop UI:** Tauri 2 + React + TypeScript.
2. **Local core:** Rust for filesystem permissions, process supervision, and secure storage.
3. **Orchestration:** stateful task graph with approval gates, retries, and checkpoints.
4. **Agent adapters:** capability-driven interfaces for Codex, Claude Code, and future providers.
5. **Project intelligence:** local repository index, decision records, and relevant context retrieval.
6. **QA:** test results, diff inspection, and human review.

## Safety boundaries

Agent execution must use official, permitted integrations. No credential scraping. Separate prompt approval from permission to run destructive operations. Avoid concurrent writes to shared binary assets. Never claim subscription usage is equivalent to API access.

## MVP milestones

1. Working desktop shell and settings.
2. Project onboarding and adaptive questions.
3. Execution Brief generation and approval UI.
4. Mock agent orchestration with persistent task state.
5. One live coding agent integration and Git diff review.
6. Second provider integration, QA, and usage measurements.

## Starter implementation

The first milestone has a React workspace, settings, and a Tauri 2 Rust shell. It also includes adapter interfaces and a deterministic mocked workflow to exercise the journey before live integrations.

- `AgentAdapter` declares planning, file edit, command execution, and review capabilities. The only implemented adapter is `mock`; it edits no files and executes no commands. The runner rejects live adapters until an independent permission boundary exists.
- The workflow state machine requires explicit plan approval and an explicit start. It executes tasks sequentially, supports cancellation, preserves completed task checkpoints, records failures, and allows retry from the first unfinished task.
- Zod validates versioned local state. Reloading a running workflow changes it to paused. Corrupt or unsupported state falls back to defaults. Preferences are copied into each plan, so later edits do not silently alter an approved plan.
- Browser/desktop local storage is a prototype persistence layer, not secure storage. There is one active plan. A new objective replaces that plan and its log. Reports can be exported before replacement.
- The native shell uses `core:default` only, with a restrictive production CSP and no remote content, filesystem, shell, process, or provider plugins. Developer-server connectivity is handled by Tauri in development.
- Project onboarding and architecture recommendations are still demonstrative. The UI does not inspect a real repository, call a model, generate code, run tests, or claim to have delivered code.

The browser preview validates the UI and mock lifecycle. Native compilation additionally requires the OS-specific Tauri prerequisites. Repository CI checks the frontend on Linux and compiles the desktop shell on Windows.
