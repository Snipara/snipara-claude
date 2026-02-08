# Hooks Configuration Guide

Complete guide to using and configuring automation hooks in the Snipara Claude Code plugin.

## Table of Contents

- [What Are Hooks?](#what-are-hooks)
- [Hook Types](#hook-types)
- [Current Hooks](#current-hooks)
- [Hook Configuration](#hook-configuration)
- [Limitations](#limitations)
- [Creating Custom Hooks](#creating-custom-hooks)

---

## What Are Hooks?

**Hooks** are automation triggers that execute commands at specific points in your Claude Code workflow. They enable automatic actions like:

- Recalling previous context when starting a session
- Auto-saving changes to memory
- Recording git commits
- Running linters after edits
- Custom automation workflows

### Benefits

- **Automation**: Reduce manual steps
- **Consistency**: Same actions every time
- **Memory**: Never forget to save context
- **Integration**: Connect Claude Code to other tools

---

## Hook Types

Claude Code supports several hook types:

| Hook Type | When It Fires | Use Cases |
|-----------|---------------|-----------|
| **SessionStart** | When Claude Code starts | Recall context, load config, greet user |
| **SessionEnd** | When Claude Code exits | Save state, cleanup |
| **PreCompact** | Before conversation compaction | Save important context |
| **PostToolUse** | After a tool is used | Auto-commit, auto-test, auto-save |
| **PrePrompt** | Before sending prompt to LLM | Inject context, modify prompt |
| **PostCompletion** | After LLM response | Log response, analyze output |

### CLI vs VSCode Support

| Hook Type | CLI | VSCode Extension |
|-----------|-----|------------------|
| SessionStart | ✅ | ✅ |
| PreCompact | ✅ | ✅ |
| PostToolUse | ✅ | ❌ |
| PrePrompt | ✅ | ✅ |
| PostCompletion | ✅ | ✅ |
| SessionEnd | ✅ | ✅ |

**⚠️ Important:** PostToolUse hooks currently only work in Claude Code CLI, not in the VSCode extension.

---

## Current Hooks

The Snipara plugin includes these hooks:

### 1. SessionStart Hook

**Purpose:** Display a friendly message when starting Claude Code

**Configuration:**
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo '🧠 Snipara: Recalling previous session context...'"
          }
        ]
      }
    ]
  }
}
```

**What it does:**
- Displays: "🧠 Snipara: Recalling previous session context..."
- Runs when you start `claude` or open Claude Code

**Example:**
```bash
$ claude

🧠 Snipara: Recalling previous session context...

Welcome to Claude Code...
```

### 2. PostToolUse Hooks (Disabled by Default)

**⚠️ Note:** These hooks are disabled by default because they only work in CLI, not VSCode.

**Purpose:** Automatically save changes and commits to Snipara memory

**Potential Configuration (if enabled):**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "snipara-auto-remember.sh \"$TOOL\" \"$FILE\""
          }
        ]
      },
      {
        "matcher": "Bash.*commit",
        "hooks": [
          {
            "type": "command",
            "command": "snipara-commit-memory.sh \"$COMMAND\""
          }
        ]
      }
    ]
  }
}
```

**What it would do (if enabled):**
- After Write/Edit: Save change to memory
- After git commit: Save commit message to memory

**Why disabled:**
- Requires MCP tool calling from bash scripts
- Only works in CLI, not VSCode
- May cause unexpected behavior for VSCode users

---

## Hook Configuration

### Configuration File

Hooks are configured in: `hooks/hooks.json`

### Basic Structure

```json
{
  "hooks": {
    "HookType": [
      {
        "matcher": "optional-regex-pattern",
        "hooks": [
          {
            "type": "command",
            "command": "your-command-here"
          }
        ]
      }
    ]
  }
}
```

### Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `hooks` | Yes | Root object containing all hooks |
| `HookType` | Yes | SessionStart, PostToolUse, etc. |
| `matcher` | No | Regex to filter when hook runs |
| `type` | Yes | Always "command" for shell commands |
| `command` | Yes | Shell command to execute |

### Variables

Available in hook commands:

