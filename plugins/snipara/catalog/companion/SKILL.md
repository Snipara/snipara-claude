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

Checkpoint continuity requires the project folder, `.snipara` state and referenced
files/artifacts. It does not migrate a live agent process. Use Orchestrator for
explicit htask queues, controller execution and production proof coordination.
