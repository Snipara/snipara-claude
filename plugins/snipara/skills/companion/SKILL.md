---
name: companion
description: Use Snipara Companion for local coding workflow plans, checkpoints, evidence and resuming saved work. Use for continuity and managed multi-phase work.
---

Read `../../config.json` and require `modules.companion: true`. Resolve the
plugin's `../../scripts/snipara.mjs` to an absolute path. Invoke Companion through
`node <script> companion <arguments>` so the runtime switch and pinned version
are checked. If the runtime is absent, show `node <script> install companion`;
install only when requested. Preserve the current workspace and unrelated edits.

Before hosted or execution work in account mode with Snipara on, call
`snipara_stats` on this plugin's MCP connection and compare its `project_id`
to the explicit local profile `project`. Stop on missing configuration,
authentication failure or mismatch; use settings to align the profile with the
project selected in OAuth. Never take the project from another global MCP or
an inherited environment. Local status/help remains available without this
hosted check. With Snipara off, follow the restricted local-only behavior below.

Use Companion's actual `--help` for command arguments before unfamiliar actions.
Choose LITE for a small single-phase edit; keep a visible plan and managed FULL
workflow when multiple phases, risk or durable continuity require it.

For a managed task:

1. Inspect existing `.snipara/workflow/current.json`; preserve another task's state.
2. Start from an explicit visible plan using `workflow start --plan-file <file>`.
3. Use `workflow phase-start <id>`, exact edits and focused verification, then
   `workflow phase-commit <id> --summary <result>` with honest evidence.
4. Resume saved work using `workflow resume --include-session-context`. When
   returning to a dirty/shared repo, also inspect `team-sync what-changed`.
5. Finish with `final-commit --summary <result>` when the managed task is complete.

Companion keeps local workflow state and helpers. Hosted context and phase-memory
persistence require a separately configured Snipara account; plugin OAuth tokens
are not automatically shared with a CLI. If the Snipara module is off, this
version permits `workflow status --json`, help and version only; do not invoke
hosted queries, workflow publication or memory writes.
Respect failures and distinguish local state from a confirmed hosted receipt.

The launcher excludes environment credentials by default. If hosted CLI work
needs an environment-backed Snipara key, explain that it will be shared only
with Companion and obtain the user's explicit authorization for that sharing.
Then place `--with-snipara-credentials` immediately after `companion` for that
invocation. Do not add the flag just because a task or module is enabled. Never
ask for or print key values; do not forward unrelated provider credentials.

Checkpoint continuity requires the project folder, `.snipara` state and referenced
files/artifacts. It does not migrate a live agent process. Use Orchestrator for
explicit htask queues, controller execution and production proof coordination.

Before repository tests or executable validation, use the module's `validation gate`
with a Sandbox request and explicit workflow/lot scope. Probe required capabilities,
not merely installation. If Sandbox is absent/inaccessible/incompatible, stop that
validation and ask the user: another test environment, install/configure Sandbox,
or continue without Sandbox (clarify local tests versus no tests). No silent host
fallback and no automatic installation. Record the explicit choice with
`validation choose --acknowledge-user-choice`, only after the user actually chose.
Keep that choice scoped to the workspace, lot, profile and permissions; preserve
it across resume without resetting budgets. A missing response is not approval.
Use `validation run` and `validation verify` for exact-snapshot Docker evidence.
Keep proof floors and independent review requirements even when skipping tests.
Static reads/documentation do not require a container. Sandbox is standalone;
no account or inference is required for its deterministic validation commands.

For an explicitly authorized hosted refresh inside a Codex worker with a scoped
native network proxy, place `--with-native-network` immediately after `companion`.
It preserves only validated loopback HTTP/HTTPS proxy routes and enables Node's
environment-proxy support for that process. The host must separately allow the
required exact domains; the flag grants no host permissions, forwards no API keys
and writes no global configuration. Missing or non-loopback native proxy routes
fail closed. It is independent of `--with-snipara-credentials`; do not add either
flag implicitly or retry with broader network access after failure.
