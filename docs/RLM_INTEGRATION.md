# RLM Runtime Integration Guide

Complete guide to using RLM Runtime (Recursive Language Models) with the Snipara Claude Code plugin for safe code execution with Docker isolation.

## Table of Contents

- [What is RLM Runtime?](#what-is-rlm-runtime)
- [Installation](#installation)
- [Configuration](#configuration)
- [Basic Usage](#basic-usage)
- [Docker Isolation](#docker-isolation)
- [Snipara + RLM Integration](#snipara--rlm-integration)
- [Trajectory Logging](#trajectory-logging)
- [Visualization Dashboard](#visualization-dashboard)
- [Python API](#python-api)
- [Code Execution Patterns](#code-execution-patterns)
- [Safety and Security](#safety-and-security)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## What is RLM Runtime?

**RLM Runtime** is a framework for executing code with Large Language Models in a safe, isolated environment.

### Key Features

| Feature | Description |
|---------|-------------|
| **Docker Isolation** | Execute code in isolated containers with no host access |
| **Recursive Completion** | Break down complex tasks automatically |
| **Trajectory Logging** | Full execution trace with timestamps and token usage |
| **Multi-Provider** | Works with OpenAI, Anthropic, LiteLLM |
| **Visualization** | Interactive dashboard for execution analysis |
| **Resource Limits** | CPU, memory, and network restrictions |

### Why Use RLM Runtime?

```
┌─────────────────────────────────────────────────────────────────┐
│  Traditional LLM Usage                                          │
│                                                                 │
│  User → LLM → Response (text only)                             │
│  - Can describe code                                            │
│  - Cannot execute code                                          │
│  - Cannot verify behavior                                       │
│  - Risk if user runs code blindly                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  RLM Runtime Usage                                              │
│                                                                 │
│  User → LLM → Code → Docker Container → Results → LLM → User   │
│  - Can execute code safely                                      │
│  - Can verify behavior                                          │
│  - Full trajectory log                                          │
│  - No risk to host system                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Use Cases

**Perfect for:**
- ✅ Running tests and validating implementations
- ✅ Complex data processing or computation
- ✅ Executing user-provided code safely
- ✅ Iterative development with feedback loops
- ✅ Chunk-by-chunk feature implementation

**Not suitable for:**
- ❌ Simple code review or explanation
- ❌ Reading or editing files (use Claude's Read/Edit tools)
- ❌ git operations (use Bash tool)
- ❌ Tasks that don't require code execution

---

## Installation

### Prerequisites

1. **Python 3.9 or higher**
```bash
python --version
# Should show: Python 3.9.x or higher
```

2. **Docker installed and running**
```bash
docker --version
# Should show: Docker version 20.10.x or higher

docker ps
# Should not error (confirms Docker is running)
```

3. **LLM API Key** (Anthropic, OpenAI, or LiteLLM)
```bash
# For Anthropic (Claude)
export ANTHROPIC_API_KEY=sk-ant-...

# Or for OpenAI (GPT)
export OPENAI_API_KEY=sk-...

# Or for LiteLLM (unified interface)
export LITELLM_API_KEY=...
```

### Install RLM Runtime

**Option 1: Full installation (recommended)**
```bash
# Install with all features (Docker, visualization, etc.)
pip install rlm-runtime[all]
```

**Option 2: Minimal installation**
```bash
# Core functionality only
pip install rlm-runtime

# Add Docker support
pip install rlm-runtime[docker]

# Add visualization
pip install rlm-runtime[viz]
```

**Option 3: Development installation**
```bash
# Clone repository
git clone https://github.com/recursal/rlm-runtime
cd rlm-runtime

# Install in editable mode
pip install -e ".[all]"
```

### Initialize Configuration

```bash
# Create default configuration file
rlm init

# Configuration saved to: ~/.rlm/config.yaml
```

### Verify Installation

```bash
# Check version
rlm --version

# Test basic execution
rlm run "print('Hello from RLM')"

# Test Docker execution
rlm run --env docker "print('Hello from Docker')"

# Launch visualization (optional)
rlm visualize
```

If all commands succeed, installation is complete! ✅

---

## Configuration

### Configuration File Location

```
~/.rlm/config.yaml
```

### Default Configuration

```yaml
# LLM Provider
backend: anthropic  # or "openai", "litellm"
model: claude-sonnet-4-5

# Execution Environment
environment: docker  # or "repl" (local)
max_depth: 4  # Maximum recursion depth
timeout: 300  # Seconds

# Docker Settings (when environment=docker)
docker:
  image: python:3.11-slim
  network_mode: none  # No network access
  cpu_limit: 2.0  # CPU cores
  memory_limit: 2g  # RAM limit
  read_only: true  # Read-only filesystem

# Logging
log_dir: ./logs
trajectory_format: jsonl  # or "json"
verbose: false

# Visualization
viz:
  port: 8501
  host: localhost
```

### Environment Variables

RLM Runtime respects these environment variables:

| Variable | Purpose | Example |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | Claude API access | `sk-ant-...` |
| `OPENAI_API_KEY` | GPT API access | `sk-...` |
| `LITELLM_API_KEY` | LiteLLM API access | `...` |
| `RLM_CONFIG` | Custom config path | `~/.rlm/custom.yaml` |
| `RLM_LOG_DIR` | Custom log directory | `./my-logs` |
| `DOCKER_HOST` | Docker daemon URL | `unix:///var/run/docker.sock` |

### Customizing Configuration

**Override backend:**
```bash
rlm run --backend openai "Your task"
```

**Override environment:**
```bash
rlm run --env repl "Your task"  # Local (no Docker)
```

**Override timeout:**
```bash
rlm run --timeout 600 "Long running task"
```

**Override max depth:**
```bash
rlm run --max-depth 10 "Complex recursive task"
```

---

## Basic Usage

### Command Line Interface

**Simple execution:**
```bash
rlm run "Write a function that calculates factorial"
```

**With Docker isolation:**
```bash
rlm run --env docker "Write a function that calculates factorial"
```

**With verbose output:**
```bash
rlm run --verbose "Your task"
```

**With custom model:**
```bash
rlm run --model claude-opus-4-5 "Complex reasoning task"
```

### Common Patterns

**1. Write and Test Code**
```bash
rlm run --env docker "
    Write a function that validates email addresses.
    Then write pytest tests for it.
    Run the tests and return results.
"
```

**2. Data Processing**
```bash
rlm run --env docker "
    Parse the JSON file at /workspace/data.json
    Extract all entries with status='active'
    Sort by timestamp
    Return top 10 results
"
```

**3. Complex Computation**
```bash
rlm run --env docker "
    Calculate the first 100 Fibonacci numbers.
    Find the largest prime in that sequence.
    Return the result.
"
```

**4. Multi-Step Task**
```bash
rlm run --env docker "
    1. Generate random test data (1000 records)
    2. Write to CSV file
    3. Read CSV and compute statistics
    4. Generate visualization (matplotlib)
    5. Return summary statistics
"
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Execution error |
| 2 | Timeout |
| 3 | Docker error |
| 4 | API error (LLM) |
| 5 | Configuration error |

---

## Docker Isolation

### Why Docker?

Docker provides **true isolation** for code execution:

```
┌─────────────────────────────────────────────────────────────────┐
│  Without Docker (--env repl)                                    │
│                                                                 │
│  - Code runs on YOUR machine                                    │
│  - Can access YOUR files                                        │
│  - Can make network requests                                    │
│  - Can install packages globally                                │
│  - ⚠️ Security risk for untrusted code                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  With Docker (--env docker)                                     │
│                                                                 │
│  - Code runs in ISOLATED CONTAINER                              │
│  - Cannot access host files (except mounted workspace)          │
│  - No network access (--network none)                           │
│  - Packages installed in container only                         │
│  - ✅ Safe for untrusted code                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Docker Configuration

**Network Isolation:**
```yaml
docker:
  network_mode: none  # No internet access
```

**Resource Limits:**
```yaml
docker:
  cpu_limit: 2.0  # Max 2 CPU cores
  memory_limit: 2g  # Max 2GB RAM
```

**Filesystem:**
```yaml
docker:
  read_only: true  # Container filesystem is read-only
  workspace_mount: /workspace  # Only this is writable
```

**Custom Docker Image:**
```yaml
docker:
  image: python:3.11-slim  # Base image

  # Or use custom image with preinstalled packages
  image: myregistry/rlm-python:latest
```

### Workspace Mounting

RLM mounts your **current directory** as `/workspace` in the container:

```
Host: /Users/you/project/
├── src/
├── tests/
└── data.json

Container: /workspace/
├── src/  (read-only)
├── tests/  (read-only)
└── data.json  (read-only)
```

**To allow writes:**
```bash
# Mount workspace as read-write (use with caution)
rlm run --env docker --writable "Your task"
```

### Security Best Practices

| Practice | Why |
|----------|-----|
| **Always use Docker for untrusted code** | Prevents host compromise |
| **Keep network_mode=none** | Prevents data exfiltration |
| **Use read-only filesystem** | Prevents persistence |
| **Set resource limits** | Prevents DoS attacks |
| **Use minimal base image** | Reduces attack surface |
| **Don't mount sensitive directories** | Prevents data leakage |

---

## Snipara + RLM Integration

### Why Integrate?

```
┌─────────────────────────────────────────────────────────────────┐
│  Snipara: Perfect Context → RLM Runtime: Safe Execution         │
│                                                                 │
│  1. Snipara queries docs (500K → 5K tokens optimized)          │
│  2. RLM Runtime receives focused context                        │
│  3. RLM generates code based on context                         │
│  4. RLM executes code in Docker safely                          │
│  5. RLM returns results + trajectory                            │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Pattern

**Step 1: Query Snipara for Context**
```bash
# Use Snipara MCP to get relevant documentation
rlm_context_query(
    query="How to implement rate limiting?",
    max_tokens=6000,
    search_mode="hybrid"
)
```

**Step 2: Pass Context to RLM Runtime**
```python
from rlm import RLM

# Context from Snipara
context = """
Rate limiting implementation uses Redis:
- Store request count per user per window
- Use sliding window algorithm
- Redis key format: rate_limit:{user_id}:{window}
"""

# Execute with RLM Runtime
rlm = RLM(backend="anthropic", environment="docker")

result = rlm.completion(f"""
    Implement rate limiting middleware using this context:

    {context}

    Requirements:
    1. Use Redis for storage
    2. Sliding window algorithm
    3. 100 requests per minute per user
    4. Write tests
    5. Run tests with pytest
""")

print(result.response)
print(f"Success: {result.success}")
print(f"Trajectory ID: {result.trajectory_id}")
```

**Step 3: Remember Decisions**
```bash
# Save implementation decisions to Snipara memory
rlm_remember(
    type="decision",
    content="Implemented Redis-based rate limiting with sliding window. 100 req/min per user."
)
```

### Full Workflow Example

**Scenario: Implement OAuth Integration**

```python
# Phase 1: Upload Feature Doc to Snipara
rlm_upload_document(
    path="docs/features/oauth-integration.md",
    content="<OAuth 2.0 integration specification>"
)

# Phase 2: Generate Plan with Snipara
plan = rlm_plan(
    query="Implement OAuth 2.0 from docs/features/oauth-integration.md",
    max_tokens=16000
)

# Phase 3: Decompose into Chunks
chunks = rlm_decompose(
    query="OAuth 2.0 implementation",
    max_depth=2
)

# Phase 4: Iterate Through Chunks
from rlm import RLM

rlm = RLM(backend="anthropic", environment="docker")

for chunk in chunks["sub_queries"]:
    # Query Snipara for this chunk's context
    context = rlm_context_query(
        query=chunk["query"],
        max_tokens=6000
    )

    # Execute chunk with RLM Runtime
    result = rlm.completion(f"""
        Task: {chunk['query']}

        Context from Snipara:
        {context['sections']}

        Steps:
        1. Write implementation following team standards
        2. Write comprehensive tests
        3. Run tests with pytest
        4. Return results
    """)

    # Remember what was done
    rlm_remember(
        type="learning",
        content=f"Chunk: {chunk['query']}. Result: {result.response}"
    )

    # Check trajectory
    print(f"Trajectory ID: {result.trajectory_id}")
    print(f"Tokens used: {result.tokens}")
    print(f"Success: {result.success}")
```

### Plugin Commands Integration

The Snipara plugin provides commands that integrate both tools:

**LITE Mode (Quick Tasks)**
```bash
/snipara:lite authentication bug fix
# 1. Queries Snipara (4K tokens)
# 2. Reads files
# 3. Edits code
# 4. Tests
```

**FULL Mode (Complex Features)**
```bash
/snipara:full OAuth integration
# 1. rlm_shared_context() → Team standards
# 2. rlm_recall() → Previous context
# 3. rlm_plan() → Execution plan
# 4. rlm_decompose() → Break into chunks
# 5. FOR EACH CHUNK:
#    - rlm_context_query() → Get context
#    - RLM Runtime → Execute code
#    - rlm_remember() → Save decisions
# 6. rlm_upload_document() → Save implementation
```

**Direct Execution Commands**
```bash
# Local execution (no Docker)
/snipara:run Write tests for authentication module

# Docker execution (isolated)
/snipara:docker Write tests for authentication module and run pytest

# View logs
/snipara:logs

# Visualize trajectory
/snipara:visualize
```

---

## Trajectory Logging

### What is a Trajectory?

A **trajectory** is a complete execution trace including:

- All LLM completion calls (requests + responses)
- All tool uses (function calls)
- Timestamps and latency
- Token usage
- Success/failure status
- Recursion depth

### Log Format

**JSONL Format** (default, one trajectory per line):
```jsonl
{"trajectory_id": "traj_abc123", "backend": "anthropic", "model": "claude-sonnet-4-5", "environment": "docker", "start_time": "2026-01-29T12:00:00Z", "calls": [...], "success": true, "total_tokens": 2847}
```

**JSON Format** (pretty-printed):
```json
{
  "trajectory_id": "traj_abc123",
  "backend": "anthropic",
  "model": "claude-sonnet-4-5",
  "environment": "docker",
  "start_time": "2026-01-29T12:00:00Z",
  "end_time": "2026-01-29T12:00:45Z",
  "duration_ms": 45230,
  "calls": [
    {
      "depth": 0,
      "prompt": "Write a function that validates emails",
      "response": "Here's an email validator...",
      "tools_used": ["python_execute"],
      "tokens_in": 234,
      "tokens_out": 512,
      "latency_ms": 1523
    }
  ],
  "total_tokens": 746,
  "success": true,
  "error": null
}
```

### Log Location

**Default location:**
```
./logs/trajectories_{timestamp}.jsonl
```

**Custom location:**
```bash
# Set via environment variable
export RLM_LOG_DIR=/path/to/logs
rlm run "Your task"

# Or via command line
rlm run --log-dir /path/to/logs "Your task"
```

### Viewing Logs

**Command line:**
```bash
# Show recent executions
rlm logs

# Show last 10
rlm logs --tail 10

# Show specific trajectory
rlm logs --id traj_abc123

# Show only failed executions
rlm logs --failed

# Show logs in JSON format
rlm logs --format json
```

**Python API:**
```python
from rlm import RLM

rlm = RLM()

# Get recent trajectories
trajectories = rlm.get_trajectories(limit=10)

for traj in trajectories:
    print(f"ID: {traj.trajectory_id}")
    print(f"Success: {traj.success}")
    print(f"Tokens: {traj.total_tokens}")
    print(f"Duration: {traj.duration_ms}ms")
```

### Analyzing Trajectories

**Token usage by depth:**
```python
trajectory = rlm.get_trajectory("traj_abc123")

for call in trajectory.calls:
    print(f"Depth {call.depth}: {call.tokens_in + call.tokens_out} tokens")
```

**Total cost estimation:**
```python
# Anthropic pricing (example)
PRICE_PER_1K_INPUT = 0.003
PRICE_PER_1K_OUTPUT = 0.015

total_cost = (
    (trajectory.total_input_tokens / 1000) * PRICE_PER_1K_INPUT +
    (trajectory.total_output_tokens / 1000) * PRICE_PER_1K_OUTPUT
)

print(f"Estimated cost: ${total_cost:.4f}")
```

---

## Visualization Dashboard

### Launching the Dashboard

```bash
# Launch visualization server
rlm visualize

# Server starts at: http://localhost:8501
# Opens automatically in browser
```

**Custom port:**
```bash
rlm visualize --port 8080
```

**Custom log directory:**
```bash
rlm visualize --log-dir /path/to/logs
```

### Dashboard Features

**1. Trajectory List**
- All recent executions
- Filter by success/failure
- Sort by date, tokens, duration

**2. Call Tree Visualization**
- Tree view of recursive calls
- Color-coded by depth
- Click to expand/collapse

**3. Token Usage Analysis**
- Bar chart of tokens per call
- Input vs output tokens
- Cost estimation

**4. Timing Analysis**
- Latency per call
- Total execution time
- Bottleneck identification

**5. Tool Usage**
- Which tools were called
- How many times
- Success rate

**6. Trajectory Export**
- Download as JSON
- Share with team
- Import for comparison

### Example Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  RLM Runtime Trajectory Visualizer                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Trajectory: traj_abc123                                     │
│  Model: claude-sonnet-4-5                                    │
│  Environment: docker                                         │
│  Duration: 45.2s                                             │
│  Tokens: 2,847 (input: 1,234 | output: 1,613)              │
│  Cost: $0.0285                                               │
│  Status: ✅ Success                                          │
│                                                              │
│  Call Tree:                                                  │
│  📦 Root Call (depth 0) - 746 tokens                        │
│  ├─ 🔧 python_execute - "write validator"                  │
│  ├─ 🔧 python_execute - "write tests"                      │
│  └─ 📦 Recursive Call (depth 1) - 1,324 tokens             │
│     ├─ 🔧 python_execute - "run pytest"                    │
│     └─ 📦 Recursive Call (depth 2) - 777 tokens            │
│        └─ 🔧 python_execute - "fix failing test"           │
│                                                              │
│  Tools Used:                                                 │
│  - python_execute: 4 times (100% success)                   │
│  - read_file: 2 times (100% success)                        │
│                                                              │
│  [Export JSON] [Share] [Compare]                            │
└──────────────────────────────────────────────────────────────┘
```

### Comparing Trajectories

**Select multiple trajectories to compare:**
- Token usage differences
- Execution time differences
- Success rate by model
- Cost per task type

**Example comparison:**
```
Model Comparison:
- claude-sonnet-4-5: 2,847 tokens, 45s, $0.0285
- claude-opus-4-5: 3,124 tokens, 52s, $0.0356
- gpt-4-turbo: 2,456 tokens, 38s, $0.0147

Winner: gpt-4-turbo (fastest, cheapest)
```

---

## Python API

### Basic Usage

```python
from rlm import RLM

# Initialize
rlm = RLM(
    backend="anthropic",  # or "openai", "litellm"
    model="claude-sonnet-4-5",
    environment="docker",  # or "repl"
    max_depth=4,
    timeout=300,
    verbose=True
)

# Execute task
result = rlm.completion("Write a function that validates email addresses")

# Check result
print(result.response)
print(f"Success: {result.success}")
print(f"Trajectory ID: {result.trajectory_id}")
print(f"Tokens: {result.tokens}")
```

### Advanced Usage

**With context from Snipara:**
```python
from rlm import RLM

# Get context from Snipara
context = rlm_context_query(
    query="email validation patterns",
    max_tokens=4000
)

# Pass to RLM Runtime
rlm = RLM(backend="anthropic", environment="docker")

result = rlm.completion(f"""
    Implement email validation using these patterns:

    {context['sections']}

    Requirements:
    1. Support RFC 5322
    2. Handle international domains
    3. Write comprehensive tests
    4. Run tests with pytest
""")
```

**Error handling:**
```python
try:
    result = rlm.completion("Your task")

    if result.success:
        print("Success!")
        print(result.response)
    else:
        print("Failed!")
        print(f"Error: {result.error}")

except TimeoutError:
    print("Task timed out")
except Exception as e:
    print(f"Unexpected error: {e}")
```

**Streaming responses:**
```python
# Stream response as it's generated
for chunk in rlm.completion_stream("Long running task"):
    print(chunk, end="", flush=True)
```

**Custom tools:**
```python
# Define custom tool
def custom_tool(arg1, arg2):
    """My custom tool."""
    return f"Result: {arg1} + {arg2}"

# Register tool
rlm = RLM(backend="anthropic", environment="docker")
rlm.register_tool(custom_tool)

# Use in completion
result = rlm.completion("Use custom_tool to add 5 and 3")
```

### Configuration

**Override defaults per call:**
```python
result = rlm.completion(
    "Your task",
    model="claude-opus-4-5",  # Override model
    max_depth=10,  # Override max depth
    timeout=600  # Override timeout
)
```

**Multiple backends:**
```python
# Compare results from different models
claude = RLM(backend="anthropic")
gpt = RLM(backend="openai")

task = "Implement binary search"

claude_result = claude.completion(task)
gpt_result = gpt.completion(task)

print(f"Claude tokens: {claude_result.tokens}")
print(f"GPT tokens: {gpt_result.tokens}")
```

---

## Code Execution Patterns

### Pattern 1: Write and Test

```python
from rlm import RLM

rlm = RLM(backend="anthropic", environment="docker")

result = rlm.completion("""
    1. Write a function that parses JSON logs
    2. Write pytest tests for edge cases
    3. Run tests with pytest
    4. If tests fail, fix and retry
    5. Return final code + test results
""")
```

### Pattern 2: Data Processing

```python
result = rlm.completion("""
    Process the CSV file at /workspace/data.csv:

    1. Load with pandas
    2. Remove duplicates
    3. Filter rows where status='active'
    4. Group by category
    5. Compute summary statistics
    6. Save to /workspace/output.csv
    7. Return statistics
""")
```

### Pattern 3: Multi-Step Computation

```python
result = rlm.completion("""
    Monte Carlo simulation:

    1. Generate 10,000 random samples
    2. Apply transformation function
    3. Compute mean and std dev
    4. Generate histogram with matplotlib
    5. Save plot to /workspace/histogram.png
    6. Return statistics
""")
```

### Pattern 4: Iterative Refinement

```python
result = rlm.completion("""
    Implement and refine a sorting algorithm:

    1. Write quicksort implementation
    2. Write performance tests (1K, 10K, 100K items)
    3. Run tests and measure time
    4. If slow, optimize
    5. Re-run tests
    6. Repeat until performance is good
    7. Return final code + benchmarks
""")
```

### Pattern 5: Context-Aware Implementation

```python
# Get context from Snipara
context = rlm_context_query("authentication implementation patterns")

# Use context in RLM Runtime
result = rlm.completion(f"""
    Implement authentication middleware using these patterns:

    {context['sections']}

    Requirements:
    1. JWT validation
    2. Role-based access control
    3. Rate limiting
    4. Comprehensive tests
    5. Run tests with pytest
""")
```

---

## Safety and Security

### Docker Isolation Guarantees

| Feature | Description | Status |
|---------|-------------|--------|
| **No Host Access** | Container cannot read/write host files | ✅ Enforced |
| **No Network** | Container has no internet access | ✅ Enforced |
| **Resource Limits** | CPU and RAM capped | ✅ Enforced |
| **Read-Only FS** | Container filesystem is read-only | ✅ Enforced |
| **No Persistence** | Container destroyed after execution | ✅ Enforced |
| **Process Isolation** | Container processes isolated from host | ✅ Enforced |

### Attack Vectors (Mitigated)

**1. File System Access**
```
Attack: Malicious code tries to read /etc/passwd
Result: ❌ File not accessible (read-only mount)
```

**2. Network Exfiltration**
```
Attack: Malicious code tries to send data to external server
Result: ❌ No network access (--network none)
```

**3. Resource Exhaustion**
```
Attack: Infinite loop to consume CPU
Result: ❌ CPU limit enforced, container killed after timeout
```

**4. Container Escape**
```
Attack: Attempt to break out of container
Result: ❌ Docker isolation prevents escape
```

**5. Persistent Backdoor**
```
Attack: Write malicious file to persist across runs
Result: ❌ Container destroyed after execution
```

### Security Best Practices

**1. Always use Docker for untrusted code**
```python
# ✅ Safe
rlm = RLM(environment="docker")

# ❌ Unsafe for untrusted code
rlm = RLM(environment="repl")
```

**2. Keep network disabled**
```yaml
# ✅ Secure
docker:
  network_mode: none

# ❌ Insecure
docker:
  network_mode: bridge
```

**3. Use minimal base image**
```yaml
# ✅ Smaller attack surface
docker:
  image: python:3.11-slim

# ❌ Larger attack surface
docker:
  image: python:3.11-full
```

**4. Set resource limits**
```yaml
# ✅ Protected
docker:
  cpu_limit: 2.0
  memory_limit: 2g

# ❌ Unlimited (DoS risk)
docker:
  cpu_limit: null
  memory_limit: null
```

**5. Read-only filesystem**
```yaml
# ✅ Secure
docker:
  read_only: true

# ❌ Writable (persistence risk)
docker:
  read_only: false
```

### Auditing and Monitoring

**Log all executions:**
```python
# All trajectories are logged automatically
rlm = RLM(log_dir="./audit-logs")

result = rlm.completion("Untrusted user code")

# Review logs later
rlm logs --format json > audit-report.json
```

**Monitor resource usage:**
```bash
# Check Docker stats during execution
docker stats
```

**Review trajectories:**
```bash
# Launch visualization dashboard
rlm visualize

# Review all executions
# Look for suspicious patterns
```

---

## Troubleshooting

### Common Issues

**Issue 1: "Docker not found"**
```
Error: Docker daemon not running
```

**Solution:**
```bash
# Check Docker is installed
docker --version

# Start Docker daemon
# macOS: Open Docker Desktop
# Linux: sudo systemctl start docker
# Windows: Start Docker Desktop

# Verify
docker ps
```

---

**Issue 2: "API key not set"**
```
Error: ANTHROPIC_API_KEY not set
```

**Solution:**
```bash
# Set API key
export ANTHROPIC_API_KEY=sk-ant-...

# Or add to ~/.bashrc or ~/.zshrc
echo 'export ANTHROPIC_API_KEY=sk-ant-...' >> ~/.bashrc
```

---

**Issue 3: "Permission denied" (Docker)**
```
Error: Got permission denied while trying to connect to Docker daemon socket
```

**Solution:**
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER

# Log out and log back in

# Verify
docker ps
```

---

**Issue 4: "Timeout"**
```
Error: Task timed out after 300s
```

**Solution:**
```bash
# Increase timeout
rlm run --timeout 600 "Long running task"

# Or in config
timeout: 600
```

---

**Issue 5: "Out of memory" (Docker)**
```
Error: Container killed due to memory limit
```

**Solution:**
```bash
# Increase memory limit
rlm run --memory 4g "Memory intensive task"

# Or in config
docker:
  memory_limit: 4g
```

---

**Issue 6: "Container creation failed"**
```
Error: Failed to create container
```

**Solution:**
```bash
# Check Docker disk space
docker system df

# Clean up if needed
docker system prune

# Check Docker logs
docker logs <container_id>
```

---

**Issue 7: "Model not found"**
```
Error: Model 'claude-sonnet-4-5' not found
```

**Solution:**
```bash
# Check available models
# For Anthropic: https://docs.anthropic.com/en/docs/about-claude/models
# For OpenAI: https://platform.openai.com/docs/models

# Use correct model name
rlm run --model claude-sonnet-4-5 "Your task"
```

---

**Issue 8: "Trajectory not found"**
```
Error: Trajectory 'traj_abc123' not found
```

**Solution:**
```bash
# Check log directory
ls -la ./logs/

# Check config
cat ~/.rlm/config.yaml

# Specify custom log dir
rlm logs --log-dir /path/to/logs
```

---

### Debugging Tips

**1. Enable verbose mode**
```bash
rlm run --verbose "Your task"
```

**2. Check trajectory logs**
```bash
rlm logs --id <trajectory_id> --format json
```

**3. Test with simple task**
```bash
rlm run --env docker "print('Hello')"
```

**4. Check Docker logs**
```bash
docker logs <container_id>
```

**5. Verify configuration**
```bash
cat ~/.rlm/config.yaml
```

---

## Best Practices

### Development Workflow

**1. Start with context query**
```python
# Get relevant context first
context = rlm_context_query("task description", max_tokens=6000)

# Then execute with RLM Runtime
result = rlm.completion(f"Implement: {context}")
```

**2. Use Docker for safety**
```python
# Always use Docker for untrusted code
rlm = RLM(environment="docker")
```

**3. Review trajectories**
```bash
# After execution, review what happened
rlm visualize
```

**4. Save decisions to memory**
```python
# Remember important decisions
rlm_remember(
    type="decision",
    content="Implemented X using approach Y because Z"
)
```

### Performance Optimization

**1. Adjust max_depth for complexity**
```python
# Simple tasks: low depth
rlm = RLM(max_depth=2)

# Complex tasks: higher depth
rlm = RLM(max_depth=10)
```

**2. Use appropriate model**
```python
# Fast, cheap: Sonnet
rlm = RLM(model="claude-sonnet-4-5")

# Powerful, expensive: Opus
rlm = RLM(model="claude-opus-4-5")
```

**3. Set reasonable timeouts**
```python
# Quick tasks
rlm = RLM(timeout=60)

# Long-running tasks
rlm = RLM(timeout=600)
```

### Team Collaboration

**1. Share trajectories**
```bash
# Export trajectory
rlm logs --id traj_abc123 --format json > trajectory.json

# Share with team
# Others can import and analyze
```

**2. Use consistent configuration**
```yaml
# Team-wide config in ~/.rlm/config.yaml
backend: anthropic
model: claude-sonnet-4-5
environment: docker
```

**3. Document implementations**
```python
# After successful execution
rlm_upload_document(
    path="docs/implementations/feature-x.md",
    content="Implementation details..."
)
```

### Cost Management

**1. Monitor token usage**
```bash
rlm logs --format json | jq '.total_tokens'
```

**2. Use cheaper models when possible**
```python
# For simple tasks
rlm = RLM(model="claude-haiku")

# For complex reasoning
rlm = RLM(model="claude-opus-4-5")
```

**3. Set max_depth limits**
```python
# Prevents runaway recursion
rlm = RLM(max_depth=4)
```

---

## Next Steps

### Learn More

- Read [WORKFLOWS.md](./WORKFLOWS.md) for workflow examples
- Read [SKILLS.md](./SKILLS.md) for skill development
- Read [HOOKS.md](./HOOKS.md) for automation hooks
- Check [RLM Runtime GitHub](https://github.com/recursal/rlm-runtime) for updates

### Get Help

- 📚 [RLM Runtime Documentation](https://rlm-runtime.readthedocs.io)
- 📚 [Snipara Documentation](https://snipara.com/docs)
- 💬 [Discord Community](https://discord.gg/snipara)
- 🐛 [Report Issues](https://github.com/Snipara/snipara-claude/issues)

### Contribute

Found a bug? Have an idea? Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

_Last updated: January 2026_
