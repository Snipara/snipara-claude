---
name: orchestrator
description: Use Snipara Orchestrator for explicit controller plans, task coordination, execution receipts and proof gates. Invoke only when the user requests orchestration or an authorized task requires it.
disable-model-invocation: true
---

Read `../../config.json` and require `modules.orchestrator: true`. Resolve the
plugin's `../../scripts/snipara.mjs` to an absolute path. Use
`node <script> orchestrator <arguments>` so the module gate and pinned runtime
are enforced. If absent, show `node <script> install orchestrator`; install only
when requested. Enabling this module never starts a controller or worker.

Before hosted or execution work in account mode with Snipara on, call
`snipara_stats` on this plugin's MCP connection and compare its `project_id`
to the explicit local profile `project`. Stop on missing configuration,
authentication failure or mismatch; use settings to align the profile with the
project selected in OAuth. Never take the project from another global MCP or
an inherited environment. Local status/help remains available without this
hosted check. With Snipara off, follow the restricted local-only behavior below.

1. Inspect `status --json` and the requested command's `--help` before work.
2. Discover native hosts with `host discover --adapter all`; discovery is not
   proof that a host can execute or that it is authorized for this task.
3. Translate an explicit goal into a controller plan, acceptance conditions and
   bounded budget. Start with observe autonomy unless execution is authorized.
4. Preserve stored autonomy ceilings, proof floors, permissions and evidence.
   Reconcile/preview before an explicit `--execute` action. Do not infer release,
   deployment, publishing or worker-messaging authority from plugin activation.
5. Capture execution receipts and review/proof evidence. Treat native execution,
   independent acceptance and live customer-path proof as separate outcomes.

Hosted htask operations require account/project credentials and the hosted
service. Plugin OAuth does not provision CLI credentials. With Snipara off, do
not invoke hosted queues or context; this version permits `status --json`,
help and version only.
Keep htask coordination here, not on Companion. Report unavailable capabilities
or missing proof without weakening an existing gate. Never fabricate credentials,
approval, acceptance, runtime continuation or billing measurements.
