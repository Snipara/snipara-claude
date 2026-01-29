---
description: Execute code using RLM Runtime with Docker isolation (recommended)
---

# RLM Runtime (Docker Isolated)

Executing with Docker isolation: $ARGUMENTS

**Command:** `rlm run --env docker "$ARGUMENTS"`

This will:
1. Execute the task using your configured LLM
2. Run code inside an isolated Docker container
3. Prevent access to host filesystem and network
4. Log full trajectory for review

**Benefits:**
- 🔒 **Safe execution** - Isolated from your system
- 🚫 **No network access** - Container runs with `--network none`
- 📁 **Read-only workspace** - Mounted as `-v workdir:/workspace:ro`
- ⚡ **Resource limits** - CPU and memory capped

**Prerequisites:**
- Docker installed and running
- RLM Runtime installed: `pip install rlm-runtime[docker]`
- API key configured

**View results:**
- Check logs: `rlm logs`
- View trajectory: `rlm visualize`
