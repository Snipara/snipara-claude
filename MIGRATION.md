# Migrating from the 1.1.0 plugin

The marketplace remains `snipara-plugins`, and the Claude plugin remains
`snipara@snipara-plugins`. Its source now points to `plugins/snipara`.
Version 2 replaces the old commands/RLM Runtime integration with four skills:
`snipara`, `companion`, `orchestrator`, and `settings`.

Update the marketplace and plugin, then restart Claude Code:

```sh
claude plugin marketplace update snipara-plugins
claude plugin update snipara@snipara-plugins
```

Use `/mcp` to authenticate `plugin:snipara:snipara-plugin`. Sign into Snipara and
explicitly choose an accessible project. The account MCP URL is
`https://api.snipara.com/mcp`. Verify the selected project using the plugin's stats.

Existing manually configured global MCP connections are not removed or reused as
proof of plugin authentication. The distinct `snipara-plugin` name avoids collisions.
Do not enable the old root plugin and the new nested plugin together. Existing
legacy sources remain in this Git history and checkout for reference, but the
marketplace loads only the new nested package.

All three modules default to on. Local engines are separately installed and pinned;
OAuth does not copy their credentials or launch a controller. Configure local runtime
project alignment through the settings skill before hosted/execution commands.

If you installed the previous local development marketplace named `snipara`, disable
that copy when installing from the public Claude marketplace to avoid duplicate skills.
Codex's marketplace is named `snipara` and loads the same native package.
