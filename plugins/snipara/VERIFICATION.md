# Local plugin verification — 2026-10-11

## Directory hardening follow-up — 2026-10-16

Public PRs #3 and #4 promoted the bundle through dev to main, final commit
`515ee45453dc9b2d242b784d2768133f308105fc`, native version
`2.0.2-profile.ae6fd6349734`. Main CI run 38816424783 passes on Node 20 and 22.
All 26 package tests pass, including actual shell-hook execution for all enabled
module profiles, child-process credential isolation and explicit vendor-key
opt-in. Tests now live in `plugins/snipara-tests` outside the installed plugin;
CI rejects installed test fixtures. Exported native and directory ZIP inventory
and hashes pass. Engine pins remain Companion 3.7.0 and Orchestrator 1.9.0;
no engine package publication or web/backend deployment was needed.

Final live Claude portal scan at `515ee45` passes: 48 files, 137.8 KB,
four skills, one hook, one MCP server, zero blocking issues, five listing-only
schema warnings and ten policy holds (eight PNG references, two credential
environment findings). `COMMAND_SCRIPT_NOT_FOLLOWED` is cleared. The scanner
still conservatively flags environment access despite the tested allowlist and
explicit per-call credential flag; it does not prove a credential was sent.
The PNG is used as data only. These findings remain for human review, not hidden
or declared approved. Listing metadata warnings explicitly require no action.

The native session hook is a literal shell script reading only config.json.
Installers do not inherit environment secrets; runtimes receive environment
Snipara keys only with explicit `--with-snipara-credentials` authorization.
Separately stored runtime credentials remain under the runtime's own control.
Native host OAuth credentials are never copied. Hosted impact matches local
committed base `2220cfd8` but contains no indexed plugin symbols and excludes
the current edits; exact files and tests supply change evidence.

The portal draft is not submitted. Legal attestations, reviewer approval and a
fresh installed-host acceptance of 2.0.2 remain unverified. Prior-workflow state
was preserved in `.snipara/workflow/plugin-directory-hardening-20261016/`.

## Claude Directory and public-repository CI — 2026-10-16

Claude submission must select `plugins/snipara`, not the repository root: root
selection scans the legacy integration and produced a blocking unpinned launcher.
The selected bundle passed Directory validation at `d555c5d`, with five schema
warnings and ten policy holds requiring human review. Public PR #1 added icon,
privacy, support, terms and documentation fields; the portal confirms all six
listing links. Policy holds remain for asset references, inherited runtime
environment and the Node launcher; validation success is not policy approval.

Public PR #2 adds `.github/workflows/plugin-ci.yml` and a published-manifest
checker. Node 20 and 22 jobs passed on both the dev push and PR. Promoted through
dev to main as `1be383e73ca194e7d50a1561d46dbc5229164318`; the main push run is
https://github.com/Snipara/snipara-claude/actions/runs/38814410382.
Actions use commit pins and read-only permissions, without secrets or installs.

The portal remains at compliance, not submitted. Owner confirmed personal-data
read/storage, retention potentially beyond 30 days and no under-18 targeting.
Legal/policy attestations are unchecked. The wording forbidding execution outside
declared MCP servers needs clarification for the full bundle's local hook and
runtimes before attesting. Existing local generator metadata corrections remain
uncommitted; unrelated working-tree changes were preserved.

## Account connection 0.3.0 — local verification

- 35 focused web OAuth/resource/refresh/consent tests, 57 backend account OAuth,
  transport/usage pipeline, discovery and existing user-key regressions, and
  23 plugin profile/export/runtime checks pass.
- Web TypeScript and focused ESLint pass. Backend Ruff and `git diff --check`
  pass. JS/Python Prisma schemas match apart from their generators; Python
  client generation was validated in isolated /tmp output, without database
  access or global package mutation. No migration has been applied.
- The account transport accepts native OAuth only, derives the project from
  the token row, checks the canonical audience and current membership, and caps
  write access after a Viewer downgrade. Legacy device tokens remain on explicit
  project URLs. Refresh uses atomic hash rotation and cannot change audience,
  client or project. Database concurrency itself was not exercised.
