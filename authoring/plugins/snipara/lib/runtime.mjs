import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { requireModule, VERSIONS } from "./config.mjs";
import { observeSource, readSourceBinding, SourceBindingError } from "./source-binding.mjs";
// Local preparation does not require or create a cloud connection. The existing
// installer preserves an actual repository connection and its authorization.
export function setupLocalWork(config, pluginRoot, client, {
  cwd = process.cwd(), env = process.env, execute = spawnSync,
} = {}) {
  for (const name of ["companion", "orchestrator"]) requireModule(config, name);
  if (!["codex", "claude"].includes(client)) throw new Error("Choose --client codex or claude.");
  const result = execute(process.platform === "win32" ? "npx.cmd" : "npx", [
    "--yes", "create-snipara@2.2.0", "init", "--profile", "local-work",
    "--client", client === "claude" ? "claude-code" : "codex",
  ], { cwd, env: runtimeEnvironment(env), stdio: "inherit", shell: false, timeout: 600000 });
  if (result.error || result.status !== 0)
    throw new Error("Local work preparation did not complete. Preserve the existing connection and use create-snipara doctor before retrying.");
  return { status: "prepared", localWorkPrepared: true, cloudConnectionObserved: false,
    message: "Reload this trusted project to connect the local tools. Preparation does not prove a live connection or a passing validation." };
}

