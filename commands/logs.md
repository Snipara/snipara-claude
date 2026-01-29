---
description: View RLM Runtime execution logs
---

# RLM Execution Logs

Viewing recent RLM execution logs...

**Command:** `rlm logs`

This will show:
- Recent completion calls
- Token usage
- Execution time
- Success/failure status
- Trajectory IDs

**Options:**
- `rlm logs --tail 10` - Show last 10 executions
- `rlm logs --id <trajectory_id>` - Show specific trajectory
- `rlm logs --failed` - Show only failed executions

**Log location:** `./logs/` (JSONL format)

For interactive analysis, use: `/snipara:visualize`