- Consent renders the authenticated user's accessible projects without choosing
  a default. Duplicate slugs use distinct immutable IDs. No-project, expiration
  and Viewer states were exercised through the real component in the browser.
- Native onboarding uses default-advertised `snipara_stats` to observe the bound
  project ID, including a new project without indexed documents. Local runtime
  profiles retain the account URL; native OAuth tokens are still not CLI secrets.
- Claude validates both variant manifests and the native marketplace. Codex
  `plugin/read` discovers the four native skills and one MCP server, reporting
  installed=false. Portable plugin/MCP JSON schemas validate. These are package
  discovery checks, not installed/native login acceptance.
- localhost:4178 displays the actual consent component using explicitly labeled
  demonstration account/project data. No OAuth token is created by this preview.
- Account MCP/backend web changes and the additive audience migration are local
  only. Hosted fresh OAuth login/refresh, sourced answer, engine workflow,
  public repository, demo recording and directory submission remain unverified.
- Hosted impact includes auth/transport files and a separate one-line stats
  change. Its graph is indexed through ee33d88256704516497fec8c4baf23f8d268d05a,
  behind local b4f4b886 and excluding uncommitted edits; exact local reads and
  tests are the implementation evidence.

## Historical distribution preparation 0.2.0

- 21 focused checks pass, adding distribution separation, hidden compatibility
  manifest rejection, ZIP/hash/inventory checks, output preservation and an
  unconfigured native bootstrap that cannot inherit a developer project for
  execution.
- Native bootstrap: all three modules on, no preselected project or MCP
  registration. A bundled settings skill builds the user's project profile.
- Directory draft: two skills, one project-bound remote MCP, no lifecycle hooks,
  scripts, installers, app bindings or engine source. Five positive and three
  negative reviewer cases are drafted, not executed.
- Claude validates both plugin manifests and the native marketplace. Portable
  plugin and MCP schemas validate for both variants.
- Native Codex reads the four bootstrap skills with no MCP server, matching the
  deliberate unconfigured profile. This is package discovery, not installation.
- Live public website, contact, privacy and terms pages return 200 after redirect
  to www.snipara.com; their actual content identifies Snipara/STARBOX GROUP GMBH
  and provides support, privacy and service terms. Plugin policy coverage and
  portal identity verification remain separate.
- Project OAuth metadata and authorization-server metadata return 200.
  Anonymous initialization returns 401 with the project discovery challenge.
  The generic /mcp GET returns 404; exact source has no universal MCP handler.
- The four read tools used by the reviewer cases expose boolean readOnlyHint,
  destructiveHint and openWorldHint annotations. Their tools/list inspection
  used the existing agent API key, not a new native OAuth session.
- The current package uses project snipara only as a technical discovery fixture.
  It is not a dedicated synthetic reviewer account or universal public endpoint.
- No native OAuth login/refresh, customer account/project selection, reviewer
  account, actual host video, Git publication, portal submission or approval is
  claimed. The owner confirmed Starbox Group Gmbh and the plugin-only MIT scope
  on 2026-10-11; listing.json, source manifests, LICENSE and NOTICE record them.
- No existing engine package changed: no npm/PyPI release is needed for this
  private source package. New distributions remain prepared, unpublished drafts.

The remaining blockers are recorded in DISTRIBUTION.md and the generated
distribution-manifest.json. Hosted impact was indexed through ee33d882,
behind local b4f4b886, with no indexed symbols for these new uncommitted files.
Focused local checks provide the exact artifact evidence.

Scope: one native plugin with shared skills and three default-on modules.
Source base: `dev` at `b4f4b8860568e43e643b6e4c9fe38b40efdada96`.
Existing unrelated working-tree changes were preserved. No backend, CLI engine,
authentication route, schema, production runtime or public website was changed.

## Passed

- Fifteen Node regression checks, including all eight toggle combinations.
- Disabled modules omit skills; Snipara off omits both portable and compatibility
  MCP registrations. Disabled runtime/install calls fail before subprocesses.
- Snipara-off profiles reject hosted/execution CLI actions before probing
  dependencies, while retaining bounded local status/help/version inspection.
