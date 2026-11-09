import { readFileSync } from "node:fs";
import { join } from "node:path";

export const MODULES = ["snipara", "companion", "orchestrator"];
// Native hosts merge plugin servers with existing user MCP registrations.
export const MCP_SERVER_NAME = "snipara-plugin";
export const VERSIONS = { companion: "4.2.0", orchestrator: "1.16.0" };

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateConfig(value, requireProject = false) {
  if (
    !object(value) ||
    value.schemaVersion !== 1 ||
    Object.keys(value).some(
      (key) => !["schemaVersion", "project", "connection", "modules", "sourceBound"].includes(key)
    )
  ) {
    throw new Error("Invalid plugin configuration; expected schemaVersion, project and modules.");
  }
  const connection = value.connection ?? "project"; // Compatibility with existing profiles.
  if (!["account", "project", "source"].includes(connection)) {
    throw new Error("Connection must be account, project or source.");
  }
  if (value.sourceBound !== undefined && typeof value.sourceBound !== "boolean") {
    throw new Error("sourceBound must be a boolean.");
  }
  if (
    value.project !== null &&
    (typeof value.project !== "string" || !/^[a-z0-9][a-z0-9_-]{0,127}$/.test(value.project))
  ) {
    throw new Error("Project must be a Snipara project slug, not a URL or credential.");
  }
  if (
    !object(value.modules) ||
    Object.keys(value.modules).length !== MODULES.length ||
    MODULES.some((name) => typeof value.modules[name] !== "boolean")
  ) {
    throw new Error("Each of snipara, companion and orchestrator must be a boolean.");
  }
  if (requireProject && value.modules.snipara && connection !== "source" && (connection === "project" || value.sourceBound) && !value.project) {
    throw new Error("Choose a project with --project <slug> when Snipara is on.");
  }
  return structuredClone({ ...value, connection });
}

export function readConfig(root, requireProject = false) {
  return validateConfig(
    JSON.parse(readFileSync(join(root, "config.json"), "utf8")),
    requireProject
  );
}

export function requireModule(config, name) {
  validateConfig(config);
  if (!MODULES.includes(name) || config.modules[name] !== true) {
    throw new Error(`${name} is off in this plugin profile.`);
  }
}

export function applyOptions(config, options) {
  const next = structuredClone(config);
  if (options.project !== undefined) next.project = options.project;
  if (options.connection !== undefined) next.connection = options.connection;
  if (options.sourceBound !== undefined) {
    if (!["on", "off"].includes(options.sourceBound)) throw new Error("--source-bound must be on or off.");
    next.sourceBound = options.sourceBound === "on";
  }
  for (const name of MODULES) {
    if (options[name] !== undefined) {
      if (!["on", "off"].includes(options[name])) throw new Error(`--${name} must be on or off.`);
      next.modules[name] = options[name] === "on";
    }
  }
  return validateConfig(next, true);
}

export function endpoint(config) {
  if (!config.modules.snipara || config.connection === "source") return null;
  return config.connection === "account"
    ? "https://api.snipara.com/mcp"
    : `https://api.snipara.com/mcp/${config.project}`;
}
