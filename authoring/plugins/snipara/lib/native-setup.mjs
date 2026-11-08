import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { observeSource } from "./source-binding.mjs";

export const NATIVE_SERVER_NAME = "snipara-repository";
const MARKER = "# Managed by Snipara repository connection v1";
const LIMIT = 1024 * 1024;

function regular(path, directory = false) {
  if (!existsSync(path)) return;
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !(directory ? stat.isDirectory() : stat.isFile()))
    throw new Error("Snipara configuration requires regular files and directories.");
  if (!directory && stat.size > LIMIT) throw new Error("Project configuration is too large to update safely.");
}

function writeNew(path, content) {
  // Exclusive creation only. Existing user files are never rewritten; a merge
  // is returned for the caller to review through its normal editing workflow.
  regular(dirname(path), true);
  regular(path);
  writeFileSync(path, content, { flag: "wx", mode: 0o600 });
}

/** Explicit setup from the native shell workspace; never from a plugin cache cwd. */
export function setupNativeConnection(pluginRoot, client, { cwd = process.cwd(), node = process.execPath } = {}) {
  if (!["codex", "claude"].includes(client)) throw new Error("Choose --client codex or claude.");
  if (!isAbsolute(node)) throw new Error("The Node executable must have an absolute path.");
  const source = observeSource(cwd);
  const plugin = realpathSync(pluginRoot);
  const folder = realpathSync(cwd);
  if (folder === plugin || folder.startsWith(`${plugin}/`))
    throw new Error("Run setup from your project, not from the installed plugin directory.");
  const script = resolve(plugin, "scripts", "native-mcp.mjs");
  regular(script);
  if (!existsSync(script)) throw new Error("This plugin does not include the native repository component.");
  const args = [script, "--source-fingerprint", source.fingerprint, "--source-kind", source.kind];
  const server = { command: node, args }; // No cwd: host must use its current project.
  let path, content, previous = null;
  if (client === "codex") {
    const directory = join(source.root, ".codex");
    regular(directory, true);
    if (!existsSync(directory)) mkdirSync(directory, { mode: 0o700 });
    path = join(directory, "config.toml");
    regular(path);
    previous = existsSync(path) ? readFileSync(path, "utf8") : null;
    content = `${MARKER}\n[mcp_servers.${NATIVE_SERVER_NAME}]\ncommand = ${JSON.stringify(node)}\nargs = ${JSON.stringify(args)}\n`;
    if (previous !== null && previous !== content)
      return { status: "merge_required", client, configuration: path, server: NATIVE_SERVER_NAME,
        snippet: content, message: "Preserve your existing Codex settings and add this project MCP entry. Remove an older direct Snipara connection before using this source connection." };
  } else {
    path = join(source.root, ".mcp.json");
    regular(path);
    previous = existsSync(path) ? readFileSync(path, "utf8") : null;
    const value = previous === null ? {} : JSON.parse(previous);
    if (!value || typeof value !== "object" || Array.isArray(value)
        || (value.mcpServers !== undefined && (!value.mcpServers || typeof value.mcpServers !== "object" || Array.isArray(value.mcpServers))))
      throw new Error("Invalid project MCP configuration; preserve it and repair it before setup.");
    const bypass = Object.entries(value.mcpServers ?? {}).some(([name, entry]) =>
      name === "snipara-plugin" || name === "snipara"
      || (typeof entry?.url === "string" && /^https:\/\/api\.snipara\.com(?::443)?\/mcp(?:[/?#]|$)/i.test(entry.url))
      || [entry?.command, ...(Array.isArray(entry?.args) ? entry.args : [])]
        .some((arg) => typeof arg === "string" && /(?:^|[/\\])snipara-mcp(?:@[^/\\]+)?(?:\.exe)?$/.test(arg)));
    if (bypass)
      throw new Error("An older direct Snipara connection exists here. Disable it before adding the repository connection.");
    const existing = value.mcpServers?.[NATIVE_SERVER_NAME];
    if (existing && JSON.stringify(existing) !== JSON.stringify(server))
      throw new Error("A different Snipara repository entry already exists. Review it before setup.");
    content = `${JSON.stringify({ ...value, mcpServers: { ...value.mcpServers, [NATIVE_SERVER_NAME]: server } }, null, 2)}\n`;
    if (previous !== null && !existing)
      return { status: "merge_required", client, configuration: path, server: NATIVE_SERVER_NAME,
        snippet: `${JSON.stringify({ mcpServers: { [NATIVE_SERVER_NAME]: server } }, null, 2)}\n`,
        message: "Merge this server into the existing project MCP configuration, preserving other entries. Reload and approve the project connection afterward." };
  }
  if (previous === null) writeNew(path, content);
  return { status: "configured", client, configuration: path, server: NATIVE_SERVER_NAME,
    source: { kind: source.kind, fingerprint: source.fingerprint },
    message: "Reload this trusted project in the client, then use Snipara Connect to authorize it in your browser. Use a new chat/session when switching repositories; live Claude project reload requires Claude Code 2.1.246 or newer." };
}
