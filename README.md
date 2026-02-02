# Snipara + RLM Runtime Claude Code Plugin

> Context optimization + safe code execution - Query docs with 90% token reduction and execute code in Docker isolation

## Quick Start (Free)

**100 queries/month free, no credit card required.**

```bash
# 1. Install plugin
/plugin marketplace add Snipara/snipara-claude

# 2. Set up (creates free account automatically)
/snipara:quickstart

# 3. Sign in with GitHub in your browser — done!
```

That's it. Your `.mcp.json` is configured automatically. Start querying with `/snipara:lite-mode [your task]`.

---

## What is This Plugin?

This plugin integrates TWO powerful tools into Claude Code:

### 1. **Snipara MCP** - Context Optimization
Optimizes documentation context for LLMs, reducing 500K tokens to ~5K tokens of highly relevant content. You use YOUR OWN LLM (Claude, GPT, Gemini) - Snipara just provides the perfect context.

### 2. **RLM Runtime** - Safe Code Execution
Execute real code recursively with Docker isolation. RLM (Recursive Language Models) can inspect context, decompose tasks, run code, and compose results - all with full trajectory logging.

## Works With Your Existing LLM Account

Snipara is a **context optimization layer** - it does NOT run an LLM. It works alongside your existing AI subscription:

| Your Account | How It Works |
|---|---|
| **Claude Pro / Max** | Claude Code already has LLM access. Snipara provides optimized context to Claude via MCP. Just authenticate with Snipara and go. |
| **Any MCP-Compatible Client** | Cursor, Windsurf, or any client that supports MCP servers. |
| **RLM Runtime (optional)** | Use your own OpenAI or Anthropic API key for isolated code execution. Snipara provides the context separately. |

**If you use Claude Code with a Pro or Max account**, you already have full LLM access built in. Just authenticate with Snipara (API key or OAuth) and start querying. No additional API keys needed.

```
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  Your Documentation  │────>│  Snipara             │────>│  Your LLM        │
│  (500K+ tokens)      │     │  (Optimizes to ~5K)  │     │  (Claude/GPT/etc)│
└──────────────────────┘     └──────────────────────┘     └──────────────────┘
                              Context Optimization         Your account / key
```

## Features

### Snipara Features
- 🔍 **Smart Documentation Querying** - Semantic search with token budgeting
- 🎯 **Multi-Round Orchestration** - Scan, search, and load in one call *(NEW in v1.1)*
- 📄 **Document & Project Loading** - Load raw files or full project maps *(NEW in v1.1)*
- 🐍 **REPL Context Bridge** - Package context for Python REPL consumption *(NEW in v1.1)*
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
2. **Docker** installed and running (optional, for RLM Runtime isolation)
3. **Python 3.9+** (optional, for RLM Runtime)

> **No Snipara account needed beforehand.** Running `/snipara:quickstart` creates a free account automatically (100 queries/month, no credit card).

### Step 1: Install Plugin

**Option A: From Marketplace (recommended)**

```bash
# Add the Snipara marketplace
/plugin marketplace add Snipara/snipara-claude

# Install the plugin
/plugin install snipara@snipara-plugins
```

**Option B: Local development**

```bash
# Clone and load locally
git clone https://github.com/Snipara/snipara-claude.git
claude --plugin-dir ./snipara-claude
```

### Step 2: Configure Snipara MCP

Add to your project's `.mcp.json` using **either** an API key or an OAuth token:

**Option A: API Key (quickest)**

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

**Option B: OAuth Token (browser-based login)**

```json
{
  "mcpServers": {
    "snipara": {
      "type": "http",
      "url": "https://api.snipara.com/mcp/<your-project-slug>",
      "headers": {
        "Authorization": "Bearer <your-oauth-token>"
      }
    }
  }
}
```

