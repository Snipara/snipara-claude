---
description: Execute code using RLM Runtime (local execution)
---

# RLM Runtime Execution

Executing with RLM Runtime: $ARGUMENTS

**Command:** `rlm run "$ARGUMENTS"`

This will:
1. Execute the task using your configured LLM (OpenAI, Anthropic, etc.)
2. Run code in a local REPL environment
3. Log full trajectory to `./logs/` directory

**Note:** This uses local execution (no isolation). For safer execution, use `/snipara:docker` instead.

**Prerequisites:**
- RLM Runtime installed: `pip install rlm-runtime[all]`
- API key configured: `export ANTHROPIC_API_KEY=...` or `export OPENAI_API_KEY=...`

**View results:**
- Check logs: `rlm logs`
- View trajectory: `rlm visualize`
