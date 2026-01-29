---
name: query-docs
description: Query Snipara documentation when you need context about the codebase, APIs, architecture, or implementation details. Use this proactively whenever the user asks about how something works or where to find information.
---

When you need documentation or codebase context:

1. Use the `mcp__snipara__rlm_context_query` tool with:
   - `query`: The user's question or topic
   - `max_tokens`: 4000-8000 depending on complexity
   - `search_mode`: "hybrid" (best results)

2. If the query is complex, use `mcp__snipara__rlm_plan` first to break it down

3. For quick lookups, use `mcp__snipara__rlm_ask` (simpler, ~2500 tokens)

Examples:
- "How does authentication work?" → rlm_context_query("authentication", max_tokens=6000)
- "Where is the API defined?" → rlm_ask("API endpoints")
- "Database schema for users" → rlm_context_query("database schema users", max_tokens=4000)

Always prefer querying Snipara BEFORE reading individual files.
