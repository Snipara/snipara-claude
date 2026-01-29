---
name: plan-task
description: Use Snipara's planning tools when the user asks you to implement a complex feature, refactor code, or tackle a multi-step task. Generate execution plans before starting work.
---

When the user asks you to implement something complex:

1. First check if it's complex enough:
   - Affects 5+ files? → Use planning
   - Multiple sub-tasks? → Use planning
   - Architectural decisions? → Use planning

2. Use `mcp__snipara__rlm_plan` with:
   - `query`: The task description
   - `max_tokens`: 16000 for comprehensive plans
   - `strategy`: "relevance_first" (default) or "depth_first"

3. Or use `mcp__snipara__rlm_decompose` to break into chunks:
   - `query`: The task
   - `max_depth`: 2 (recommended)

4. Then query context for each sub-task as you implement

Example workflow:
1. User: "Implement OAuth integration"
2. You: rlm_plan("Implement OAuth integration", max_tokens=16000)
3. Result: Sub-queries with execution order
4. You: Implement each sub-query with rlm_context_query
