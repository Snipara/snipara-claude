# Snipara for Claude Code and Codex

Choose Context for sourced project knowledge, or Local work for tasks,
checkpoints, verification and review around your existing coding agent.
Local work requires no Snipara account. Hosted context needs an authorized project
connection; any service subscription is separate from the free plugin.

Publisher: **Starbox Group Gmbh**. Plugin code and documentation: **MIT**.

## Install the native plugin

Claude Code:

```sh
claude plugin marketplace add Snipara/snipara-claude
claude plugin install snipara@snipara-plugins
```

Codex:

```sh
codex plugin marketplace add https://github.com/Snipara/snipara-claude.git
```

Install Snipara from the `snipara` marketplace in Codex's plugin settings.
Open the repository you actually want to use, then follow `/snipara:settings`.

## Local work

From your repository, ask the settings skill to prepare local work, or run the
installed plugin's `scripts/snipara.mjs setup-work --client codex` (use
`--client claude` for Claude Code). It delegates to the pinned installer:

```sh
npx --yes create-snipara@2.2.2 init --profile local-work --client codex
```

The compatible local tools are prepared together. Signup, a Hosted project and
provider keys are not prerequisites. Existing authorized repository connections
and unrelated client settings are preserved. Reload the trusted project after
setup. Standalone Companion 4.2.0, Orchestrator 1.16.0 and Sandbox 3.0.0 remain
independent integrations.

Preparation does not install Docker or dependency images, start a test, call a
model or deploy your application. Deterministic repository validation needs a
running local Docker environment and an appropriate prepared image. Readiness,
passing checks, independent review and integration are separate observations.

## Optional project context

Use the settings skill's context setup only when requested. Reload and approve
the project connection, use its Connect tool and follow the browser link to sign
in or create an account, create a workspace if needed, then select or create the
project for this repository. Never put credentials or project IDs in chat.
An existing live authorized source connection can be reused for its supported
operations; a saved entry, global key or matching folder name is not proof of access.

Confirm the selected project, read `SNIPARA_USAGE.md` after indexing, and check a
cited passage. Upload or sync only the documents you select, after confirming the
destination and exact file list. Installation does not import your repository.

An open connection remains bound to its approved workspace. Start a new session
when changing repositories unless the client's project reload is qualified.
A shell directory change alone does not switch the chat's project. Preserve
independent global connections and existing project instructions.

Automatic cloud job synchronization is planned separately. Local execution must
continue while disconnected; reconnecting must not relaunch a local job. A
context connection does not grant remote launch or cancellation authority.

## Separate distributions and proof

| Path | Purpose |
| --- | --- |
| `plugins/snipara` | Native `2.3.0-profile.1cf122f79b21`; exactly 37 files, no lifecycle hooks |
| `plugins/snipara-directory` | Claude Directory 2.2.4; exactly eight files, remote context/OAuth only |
| `authoring/plugins` | Authoring source and regression tests; never a Directory scan root |

For Claude Directory, select only `plugins/snipara-directory`. The remote package
contains no command hooks, packaged scripts or automatic local-folder selection.
Do not submit the repository root, native profile or authoring tree. Use the same
publisher organization as the remote MCP connector. Marketplace installation,
official Directory review and publication are separate channels.

`review/plugin-delivery-bindings.json` records the exact inventories. Separate
Sandbox qualification runs all eight authoring test modules and the delivery
regressions. Public CI checks delivered bytes on Node 20 and 22; it does not
rebuild packages, submit listings or update the owning application repository.
Native browser/protocol pilots and official portal approval require their own
exact release evidence. This README does not claim those approvals.

[Website](https://www.snipara.com) · [Support](https://www.snipara.com/contact) ·
[Privacy](https://www.snipara.com/privacy) · [Terms](https://www.snipara.com/terms)
