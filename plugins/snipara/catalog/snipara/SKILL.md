---
name: snipara
description: Retrieve sourced project context and reviewed memory through Snipara Hosted MCP. Use for project knowledge, prior decisions and evidence-backed source questions.
---

Read this plugin's `../../config.json` first. If `modules.snipara` is not true,
stop this skill without calling Snipara. For `connection: source`, use only the regular project MCP connection named
`snipara-repository`. Check its connection status first. If it is absent or
unconnected, use settings to connect this repository. Never fall back to a direct
account MCP connection. Repository switching follows the host project/session;
a shell `cd` alone does not switch the current chat. Use a fresh session on a new
repository unless that host's project reload is qualified.

For account/project profiles, use `snipara-plugin`. Native OAuth binds it to the
project explicitly chosen in consent. Call `snipara_stats` to observe the project
ID and verify it against any configured runtime project. Stop on mismatch and
reconnect through settings. These remote profiles do not enforce local repository
identity. Never substitute another global connection, environment project or source.

- Validate with `snipara_help` and discover exact tool names. Empty resources do
  not imply a tool-only MCP server is unavailable.
- Recall relevant durable decisions with `snipara_recall` when history matters.
- Use `snipara_context_query` for source truth. Prefer its source facts, caveats
  and verification checklist. Fetch cited chunks with `snipara_get_chunk` before
  relying on exact wording. Retry one weak/slow broad query with narrow keywords.
- For exact current code, inspect local files and tests. Indexed context can lag
  uncommitted edits. Report code graph freshness separately from document health.
- Persist only durable, validated decisions or learnings through the available
  memory tools when the task warrants it. Never store credentials or raw logs.

Use the user's current authorization and project rules. Memory is context, not
approval. If authentication or account access fails, report it rather than
pretending context was retrieved. Do not claim the plugin indexed the repository.