| Variable | Available In | Value |
|----------|--------------|-------|
| `$TOOL` | PostToolUse | Tool that was used (e.g., "Write", "Edit") |
| `$FILE` | PostToolUse | File that was affected |
| `$COMMAND` | PostToolUse (Bash) | Bash command that was run |

---

## Limitations

### 1. VSCode Extension

**PostToolUse hooks don't work in VSCode extension.**

If you use VSCode:
- SessionStart hooks work ✅
- PreCompact hooks work ✅
- PostToolUse hooks don't work ❌

Solution: Use Claude Code CLI if you need PostToolUse hooks.

### 2. MCP Tool Calling

**Hooks cannot directly call MCP tools.**

Current limitation:
```bash
# ❌ This doesn't work from a hook script
claude mcp snipara rlm_remember --type context --content "..."
```

Workaround:
- Use files for inter-process communication
- Trigger actions on next Claude interaction
- Use external APIs

### 3. Error Handling

**Hooks run silently and don't block.**

If a hook fails:
- Claude Code continues running
- No error shown to user
- Check stderr for debugging

Best practice:
```bash
#!/usr/bin/env bash
# Add error handling in your scripts

command-that-might-fail 2>/dev/null || true
```

### 4. Performance

**Hooks add latency.**

Considerations:
- Keep hooks fast (<100ms)
- Use background processes for slow operations
- Don't block on network calls

---

## Creating Custom Hooks

### Example 1: Auto-Format on Edit

**Goal:** Run prettier after editing files

**Configuration:**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "prettier --write \"$FILE\" 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

**Explanation:**
- Triggers after Edit tool
- Runs prettier on the file
- Silently fails if prettier not installed

### Example 2: Git Auto-Add

**Goal:** Automatically stage files after Write/Edit

**Configuration:**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "git add \"$FILE\" 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

### Example 3: Notification on Session Start

**Goal:** Show desktop notification when Claude starts

**Configuration (macOS):**
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude Code started\" with title \"Snipara\"'"
          }
        ]
      }
    ]
  }
}
```

**Configuration (Linux):**
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "notify-send 'Snipara' 'Claude Code started'"
          }
        ]
      }
    ]
  }
}
```

### Example 4: Context Auto-Save

**Goal:** Save conversation summary periodically

**Configuration:**
```json
{
  "hooks": {
    "PreCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo '[Compaction at '$(date)']' >> ~/.claude/context-log.txt"
          }
        ]
      }
    ]
  }
}
```

### Example 5: Multiple Actions

**Goal:** Run multiple commands on same hook

**Configuration:**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "git add \"$FILE\""
          },
          {
            "type": "command",
            "command": "prettier --write \"$FILE\""
          },
          {
            "type": "command",
            "command": "echo \"Modified: $FILE\" >> .claude-changes.log"
          }
        ]
      }
    ]
  }
}
```

---

## Hook Scripts

### Writing Hook Scripts

Create executable scripts in `bin/` directory:

```bash
#!/usr/bin/env bash
# bin/my-hook-script.sh

# Exit on error (optional - hooks should be resilient)
set -e

# Get arguments
ARG1="$1"
ARG2="$2"

# Do something
echo "Hook triggered with: $ARG1, $ARG2"

# Exit successfully
exit 0
```

Make executable:
```bash
chmod +x bin/my-hook-script.sh
```

Use in hooks:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bin/my-hook-script.sh \"$TOOL\" \"$FILE\""
          }
        ]
      }
    ]
  }
}
```

### Script Best Practices

1. **Silent by default:**
   ```bash
   # Redirect stderr
   command 2>/dev/null || true
   ```

2. **Fast execution:**
   ```bash
   # Use background processes for slow operations
   slow-command &
   ```

3. **Error resilient:**
   ```bash
   # Don't fail on errors
   command || true
   ```

4. **Path aware:**
   ```bash
   # Use absolute paths
   /usr/bin/command instead of command
   ```

5. **Logging:**
   ```bash
   # Log to file for debugging
   echo "Hook ran at $(date)" >> ~/.claude/hooks.log
   ```

---

## Debugging Hooks

### Check Hook Configuration