- Configuration preserves unspecified switches and can re-enable modules from
  the bundled catalog; profile versions change with configuration/executable content.
- Invalid slugs, credentials in config, malformed booleans, unknown/repeated flags,
  source overlap, symlink output and unrelated/user-added output files are rejected.
- Literal CLI arguments are passed without a shell. Missing/stale runtimes are
  rejected with the pinned installation instruction.
- Claude Code **2.1.100** validates the generated plugin and its marketplace.
- Codex CLI **0.159.2** lists the generated marketplace plugin through temporary
  command-line marketplace configuration, without modifying global settings.
- Native Codex `plugin/read` discovers `snipara:settings`, `snipara:snipara`,
  `snipara:companion`, `snipara:orchestrator` and the `snipara` MCP server.
- Generated portable manifests validate against the fetched Agent Plugins 1.0.0
  plugin and MCP JSON schemas.
- Published dependency metadata confirms Companion **3.7.0** (Node 18+) and
  Orchestrator **1.9.0** (Python 3.10+).
- The packaged installer actually installed both pinned engines into a temporary
  private npm prefix/virtual environment. The plugin launchers returned **3.7.0**
  and **1.9.0** respectively, and Orchestrator help ran successfully. No controller
  or worker was started; global installations were preserved.
- JavaScript syntax checks and `git diff --check` pass.

## Remaining client proof

- Native Claude/Codex account login, OAuth refresh and the first sourced answer
  from the installed plugin have not been exercised in this task.
- Native hook trust/loading is not established by `plugin/read`: it reported
  no hooks before installation. The packaged SessionStart script was tested
  directly and performs no network access or subprocess execution.
- No controller, worker, production gate, deployment or independent acceptance
  run was performed. Runtime activation does not establish any of those proofs.
- Native MCP OAuth tokens are not shared with CLI engines. Hosted CLI actions
  still require the existing environment-backed account/project configuration.
- Module changes take effect in the native client after refreshing its installed
  local plugin and restarting. The settings skill/CLI is implemented; custom
  native settings UI is not.

## Hosted impact context

The hosted `snipara_code_impact` call completed. It was indexed through
`ee33d88256704516497fec8c4baf23f8d268d05a`, behind the local committed base, and
does not include these new uncommitted plugin files. It found no indexed symbols
for them and returned conservative file-level actions. Local file inspection,
focused tests and native manifest reads supply the current packaging evidence.

## Current distribution

The generated bundle is a local installable marketplace. It has not been installed
into the user's clients or submitted/published to a public directory. The source
package is private and dependency versions are unchanged; the 0.3.0 account connection does not
require an npm/PyPI engine release or OSS engine mirror sync. It requires web/MCP
deployment and the additive OAuth audience migration, still not performed.
Other clients retain the existing `create-snipara` and Hosted MCP setup.

## Production follow-up — 2026-10-11

Account OAuth web/MCP deployed from `d4298d3a` with the additive resource migration. Both runtimes healthy; existing project API-key stats and account discovery/denial probes pass. The user completed native Codex sign-in and project consent. Restarting Codex 0.159.2 in the same isolated test profile recovered `oAuth` and thirteen tools. Real native stats, context-query and cited-chunk reads pass for the granted project. Browser completion remained stale; its cause is unproven and no runtime patch was made. Refresh, revoked/downgraded access and an agent-generated sourced answer still need acceptance. This does not establish a normal desktop installation or fresh Claude acceptance. See `docs/planning/SNIPARA_PLUGIN_OAUTH_DEPLOY_20261011.md`. Earlier no-deployment/no-login statements are historical local-phase evidence.

## Normal client setup — 2026-10-12

The user installed and enabled Snipara in normal Codex. Inspection found that
the global `snipara` server shadowed the 0.3.0 plugin server with the same name:
the effective server had bearer-token auth and no plugin attribution. The user
configuration's existing MCP definitions were preserved.

