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

If the user has no account, use the sign-up link in Snipara's connection page.
If no project is available, use its Set up my project link to connect the user's
repository or folder through the website, then return to authorization. Do not
substitute the first accessible project. Ask the user which project represents
the work when the choice is ambiguous; Claude chat has no reliable local repo
identity. Tell the user the selected project in plain language.

After authorization, call `snipara_stats` to check the project actually selected.
Use `snipara_help` to discover available tools. A successful login elsewhere does
not establish this connection. If access fails, report the observed error and
let the user reconnect; do not substitute another project or connection.

Ask a question about a document already stored in that Snipara project, retrieve
the relevant source and check the citation. Reconnect through OAuth to change
the selected project. Do not upload Claude files, copy conversations, install
software or run local commands as part of connection setup.

For a newly created project, try a sourced question about `SNIPARA_USAGE.md`.
This guide is product documentation, not proof that the repository was imported.
If it is not indexed yet, report that state. When the user wants to add documents,
guide them to the selected project's document import controls on Snipara's
website. Verify availability after import; never claim a successful upload from
instructions alone. Do not extract or forward Claude attachments or chat content.
When the user changes projects or repositories, stop using the previous project
and reconnect explicitly. This package cannot detect local repository changes.
