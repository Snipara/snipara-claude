# Skills Development Guide

Complete guide to understanding and developing skills for the Snipara Claude Code plugin.

## Table of Contents

- [What Are Skills?](#what-are-skills)
- [Existing Skills](#existing-skills)
- [Skill Structure](#skill-structure)
- [Writing Effective Skills](#writing-effective-skills)
- [Testing Skills](#testing-skills)
- [Advanced Patterns](#advanced-patterns)

---

## What Are Skills?

**Skills** are model-invoked capabilities that Claude uses automatically based on task context. Unlike commands (which users invoke explicitly with `/command-name`), skills are triggered by Claude when it determines they're relevant.

### Skills vs Commands

| Aspect | Skills | Commands |
|--------|--------|----------|
| **Invocation** | Automatic (by Claude) | Manual (by user) |
| **Namespace** | None (invisible to user) | `/snipara:command-name` |
| **Use Case** | Background intelligence | Explicit actions |
| **File Format** | `SKILL.md` with frontmatter | `.md` with description |
| **Location** | `skills/skill-name/SKILL.md` | `commands/command-name.md` |

### When Claude Uses Skills

Claude evaluates whether to use a skill based on:
1. **User's request** - What the user is asking for
2. **Skill description** - Does the skill match the need?
3. **Context** - Is this an appropriate time to use it?
4. **Tool availability** - Are required MCP tools available?

---

## Existing Skills

### 1. query-docs

**Purpose:** Automatically query Snipara documentation when Claude needs context

**Triggers when:**
- User asks "How does X work?"
- User asks "Where is X defined?"
- Claude needs implementation context
- User references codebase features

**What it does:**
- Calls `mcp__snipara__rlm_context_query` with user's question
- Retrieves 4-8K tokens of relevant context
- Uses hybrid search for best results

**Example:**
```
User: How does authentication work in our API?

Claude (thinking): The user is asking about authentication. I should
use the query-docs skill to get context from Snipara before answering.

[Automatically calls mcp__snipara__rlm_context_query("authentication API", max_tokens=6000)]

[Receives context about JWT tokens, auth middleware, etc.]

Based on the context from Snipara, your API uses JWT authentication...
```

### 2. recall-context

**Purpose:** Automatically recall previous context and decisions

**Triggers when:**
- User says "What did we decide about X?"
- User asks "Where was I in the implementation?"
- Session starts (looks for previous work)
- User references past decisions

**What it does:**
- Calls `mcp__snipara__rlm_recall` with relevant query
- Retrieves memories with relevance scoring
- Filters by type if appropriate (decision, context, etc.)

**Example:**
```
User: What did we decide about using Redis vs in-memory cache?

Claude (thinking): User is asking about a past decision. I should
use the recall-context skill to search our memory.

[Automatically calls mcp__snipara__rlm_recall("Redis vs in-memory cache decision", type="decision")]

[Receives: "Chose Redis for rate limiting because it works across
multiple servers. In-memory only for single-server deployments."]

Based on our previous decision, we chose Redis for rate limiting...
```

### 3. plan-task

**Purpose:** Automatically generate execution plans for complex tasks

**Triggers when:**
- User asks to implement complex feature
- Task affects 5+ files
- Architectural decisions needed
- Multi-step implementation required

**What it does:**
- Calls `mcp__snipara__rlm_plan` with task description
- Gets sub-queries with dependencies
- Calls `mcp__snipara__rlm_decompose` for chunking
- Presents plan to user for approval

**Example:**
```
User: Implement OAuth 2.0 integration with Google and GitHub

Claude (thinking): This is a complex feature affecting multiple files
and requiring architectural decisions. I should use the plan-task skill.

[Automatically calls mcp__snipara__rlm_plan("OAuth 2.0 integration with Google and GitHub", max_tokens=16000)]

[Receives execution plan with 6 chunks and dependencies]

I've generated an implementation plan for OAuth 2.0:

Chunk 1: Database Schema (no dependencies)
Chunk 2: OAuth Provider Config (depends on Chunk 1)
Chunk 3: Authorization Endpoint (depends on Chunk 2)
...

Would you like to proceed with this plan?
```

### 4. execute-code

**Purpose:** Automatically execute code using RLM Runtime when safe execution needed

**Triggers when:**
- User says "run tests"
- User says "execute this code"
- User says "validate the implementation"
- Claude needs to verify code behavior

**What it does:**
- Checks if RLM Runtime is installed
- Calls `rlm run --env docker` for isolated execution
- Logs trajectory for debugging
- Returns execution results

**Example:**
```
User: Run the authentication tests to make sure everything works

Claude (thinking): User wants to run tests. I should use the
execute-code skill with RLM Runtime for safe execution.

[Checks: rlm --version]
RLM Runtime is installed.

[Automatically calls: rlm run --env docker "Run pytest for authentication module"]

[Receives: All 12 tests passed, execution time: 3.2s]

I've run the authentication tests using RLM Runtime in Docker:
✓ 12 tests passed
✓ Execution time: 3.2 seconds
✓ All tests green

All authentication tests are passing!
```

### 5. chunk-implement

**Purpose:** Implement features chunk-by-chunk using Snipara + RLM Runtime

**Triggers when:**
- Complex feature (5+ files)
- Multi-step implementation
- User wants iterative approach
- Feature has written specification

**What it does:**
- Uploads feature document to Snipara
- Generates plan and decomposes
- For each chunk:
  - Queries context
  - Implements code
  - Runs tests with RLM Runtime
  - Remembers decisions
- Final verification

**Example:**
```
User: I have a spec for real-time notifications. Let's implement it chunk-by-chunk.

Claude (thinking): Complex feature with spec. Perfect for chunk-implement skill.

[Automatically enters chunk-by-chunk workflow]

Phase 1: Uploading spec to Snipara...
[Calls rlm_upload_document()]

Phase 2: Generating plan...
[Calls rlm_plan() and rlm_decompose()]

Found 8 chunks:
1. WebSocket server setup
2. Redis pub/sub
3. Notification model
...

Phase 3: Implementing Chunk 1...
[Calls rlm_context_query("WebSocket server setup")]
[Implements code]
[Runs tests with RLM Runtime]
✓ Chunk 1 complete

Continuing to Chunk 2...
```

---

## Skill Structure

### Directory Layout

```
skills/
└── skill-name/
    └── SKILL.md          # Skill definition
```

### SKILL.md Format

```markdown
---
name: skill-name
description: Brief description of when Claude should use this skill. Be specific about triggers and use cases.
---

# Instructions for Claude

Detailed instructions on:
- When to use this skill
- What tools to call
- How to process results
- What to return to user

## Examples

Show concrete examples of using this skill.

## When NOT to use

Clarify when this skill is not appropriate.
```

### Frontmatter Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | Yes | Skill identifier (matches directory name) |
| `description` | Yes | When Claude should use this skill |
| `disable-model-invocation` | No | Set to `true` for command-like skills |

### Description Best Practices

**Good descriptions** (specific triggers):
```yaml
description: Query Snipara documentation when you need context about the codebase, APIs, architecture, or implementation details. Use this proactively whenever the user asks about how something works or where to find information.
```

**Bad descriptions** (too vague):
```yaml
description: Get documentation
```

**Good descriptions** include:
- **Specific triggers**: "when you need...", "whenever the user asks..."
- **Use cases**: "about the codebase, APIs, architecture..."
- **Action words**: "Query", "Recall", "Execute", "Implement"

---

## Writing Effective Skills

### 1. Clear Triggers

Tell Claude **exactly** when to use the skill:

```markdown
---
description: Execute code safely using RLM Runtime with Docker isolation when you need to run tests, validate implementations, or execute complex computations. Use when the user asks to run code, test implementations, or when you need to verify code behavior.
---
```

**Key elements:**
- **Conditions**: "when you need to...", "when the user asks to..."
- **Specific actions**: "run tests", "validate implementations"
- **Context clues**: "or execute complex computations"

### 2. Step-by-Step Instructions

Guide Claude through the process:

```markdown
When you need to execute code safely:

1. Check if RLM Runtime is installed:
   - Run: `which rlm` or `rlm --version`
   - If not found, suggest: `pip install rlm-runtime[all]`

2. For safe execution, use Docker environment:
   - `rlm run --env docker "Your task here"`
   - Docker provides isolation from host system

3. For quick local execution (trusted code only):
   - `rlm run "Your task here"`

4. Common patterns:
   - **Run tests**: `rlm run --env docker "Run pytest for the authentication module"`
   - **Validate code**: `rlm run --env docker "Check if the API endpoint returns valid JSON"`
```

### 3. Concrete Examples

Show real scenarios:

```markdown
Examples:
- "How does authentication work?" → rlm_context_query("authentication", max_tokens=6000)
- "Where is the API defined?" → rlm_ask("API endpoints")
- "Database schema for users" → rlm_context_query("database schema users", max_tokens=4000)
```

### 4. Tool Parameters

Be explicit about tool calls:

```markdown
Use `mcp__snipara__rlm_context_query` with:
- `query`: The user's question or topic
- `max_tokens`: 4000-8000 depending on complexity
- `search_mode`: "hybrid" (best results)
```

### 5. When NOT to Use

Clarify boundaries:

```markdown
**When NOT to use:**
- Simple code review or explanation
- Reading or editing files (use Read/Edit tools instead)
- git operations (use Bash tool instead)
```

---

## Testing Skills

### 1. Local Testing

```bash
# Test plugin with skills
claude --plugin-dir ~/Devs/snipara-claude

# Ask questions that should trigger skills
User: How does authentication work?
# Should trigger query-docs skill

User: What did we decide about caching?
# Should trigger recall-context skill

User: Implement a new API endpoint
# Should trigger plan-task skill (if complex)
```

### 2. Verify Skill Triggers

Check Claude's reasoning:

```bash
# Enable verbose mode (if available)
claude --plugin-dir . --verbose

# Watch for skill invocations in output
# Look for: "Using skill: query-docs"
```

### 3. Test Skill Logic

Verify each step works:

```bash
# Test MCP tool directly
claude

> User: Test the context query tool
> [Manually call mcp__snipara__rlm_context_query("test", max_tokens=1000)]
> Verify it returns results
```

### 4. Edge Cases

Test when skills should NOT trigger:

```bash
# Should NOT trigger query-docs (no documentation needed)
User: What's 2 + 2?

# Should NOT trigger execute-code (no code execution needed)
User: Explain how loops work

# Should NOT trigger plan-task (too simple)
User: Fix this typo
```

---

## Advanced Patterns

### Pattern 1: Conditional Execution

```markdown
When the user asks you to implement something complex:

1. First check if it's complex enough:
   - Affects 5+ files? → Use planning
   - Multiple sub-tasks? → Use planning
   - Architectural decisions? → Use planning
   - If NO to all: Skip planning, implement directly

2. If complex, use `mcp__snipara__rlm_plan`...
```

### Pattern 2: Progressive Enhancement

```markdown
1. Start with simple query:
   - Use `mcp__snipara__rlm_ask` for quick lookup (~2500 tokens)

2. If more context needed:
   - Use `mcp__snipara__rlm_context_query` with higher token budget

3. If very complex:
   - Use `mcp__snipara__rlm_plan` to break down first
```

### Pattern 3: Tool Composition

```markdown
**Phase 1: Gather Context**
1. Query documentation: `rlm_context_query(...)`
2. Recall previous decisions: `rlm_recall(...)`
3. Load team standards: `rlm_shared_context(...)`

**Phase 2: Execute**
[Use gathered context for implementation]

**Phase 3: Remember**
1. Save decisions: `rlm_remember(type="decision", ...)`
2. Save context: `rlm_remember(type="context", ...)`
```

### Pattern 4: Fallback Logic

```markdown
When you need to execute code safely:

1. Check if RLM Runtime is installed:
   - Run: `rlm --version`
   - If not found, suggest installation

2. Try Docker execution:
   - `rlm run --env docker "..."`
   - If Docker not available, warn user about local execution risks

3. Fallback to local:
   - `rlm run "..."`
   - Log warning about non-isolated execution
```

---

## Creating New Skills

### Step 1: Identify the Need

Ask:
- Is this something Claude should do automatically?
- Does it require multiple steps?
- Will it improve user experience?
- Is it distinct from existing skills?

### Step 2: Define Triggers

List specific scenarios:
```
When to use:
- User asks "X"
- User mentions "Y"
- Context involves "Z"
```

### Step 3: Write the Skill

```markdown
---
name: my-new-skill
description: [Clear, specific description with triggers]
---

[Step-by-step instructions]

[Examples]

[When NOT to use]
```

### Step 4: Test Thoroughly

- Test trigger scenarios
- Test edge cases
- Test with other skills
- Verify tool calls work

### Step 5: Document

Add to this guide with:
- Purpose
- Triggers
- Examples
- Integration notes

---

## Skill Development Checklist

- [ ] Clear, specific description with triggers
- [ ] Step-by-step instructions
- [ ] Concrete examples
- [ ] Tool parameters documented
- [ ] "When NOT to use" section
- [ ] Tested locally
- [ ] Edge cases tested
- [ ] Documented in SKILLS.md
- [ ] No conflicts with existing skills

---

## Common Pitfalls

### 1. Vague Descriptions

❌ **Bad:**
```yaml
description: Help with code
```

✅ **Good:**
```yaml
description: Execute code safely using RLM Runtime when you need to run tests, validate implementations, or execute computations. Use when the user asks to run code or verify behavior.
```

### 2. Missing Examples

❌ **Bad:**
```markdown
Use the tool to query documentation.
```

✅ **Good:**
```markdown
Examples:
- "How does auth work?" → rlm_context_query("authentication", max_tokens=6000)
- "Where is API?" → rlm_ask("API endpoints")
```

### 3. No Boundaries

❌ **Bad:**
```markdown
[No "when NOT to use" section]
```

✅ **Good:**
```markdown
**When NOT to use:**
- Simple explanations
- File operations (use Read/Edit)
- git operations (use Bash)
```

### 4. Unclear Steps

❌ **Bad:**
```markdown
Query the database and return results.
```

✅ **Good:**
```markdown
1. Query context: `rlm_context_query("database schema")`
2. Analyze results
3. Identify relevant tables
4. Return list with descriptions
```

---

## Best Practices

### 1. Be Specific

Tell Claude exactly when and how to use the skill.

### 2. Show, Don't Tell

Use examples to illustrate correct usage.

### 3. Set Boundaries

Clearly define when NOT to use the skill.

### 4. Test Thoroughly

Verify skills work in real scenarios.

### 5. Keep Updated

Update skills as MCP tools evolve.

---

## Next Steps

- Read [WORKFLOWS.md](./WORKFLOWS.md) for workflow examples
- Read [HOOKS.md](./HOOKS.md) for automation hooks
- Read [RLM_INTEGRATION.md](./RLM_INTEGRATION.md) for RLM Runtime details
