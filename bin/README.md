# Hook Scripts

These scripts are used by Claude Code hooks for automation.

**Note:** Hooks only work in Claude Code CLI, not in the VSCode extension.

## Scripts

- `claude-recall-context` - Session start hook (recalls previous context)
- `snipara-auto-remember.sh` - Auto-remember after Write/Edit (currently disabled)
- `snipara-commit-memory.sh` - Save commit info to memory (currently disabled)

## Usage

Hooks are configured in `../hooks/hooks.json`. Currently only SessionStart is enabled as a simple example.

To enable additional hooks, you'll need to implement custom MCP tool calling logic in these scripts.
