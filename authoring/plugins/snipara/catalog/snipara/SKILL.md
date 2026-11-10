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

## Answer a procedural question

Use English retrieval terms for maintained English sources. Preserve exact entity
names, client identifiers, file paths and versions; do not translate identifiers.
For a multi-part task, supply two to four neutral `retrieval_queries` facets with
the original `query`, within one `max_tokens` budget. Describe mechanisms and
constraints without assuming a source proves the requested capability.

Read exact cited chunks before giving commands or applying a procedure. Preserve
parent retirement notices, canonical replacements, scope, missing prerequisites
and negative constraints. A recent date, high relevance/quality score or accepted
journal write does not establish current factual authority. Historical sources
can answer explicitly historical questions when their status remains visible.

After one weak or slow query, retry once with three to eight distinctive terms,
`search_mode="keyword"`, `max_tokens=800`, `return_references=true`,
`auto_decompose=false` and `include_all_tiers=false`. Stop recovery after that
attempt and state any evidence gap. Local code inspection, when available, owns
uncommitted behavior; it does not repair hosted indexing or freshness by itself.

Require source support for the exact requested subject. Generic Snipara hosting
cannot identify an unknown customer's server, owner or backup destination. State
which client-specific evidence is missing. Keep proposals separate from adopted
decisions, continuity separate from reviewed reusable claims, and historical
receipts separate from checks actually run against the current source identity.

Answer with the applicable sourced procedure, unresolved inputs and the actual
verification observed. If no check ran, say so. Do not turn a suggested action,
AnswerPack draft, saved receipt or returned source into execution permission.

## Correct or retain knowledge

For a user-authorized correction, first recover the owning source or explicit
user decision and inspect the existing memory's owner, lifecycle and evidence.
Use the exposed memory/review tools only within that authorization. Prefer a
reviewed supersession linked to its replacement over erasing historical proof.
Store only validated reusable decisions or learnings; an assistant proposal and
an automatic task-summary candidate are not user adoption. Do not save raw
transcripts, transient test counts, personal unrelated work or credentials.
A retrieval question alone does not authorize memory mutation or background
capture. If the needed lifecycle tool is absent, discover with `snipara_help`
and report the actual missing capability instead of inventing a call.
