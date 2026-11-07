---
name: connect
description: Connect Snipara to an authorized project and troubleshoot its OAuth connection when the user asks.
disable-model-invocation: true
---

Use this plugin's remote MCP connection, named `snipara-plugin`. Ask the user to
connect it through Claude's normal connector authorization flow. Snipara's OAuth
consent lets the user choose one project they can access; the plugin presets none.
Never ask for passwords, API keys or tokens in chat, read credentials from the
machine, or place credentials in plugin files.

After authorization, call `snipara_stats` to check the project actually selected.
Use `snipara_help` to discover available tools. A successful login elsewhere does
not establish this connection. If access fails, report the observed error and
let the user reconnect; do not substitute another project or connection.

Ask a question about a document already stored in that Snipara project, retrieve
the relevant source and check the citation. Reconnect through OAuth to change
the selected project. Do not upload Claude files, copy conversations, install
software or run local commands as part of connection setup.
