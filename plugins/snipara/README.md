# Snipara native plugin

One plugin for Claude Code and Codex, built from the same skills and configuration.
Three modules are **on by default** and can be switched independently:

| Module       | Included capability                                         | Off behavior                                                     |
| ------------ | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| Snipara      | Account OAuth, source context and reviewed memory           | MCP registration and context skill removed                       |
| Companion    | Local workflow plan, checkpoints, evidence and resume skill | Skill removed; launcher and dependency installation reject calls |
| Orchestrator | Explicit controller/task coordination and proof skill       | Skill removed; launcher and dependency installation reject calls |

Companion and Orchestrator keep their existing package engines. The plugin
contains their skills, adapters and a pinned dependency installer; it does not
duplicate their source or require another plugin. Enabling a module makes its
functions available. It does not install dependencies, index a repository,
create a controller, run a worker, approve work or deploy anything.

## Build a profile

Node.js 18+ is required. From the source checkout:

```bash
node plugins/snipara/scripts/snipara.mjs build \
  --connection account \
  --output /absolute/path/to/snipara-plugin
```

Install the account profile, sign in through the native client's MCP OAuth
flow, and choose one of your accessible projects in the Snipara consent screen.
No project or credential is preset by the plugin. `snipara_stats` reports the
token-bound project ID after login. Reconnect to choose another project.

**Account OAuth requires the backend changes and additive
`oauth_tokens.resource` migration. Both were deployed on 2026-10-11. Fresh
isolated Codex OAuth and normal Claude Code/Codex sourced answers passed.
Refresh and reviewer-account acceptance remain separate checks.** Existing explicit
project integrations can still build with `--connection project --project <slug>`.

The output is a dedicated marketplace containing `plugins/snipara/`, Claude's
`.claude-plugin/marketplace.json`, and Codex's `.agents/plugins/marketplace.json`.
Keep it outside the source plugin directory. Unrelated/non-owned directories
are rejected, and configuration changes replace only an owned complete profile.

## Claude Code

For a temporary local test:

```bash
claude plugin validate /absolute/path/to/snipara-plugin/plugins/snipara
claude --plugin-dir /absolute/path/to/snipara-plugin/plugins/snipara
```

For an installation from the local marketplace:

```bash
claude plugin marketplace add /absolute/path/to/snipara-plugin
claude plugin install snipara@snipara-local
```

Restart Claude Code, authenticate Snipara through `/mcp`, then use
`/snipara:snipara`, `/snipara:companion`, `/snipara:orchestrator` or
`/snipara:settings` according to the enabled profile. First ask a sourced
question about a document already present in your project and inspect the source.

The exported distribution uses the marketplace name `snipara`, so its install
command is `claude plugin install snipara@snipara`. The commands above use the
default `snipara-local` name of a profile generated with `build`.

## Codex

Add the generated local marketplace using a client with the documented plugin
marketplace CLI:

```bash
codex plugin marketplace add /absolute/path/to/snipara-plugin
```

In Codex desktop, select **Snipara** from that local marketplace and install it.
Restart/refresh the client, complete native MCP authentication and verify the
first sourced answer. The profile includes a portable `plugin.json`/`mcp.json`
and a `.codex-plugin/plugin.json` compatibility manifest. The component skills
are shared with Claude Code. The SessionStart hook only prints local status;
Codex requires trust review for plugin hooks and supports them on local installs.

Version 0.3.1 registers its MCP as `snipara-plugin`. This keeps it distinct from
an existing global `snipara` connection, which some native hosts otherwise load
instead of the plugin server. The endpoint, scopes and explicit OAuth project
selection are unchanged. Refresh existing plugin installations to pick up the
new registration; native authentication may be requested for that server name.

## Change the switches

```bash
node plugins/snipara/scripts/snipara.mjs configure \
  --output /absolute/path/to/snipara-plugin \
  --companion off --orchestrator off
```

Unspecified settings are preserved. All eight combinations are supported,
including all off and local modules on with Snipara off. Refresh the local
plugin installation and restart the client after a change: native clients load
a cached profile, so a build-directory change is not an immediate runtime toggle.
Each generated profile has a version fingerprint of its settings and executable
content, allowing a client update to pick up changed switches or scripts.
Settings currently use the shared settings skill/CLI, not custom native UI controls.

These settings govern this plugin's registrations and launchers. They do not
uninstall separately installed packages, disable other global MCP connections,
or cancel already running work. With Snipara off, this version permits local
Companion `workflow status`, Orchestrator `status`, help and version only. Other
runtime commands are rejected before a subprocess starts. The existing engines
can publish workflow coordination or memory, so this bounded offline profile
does not pretend they offer a complete network-free execution mode.

## Local runtimes

From the generated plugin directory:

```bash
node scripts/snipara.mjs install companion
node scripts/snipara.mjs install orchestrator
node scripts/snipara.mjs companion --version
node scripts/snipara.mjs orchestrator status --json
```

The installer pins published Companion **3.7.0** and Orchestrator **1.9.0**.
It uses plugin data when supplied by the host, otherwise the workspace's
`.snipara/plugin-runtime/`. Companion uses a private npm prefix; Orchestrator
uses a Python virtual environment (Python 3.10+ required). No global dependency
is changed. An existing exact-version runtime on PATH can also be used.
This initial runtime adapter targets macOS/Linux.

Native MCP OAuth credentials remain with the client. They are not automatically
shared with Companion/Orchestrator. Hosted CLI actions still need the existing
environment-backed Snipara credentials/configuration. Never paste credentials
into a plugin manifest or commit generated secret files.

## Verification and distribution

Two artifacts are derived from this shared source. The native marketplace has
all three modules enabled, the account MCP URL, and no project preset. After
OAuth, use settings to observe the selected project ID. For local runtime work,
build a profile using `--connection account --project <observed-project-id>`;
the MCP URL and OAuth audience remain unchanged. Hosted runtime actions are
rejected until this explicit setup is complete. Credentials for local engines
remain separate from native MCP OAuth.

The directory draft includes account Hosted MCP, the shared context/memory skill
and connection guidance. It has no hooks, runtime adapters or local installers.
Exporting with an optional `--project <review-slug>` instead creates a bound
technical review fixture, which must not be published as universal onboarding.

Generate both account packages, ZIPs, checksums and inventory:

    node plugins/snipara/scripts/snipara.mjs export \
      --output /absolute/path/to/new-snipara-distribution

The destination must not exist. Export never overwrites a checkout or an earlier
release. Publisher/license facts are in listing.json: Starbox Group Gmbh and MIT
were confirmed by the owner on 2026-10-11. LICENSE covers the plugin code and
documentation; NOTICE excludes the Snipara brand assets, backend and hosted
service. See DISTRIBUTION.md for submission and native acceptance gaps.

```bash
node --test plugins/snipara/test/*.test.mjs
```

See `VERIFICATION.md` for measured checks and remaining client proof. Version
2.0.0 is prepared for the existing `Snipara/snipara-claude` distribution repository;
publication receipts and official directory review are separate evidence.
Existing `create-snipara` and generic Hosted MCP setup remain available to other
clients. No engine npm/PyPI release is needed. The required hosted web/MCP
deployment and additive migration are recorded in `VERIFICATION.md`.

Formats follow [OpenAI's plugin packaging documentation](https://developers.openai.com/plugins/build/plugins)
and [Claude Code's plugin reference](https://code.claude.com/docs/en/plugins-reference).