```bash
# Verify JSON is valid
cat hooks/hooks.json | jq .

# Check for syntax errors
```

### Test Hook Command

```bash
# Run hook command manually
echo '🧠 Snipara: Recalling previous session context...'

# Test with variables
TOOL="Write" FILE="test.ts" bash -c 'echo "Tool: $TOOL, File: $FILE"'
```

### Enable Verbose Logging

```bash
# Run Claude Code with verbose output (if supported)
claude --verbose

# Or check logs
tail -f ~/.claude/logs/*.log
```

### Check Script Permissions

```bash
# Verify scripts are executable
ls -la bin/

# Make executable if needed
chmod +x bin/*.sh
```

---

## Hook Ideas

### Development Workflow

```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {"type": "command", "command": "npm run lint:fix \"$FILE\""},
        {"type": "command", "command": "git add \"$FILE\""}
      ]
    }
  ]
}
```

### Testing

```json
{
  "PostToolUse": [
    {
      "matcher": "Write.*test",
      "hooks": [
        {"type": "command", "command": "npm test -- \"$FILE\""}
      ]
    }
  ]
}
```

### Documentation

```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {"type": "command", "command": "bin/update-docs-index.sh"}
      ]
    }
  ]
}
```

### Notifications

```json
{
  "SessionEnd": [
    {
      "hooks": [
        {"type": "command", "command": "notify-send 'Session ended' 'Claude Code session completed'"}
      ]
    }
  ]
}
```

---

## Future Enhancements

### Planned Features

- **MCP Tool Support**: Call MCP tools directly from hooks
- **VSCode Extension**: PostToolUse hooks in VSCode
- **Async Hooks**: Non-blocking hook execution
- **Hook Marketplace**: Share hooks with community

### Contributing

Have ideas for hooks? Please:
1. Create an issue with your use case
2. Share your hook configuration
3. Submit a PR with examples

---

## Troubleshooting

### Hook Not Running

Check:
- [ ] JSON syntax is valid
- [ ] Hook type is spelled correctly
- [ ] Matcher regex is correct
- [ ] Command is executable
- [ ] Using CLI (not VSCode for PostToolUse)

### Command Fails Silently

Debug:
```bash
# Test command manually
bash -c 'your-command-here'

# Add logging
command 2>> ~/.claude/hook-errors.log
```

### Variables Not Working

Verify:
- [ ] Using correct variable name ($TOOL, $FILE, $COMMAND)
- [ ] Variable is available for that hook type
- [ ] Using double quotes around variables

### Performance Issues

Optimize:
```bash
# Run in background
(slow-command) &

# Use timeout
timeout 1s command || true

# Cache results
if [ ! -f /tmp/cache ]; then expensive-command > /tmp/cache; fi
```

---

## Example Configurations

### Minimal (Current Default)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo '🧠 Snipara: Recalling previous session context...'"
          }
        ]
      }
    ]
  }
}
```

### Developer Workflow

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {"type": "command", "command": "git fetch"},
          {"type": "command", "command": "echo 'Claude Code ready!'"}
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {"type": "command", "command": "prettier --write \"$FILE\" 2>/dev/null || true"},
          {"type": "command", "command": "git add \"$FILE\" 2>/dev/null || true"}
        ]
      }
    ]
  }
}
```

### Full Automation

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {"type": "command", "command": "git fetch"},
          {"type": "command", "command": "npm install"},
          {"type": "command", "command": "echo 'Environment ready!'"}
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {"type": "command", "command": "eslint --fix \"$FILE\""},
          {"type": "command", "command": "prettier --write \"$FILE\""},
          {"type": "command", "command": "git add \"$FILE\""}
        ]
      },
      {
        "matcher": "Bash.*commit",
        "hooks": [
          {"type": "command", "command": "git push"}
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {"type": "command", "command": "git stash"}
        ]
      }
    ]
  }
}
```

---

## Next Steps

- Read [WORKFLOWS.md](./WORKFLOWS.md) for workflow examples
- Read [SKILLS.md](./SKILLS.md) for skill development
- Read [RLM_INTEGRATION.md](./RLM_INTEGRATION.md) for RLM Runtime details
