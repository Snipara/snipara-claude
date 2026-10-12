---
name: settings
description: Configure the Snipara plugin project and independently enable or disable Snipara, Companion and Orchestrator. Use only when the user requests setup or a settings change.
disable-model-invocation: true
---

Locate this plugin's `scripts/snipara.mjs` from the loaded skill directory: it is
`../../scripts/snipara.mjs`. Resolve that to an absolute path before running it.

1. Read `../../config.json`. Show the selected project and the three on/off values.
2. For first setup, use the plugin's native MCP OAuth login. In account mode,
   the user signs into Snipara and explicitly chooses one accessible project in
   the consent screen. After login, call `snipara_stats` on this plugin's MCP
   connection named `snipara-plugin` and read its returned `project_id`. Do not use another global
   connection or infer the project from environment variables. If local runtime
   setup is requested, show that project ID and build its profile with
   `node <script> build --connection account --project <observed-project-id> --output <directory>`.
   This keeps the account MCP URL and native OAuth audience unchanged. A
   project-specific profile remains available with `--connection project` for
   existing explicit-project integrations. Never request a secret in chat.
3. To change an existing profile, use
   `node <script> configure --output <marketplace-directory> --companion off`
   (or `--snipara on|off`, `--orchestrator on|off`, `--project <slug>`). Preserve
   options the user did not change. If the marketplace location is unknown, ask
   for it; do not modify an installed cache or an unrelated repository directory.
4. Explain that the client must refresh its installed local plugin and restart.
   Until reload, its cached profile is still active. Show the resulting profile.
   If first setup installs a project profile from a second marketplace, disable
   the bootstrap copy before using the project profile. Avoid two active copies
   of the same Snipara skills. Do not uninstall unrelated plugins or connections.
5. Use the native client's MCP login for account access. Changing the selected
   account project requires reconnecting and choosing it in consent, then
   updating the local runtime profile to the newly observed project ID. OAuth credentials remain with the native client. If OAuth fails,
   report the observed failure; do not silently copy API keys into a manifest.
6. Local dependencies are separate from the plugin files. When the user requests
   installation, run `node <script> install companion` or `install orchestrator`
   for enabled modules. Never install dependencies or launch tasks at session start.

All three modules default to on. A disabled module's skill is omitted from the
generated profile. Snipara off removes the plugin's MCP registration. Companion
and Orchestrator off also reject the corresponding runtime and install commands.
These switches govern this plugin; existing global MCP connections, independently
installed CLIs, and already running tasks have their own lifecycle.