Get your OAuth token via the device flow - see [Authentication](#authentication) below.

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

> **Note:** If you're using Claude Code with a Claude Pro or Max account, you already have LLM access built in. These API keys are only needed if you use the optional RLM Runtime feature for isolated code execution.

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
- **orchestrate** - Multi-round context exploration for complex queries *(NEW in v1.1)*
- **execute-code** - Auto-executes code with RLM Runtime when safe execution needed
- **chunk-implement** - Chunk-by-chunk implementation workflow

### Commands (Manual)

#### Quick Workflows
- `/snipara:lite-mode [task]` - Start LITE mode (quick bug fixes, <5 files)
- `/snipara:full-mode [task]` - Start FULL mode (complex features, 5+ files)

#### Documentation
- `/snipara:search [pattern]` - Search docs with regex
- `/snipara:team-search [query]` - Search across ALL team projects

#### Memory
- `/snipara:remember [content]` - Save important context
- `/snipara:recall [query]` - Search memories

#### Planning
- `/snipara:plan [task]` - Generate execution plan
- `/snipara:decompose [task]` - Break into sub-tasks

#### Team
- `/snipara:shared` - Get team coding standards
- `/snipara:inject [context]` - Set session context

#### Orchestration & Documents *(NEW in v1.1)*
- `/snipara:load-document [path]` - Load raw document content by file path (PRO+)
- `/snipara:load-project [paths]` - Load structured project map with token budgeting (TEAM+)
- `/snipara:orchestrate [query]` - Multi-round scan, search, and load in one call (TEAM+)
- `/snipara:repl-context [query]` - Package project context for REPL with Python helpers (PRO+)

#### RLM Runtime (Optional)
- `/snipara:run [task]` - Execute with RLM (local)
- `/snipara:docker [task]` - Execute with Docker isolation
- `/snipara:visualize` - Launch trajectory dashboard
- `/snipara:logs` - View execution logs

## Workflow Examples

### LITE Mode (Quick Bug Fix)

```bash
User: Fix the authentication timeout bug
You: /snipara:lite-mode authentication timeout
# Queries context (4K tokens) → Reads files → Fixes → Tests
```

### FULL Mode (Complex Feature)

```bash
User: Implement OAuth integration
You: /snipara:full-mode OAuth integration

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

## Authentication

> For the full authentication reference including OAuth device flow details, token management, LLM provider compatibility, and troubleshooting, see [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md).

Snipara supports two authentication methods. Both give you full access to context optimization features.

### Method 1: API Key

The simplest method. Generate a key from your dashboard and add it to `.mcp.json`.

1. Sign in at [snipara.com](https://snipara.com)
2. Go to **Project > API Keys**
3. Click **"Generate Key"**
4. Copy the key (format: `rlm_pk_...`)
5. Add to `.mcp.json` as shown in [Step 2](#step-2-configure-snipara-mcp)

**Key formats:**

| Format | Scope |
|---|---|
| `rlm_pk_...` | Single project access |
| `rlm_team_...` | All projects in a team |

### Method 2: OAuth Device Flow

Recommended for users who prefer browser-based login. This is especially convenient if you already have a Snipara account linked to GitHub or Google.

**How it works:**

```
1. CLI requests a device code from Snipara
2. You open snipara.com/device in your browser
3. Enter the code and log in (GitHub, Google, or email)
4. CLI receives an OAuth token automatically
5. Token is saved and used for all MCP requests
```

**Step-by-step:**

1. **Request a device code:**

```bash
curl -X POST https://snipara.com/api/oauth/device/code \
  -H "Content-Type: application/json" \
  -d '{"client_id": "snipara_cli"}'
```

Response:

```json
{
  "device_code": "abc123...",
  "user_code": "ABCD-1234",
  "verification_uri": "https://snipara.com/device",
  "verification_uri_complete": "https://snipara.com/device?code=ABCD-1234",
  "expires_in": 900,
  "interval": 5
}
```

2. **Open the link and enter the code:**

   Go to [snipara.com/device](https://snipara.com/device) and enter the code (e.g., `ABCD-1234`). Log in with GitHub, Google, or email.

3. **Poll for the token:**

```bash
curl -X POST https://snipara.com/api/oauth/device/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
    "device_code": "abc123...",
    "client_id": "snipara_cli"
  }'
