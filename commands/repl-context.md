---
description: Package project context for REPL consumption with Python helpers (PRO+ plan)
---

# REPL Context

Building REPL context package...

Using `rlm_repl_context()` with optional relevance query from arguments.

If arguments are provided, they are used as a relevance query to prioritize files. Leave empty to load all files within the token budget.

**Plan required:** PRO or higher.

**What it returns:**
- **Context data** - Loaded files with token counts and truncation info
- **Usage hint** - Instructions for how to use the context in a REPL session
- **Setup code** - Python helper code to bootstrap the REPL with project context

**When to use:**
- Before executing code with RLM Runtime that needs project context
- When you want to bridge Snipara documentation into a Python REPL
- For context-aware code execution workflows

**Example:**
```
/snipara:repl-context authentication flow
```

This packages all relevant authentication documentation into a format ready for REPL consumption, including Python setup code.
