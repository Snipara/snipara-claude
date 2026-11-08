#!/bin/sh
# Informational only: read public module/project settings, never launch a runtime.
printf '%s\n' 'Snipara plugin — configured project and module switches:'
cat "${CLAUDE_PLUGIN_ROOT}/config.json"
printf '\n%s\n' 'Use enabled skills. Local runtimes, credential sharing and task execution require explicit authorization.'
