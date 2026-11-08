---
name: connect
description: Connect Snipara Hosted MCP, check the configured project and diagnose account access. Use when the user asks to connect Snipara or troubleshoot its connection.
disable-model-invocation: true
---

Read this plugin's `../../config.json` to identify account or explicit-project
connection mode. In account mode, native OAuth asks the user to choose one
accessible Snipara project; no project is preset by the plugin. Ask the native client to connect or authorize Snipara using its
standard OAuth flow. Never request a token or API key in chat or place one in a
manifest. Do not claim authorization until a real tool request succeeds.

Use this plugin's MCP connection named `snipara-plugin`.
Once connected, call `snipara_stats` to observe the token-bound project ID,
then `snipara_help` to report the observed tool availability.
Answer a sourced question only from returned project context. If authentication
or project authorization fails, explain the observed error. Reconnect through native OAuth to choose another project in account mode.
An explicit project-mode review fixture remains bound to its configured URL.
Do not use another global connection or claim project selection without a
successful tool request. Report the connection actually observed in this host;
another host's successful login does not establish this host's access.

If the user needs an account, follow Sign up in Snipara's connection page. Use
Set up my project when no project exists and connect the intended source there.
After authorization, identify the selected project in plain language. A new
setup project can contain `SNIPARA_USAGE.md`: retrieve it as product guidance,
not evidence that the repository is indexed. Help the user import selected
documents in that project's Snipara dashboard, then verify retrieval readiness.
Do not promise direct upload unless this host exposes the exact supported tool.
When work changes to another repository/project, stop and reconnect explicitly;
this remote-only variant has no local source guard or automatic repo switching.

This directory variant contains Hosted MCP and context/memory skills. It does
not contain Companion, Orchestrator, lifecycle hooks, installers or access to a
local repository. Do not run local commands to install missing capabilities.
