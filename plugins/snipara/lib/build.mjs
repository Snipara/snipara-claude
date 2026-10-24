import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { endpoint, MCP_SERVER_NAME, validateConfig } from "./config.mjs";

const OWNER = "snipara-native-plugin-v1";
const json = (path, data) => writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
const inside = (parent, child) => {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
};

function files(root, prefix = "") {
  return readdirSync(join(root, prefix))
    .sort()
    .flatMap((name) => {
      const path = join(prefix, name);
      const entry = lstatSync(join(root, path));
      if (entry.isSymbolicLink()) throw new Error("Plugin profiles cannot contain symlinks.");
      return entry.isDirectory() ? files(root, path) : [path];
    });
}

function assertOwnedOutput(root) {
  const marker = join(root, ".snipara-native-plugin.json");
  if (lstatSync(root).isSymbolicLink() || !existsSync(marker))
    throw new Error("Configure requires an owned Snipara marketplace output.");
  const receipt = JSON.parse(readFileSync(marker, "utf8"));
  if (
    receipt.owner !== OWNER ||
    !Array.isArray(receipt.files) ||
    files(root).some(
      (path) => path !== ".snipara-native-plugin.json" && !receipt.files.includes(path)
    )
  ) {
    throw new Error("Output contains unowned files; preserve them and use a new output directory.");
  }
}

function safeOutput(sourceRoot, outputRoot) {
  const source = realpathSync(sourceRoot);
  let ancestor = outputRoot;
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const output = resolve(realpathSync(ancestor), relative(ancestor, outputRoot));
  if (inside(source, output) || inside(output, source))
    throw new Error("Output cannot overlap the plugin source.");
  if (existsSync(outputRoot)) {
    if (lstatSync(outputRoot).isSymbolicLink()) throw new Error("Output cannot be a symlink.");
    const marker = join(outputRoot, ".snipara-native-plugin.json");
    if (
      readdirSync(outputRoot).length &&
      (!existsSync(marker) || JSON.parse(readFileSync(marker, "utf8")).owner !== OWNER)
    ) {
      throw new Error("Output is not an owned Snipara plugin marketplace; use an empty directory.");
    }
    if (readdirSync(outputRoot).length) assertOwnedOutput(outputRoot);
    for (const name of ["plugins", ".agents", ".claude-plugin"]) {
      if (existsSync(join(outputRoot, name)))
        throw new Error(
          "Owned output is replaced as a complete profile; choose a new output or use configure."
        );
    }
  }
  return output;
}

