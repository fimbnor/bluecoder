# BlueCoder

Multi-agent AI workspace for software development.

BlueCoder aims to help developers define architecture, optimize execution briefs, coordinate coding agents, review changes, and track task outcomes.

## Status

Runnable desktop starter: Tauri 2, React, TypeScript, and a Rust shell. The UI is in Brazilian Portuguese. A browser preview runs the same interface without requiring a desktop toolchain.

The first end-to-end workflow is **fully simulated**: describe an objective → generate a deterministic plan → approve → explicitly start → pause/resume → review and export a Markdown report. Task checkpoints, preferences, and the current plan persist in local storage on this device. Interrupted runs restore as paused and never restart automatically.

No provider authentication, repository inspection, code generation, real QA, or autonomous execution is implemented. The project name is a demonstration label, not a connected repository. Reports always identify simulated results.

## Run the browser preview

Requires Node.js **22.12 or newer** and npm.

```sh
git clone https://github.com/fimbnor/bluecoder.git
cd bluecoder
npm ci
npm run dev
```

Open **http://localhost:1420**. The development server listens on all interfaces for cloud preview access; use `npm run dev -- --host 127.0.0.1` to restrict it to localhost.

## Run the desktop application

Install the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS, including Rust stable. Linux requires WebKitGTK 4.1 and GTK development libraries; Windows requires the C++ build tools and WebView2; macOS requires the Xcode command line tools.

```sh
npm ci
npm run tauri -- dev
```

Create a platform-specific installer with `npm run tauri -- build`. The desktop shell grants no filesystem, shell, process, or provider permissions. Browser preview does not validate the native Rust build.

## Check the project

```sh
npm run typecheck
npm run format:check
npm test
npm run build
```

Tests cover the approval gate, ordered task transitions, cancellation, failure/retry, recovery from invalid local storage, and simulated report labeling. GitHub Actions also checks the native shell on Windows, with the required toolchain.

## Source map

```text
src/App.tsx             Workspace, plan review, agents, activity, and preferences
src/core/workflow.ts    Validated state, approval transitions, persistence, reports
src/core/runner.ts      Sequential, cancellable mock execution
src/adapters/           Capability-driven agent contract and mock implementation
src-tauri/             Native Rust shell, configuration, and minimal capabilities
docs/                  Product brief and architecture
```

No API keys are needed. Preferences and the current plan are stored under `bluecoder.workspace.v1` in local storage. Do not enter secrets in these fields. “Novo objetivo” replaces the active plan and its event log; export the report first if you want to keep it. Browser preview and the desktop app use separate local storage.

## Planned modules

- **Architect:** adaptive technical discovery and decision records
- **Context:** repository-aware retrieval and project preferences
- **Optimizer:** concise execution briefs with acceptance criteria
- **Orchestrator:** task scheduling and agent adapters
- **Approval Gateway:** manual, smart, and automatic workflows
- **QA:** tests, review, and traceable delivery

## Design principles

Local-first, provider-neutral, explicit permissions, auditable changes, and measured efficiency rather than unverified token-savings claims.

## Next steps

1. Native folder selection and repository inspection with scoped filesystem access.
2. Adaptive discovery and editable execution briefs based on actual repository context.
3. One official coding agent integration, explicit tool permissions, and Git diff review.
4. Real QA results, secure provider storage, and usage measurements.
