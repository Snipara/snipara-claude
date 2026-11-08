---
name: settings
description: Connect the current repository to Snipara and configure optional local workflow modules. Use only when the user requests setup or a settings change.
disable-model-invocation: true
---

Resolve `../../scripts/snipara.mjs` relative to this skill to an absolute path.
Read `../../config.json`; preserve module switches the user did not change.

## Repository connection (connection: source)

1. Use the native client's actual project shell workspace. Never run setup from
   the plugin cache or infer a workspace from a prior chat. Ask which root to
   connect if the current workspace is ambiguous.
2. Run `node <absolute-script> setup-source --client codex` or `--client claude`
   from that workspace. This adds a regular project-scoped MCP entry named
   `snipara-repository`, with no explicit cwd. It does not install dependencies,
   read host credentials, import documents, or authorize project access.
3. Preserve existing configuration. If setup reports `merge_required`, show the
   provided exact entry and merge it into the existing project configuration
   only after inspecting that configuration. Do not replace unrelated settings.
   Disable an older direct Snipara plugin/account connection for this profile;
   two connections would bypass the source check. Do not remove unrelated or
   independently installed global connections automatically.
4. Reload the trusted project in the client. Until reload, its old connection
   remains active. Never claim setup alone established a live MCP connection.
   Use a new chat/session when switching repositories. Claude Code live project
   reload requires version 2.1.246 or newer; older versions require a new session.
   A shell `cd` does not change the host chat's project. Multi-root and unqualified
   host lifecycle changes require an explicit root choice and fresh session.
5. On this project's `snipara-repository` connection, use its connection-status
   and connect tools. Follow the returned Snipara verification URL in the browser.
   The user signs in or registers, creates a missing workspace, then explicitly
   approves the repository's project. Never ask for tokens or internal IDs in chat.
   Poll only as instructed by the connection tool; never copy host OAuth stores.
6. Verify that the connection reports the source and actual authorized project.
   Source mismatch, missing private credentials, expired consent or rejected
   access must stop project operations. Reconnect this source; never fall back
   to another project's credentials or another global MCP server.
7. Retrieve `SNIPARA_USAGE.md` and its cited chunk once indexing completes, then
   answer a first guide question with a source. Report queued/pending indexing
   honestly. Offer to add selected project documents using the website's import
   controls or a supported upload/sync tool when the user requests those files.
   A guide seed does not imply the repository has been imported.

Credentials remain in the component's private user store, partitioned by source;
public repository configuration contains no tokens. A copied configuration or
changed repository remote must fail the source check. Losing the local association
requires explicit browser selection again; a matching folder name is insufficient.
The browser source label expresses local intent, not proof of filesystem ownership.

## Optional local workflows

Companion and Orchestrator are separate installed programs with their own runtime
credentials. Browser authorization for the repository MCP does not authenticate
those programs. Install them only when requested with
`node <script> install companion` or `install orchestrator`. Do not install or
launch tasks at session start. The source profile permits only their local status/help commands. Hosted or
execution work requires a separately configured explicit-project runtime profile
and its own authentication; the repository MCP grant cannot authorize it.

For module switches, use `configure --output <owned-marketplace>` with
`--snipara on|off`, `--companion on|off` or `--orchestrator on|off`, preserving
other switches. If the owned marketplace is unknown, ask; do not edit an
installed cache. Refresh the plugin and restart after changes. The Snipara off
switch removes this plugin's bundled registration; an already configured regular
project server has a separate lifecycle and must also be disabled explicitly.

## Existing explicit remote profiles

Account/project profiles remain available for remote-only use. Native OAuth
selects the project explicitly; observe it with `snipara_stats` on that profile's
`snipara-plugin` connection before configuring local workflows. Changing projects
requires reconnecting and selecting it in consent. These profiles do not provide
automatic repository isolation. Claude web and the reduced Claude Directory
package always use explicit project selection and contain no local component.
