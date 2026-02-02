---
name: orchestrate
description: Perform multi-round context exploration when a simple query isn't sufficient. Use this when the user needs comprehensive context from multiple files, when implementing features that span the codebase, or when rlm_context_query alone would miss important cross-file relationships.
---

When you need deep, comprehensive context across multiple files:

1. Use `mcp__snipara__rlm_orchestrate` with:
   - `query`: The user's question or implementation task
   - `max_tokens`: 8000-16000 depending on scope
   - `search_mode`: "hybrid" (best results)

2. The tool performs 3 rounds automatically:
   - **Sections scan** - Identifies all relevant sections across files
   - **Ranked search** - Scores and ranks the best matches
   - **Raw load** - Loads full content of top documents

3. For loading a single specific file, prefer `mcp__snipara__rlm_load_document` instead

4. For a project-wide structural overview, use `mcp__snipara__rlm_load_project`

5. To package context for REPL execution, use `mcp__snipara__rlm_repl_context`

**When to choose orchestrate over context_query:**
- The topic spans 3+ files
- You need full file content, not just excerpts
- The user is implementing a complex feature
- Previous context_query results were insufficient

**When to choose context_query instead:**
- Simple, focused questions
- Single-topic lookups
- When token budget should be small (< 6K)

Examples:
- "Implement OAuth integration" → rlm_orchestrate("OAuth flow implementation", max_tokens=12000)
- "How does the payment system work?" → rlm_orchestrate("payment system architecture", max_tokens=8000)
- "Refactor the database layer" → rlm_orchestrate("database layer structure and patterns", max_tokens=16000)
