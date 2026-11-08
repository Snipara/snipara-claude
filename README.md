# Snipara for Claude Code and Codex

This publisher repository contains the native Snipara marketplace and a separate
Claude Directory submission source. Marketplace installation and official
Directory approval are separate.

Publisher: **Starbox Group Gmbh**. Plugin code and documentation: **MIT**.
The plugin is free. A Snipara account and authorized project access are required;
any service subscription is purchased separately on snipara.com.

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
Open your actual project and use `/snipara:settings` to connect this repository.
The settings skill adds the regular project connection `snipara-repository`.
Reload and approve the trusted project, use its Connect tool, and follow the
Snipara browser link. Sign in or register, then explicitly select or create the
project for this repository. No account credentials or project IDs belong in chat.

The native plugin has no global remote connection. Disable an older direct
Snipara plugin connection before using repository routing; preserve independent
global connections. A new chat/session is required when switching repositories
unless the client's project reload has been qualified. A shell `cd` alone does
not change the chat's project. The local component stores its own source-specific
OAuth association privately; it does not read Codex or Claude credential stores.

After the project's `SNIPARA_USAGE.md` is indexed, ask a usage question and check
its citation. Add selected project documents through Snipara's website or an
explicitly requested supported upload/sync tool. Installation does not import
repository files. Pending indexing must be reported as pending.

Companion **3.9.0** and Orchestrator **1.13.1** remain optional separate programs.
No engine is installed or task started at session launch. Their execution and
hosted credentials require their own explicit setup. See the
[native package instructions](plugins/snipara/README.md).

## Separate submission sources

| Path | Purpose |
| --- | --- |
| `plugins/snipara` | Native source-routing profile `2.2.3-profile.7ce949120db3`; 37 files, no lifecycle hooks |
| `plugins/snipara-directory` | Claude Directory `2.2.3`; exactly eight files, remote OAuth only |
| `directory-draft` | Retained earlier OpenAI remote draft; separate review source |
| `authoring/plugins` | Authoring source and unchanged test modules; never a Directory scan root |

For Claude Directory, select **only `plugins/snipara-directory`** as the plugin
path. Do not submit the repository root, native profile or authoring tree.
If the portal cannot honor a plugin subdirectory, stop and prepare a separate
reviewed eight-file-only source ref. Never add CI, scripts or tests to that scan
root. Use the same publisher organization as the Snipara MCP connector.

The native profile requires a local executor. It is separate from the remote
OpenAI/Claude packages and must not silently replace an existing approved remote
listing. Fresh host/OAuth, hosted deployment, scan, review and publication require
their own evidence. This repository update does not claim official approval.

## Source and checks

`review/plugin-delivery-bindings.json` records the exact reused package members
and historical validation artifact identities. The native and Claude payloads
stay separate. Prepublication Sandbox qualification runs the unchanged authoring tests and four
assembly regressions. Public CI checks both installed inventories, routing
declarations, marketplace identities and legal/icon files without running plugin
code or rebuilding packages.
No CI step submits a Directory listing or updates the owning application repo.

[Website](https://www.snipara.com) · [Support](https://www.snipara.com/contact) ·
[Privacy](https://www.snipara.com/privacy) · [Terms](https://www.snipara.com/terms)
