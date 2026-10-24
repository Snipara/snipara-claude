# Snipara for Claude Code and Codex

One plugin for sourced project context, reviewed memory, local workflow continuity
and explicit orchestration. Snipara, Companion and Orchestrator are on by default
and can be disabled independently through the settings skill.

Publisher: **Starbox Group Gmbh**. Plugin code and documentation: **MIT**.
Snipara branding, hosted service, backend and engine licenses are separate.
The plugin is free. A Snipara account and project access are required; any service
subscription is purchased separately at https://www.snipara.com.

## Claude Code

```sh
claude plugin marketplace add Snipara/snipara-claude
claude plugin install snipara@snipara-plugins
```

Restart Claude Code. In `/mcp`, authenticate `plugin:snipara:snipara-plugin`, sign into
Snipara and choose your project. Then ask `/snipara:snipara` to retrieve a source-backed
answer. Use `/snipara:settings` for project alignment and module switches.

## Codex

```sh
codex plugin marketplace add https://github.com/Snipara/snipara-claude.git
```

Open the Plugins settings in Codex, install **Snipara** from the `snipara` marketplace
and restart/refresh the client. Connect its MCP and select your Snipara project.
On supported CLI versions, native authentication can also be started with:

```sh
codex mcp login snipara-plugin
```

Ask Snipara for a documentation answer with citations, and check the source sections.

## What each module does

| Module | Capability | When disabled |
| --- | --- | --- |
| Snipara | Hosted project context, sources and reviewed memory | Removes the plugin MCP and context skill |
| Companion | Local plans, checkpoints, evidence and resumption | Removes the skill and rejects its launcher/install calls |
| Orchestrator | Explicit controller plans and task/proof coordination | Removes the skill and rejects its launcher/install calls |

Enabling modules does not install engines or start work. Companion **3.9.0** and
Orchestrator **1.12.1** use separate local installations and account configuration.
OAuth credentials stay with the native host. Local engines need explicit project
alignment and separate hosted credentials. See [the native package guide](plugins/snipara/README.md).

## Existing users

Read [MIGRATION.md](MIGRATION.md) before updating from 1.1.0. The existing Claude
marketplace and plugin names are preserved. The old root files remain historical
reference; the marketplace points to the new `plugins/snipara` package.

## Distribution and official review

This Git repository is the publisher's installable marketplace. It does not claim
approval or listing in Anthropic's directory or the shared ChatGPT/Codex directory.
The hook-free `directory-draft` contains Hosted MCP and context/memory skills for
OpenAI review; local Companion/Orchestrator adapters remain in the native package.
See [review preparation](review/README.md) for exact verification and pending items.

[Website](https://www.snipara.com) · [Support](https://www.snipara.com/contact) ·
[Privacy](https://www.snipara.com/privacy) · [Terms](https://www.snipara.com/terms)
