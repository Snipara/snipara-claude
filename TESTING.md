# Snipara Plugin Testing Guide

## Prerequisites

- Claude Code v1.0.33 or later: `claude --version`
- Plugin directory: `/Users/alopez/Devs/snipara-claude`

## Load the Plugin

```bash
cd /Users/alopez/Devs/snipara-claude
claude --plugin-dir .
```

## Quick Test Checklist

### 1. Verify Plugin Loaded

Run this first to see all available commands:

```
/help
```

Expected: You should see 14 commands under "snipara:" namespace:
- `/snipara:lite-mode`
- `/snipara:full-mode`
- `/snipara:remember`
- `/snipara:recall`
- `/snipara:search`
- `/snipara:team-search`
- `/snipara:inject`
- `/snipara:plan`
- `/snipara:decompose`
- `/snipara:shared`
- `/snipara:run`
- `/snipara:docker`
- `/snipara:visualize`
- `/snipara:logs`

### 2. Test Basic Commands

#### Test LITE Mode
```
/snipara:lite-mode authentication bug fix
```

Expected: Claude should query Snipara context and start a lightweight workflow.

#### Test FULL Mode
```
/snipara:full-mode OAuth integration
```

Expected: Claude should start a comprehensive 6-phase workflow with planning.

#### Test Memory Commands
```
/snipara:remember type=decision "Testing the plugin works correctly"
```

Expected: Claude should save this to Snipara memory.

```
/snipara:recall testing plugin
```

Expected: Claude should search memories for "testing plugin".

#### Test Documentation Commands
```
/snipara:search authentication
```

Expected: Claude should search Snipara docs with pattern matching.

```
/snipara:shared
```

Expected: Claude should load team coding standards (requires TEAM plan).

### 3. Test Skills (Model-Invoked)

Skills trigger automatically when appropriate. Test by asking questions:

#### query-docs skill
```
User: How does authentication work in this codebase?
```

Expected: Claude should automatically use `mcp__snipara__rlm_context_query`.

#### recall-context skill
```
User: What did we decide about OAuth last session?
```

Expected: Claude should automatically use `mcp__snipara__rlm_recall`.

#### plan-task skill
```
User: Implement a complex rate limiting system
```

Expected: Claude should automatically use `mcp__snipara__rlm_plan`.

### 4. Test RLM Runtime Commands (Requires RLM Runtime Installed)

```
/snipara:run Write a function that validates email addresses
```

Expected: Executes with RLM Runtime locally.

```
/snipara:docker Write tests for authentication module and run pytest
```

Expected: Executes with Docker isolation.

```
/snipara:logs
```

Expected: Shows recent RLM execution logs.

```
/snipara:visualize
```

Expected: Launches Streamlit dashboard at http://localhost:8501.

### 5. Test Hooks (CLI Only)

Hooks work in Claude Code CLI but **not in VSCode extension**.

#### SessionStart Hook
When you start Claude Code with the plugin:

```bash
claude --plugin-dir .
```

Expected output on start:
```
🧠 Snipara: Recalling previous session context...
```

### 6. Verify All Components

Check that all plugin components are loaded:

```
/agents
```

Expected: Should show any custom agents (if implemented).

```
/skills
```

Expected: Should show the 5 Snipara skills (query-docs, recall-context, plan-task, execute-code, chunk-implement).

## Test Results Template

Use this template to document your test results:

```
## Test Results - [Date]

### Plugin Loading
- [ ] Plugin loaded successfully with `--plugin-dir`
- [ ] All 14 commands visible in `/help`
- [ ] Plugin metadata correct (name: snipara, version: 1.0.0)

### Commands
- [ ] `/snipara:lite-mode` works
- [ ] `/snipara:full-mode` works
- [ ] `/snipara:remember` works
- [ ] `/snipara:recall` works
- [ ] `/snipara:search` works
- [ ] `/snipara:team-search` works (requires TEAM plan)
- [ ] `/snipara:inject` works
- [ ] `/snipara:plan` works
- [ ] `/snipara:decompose` works
- [ ] `/snipara:shared` works (requires TEAM plan)

### RLM Runtime Commands (Optional)
- [ ] `/snipara:run` works
- [ ] `/snipara:docker` works
- [ ] `/snipara:logs` works
- [ ] `/snipara:visualize` works

### Skills
- [ ] query-docs triggers automatically
- [ ] recall-context triggers automatically
- [ ] plan-task triggers automatically
- [ ] execute-code triggers automatically (if RLM installed)
- [ ] chunk-implement triggers automatically (if RLM installed)

### Hooks
- [ ] SessionStart hook displays message on startup (CLI only)

### Issues Found
- None / [List any issues]

### Notes
[Add any additional observations]
```

## Common Issues

### Plugin Not Loading

**Issue:** Commands don't appear in `/help`

**Solutions:**
1. Check plugin structure: `./test-plugin.sh`
2. Verify `plugin.json` is valid JSON: `jq . .claude-plugin/plugin.json`
3. Ensure commands have frontmatter: `head commands/lite-mode.md`
4. Check Claude Code version: `claude --version` (need >= 1.0.33)

### Commands Not Working

**Issue:** Command runs but doesn't work as expected

**Solutions:**
1. Check if MCP server is configured: `.mcp.json` in project root
2. Verify Snipara API key is set in `.mcp.json`
3. Check Snipara account has appropriate plan (FREE/PRO/TEAM)
4. Review command file for typos: `cat commands/[command-name].md`

### Skills Not Triggering

**Issue:** Skills don't invoke automatically

**Solutions:**
1. Verify skill frontmatter has `name` and `description`: `head skills/*/SKILL.md`
2. Check skill description is clear about when to use
3. Try asking questions more explicitly
4. Restart Claude Code to reload skills

### Hooks Not Working

**Issue:** SessionStart hook doesn't show message

**Solutions:**
1. Verify you're using CLI (hooks don't work in VSCode extension)
2. Check `hooks/hooks.json` is valid JSON: `jq . hooks/hooks.json`
3. Restart Claude Code

### RLM Runtime Commands Failing

**Issue:** `/snipara:run` or `/snipara:docker` don't work

**Solutions:**
1. Check RLM Runtime is installed: `rlm --version`
2. Verify Docker is running: `docker ps` (for docker command)
3. Check API key is set: `echo $ANTHROPIC_API_KEY` or `echo $OPENAI_API_KEY`
4. Install RLM Runtime: `pip install rlm-runtime[all]`

## Next Steps After Testing

1. **If all tests pass:** Ready to create GitHub release v1.0.0
2. **If issues found:** Document in GitHub Issues
3. **Share feedback:** Update TESTING.md with your results
4. **Distribute:** Set up plugin marketplace for team/community

## Installation for Others

Once testing is complete, others can install with:

```bash
/plugin install https://github.com/Snipara/snipara-claude
```

Or for local testing:

```bash
/plugin install /Users/alopez/Devs/snipara-claude
```
