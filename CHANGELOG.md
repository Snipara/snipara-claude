# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

### Planned for v1.1
- Additional skills for testing, debugging, refactoring
- Integration with Snipara dashboard for usage stats
- Interactive config command `/snipara:config`
- Project templates support

### Planned for v2.0
- LSP integration for inline documentation hints
- MCP server bundled with plugin
- Visual context browser in IDE
- Enhanced team collaboration features
