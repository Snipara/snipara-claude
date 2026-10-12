---
name: snipara
description: Retrieve sourced project context and reviewed memory through Snipara Hosted MCP. Use for project knowledge, prior decisions and evidence-backed source questions.
---

Read this plugin's `../../config.json` first. If `modules.snipara` is not true,
stop this skill without calling Snipara. Use the plugin's native Hosted MCP
connection named `snipara-plugin`. In account mode, native OAuth binds it to the project explicitly
chosen in consent: call `snipara_stats` to observe that project ID, even when
local `project` is not configured yet. If a local runtime project is configured,
verify that it matches the returned ID before coordinating local work. Stop on
mismatch and use settings to reconnect or update the local profile. In project
mode, configure the explicit project first. Never substitute another global
connection, environment project or source.

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