Version 0.3.1 uses `snipara-plugin` in both native and directory packages. All
23 packaging tests pass. An isolated native Codex host containing the existing
global registration now discovers both servers, with `snipara-plugin` attributed
to `snipara@snipara`. Its missing OAuth auth is reported independently instead
of using the global API-key connection. The endpoint, scopes and project-selection
contract are unchanged; no web/MCP deployment or engine publication is needed.

The normal Codex cache now contains 0.3.1-profile.4d95cf2bf2fd. The bundled
CLI updated to 0.162.0-alpha.2 during validation. Native server status attributes
`snipara-plugin` to `snipara@snipara`, reports `oAuth`, and exposes thirteen tools.
An actual plugin `snipara_stats` call returns `proj_snipara_001` and 528 documents;
context-query and referenced-chunk reads also succeed through that exact server.
These calls do not use the separate global bearer-token connection.

The controlled browser return remained stuck in IAB and showed
`ERR_BLOCKED_BY_CLIENT` on the loopback callback in Chrome. Reload did not
resolve that visible failure. The official `codex mcp login snipara-plugin`
command, using the normal system browser, subsequently completed successfully.
The exact controlled-browser failure remains unproven; no backend patch,
credential copying, or browser-security bypass was performed.

Claude Code 2.1.100 has `snipara@snipara` 0.3.1-profile.4d95cf2bf2fd installed and
enabled at user scope. Native account login succeeded and a keychain-enabled
status check confirms subscription authentication. Its MCP health command now
reports the distinct `plugin:snipara:snipara-plugin` server connected. A normal
installed-plugin Claude print session called its exact stats tool and returned
the same `proj_snipara_001` and 528 documents, with no permission denials.
The existing global connection remains separate. A sandboxed account-status probe can report logged
out when it cannot read the system keychain; it is not sufficient login proof.

Private workspace runtimes install and report Companion 3.7.0 and Orchestrator
1.9.0; their launchers' help commands pass. Existing global engine versions are
preserved. No controller or hosted workflow was invoked through the plugin.
No public repository or marketplace submission has been made in this setup phase.

Receipts: `.snipara/workflow/plugin-client-install-20261012/activation-receipt.json`
and the normal-client stats/context/chunk receipts in that directory. Native
agent-generated sourced answers, refresh, revoked/downgraded access and bounded
module workflows remain separate acceptance checks.

## Public repository preparation — 2026-10-12

The owner selected the existing public `Snipara/snipara-claude` repository.
Version 2.0.0 succeeds its 1.1.0 integration. The Claude marketplace name
`snipara-plugins` and plugin name `snipara` are preserved, with source moved to
`plugins/snipara`; Codex uses the additional `.agents/plugins` catalogue.
Legacy sources and their original copyright/license remain in the repository.

Both normal installed clients produced French source-backed answers using real
plugin context and cited-chunk calls. The Codex test disabled other global MCP
servers only for its process and removed API-key environment variables. Claude's
final reading-only rehearsal completed without permission denials. These tests
used profile 0.3.1 and the publisher's documentation project, not the Atlas
reviewer account. The 2.0.0 package includes updated listing/configuration
metadata; its local installation/package checks are recorded separately.

Through the packaged launchers, Companion 3.7.0 created a synthetic local plan,
activated its phase and preserved the checkpoint across separate processes.
Orchestrator 1.9.0 initialized and reconciled the synthetic controller with
autonomy `observe`, one concurrent-task ceiling and no worker dispatched.
No hosted memory writes or production execution were performed in this fixture.
All 23 packaging tests, including eight module combinations, pass.

The owner confirmed all platform-supported countries and a free plugin requiring
a Snipara account, with any subscription purchased separately on snipara.com.
These declarations are serialized into the public directory manifest. The four
public listing URLs were fetched and their content inspected; privacy covers
MCP and Companion workflows and the support page identifies Starbox Group Gmbh.
Portal verification and policy attestations remain the publisher's actions.

Native automatic refresh and revoked/downgraded access, dedicated reviewer access,
the eight Atlas host cases, a real recording and its accessible URL, and portal
checks remain unverified. The repository's review folder supplies fixtures and
a recording guide; neither is a performed review or a recording. No official
directory approval or publication is claimed.
