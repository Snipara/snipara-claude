---
description: Start LITE mode workflow for quick bug fixes and small features
---

# LITE Mode Workflow

Starting LITE mode for quick development (token budget: ~3-5K).

**Best for:**
- Bug fixes
- Small features (<5 files)
- Known file locations
- Quick iterations

**Workflow:**
1. Query context: `rlm_context_query("$ARGUMENTS", max_tokens=4000)`
2. Read files
3. Edit code
4. Test

Let me query Snipara for context on: $ARGUMENTS
