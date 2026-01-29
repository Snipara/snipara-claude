---
description: Launch RLM Runtime trajectory visualization dashboard
---

# RLM Trajectory Visualizer

Launching visualization dashboard...

**Command:** `rlm visualize`

This will:
1. Start a local web server (Streamlit)
2. Load trajectory logs from `./logs/`
3. Open interactive dashboard in your browser

**Dashboard features:**
- 📊 **Call tree** - Visualize recursive completion calls
- 🔍 **Tool usage** - See all tool calls and results
- ⏱️ **Timing analysis** - Token usage and latency breakdown
- 📝 **Trajectory export** - Save logs for sharing/debugging

**Access at:** http://localhost:8501 (opens automatically)

Press Ctrl+C to stop the server.
