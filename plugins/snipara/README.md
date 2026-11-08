# Snipara for Codex desktop — submission candidate

All three modules are retained. This candidate requires local execution and has no lifecycle hooks. Companion and Orchestrator remain optional programs installed and invoked only on request. Repository setup adds a regular project-scoped stdio MCP component and uses browser device authorization; local runtime credentials remain separate. This local component still requires OpenAI eligibility confirmation; no submission, policy approval or clean-host acceptance is claimed.

# Snipara native plugin

Snipara connects Codex and Claude Code to sourced project context and reviewed
memory. The native source profile uses a small local component and browser
sign-in, with a separate project association for each repository or folder.
This candidate is not yet published or qualified in installed hosts.

## Connect your repository

Install the native plugin, open your project in Codex or Claude Code, and use
Snipara settings to connect this repository. Setup adds the regular project MCP
entry `snipara-repository`; the global plugin itself has no remote connection
that could bypass it. Reload and approve the trusted project connection, then
use its Connect tool and follow the Snipara browser verification link.

Sign in or create an account. If you have no workspace, setup creates a personal
workspace through the existing flow. Choose or create the project for this
source and approve access. You do not need to copy project IDs or tokens.
Installation alone does not authorize a project or import repository files.

A source project receives `SNIPARA_USAGE.md`. Once indexed, ask a first usage
question with a citation. Then add selected project documents through the
website import controls or an explicitly requested supported sync/upload tool.
Queued or pending indexing is reported as such; it is not a completed import.

The component stores its own OAuth credentials privately outside repositories.
It never reads Codex or Claude token stores. Source changes, copied configuration
and conflicting associations stop project calls; there is no previous-project
fallback. A missing private association requires browser approval again.

**Repository switching follows the client's project/session.** A shell `cd`
alone does not switch the chat's project. Open a new chat/session when moving to
another repository unless that host's project reload has been qualified. Claude
Code documents live project-MCP reload from 2.1.246; older versions require a
new session. Multiple roots require an explicit choice. Current-source inspection
supports Codex's project-scoped stdio design; actual installed-host acceptance
remains pending. No claim of invisible switching in every client is made.

## Build and setup

Node.js 18+ and Git are required for the component. From the source checkout:

```bash
node plugins/snipara/scripts/snipara.mjs build \
  --connection source --output /absolute/path/to/snipara-plugin
```

Install the resulting local marketplace through your native client's supported
plugin controls. Run setup from the **project shell**, using the installed
plugin's absolute script path:

```bash
node /absolute/plugin/scripts/snipara.mjs setup-source --client codex
# For Claude Code use --client claude instead.
```

Setup omits cwd in the project MCP entry so the client supplies its actual
project directory. The expected source fingerprint prevents a copied entry from
connecting another source. Existing project configuration is preserved; if it
needs a merge, setup returns the exact new entry for inspection and merging.
Disable an older direct Snipara connection for this profile before using it.
Independently installed global memory connections have their own scope and must
not substitute for the repository connection.

## Optional workflow modules

All three skill modules are on by default and can be switched independently:

| Module       | Purpose                                | Disabled behavior                                    |
| ------------ | -------------------------------------- | ---------------------------------------------------- |
| Snipara      | Project context and reviewed memory    | Context skill and this plugin's registration removed |
| Companion    | Plans, checkpoints and resume          | Skill, installer and launcher disabled               |
| Orchestrator | Explicit coordination and review gates | Skill, installer and launcher disabled               |

Changing these switches does not stop running tasks or disable independently
configured project/global servers. Disable a regular project server separately
when removing repository access. Refresh/restart after profile changes.

Companion 3.9.0 and Orchestrator 1.13.1 remain separately installed programs.
No dependency installs or tasks run at session start. The source profile permits
only their local status/help commands: its browser MCP grant does not authorize
existing runtime credentials. Hosted/execution work requires a separate explicit
project runtime profile and authentication. Existing remote account/project
profiles remain available for that use, with local source guards; those profiles
do not provide automatic MCP repository isolation.

```bash
node plugins/snipara/scripts/snipara.mjs configure \
  --output /absolute/path/to/owned-marketplace --companion off
node plugins/snipara/scripts/snipara.mjs build \
  --connection project --project example --output /absolute/path/to/explicit-profile
```

Runtime installers are opt-in, use pinned packages, and do not receive provider
or registry credentials. Explicit per-invocation `--with-snipara-credentials`
shares only environment-backed Snipara keys with an optional runtime; it does
not authenticate the native component or persist secrets into manifests.

## Distribution and data handling

`export` produces the native source marketplace and a separate remote directory
draft. `export-desktop` produces a hook-free native desktop candidate.
`export-claude` produces the reduced eight-file Claude Directory package. Export
creates inventories and ZIPs; it does not submit, publish, install or deploy.

Claude web and reduced Directory use remote OAuth with explicit project selection.
They include no local scripts/hooks and do not extract Claude files or chat
history. They cannot automatically observe a local repository change.

The native component sends authorized queries and explicit memory/document
operations to Snipara. It reports only public verification details and connection
status to the assistant; access/refresh/device secrets stay private. Source
fingerprints describe local intent, not remote ownership proof. Memories and
source documents follow the service's retention policy. Package installation
may contact npm or PyPI only when requested; enabling a skill does not authorize
document import, orchestration, memory writes or deployment.

Use standalone Sandbox for repository tests/builds, with immutable source inputs,
prepared dependency images and retained receipts. Offline tests do not establish
live OAuth, native reload/trust, PostgreSQL races, completed indexing or public
listing acceptance. The current implementation plan and qualification limits are
in `docs/planning/plugin-onboarding-20261107/` in the owning repository.

[Privacy](https://www.snipara.com/privacy) ·
[Support](https://www.snipara.com/contact) ·
[Terms](https://www.snipara.com/terms)
