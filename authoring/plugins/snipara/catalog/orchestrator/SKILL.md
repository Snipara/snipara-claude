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

For new executable Controller lots using Sandbox, install a policy-owned proof
floor using `--required-proof "snipara-sandbox validation verify --request ...
--run-id ... --store ..."` once the run is available and the exact request is
frozen. A verifier failure blocks integration through the existing proof gate.
Never count `validation gate`, `choose`, `diagnose`, or a saved choice as a passed
validation. Existing Controllers keep their stored proof floors; do not silently
rewrite their policy. The generic legacy local proof runner remains available
for explicitly authorized alternative environments, not an implicit fallback.

The launcher excludes environment credentials by default. For a hosted command
that needs a Snipara key, explain sharing with Orchestrator and obtain explicit
user authorization before placing `--with-snipara-credentials` immediately after
`orchestrator`. Permission to orchestrate alone does not authorize credential
sharing. Never ask for or print keys or forward unrelated provider credentials.
