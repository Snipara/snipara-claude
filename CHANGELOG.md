# 2.0.0 — 2026-10-12

## 2.1.1

- Pin Orchestrator 1.12.1, preserving native plugin runtime routing without forwarding credentials.
- Reject the previous patch runtime and preserve both marketplace identities.

## 2.1.0

- Pin Companion 3.9.0 and Orchestrator 1.12.0.
- Add hook-free desktop exports and generic regression-test distribution.
- Preserve explicit project setup and local-engine credential isolation.

- Shared native plugin for Claude Code and Codex, with Snipara, Companion and Orchestrator enabled by default and independent off switches.
- Account OAuth asks users to choose an accessible project; plugin MCP is named snipara-plugin to coexist with global connections.
- Companion 3.7.0 and Orchestrator 1.9.0 are pinned, separately installed local engines. Enabling the plugin does not start workers or controllers.
- Existing Claude marketplace name snipara-plugins is preserved; its source now points to plugins/snipara. See MIGRATION.md.
- Hook-free directory draft, synthetic review fixtures and review instructions are included. Official directory submissions and approvals are pending.
- Native sourced-answer checks, local checkpoint/observe-mode checks, 23 package tests and isolated client installation checks are recorded. Refresh, reviewer access and recording remain pending.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-02-02

### Added
- 4 new MCP tools matching Snipara SDK Phase 12 (orchestration) and Phase 13 (REPL context bridge):
  - `rlm_load_document` (PRO+) - Load raw document content by file path
  - `rlm_load_project` (TEAM+) - Load structured map of all project documents with token budgeting
  - `rlm_orchestrate` (TEAM+) - Multi-round context exploration (scan → search → raw load) in one call
  - `rlm_repl_context` (PRO+) - Package project context for REPL consumption with Python helpers
- 4 new user-invoked commands:
  - `/snipara:load-document` - Load raw document content
  - `/snipara:load-project` - Load project structure
  - `/snipara:orchestrate` - Multi-round orchestration
  - `/snipara:repl-context` - Build REPL context package
- 1 new model-invoked skill:
  - `orchestrate` - Auto-selects multi-round context exploration for complex queries

### Changed
- Plugin version bumped to 1.1.0
- Total commands: 16 → 20
- Total skills: 5 → 6
- Updated README with new tools reference table, architecture diagram, and examples
- Updated COMMANDS.md with new command mappings and usage examples

### Notes
- Synced with Snipara SDK commit ebf8b60 (Feb 1, 2026)
- Synced with Snipara VS Code extension v1.4.0

## [1.0.0] - 2026-01-29

### Added
- Initial release of Snipara + RLM Runtime Claude Code plugin
- 5 model-invoked skills:
  - `query-docs` - Auto-query Snipara documentation
  - `recall-context` - Auto-recall previous context and decisions
  - `plan-task` - Auto-generate execution plans
  - `execute-code` - Auto-execute code with RLM Runtime
  - `chunk-implement` - Chunk-by-chunk implementation workflow
- 14 user-invoked commands:
  - Workflow commands: `/snipara:lite`, `/snipara:full`
  - Documentation: `/snipara:search`, `/snipara:team`
  - Memory: `/snipara:remember`, `/snipara:recall`
  - Planning: `/snipara:plan`, `/snipara:decompose`
  - Team: `/snipara:shared`, `/snipara:inject`
  - RLM Runtime: `/snipara:run`, `/snipara:docker`, `/snipara:visualize`, `/snipara:logs`
- Integration with Snipara MCP server (39 tools)
- Integration with RLM Runtime for safe code execution
- SessionStart hook for auto-recall
- Comprehensive README with installation and usage instructions
- MIT License

### Notes
- Requires Claude Code v1.0.33 or later
- Snipara account required for context optimization features
- Docker required for RLM Runtime isolation features
- PostToolUse hooks work in CLI only (not VSCode extension)

## [Unreleased]

### Planned for v1.2
- Additional skills for testing, debugging, refactoring
- Integration with Snipara dashboard for usage stats
- Interactive config command `/snipara:config`
- Project templates support

### Planned for v2.0
- LSP integration for inline documentation hints
- MCP server bundled with plugin
- Visual context browser in IDE
- Enhanced team collaboration features
