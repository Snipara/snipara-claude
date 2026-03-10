#!/bin/bash

echo "=== Plugin Diagnostic Check ==="
echo ""

# Check if we're in the right directory
if [ ! -f ".claude-plugin/plugin.json" ]; then
    echo "❌ ERROR: Not in plugin directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected: /Users/alopez/Devs/snipara-claude"
    exit 1
fi

echo "✓ In correct plugin directory"
echo ""

# Validate plugin structure
echo "=== Plugin Structure ==="
echo "Plugin manifest: $([ -f .claude-plugin/plugin.json ] && echo '✓' || echo '✗')"
echo "Commands dir: $([ -d commands ] && echo '✓' || echo '✗')"
echo "Skills dir: $([ -d skills ] && echo '✓' || echo '✗')"
echo "Hooks dir: $([ -d hooks ] && echo '✗')"
echo ""

# Count files
echo "=== Component Count ==="
echo "Commands: $(find commands -name '*.md' 2>/dev/null | wc -l | tr -d ' ')"
echo "Skills: $(find skills -name 'SKILL.md' 2>/dev/null | wc -l | tr -d ' ')"
echo ""

# List all command files
echo "=== Available Command Files ==="
ls -1 commands/*.md 2>/dev/null | sed 's/commands\//  /' | sed 's/\.md$//' | sort
echo ""

# Show expected command names
echo "=== Expected Command Names ==="
for file in commands/*.md; do
    name=$(basename "$file" .md)
    echo "  /snipara:$name"
done | sort
echo ""

echo "=== Next Steps ==="
echo "1. Load plugin: claude --plugin-dir /Users/alopez/Devs/snipara-claude"
echo "2. Check commands: /help"
echo "3. Test command: /snipara:full-mode test task"
echo ""
