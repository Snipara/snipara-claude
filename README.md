# Snipara + RLM Runtime Claude Code Plugin

> Context optimization + safe code execution - Query docs with 90% token reduction and execute code in Docker isolation

## What is This Plugin?

This plugin integrates TWO powerful tools into Claude Code:

### 1. **Snipara MCP** - Context Optimization
Optimizes documentation context for LLMs, reducing 500K tokens to ~5K tokens of highly relevant content. You use YOUR OWN LLM (Claude, GPT, Gemini) - Snipara just provides the perfect context.

### 2. **RLM Runtime** - Safe Code Execution
Execute real code recursively with Docker isolation. RLM (Recursive Language Models) can inspect context, decompose tasks, run code, and compose results - all with full trajectory logging.

## Features

### Snipara Features
- 🔍 **Smart Documentation Querying** - Semantic search with token budgeting
- 🧠 **Memory & Recall** - Remember decisions and context across sessions
- 📋 **Workflow Modes** - LITE (quick) and FULL (comprehensive) development modes
- 👥 **Team Collaboration** - Multi-project search and shared coding standards
- 🤖 **Agent Coordination** - Swarms for multi-agent workflows

### RLM Runtime Features
- 🔒 **Docker Isolation** - Execute code safely in isolated containers
- 🔄 **Recursive Completion** - Break down complex tasks automatically
- 📊 **Trajectory Logging** - Full execution trace for debugging
- 🎯 **Multi-Provider** - Works with OpenAI, Anthropic, LiteLLM
- 📈 **Visualization** - Interactive dashboard for execution analysis

### Integrated Features
- ⚡ **Chunk-by-Chunk Implementation** - Query context + execute code iteratively
- 🔄 **Auto-Remember** - Automatically save context and decisions
- 🎨 **Session Continuity** - Resume work from where you left off

## Installation

### Prerequisites

1. **Claude Code** installed (v1.0.33+)
2. **Snipara account** at [snipara.com](https://snipara.com)
3. **Snipara API key** from dashboard
4. **Docker** installed and running (for RLM Runtime isolation)
5. **Python 3.9+** (for RLM Runtime)

### Step 1: Install Plugin

```bash
# Install from git
/plugin install https://github.com/alopez3006/snipara-claude
```

### Step 2: Configure Snipara MCP

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "snipara": {
      "type": "http",
      "url": "https://api.snipara.com/mcp/<your-project-slug>",
      "headers": {
        "X-API-Key": "<your-api-key>"
      }
    }
  }
}
```

Get your API key from: [snipara.com/dashboard](https://snipara.com/dashboard)

### Step 3: Install RLM Runtime (Optional)

```bash
# Full installation with all features
pip install rlm-runtime[all]

# Initialize configuration
rlm init

# Verify Docker is running
docker --version

# Test with a simple completion
rlm run --env docker "print('Hello from RLM')"
```

### Step 4: Configure LLM API Keys (For RLM Runtime)

```bash
# For Anthropic (Claude)
export ANTHROPIC_API_KEY=your-key-here

# Or for OpenAI (GPT)
export OPENAI_API_KEY=your-key-here
```

## Usage

### Skills (Automatic)

The plugin includes model-invoked skills that Claude uses automatically:

- **query-docs** - Auto-queries Snipara when you ask about documentation
- **recall-context** - Auto-recalls previous decisions and context
- **plan-task** - Auto-generates execution plans for complex tasks
- **execute-code** - Auto-executes code with RLM Runtime when safe execution needed
- **chunk-implement** - Chunk-by-chunk implementation workflow

### Commands (Manual)

#### Quick Workflows
- `/snipara:lite [task]` - Start LITE mode (quick bug fixes, <5 files)
- `/snipara:full [task]` - Start FULL mode (complex features, 5+ files)

#### Documentation
- `/snipara:search [pattern]` - Search docs with regex
- `/snipara:team [query]` - Search across ALL team projects

#### Memory
- `/snipara:remember [content]` - Save important context
- `/snipara:recall [query]` - Search memories

#### Planning
- `/snipara:plan [task]` - Generate execution plan
- `/snipara:decompose [task]` - Break into sub-tasks

#### Team
- `/snipara:shared` - Get team coding standards
- `/snipara:inject [context]` - Set session context

#### RLM Runtime (Optional)
- `/snipara:run [task]` - Execute with RLM (local)
- `/snipara:docker [task]` - Execute with Docker isolation
- `/snipara:visualize` - Launch trajectory dashboard
- `/snipara:logs` - View execution logs

## Workflow Examples

### LITE Mode (Quick Bug Fix)

```bash
User: Fix the authentication timeout bug
You: /snipara:lite authentication timeout
# Queries context (4K tokens) → Reads files → Fixes → Tests
```

### FULL Mode (Complex Feature)

```bash
User: Implement OAuth integration
You: /snipara:full OAuth integration

# Phase 1: Context & Planning
- Loads team standards from rlm_shared_context
- Generates plan with rlm_plan
- Decomposes into 6 chunks

# Phase 2: Chunk-by-Chunk Implementation
Chunk 1: Database schema
  → rlm_context_query("OAuth database schema")
  → Implement + test

Chunk 2: OAuth provider config
  → rlm_context_query("OAuth configuration")
  → Implement + test

# ... continues for all chunks ...

# Phase 3: Documentation
- Uploads implementation docs
- Stores summaries
- Remembers key decisions
```

### Memory-Driven Development

```bash
# Session 1
User: Implement user registration
# ... work happens ...
You: /snipara:remember type=context "Completed registration API, next: email verification"

# Session 2 (next day)
# Auto-recalls: "Last session: Completed registration API, next: email verification"
You: /snipara:recall email verification progress
# Continues where you left off
```

## Pricing

Snipara offers multiple plans:

- **FREE** - 100 queries/month (keyword search)
- **PRO** - $19/mo, 5,000 queries/month (semantic search, memory, planning)
- **TEAM** - $49/mo, 20,000 queries/month (multi-project, swarms)
- **ENTERPRISE** - $499/mo, unlimited queries

## Support

- 📚 [Documentation](https://snipara.com/docs)
- 💬 [Discord Community](https://discord.gg/snipara)
- 🐛 [Report Issues](https://github.com/alopez3006/snipara-claude/issues)

## License

MIT License - see [LICENSE](LICENSE) file

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Development

To test the plugin locally:

```bash
# Clone the repository
git clone https://github.com/alopez3006/snipara-claude.git
cd snipara-claude

# Test plugin locally
claude --plugin-dir .

# Verify commands appear
/help
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Claude Code + Snipara Plugin                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Skills (Model-Invoked):                                    │
│  - query-docs → rlm_context_query (Snipara MCP)            │
│  - execute-code → rlm run --env docker (RLM Runtime)       │
│  - chunk-implement → Snipara + RLM integration             │
│                                                             │
│  Commands (User-Invoked):                                   │
│  - /snipara:lite, /snipara:full (workflows)                │
│  - /snipara:run, /snipara:docker (RLM execution)           │
│  - /snipara:remember, /snipara:recall (memory)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         ↓                                   ↓
┌──────────────────────┐          ┌──────────────────────┐
│  Snipara MCP Server  │          │  RLM Runtime         │
│  (api.snipara.com)   │          │  (Local/Docker)      │
│                      │          │                      │
│  - Context query     │          │  - Code execution    │
│  - Memory system     │          │  - Trajectory logs   │
│  - Team features     │          │  - Visualization     │
│  - Swarms            │          │  - Multi-provider    │
└──────────────────────┘          └──────────────────────┘
```
