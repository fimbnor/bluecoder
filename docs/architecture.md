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
