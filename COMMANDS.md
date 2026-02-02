# Snipara Plugin Commands Quick Reference

All commands are prefixed with `/snipara:` namespace.

## Available Commands

### Setup Commands
- `/snipara:quickstart` - One-command setup (sign in + auto-create account + configure)
- `/snipara:login` - Sign in via browser (auto-creates free account if needed)

### Workflow Commands
- `/snipara:lite-mode [task]` - Quick bug fixes and small features
- `/snipara:full-mode [task]` - Complex features with full 6-phase workflow

### Memory Commands
- `/snipara:remember [content]` - Save important context or decisions
- `/snipara:recall [query]` - Search saved memories

### Documentation Commands
- `/snipara:search [pattern]` - Search docs with regex pattern
- `/snipara:team-search [query]` - Search across all team projects

### Planning Commands
- `/snipara:plan [task]` - Generate execution plan
- `/snipara:decompose [task]` - Break task into sub-tasks

### Context Commands
- `/snipara:inject [context]` - Set session context
- `/snipara:shared` - Get team coding standards

### Orchestration & Document Commands *(NEW in v1.1)*
- `/snipara:load-document [path]` - Load raw document content by file path (PRO+)
- `/snipara:load-project [paths]` - Load structured project map with token budgeting (TEAM+)
- `/snipara:orchestrate [query]` - Multi-round scan, search, and load in one call (TEAM+)
- `/snipara:repl-context [query]` - Package project context for REPL with Python helpers (PRO+)

### RLM Runtime Commands (Optional)
- `/snipara:run [task]` - Execute with RLM Runtime (local)
- `/snipara:docker [task]` - Execute with Docker isolation
- `/snipara:visualize` - Launch trajectory dashboard
- `/snipara:logs` - View execution logs

## Command vs Filename Mapping

| Command | Filename |
|---------|----------|
| `/snipara:quickstart` | `commands/quickstart.md` |
| `/snipara:login` | `commands/login.md` |
| `/snipara:lite-mode` | `commands/lite-mode.md` |
| `/snipara:full-mode` | `commands/full-mode.md` |
| `/snipara:remember` | `commands/remember.md` |
| `/snipara:recall` | `commands/recall.md` |
| `/snipara:search` | `commands/search.md` |
| `/snipara:team-search` | `commands/team-search.md` |
| `/snipara:inject` | `commands/inject.md` |
| `/snipara:plan` | `commands/plan.md` |
| `/snipara:decompose` | `commands/decompose.md` |
| `/snipara:shared` | `commands/shared.md` |
| `/snipara:run` | `commands/run.md` |
| `/snipara:docker` | `commands/docker.md` |
| `/snipara:visualize` | `commands/visualize.md` |
| `/snipara:logs` | `commands/logs.md` |
| `/snipara:load-document` | `commands/load-document.md` |
| `/snipara:load-project` | `commands/load-project.md` |
| `/snipara:orchestrate` | `commands/orchestrate.md` |
| `/snipara:repl-context` | `commands/repl-context.md` |

## Usage Examples

### Start LITE workflow
```
/snipara:lite-mode Fix authentication timeout bug
```

### Start FULL workflow
```
/snipara:full-mode Implement OAuth 2.0 integration
```

### Save a decision to memory
```
/snipara:remember type=decision "Using Redis for rate limiting"
```

### Search memories
```
/snipara:recall Redis rate limiting
```

### Search documentation
```
/snipara:search authentication.*jwt
```

### Get team standards
```
/snipara:shared
```

### Orchestrate multi-round context exploration
```
/snipara:orchestrate How does the authentication flow work end-to-end?
```

### Load a specific document
```
/snipara:load-document docs/api.md
```

### Build REPL context for code execution
```
/snipara:repl-context authentication flow
```

## Testing Commands

After loading the plugin with `claude --plugin-dir .`, verify commands are available:

```
/help
```

Look for the "snipara:" section showing all 20 commands.