export function buildPlugin(
  sourceRoot,
  outputPath,
  inputConfig,
  replace = false,
  { bootstrap = false, marketplaceName = "snipara-local", desktopOnly = false } = {}
) {
  const config = validateConfig(inputConfig, !bootstrap);
  const outputRoot = resolve(outputPath);
  // Configure may replace only a complete, marker-owned marketplace, never a repo or installed cache.
  if (replace && existsSync(outputRoot)) {
    assertOwnedOutput(outputRoot);
    const source = realpathSync(sourceRoot);
    const output = realpathSync(outputRoot);
    const ownBundle = source === join(output, "plugins", "snipara");
    if (!ownBundle && (inside(output, source) || inside(source, output)))
      throw new Error("Output cannot overlap the plugin source.");
  } else safeOutput(sourceRoot, outputRoot);
  mkdirSync(dirname(outputRoot), { recursive: true });
  const staging = mkdtempSync(join(dirname(outputRoot), ".snipara-plugin-stage-"));
  try {
    const root = join(staging, "plugins", "snipara");
    mkdirSync(root, { recursive: true });
    for (const name of [
      "catalog",
      "lib",
      "scripts",
      "plugin.json",
      "README.md",
      "VERIFICATION.md",
    ]) {
      cpSync(join(sourceRoot, name), join(root, name), { recursive: true, dereference: false });
    }
    for (const name of [
      "assets",
      "listing.json",
      "review-cases.json",
      "DISTRIBUTION.md",
      "LICENSE",
      "NOTICE",
    ]) {
      if (existsSync(join(sourceRoot, name)))
        cpSync(join(sourceRoot, name), join(root, name), { recursive: true, dereference: false });
    }
    const manifest = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8"));
    // A desktop submission must remain hook-free when the installed settings
    // skill builds or configures a project profile later.
    desktopOnly ||= manifest.extensions?.["com.openai"]?.requires_local_executor === true;
    const desktopMetadata = desktopOnly ? manifest.extensions?.["com.openai"] : null;
    if (desktopOnly) rmSync(join(root, "scripts", "session-start.sh"), { force: true });
    const baseVersion = manifest.version.replace(/-profile\.[a-f0-9]+$/, "");
    const fingerprint = createHash("sha256").update(JSON.stringify(config));
    if (desktopOnly) fingerprint.update("codex-desktop-without-hooks-v1");
    for (const directory of ["catalog", "lib", "scripts"]) {
      for (const path of files(root, directory))
        fingerprint.update(path).update(readFileSync(join(root, path)));
    }
    manifest.version = `${baseVersion}-profile.${fingerprint.digest("hex").slice(0, 12)}`;
    manifest.extensions = {
      "com.openai": {
        interface: {
          displayName: "Snipara",
          shortDescription: "Context, workflow, execution",
          ...(existsSync(join(root, "assets", "icon.png"))
            ? { logo: "./assets/icon.png", composerIcon: "./assets/icon.png" }
            : {}),
          ...(desktopMetadata?.interface || {}),
        },
        ...(desktopMetadata?.review ? { review: desktopMetadata.review } : {}),
        ...(desktopMetadata?.publication ? { publication: desktopMetadata.publication } : {}),
        ...(desktopOnly ? { requires_local_executor: true } : { hooks: "./hooks/hooks.json" }),
        ...(bootstrap ? { onboardingSkill: "./skills/settings/SKILL.md" } : {}),
      },
    };
    json(join(root, "plugin.json"), manifest);
    json(join(root, "config.json"), config);
    // Account OAuth selects each user's project; local runtime setup stays explicit.
    const url = config.connection === "account" || config.project ? endpoint(config) : null;
    json(join(root, "mcp.json"), {
      $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
      mcpServers: url
        ? {
            // Codex rejects unknown streamable-http fields, including the
            // portal auth extension. Native OAuth uses endpoint discovery.
            [MCP_SERVER_NAME]: { type: "streamable-http", url },
          }
        : {},
    });
    // Claude and older Codex loaders use the compatibility HTTP transport spelling.
    json(join(root, ".mcp.json"), {
      mcpServers: url ? { [MCP_SERVER_NAME]: { type: "http", url } } : {},
    });
    mkdirSync(join(root, ".claude-plugin"));
    mkdirSync(join(root, ".codex-plugin"));
    const identity = Object.fromEntries(
      Object.entries(manifest).filter(([key]) => !["$schema", "extensions"].includes(key))
    );
    json(join(root, ".claude-plugin", "plugin.json"), {
      ...identity,
      privacyPolicyUrl: "https://www.snipara.com/privacy",
      supportUrl: "https://www.snipara.com/contact",
      termsOfServiceUrl: "https://www.snipara.com/terms",
      documentationUrl: "https://github.com/Snipara/snipara-claude#readme",
    });
    json(join(root, ".codex-plugin", "plugin.json"), {
      ...identity,
      skills: "./skills/",
      mcpServers: "./.mcp.json",
      ...(desktopOnly ? { requires_local_executor: true } : { hooks: "./hooks/hooks.json" }),
      interface: manifest.extensions["com.openai"].interface,
      ...(bootstrap || desktopOnly
        ? {
            extensions: {
              "com.openai": {
                ...(desktopMetadata?.review ? { review: desktopMetadata.review } : {}),
                ...(desktopMetadata?.publication
                  ? { publication: desktopMetadata.publication }
                  : {}),
                ...(bootstrap ? { onboardingSkill: "./skills/settings/SKILL.md" } : {}),
              },
            },
          }
        : {}),
    });
    mkdirSync(join(root, "skills"));
    for (const name of [
      "settings",
      ...["snipara", "companion", "orchestrator"].filter((name) => config.modules[name]),
    ]) {
      cpSync(join(root, "catalog", name), join(root, "skills", name), { recursive: true });
    }
    if (!desktopOnly) {
      mkdirSync(join(root, "hooks"));
      json(join(root, "hooks", "hooks.json"), {
        hooks: Object.values(config.modules).some(Boolean)
          ? {
              SessionStart: [
                {
                  hooks: [
                    {
                      type: "command",
                      command: 'sh "${CLAUDE_PLUGIN_ROOT}/scripts/session-start.sh"',
                      timeout: 5,
                    },
                  ],
                },
              ],
            }
          : {},
      });
    }
    mkdirSync(join(staging, ".claude-plugin"));
    json(join(staging, ".claude-plugin", "marketplace.json"), {
      name: marketplaceName,
      owner: { name: manifest.author.name },
      metadata: {
        description:
          "Snipara project context, Companion workflows and optional Orchestrator execution.",
      },
      plugins: [
        {
          name: "snipara",
          source: "./plugins/snipara",
          description: manifest.description,
          version: manifest.version,
        },
      ],
    });
    mkdirSync(join(staging, ".agents", "plugins"), { recursive: true });
    json(join(staging, ".agents", "plugins", "marketplace.json"), {
      name: marketplaceName,
      interface: { displayName: "Snipara" },
      plugins: [
        {
          name: "snipara",
          source: { source: "local", path: "./plugins/snipara" },
          policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
          category: "Productivity",
        },
      ],
    });
    json(join(staging, ".snipara-native-plugin.json"), {
      owner: OWNER,
      schemaVersion: 1,
      files: files(staging),
    });
    // The old profile is retained until the replacement is complete.
    let backup;
    if (existsSync(outputRoot)) {
      backup = mkdtempSync(join(dirname(outputRoot), ".snipara-plugin-backup-"));
      renameSync(outputRoot, join(backup, "profile"));
    }
    try {
      renameSync(staging, outputRoot);
    } catch (error) {
      if (backup) renameSync(join(backup, "profile"), outputRoot);
      throw error;
    }
    if (backup) rmSync(backup, { recursive: true });
    return {
      output: outputRoot,
      plugin: join(outputRoot, "plugins", "snipara"),
      project: config.project,
      modules: config.modules,
      reloadRequired: true,
    };
  } finally {
    if (existsSync(staging)) rmSync(staging, { recursive: true });
  }
}