```

Success response:

```json
{
  "access_token": "snipara_at_...",
  "token_type": "Bearer",
  "expires_in": 2592000,
  "refresh_token": "snipara_rt_..."
}
```

4. **Use the token in `.mcp.json`:**

```json
{
  "mcpServers": {
    "snipara": {
      "type": "http",
      "url": "https://api.snipara.com/mcp/<your-project-slug>",
      "headers": {
        "Authorization": "Bearer snipara_at_..."
      }
    }
  }
}
```

**Token details:**

| Token | Format | Validity |
|---|---|---|
| Access token | `snipara_at_...` | 30 days |
| Refresh token | `snipara_rt_...` | 90 days |

To refresh an expired access token:

```bash
curl -X POST https://snipara.com/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "snipara_rt_..."
  }'
```

### Using Snipara With Your LLM Account

Snipara OAuth authenticates you to the **Snipara context optimization service**. It does not connect to OpenAI or other LLM providers. Your LLM access is separate:

| Setup | Snipara Auth | LLM Access | What You Need |
|---|---|---|---|
| **Claude Code + Pro/Max** | API key or OAuth | Built into Claude Code | Snipara auth only |
| **Cursor / Windsurf** | API key or OAuth | Built into IDE | Snipara auth only |
| **RLM Runtime + Anthropic** | API key or OAuth | `ANTHROPIC_API_KEY` | Snipara auth + Anthropic API key |
| **RLM Runtime + OpenAI** | API key or OAuth | `OPENAI_API_KEY` | Snipara auth + OpenAI API key |

**Claude Pro / Max users:** You already have full LLM access through Claude Code. Just authenticate with Snipara (API key or OAuth) and start querying. No additional API keys needed.

**RLM Runtime users:** If you use the optional RLM Runtime for isolated code execution, you need a separate LLM API key (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`) in addition to Snipara auth.

## New MCP Tools (v1.1)

The following tools were added in v1.1, matching the Snipara SDK Phase 12 (orchestration) and Phase 13 (REPL context bridge):

| Tool | Plan | Description |
|------|------|-------------|
| `rlm_load_document` | PRO+ | Load raw document content by file path |
| `rlm_load_project` | TEAM+ | Load structured map of all project documents with token budgeting |
| `rlm_orchestrate` | TEAM+ | Multi-round context exploration (scan → search → raw load) in one call |
| `rlm_repl_context` | PRO+ | Package project context for REPL consumption with Python helpers |

These tools are exposed as both commands (`/snipara:load-document`, `/snipara:load-project`, `/snipara:orchestrate`, `/snipara:repl-context`) and as a model-invoked skill (`orchestrate`) that Claude uses automatically for complex queries.

## Pricing

| Plan | Price | Queries/month | Features |
|------|-------|---------------|----------|
| **FREE** | **$0** | **100** | Keyword search, token budgeting, session persistence |
| PRO | $19/mo | 5,000 | + Semantic search, memory, planning |
| TEAM | $49/mo | 20,000 | + Multi-project search, swarms, shared standards |
| ENTERPRISE | $499/mo | Unlimited | + Custom deployment, SLA |

**No credit card required for FREE plan.** Upgrade anytime at [snipara.com/pricing](https://snipara.com/pricing).

## Support

- 📚 [Documentation](https://snipara.com/docs)
- 💬 [Discord Community](https://discord.gg/snipara)
- 🐛 [Report Issues](https://github.com/Snipara/snipara-claude/issues)

## License

MIT License - see [LICENSE](LICENSE) file

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Development

To test the plugin locally:

```bash
# Clone the repository
git clone https://github.com/Snipara/snipara-claude.git
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
│  - orchestrate → rlm_orchestrate (multi-round)      [v1.1] │
│  - execute-code → rlm run --env docker (RLM Runtime)       │
│  - chunk-implement → Snipara + RLM integration             │
│                                                             │
│  Commands (User-Invoked):                                   │
│  - /snipara:lite, /snipara:full (workflows)                │
│  - /snipara:orchestrate, /snipara:load-* (context)  [v1.1] │
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
│  - Orchestration     │          │  - Trajectory logs   │
│  - Document loading  │          │  - Visualization     │
│  - REPL context      │          │  - Multi-provider    │
│  - Memory system     │          │                      │
│  - Team features     │          │                      │
│  - Swarms            │          │                      │
└──────────────────────┘          └──────────────────────┘
```
