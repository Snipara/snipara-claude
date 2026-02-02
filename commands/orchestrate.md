---
description: Multi-round context exploration - scan, search, and load in one call (TEAM+ plan)
---

# Orchestrate

Orchestrating multi-round context exploration for: $ARGUMENTS

Using `rlm_orchestrate(query="$ARGUMENTS")`

This performs a 3-phase context exploration in a single call:

1. **Sections Scan** - Scans all project files to identify relevant sections
2. **Ranked Search** - Performs semantic/hybrid search to rank the best matches
3. **Raw Load** - Loads the full content of the top-ranked documents

**Plan required:** TEAM or higher.

**When to use:**
- Complex queries that need comprehensive context from multiple files
- When you want the best possible context without multiple tool calls
- When `rlm_context_query` alone doesn't provide enough depth
- Before implementing features that span many files

**Example:**
```
/snipara:orchestrate How does the authentication flow work end-to-end?
```

This will scan all files, find the most relevant sections about authentication, and load their full content - all in one call.