const SOURCE_IGNORED = new Set([".git", ".hg", ".next", ".snipara", ".svn", ".turbo", ".venv", "__pycache__", "build", "coverage", "dist", "node_modules", "target", "venv"]);
const ONBOARD_IGNORED = new Set([".cache", ".git", ".hg", ".next", ".nuxt", ".parcel-cache", ".pnpm-store", ".pytest_cache", ".ruff_cache", ".svn", ".turbo", ".venv", "__pycache__", "build", "coverage", "dist", "node_modules", "out", "target", "venv"]);
function scopeError(message) { throw new SourceBindingError("source_argument_mismatch", message); }
function inside(root, path) {
  const rel = relative(root, path);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`));
}

function checkSourcePath(cwd, binding, sourceRoot, value) {
  let path;
  try { path = realpathSync(resolve(cwd, value)); }
  catch { scopeError("The selected source path is unavailable. Choose an existing file or folder in this repository."); }
  if (!inside(sourceRoot, path)) scopeError("The selected source is outside this bound repository. Connect that repository separately.");
  const source = observeSource(lstatSync(path).isDirectory() ? path : dirname(path));
  if (!(binding.source.kind === "folder" && source.kind === "folder")
      && (source.kind !== binding.source.kind || source.fingerprint !== binding.source.fingerprint))
    scopeError("The selected source belongs to another repository. Connect that repository separately.");
  return path;
}

function checkSourceTree(cwd, binding, sourceRoot, path, ignored) {
  const stack = [path];
  let entriesSeen = 0;
  while (stack.length) {
    const directory = stack.pop();
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (++entriesSeen > 10000) scopeError("The source safety check is too large. Select a smaller document folder or use a non-recursive import.");
      if (ignored.has(entry.name) && entry.isDirectory()) continue;
      const child = join(directory, entry.name);
      if (entry.isSymbolicLink()) { checkSourcePath(cwd, binding, sourceRoot, child); continue; }
      if (!entry.isDirectory()) continue;
      if (existsSync(join(child, ".git"))) scopeError("The selected folder includes another repository. Import its documents through its own project.");
      stack.push(child);
    }
  }
}

// Exact positional-source contracts for the pinned Companion. Unknown options
// on these commands are rejected rather than guessed; output paths are not inputs.
function sourceCommandOptions(args, start, values, booleans) {
  const options = new Map(), positional = [];
  for (let index = start; index < args.length; index++) {
    const token = args[index];
    if (token === "--") { positional.push(...args.slice(index + 1)); break; }
    if (!token.startsWith("-")) { positional.push(token); continue; }
    const split = token.indexOf("=");
    let flag = split < 0 ? token : token.slice(0, split);
    let value = split < 0 ? undefined : token.slice(split + 1);
    if (split < 0 && /^-[A-Za-z].+/.test(token) && values.has(token.slice(0, 2))) {
      flag = token.slice(0, 2); value = token.slice(2);
    }
    if (values.has(flag)) {
      value ??= args[++index];
      if (!value || value.startsWith("-")) scopeError("A source option needs an explicit value.");
      options.set(flag, value);
    } else if (booleans.has(flag) && value === undefined) options.set(flag, true);
    else scopeError("This source command option is not qualified for a bound runtime. Use the documented import options.");
  }
  if (positional.length > 1) scopeError("Choose exactly one source folder.");
  return { options, positional };
}

function checkRuntimeSourceArguments(name, args, cwd, binding) {
  const sourceRoot = observeSource(cwd).root;
  if (["login", "init"].includes(args[0]))
    scopeError("Finish authentication/setup before binding the source; reconnect explicitly to change this project's authorization.");
  const projects = new Set([binding.projectId, binding.projectSlug]);
  const paths = new Set(["--dir", "--workspace", "--worktree"]);
  for (let index = 0; index < args.length; index++) {
    const token = args[index];
    const split = token.indexOf("=");
    const flag = split < 0 ? token : token.slice(0, split);
    const projectOption = ["--project", "--project-id"].includes(flag);
    const tenantOption = ["--workspace-id", "--team-id"].includes(flag);
    if (!projectOption && !tenantOption && !paths.has(flag)) continue;
    const value = split < 0 ? args[++index] : token.slice(split + 1);
    if (!value || value.startsWith("-")) scopeError("A source/project override needs an explicit value.");
    if (projectOption && !projects.has(value)) scopeError("This command selects a different project from the source binding.");
    if (tenantOption && value !== binding.workspaceId) scopeError("This command selects a different workspace from the source binding.");
    if (paths.has(flag)) {
      const path = checkSourcePath(cwd, binding, sourceRoot, value);
      if (name === "companion" && lstatSync(path).isDirectory()) checkCompanionLocalProject(path, binding);
    }
  }
  if (name === "orchestrator") return sourceRoot;
  if (args.some((value) => /^-d(?:.|$)/.test(value)) && !["impact", "sync-documents"].includes(args[0]) && !(args[0] === "code" && args[1] === "impact")) {
    // -d is depth for impact, directory elsewhere. Require its unambiguous spelling.
    scopeError("Use --dir for a bound runtime directory override.");
  }
  if (args[0] === "emit-event" && args.some((value) => /^-w(?:.|$)/.test(value)))
    scopeError("Use --workspace for a bound runtime workspace override.");
  if (args[0] === "sync-documents") {
    const parsed = sourceCommandOptions(args, 1,
      new Set(["--file", "-f", "--dir", "-d", "--prefix", "-p", "--reindex-kind", "--reindex-mode"]),
      new Set(["--recursive", "-r", "--delete-missing", "--dry-run", "--reindex", "--json"]));
    if (parsed.positional.length) scopeError("Use --file or --dir to select sync input.");
    for (const flag of ["--file", "-f", "--dir", "-d"]) {
      if (!parsed.options.has(flag)) continue;
      const path = checkSourcePath(cwd, binding, sourceRoot, parsed.options.get(flag));
      if (["--dir", "-d"].includes(flag)) checkCompanionLocalProject(path, binding);
      if (["--dir", "-d"].includes(flag) && (parsed.options.has("--recursive") || parsed.options.has("-r")))
        checkSourceTree(cwd, binding, sourceRoot, path, new Set());
    }
  }
  const positionalSource = args[0] === "onboard-folder" || args[0] === "source" || (args[0] === "docs" && args[1] === "bootstrap");
  if (positionalSource) {
    const values = new Set(["--prefix", "-p", "--mode", "-m", "--usage-mode", "--source-kind", "--source-provider", "--source-uri", "--client-id", "--snapshot-at", "--reindex-kind", "--reindex-mode", "--write-manifest", "--max-files", "--max-file-bytes", "--interval-ms", "--output", "-o"]);
    const booleans = new Set(["--no-recursive", "--delete-missing", "--apply", "--no-reindex", "--once", "--json", "--preview", "--force"]);
    const parsed = sourceCommandOptions(args, args[0] === "onboard-folder" ? 1 : 2, values, booleans);
    if (args[0] === "source" && !["init", "snapshot", "status", "sync", "watch"].includes(args[1]))
      scopeError("This source command is not qualified for a bound runtime.");
    if (args[0] === "source" && args[1] === "watch" && !parsed.options.has("--once"))
      scopeError("Continuous source watch is not qualified for a bound runtime. Use source sync or watch --once.");
    const path = checkSourcePath(cwd, binding, sourceRoot, parsed.positional[0] ?? ".");
    if (!lstatSync(path).isDirectory()) scopeError("Choose a source folder.");
    checkCompanionLocalProject(path, binding);
    if (!parsed.options.has("--no-recursive"))
      checkSourceTree(cwd, binding, sourceRoot, path, args[0] === "onboard-folder" ? ONBOARD_IGNORED : SOURCE_IGNORED);
  }
  const filesAreInputs = args[0] === "upload"
    || (args[0] === "business-collections" && args[1] === "upload")
    || (args[0] === "context-pack" && args[1] === "pack");
  if (filesAreInputs) {
    for (let index = 1; index < args.length; index++) {
      const token = args[index];
      const match = token.match(/^(--file|--metadata-file|--dir)(?:=(.*))?$/);
      const short = token.match(/^(-f|-d)(.*)$/);
      if (!match && !short) continue;
      const value = match ? (match[2] ?? args[++index]) : (short[2] || args[++index]);
      if (!value || value.startsWith("-")) scopeError("Choose an explicit source file or folder.");
      checkSourcePath(cwd, binding, sourceRoot, value);
    }
  }
  return sourceRoot;
}

function checkCompanionLocalProject(sourceRoot, binding) {
  for (const [relativePath, json] of [[".snipara/companion/config.json", true], [".snipara/project", false]]) {
    const path = join(sourceRoot, relativePath);
    if (!existsSync(path)) continue;
    checkSourcePath(sourceRoot, binding, sourceRoot, path);
    if (!lstatSync(path).isFile() || lstatSync(path).size > 65536) scopeError("The local project configuration cannot be verified.");
    let value;
    try {
      const text = readFileSync(path, "utf8").trim();
      if (json || text.startsWith("{")) {
        const data = JSON.parse(text);
        value = data.projectId ?? data.project_id ?? data.slug ?? data.project;
      } else value = text;
    } catch { scopeError("The local project configuration cannot be verified."); }
    if (value !== undefined && ![binding.projectId, binding.projectSlug].includes(value))
      scopeError("The local runtime configuration selects a different project. Reconnect this repository.");
  }
}

function checkOrchestratorLocalProject(cwd, sourceRoot, binding) {
  // Pinned 1.13.1 find_config_path() uses this exact cwd-only precedence and
  // get_config() returns its JSON immediately, before considering environment.
  for (const filename of [".agentic.json", ".snipara-orchestrator.json"]) {
    const path = join(cwd, filename);
    if (!existsSync(path)) continue;
    checkSourcePath(cwd, binding, sourceRoot, path);
    if (!lstatSync(path).isFile() || lstatSync(path).size > 65536)
      scopeError("The local Orchestrator configuration cannot be verified.");
    let data;
    try { data = JSON.parse(readFileSync(path, "utf8")); }
    catch { scopeError("The local Orchestrator configuration cannot be verified."); }
    if (!data || typeof data !== "object" || Array.isArray(data)
        || ![binding.projectId, binding.projectSlug].includes(data.snipara_project))
      scopeError("The local Orchestrator configuration selects a different project. Reconnect this repository.");
    if (typeof data.repo_path !== "string" || !data.repo_path)
      scopeError("The local Orchestrator repository path cannot be verified.");
    const repository = checkSourcePath(cwd, binding, sourceRoot, data.repo_path);
    if (!lstatSync(repository).isDirectory()) scopeError("Choose a repository folder for Orchestrator.");
    return;
  }
}

// Do not hand unrelated provider keys, package tokens or loader-injection flags
// to an optional runtime or package installer. Native MCP OAuth stays in the host.
export function runtimeEnvironment(env, shareSniparaCredentials = false, shareNativeNetwork = false) {
  const safe = {};
  for (const key of [
    "PATH", "HOME", "USER", "LOGNAME", "LANG", "LC_ALL", "TERM",
    "TMPDIR", "TMP", "TEMP", "SystemRoot", "WINDIR", "USERPROFILE",
    "APPDATA", "LOCALAPPDATA", "PATHEXT", "ComSpec",
    "PLUGIN_DATA", "CLAUDE_PLUGIN_DATA",
  ]) {
    if (typeof env[key] === "string") safe[key] = env[key];
  }
  if (shareSniparaCredentials) {
    for (const key of ["SNIPARA_API_KEY", "RLM_API_KEY"]) {
      if (typeof env[key] === "string") safe[key] = env[key];
    }
  }
  if (shareNativeNetwork) {
    if (env.CODEX_NETWORK_PROXY_ACTIVE !== "1")
      throw new Error("Native network forwarding requires an active Codex network proxy.");
    for (const key of ["HTTP_PROXY", "HTTPS_PROXY"]) {
      let url;
      try { url = new URL(env[key]); } catch { throw new Error("Missing native loopback proxy route."); }
      if (url.protocol !== "http:" || !["127.0.0.1", "[::1]", "localhost"].includes(url.hostname)
          || !url.port || url.username || url.password || url.pathname !== "/" || url.search || url.hash)
        throw new Error("Native proxy route must be an uncredentialed loopback HTTP endpoint.");
      safe[key] = url.href;
    }
    // Native direct egress remains blocked by the host. Do not forward NO_PROXY,
    // loader flags or arbitrary provider secrets; Node must use the owned proxy.
    safe.NODE_USE_ENV_PROXY = "1";
  }
  return safe;
}

export function runtimeDirectory(env = process.env, cwd = process.cwd()) {
  return resolve(
    env.PLUGIN_DATA || env.CLAUDE_PLUGIN_DATA || join(cwd, ".snipara", "plugin-runtime")
  );
}

export function invocation(
  config,
  name,
  args,
  { env = process.env, cwd = process.cwd(), probe = spawnSync,
    shareSniparaCredentials = false, shareNativeNetwork = false } = {}
) {
  requireModule(config, name); // Must run before probing binaries or spawning any process.
  if (
    !["companion", "orchestrator"].includes(name) ||
    !Array.isArray(args) ||
    args.some((arg) => typeof arg !== "string")
  ) {
    throw new Error("Expected companion or orchestrator and a CLI argument array.");
  }
  const help = args.length === 1 && ["--help", "-h", "--version"].includes(args[0]);
  const localStatus =
      name === "companion"
        ? args[0] === "workflow" &&
          args[1] === "status" &&
          args.slice(2).every((arg) => arg === "--json")
        : args[0] === "status" && args.slice(1).every((arg) => arg === "--json");
  if (config.connection === "source" && !help && !localStatus)
    throw new Error("The repository MCP connection does not authenticate Companion or Orchestrator. Use an explicitly configured separate runtime profile; this source profile permits local status/help only.");
  if (!config.modules.snipara || (!config.project && config.connection !== "source")) {
    if (!help && !localStatus)
      throw new Error(
        config.modules.snipara
          ? "Choose your project with the settings skill before hosted or execution workflows."
          : "Snipara is off; this profile permits local status/help only. Enable Snipara for hosted or execution workflows."
      );
  }
  // This guard covers local runtime launches only. It does not observe native
  // MCP OAuth or intercept the host's direct remote MCP calls.
  let sourceBinding = null, sourceRoot = null;
  if (!help && !localStatus) {
    try {
      sourceBinding = readSourceBinding(cwd);
    } catch (error) {
      if (config.sourceBound || config.connection === "source" || !(error instanceof SourceBindingError) || error.code !== "binding_missing") throw error;
    }
    if (sourceBinding && config.connection !== "source" && ![sourceBinding.projectId, sourceBinding.projectSlug].includes(config.project))
      throw new SourceBindingError("project_mismatch", "This runtime profile belongs to a different Snipara project. Connect this repository before continuing.");
    if (sourceBinding) {
      sourceRoot = checkRuntimeSourceArguments(name, args, cwd, sourceBinding);
      if (name === "companion") checkCompanionLocalProject(sourceRoot, sourceBinding);
      else checkOrchestratorLocalProject(cwd, sourceRoot, sourceBinding);
    }
  }
  if (shareNativeNetwork && name !== "companion")
    throw new Error("Native network forwarding currently supports Companion only.");
  const runtimeEnv = {
    ...runtimeEnvironment(env, shareSniparaCredentials, shareNativeNetwork),
    SNIPARA_COMPANION_SKIP_NPM_VERSION_CHECK: "1",
  };
  if (config.project || sourceBinding) {
    runtimeEnv.SNIPARA_PROJECT = sourceBinding?.projectSlug ?? config.project;
    runtimeEnv.SNIPARA_PROJECT_SLUG = sourceBinding?.projectSlug ?? config.project;
    runtimeEnv.SNIPARA_PROJECT_ID = sourceBinding?.projectId ?? config.project;
    runtimeEnv.SNIPARA_API_URL = "https://api.snipara.com";
  }
  if (sourceRoot) {
    runtimeEnv.SNIPARA_WORKSPACE_DIR = sourceRoot;
    // Without cwd JSON, 1.13.1 may find Companion credentials in an ancestor.
    // Its REPO_PATH environment override prevents that fallback moving execution
    // outside the verified source. Local JSON was independently checked above.
    if (name === "orchestrator") runtimeEnv.REPO_PATH = sourceRoot;
  }
  const data = runtimeDirectory(env, cwd);
  const local =
    name === "companion"
      ? join(data, "companion", "node_modules", "snipara-companion", "dist", "index.js")
      : join(
          data,
          "orchestrator",
          process.platform === "win32" ? "Scripts" : "bin",
          process.platform === "win32" ? "snipara-orchestrator.exe" : "snipara-orchestrator"
        );
  const command = existsSync(local)
    ? name === "companion"
      ? process.execPath
      : local
    : `snipara-${name}`;
  const prefix = existsSync(local) && name === "companion" ? [local] : [];
  const result = probe(command, [...prefix, "--version"], {
    encoding: "utf8",
    shell: false,
    timeout: 10000,
    env: runtimeEnv,
  });
  const version = `${result.stdout || ""} ${result.stderr || ""}`.match(/\b\d+\.\d+\.\d+\b/)?.[0];
  if (result.error || result.status !== 0 || version !== VERSIONS[name]) {
    throw new Error(
      `Install the pinned ${name} ${VERSIONS[name]} with this plugin's 'install ${name}' command.`
    );
  }
  return {
    command,
    args: [...prefix, ...args],
    options: { cwd, env: runtimeEnv, stdio: "inherit", shell: false },
  };
}

export function installRuntime(
  config,
  name,
  { env = process.env, cwd = process.cwd(), execute = spawnSync } = {}
) {
  requireModule(config, name);
  if (!["companion", "orchestrator"].includes(name))
    throw new Error("Only Companion and Orchestrator have local runtimes.");
  const data = runtimeDirectory(env, cwd);
  const target = join(data, name);
  mkdirSync(target, { recursive: true });
  const run = (command, args) => {
    const result = execute(command, args, {
      cwd, env: runtimeEnvironment(env), stdio: "inherit", shell: false,
    });
    if (result.error || result.status !== 0) throw new Error(`${name} installation failed.`);
  };
  if (name === "companion") {
    run(process.platform === "win32" ? "npm.cmd" : "npm", [
      "install",
      "--prefix",
      target,
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      `snipara-companion@${VERSIONS.companion}`,
    ]);
  } else {
    run(process.platform === "win32" ? "python" : "python3", ["-m", "venv", target]);
    const python = join(target, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
    run(python, ["-m", "pip", "install", `snipara-orchestrator==${VERSIONS.orchestrator}`]);
  }
}
