#!/usr/bin/env node
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { applyOptions, MODULES, readConfig } from "../lib/config.mjs";
import { buildPlugin } from "../lib/build.mjs";
import { installRuntime, invocation } from "../lib/runtime.mjs";
import { exportDistribution } from "../lib/distribution.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const usage = `Snipara plugin: one bundle for Claude Code and Codex
  build [--connection account|project] [--project <slug-or-id>] [--output <marketplace-directory>]
  export [--project <dedicated-review-slug>] --output <new-distribution-directory>
  export-desktop --output <new-distribution-directory>
  configure --output <existing-marketplace> [--snipara on|off] [--companion on|off] [--orchestrator on|off] [--project <slug-or-id>] [--connection account|project]
  status
  install companion|orchestrator
  companion <CLI arguments...>
  orchestrator <CLI arguments...>
  companion|orchestrator --with-snipara-credentials <CLI arguments...>
  companion --with-native-network <CLI arguments...>
The credential flag shares only Snipara keys. Native network forwarding is process-only and requires the host proxy.
All three modules default to on. Build/configure never install dependencies or execute tasks.
After configure, refresh the local plugin installation and restart its client.`;

function options(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const key = flag?.slice(2);
    if (
      !flag?.startsWith("--") ||
      !["project", "connection", "output", ...MODULES].includes(key) ||
      parsed[key] !== undefined ||
      args[index + 1] === undefined ||
      args[index + 1].startsWith("--")
    ) {
      throw new Error("Expected unique --project, --output or module on/off options.");
    }
    parsed[key] = args[index + 1];
  }
  return parsed;
}

try {
  const [action = "help", ...args] = process.argv.slice(2);
  if (["help", "--help", "-h"].includes(action)) console.log(usage);
  else if (["export", "export-desktop"].includes(action)) {
    const opts = options(args);
    if (!opts.output || opts.connection || MODULES.some((name) => opts[name] !== undefined))
      throw new Error(
        "Export needs --output <new-directory>; optional --project creates a bound review fixture. Module switches apply to native profiles."
      );
    if (action === "export-desktop" && opts.project)
      throw new Error("Desktop submission must not preset a review project.");
    console.log(
      JSON.stringify(
        exportDistribution(root, opts.output, opts.project, {
          desktopOnly: action === "export-desktop",
        }),
        null,
        2
      )
    );
  } else if (["build", "configure"].includes(action)) {
    const opts = options(args);
    if (action === "configure" && !opts.output)
      throw new Error("Configure needs --output <existing-marketplace>.");
    const output = resolve(opts.output || join(process.cwd(), ".snipara", "native-plugin"));
    const config =
      action === "configure" ? readConfig(join(output, "plugins", "snipara")) : readConfig(root);
    // Existing explicit-project build commands retain their project URL.
    if (action === "build" && opts.project && opts.connection === undefined)
      opts.connection = "project";
    console.log(
      JSON.stringify(
        buildPlugin(root, output, applyOptions(config, opts), action === "configure"),
        null,
        2
      )
    );
  } else if (["status", "session-start"].includes(action)) {
    const config = readConfig(root);
    if (action === "status") console.log(JSON.stringify(config, null, 2));
    else if (Object.values(config.modules).some(Boolean)) {
      // SessionStart is local and informational: no subprocess, network request or automatic task launch.
      console.log(
        `Snipara plugin — ${MODULES.map((name) => `${name}: ${config.modules[name] ? "on" : "off"}`).join(", ")}. Project: ${config.project || "not configured"}.`
      );
      console.log(
        "Use the enabled plugin skills. Orchestration and memory writes require an explicit task; preserve evidence and existing authorization."
      );
    }
  } else if (action === "install") {
    if (args.length !== 1) throw new Error("Install takes exactly one module name.");
    installRuntime(readConfig(root), args[0]);
  } else if (["companion", "orchestrator"].includes(action)) {
    const flags = new Set();
    while (["--with-snipara-credentials", "--with-native-network"].includes(args[0])) {
      const flag = args.shift();
      if (flags.has(flag)) throw new Error("Duplicate runtime opt-in flag.");
      flags.add(flag);
    }
    const call = invocation(readConfig(root), action, args, {
      shareSniparaCredentials: flags.has("--with-snipara-credentials"),
      shareNativeNetwork: flags.has("--with-native-network"),
    });
    const result = spawnSync(call.command, call.args, call.options);
    if (result.error) throw new Error(`Unable to start ${action}.`);
    process.exitCode = result.status ?? 1;
  } else throw new Error(`Unknown plugin action: ${action}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Plugin operation failed.");
  process.exitCode = 1;
}
