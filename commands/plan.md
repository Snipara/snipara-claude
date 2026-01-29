---
description: Generate execution plan for complex tasks
---

# Generate Execution Plan

Creating execution plan for: $ARGUMENTS

Using `rlm_plan(query="$ARGUMENTS", max_tokens=16000, strategy="relevance_first")`

This will return:
- Sub-queries with dependencies
- Execution order (topologically sorted)
- Suggested context budget per step
