import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { requireModule, VERSIONS } from "./config.mjs";

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
  if (!config.modules.snipara || !config.project) {
    const help = args.length === 1 && ["--help", "-h", "--version"].includes(args[0]);
    const local =
      name === "companion"
        ? args[0] === "workflow" &&
          args[1] === "status" &&
          args.slice(2).every((arg) => arg === "--json")
        : args[0] === "status" && args.slice(1).every((arg) => arg === "--json");
    if (!help && !local)
      throw new Error(
        config.modules.snipara
          ? "Choose your project with the settings skill before hosted or execution workflows."
          : "Snipara is off; this profile permits local status/help only. Enable Snipara for hosted or execution workflows."
      );
  }
  if (shareNativeNetwork && name !== "companion")
    throw new Error("Native network forwarding currently supports Companion only.");
  const runtimeEnv = {
    ...runtimeEnvironment(env, shareSniparaCredentials, shareNativeNetwork),
    SNIPARA_COMPANION_SKIP_NPM_VERSION_CHECK: "1",
  };
  if (config.project) {
    runtimeEnv.SNIPARA_PROJECT = config.project;
    runtimeEnv.SNIPARA_PROJECT_SLUG = config.project;
    runtimeEnv.SNIPARA_PROJECT_ID = config.project;
    runtimeEnv.SNIPARA_API_URL = "https://api.snipara.com";
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
