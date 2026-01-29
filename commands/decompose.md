---
description: Break complex queries into manageable sub-queries
---

# Decompose Query

Breaking down: $ARGUMENTS

Using `rlm_decompose(query="$ARGUMENTS", max_depth=2)`

This will return:
- Sub-queries for each chunk
- Dependencies between chunks
- Suggested execution sequence
