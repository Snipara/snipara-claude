---
description: Load structured map of all project documents with token budgeting (TEAM+ plan)
---

# Load Project

Loading project structure...

Using `rlm_load_project()` with optional path filters from arguments.

If arguments are provided, they are treated as comma-separated path prefixes to filter (e.g., `docs/, src/`). Leave empty to load all files within the token budget.

**Plan required:** TEAM or higher.

**Parameters:**
- `paths_filter` (optional) - Comma-separated path prefixes to include
- `max_tokens` (optional) - Token budget for project load (default: server-configured)
- `include_content` (optional) - Whether to include file content (default: true)

**When to use:**
- You need a bird's-eye view of the entire project structure
- You want to understand what documents are available before querying
- You need to load multiple files at once within a token budget
