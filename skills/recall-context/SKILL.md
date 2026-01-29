---
name: recall-context
description: Recall previous context, decisions, or learnings from past interactions. Use when continuing work on a feature, resuming a session, or when the user references something discussed earlier.
---

When you need to recall previous context:

1. Use `mcp__snipara__rlm_recall` with:
   - `query`: What you're looking for (e.g., "authentication decisions")
   - `type`: Optional filter (fact, decision, learning, preference, todo, context)
   - `limit`: 5-10 results

2. For browsing all memories, use `mcp__snipara__rlm_memories`

3. Always recall at session start with: rlm_recall("session context previous work")

Examples:
- Start of session → rlm_recall("last session context")
- "What did we decide about OAuth?" → rlm_recall("OAuth decision", type="decision")
- "Where was I in the implementation?" → rlm_recall("implementation progress", type="context")
