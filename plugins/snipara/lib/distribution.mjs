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
import { spawnSync } from "node:child_process";
import { buildPlugin } from "./build.mjs";
import { MCP_SERVER_NAME, readConfig, validateConfig } from "./config.mjs";

const json = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const within = (parent, child) => {
  const path = relative(parent, child);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(".." + sep));
};

export function inventory(root, prefix = "") {
  return readdirSync(join(root, prefix))
    .sort()
    .flatMap((name) => {
      const path = join(prefix, name);
      const stat = lstatSync(join(root, path));
      if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile()))
        throw new Error("Distribution must contain only regular files and directories.");
      return stat.isDirectory()
        ? inventory(root, path)
        : [{ path, bytes: stat.size, sha256: sha(readFileSync(join(root, path))) }];
    });
}

export function validateListing(listing) {
  if (
    listing?.schemaVersion !== 1 ||
    !listing.interface ||
    (listing.publisher !== null &&
      (typeof listing.publisher !== "string" ||
        !listing.publisher.trim() ||
        listing.publisher.length > 80)) ||
    ![null, "MIT"].includes(listing.license)
  )
    throw new Error("Invalid publisher or plugin license configuration.");
  for (const [key, limit] of Object.entries({
    displayName: 30,
    shortDescription: 30,
    longDescription: 4000,
  })) {
    const value = listing.interface[key];
    if (typeof value !== "string" || !value.trim() || value.length > limit)
      throw new Error("Invalid listing " + key);
  }
  for (const key of ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
    const value = listing.interface[key];
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || value.length > 1024)
      throw new Error("Invalid public " + key);
  }
  if (listing.repositoryURL !== undefined) {
    const url = new URL(listing.repositoryURL);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error("Invalid public repositoryURL");
  }
  if (
    listing.review !== undefined &&
    (typeof listing.review.commerce !== "boolean" ||
      typeof listing.review.commerce_description !== "string" ||
      !listing.review.commerce_description.trim())
  )
    throw new Error("Invalid commerce declaration.");
  if (
    listing.publication !== undefined &&
    (!Array.isArray(listing.publication.countries) ||
      listing.publication.countries.some(
        (country) => typeof country !== "string" || !/^[A-Z]{2}$/.test(country)
      ) ||
      new Set(listing.publication.countries).size !== listing.publication.countries.length ||
      typeof listing.publication.release_notes !== "string" ||
      !listing.publication.release_notes.trim())
  )
    throw new Error("Invalid publication declaration.");
  const prompts = listing.interface.defaultPrompt;
  if (
    !Array.isArray(prompts) ||
    !prompts.length ||
    prompts.length > 3 ||
    prompts.some(
      (value) =>
        typeof value !== "string" || !value.trim() || value.length > 128 || /[\r\n]/.test(value)
    ) ||
    new Set(prompts.map((value) => value.trim().replace(/\s+/g, " "))).size !== prompts.length
  )
    throw new Error("Invalid listing prompts.");
  return structuredClone(listing);
}

export function assertDirectoryPackage(root) {
  const names = inventory(root).map((item) => item.path);
  const allowed = new Set([
    "plugin.json",
    "mcp.json",
    ".mcp.json",
    ".claude-plugin/plugin.json",
    ".codex-plugin/plugin.json",
    "config.json",
    "README.md",
    "LICENSE",
    "NOTICE",
    "assets/icon.png",
    "skills/connect/SKILL.md",
    "skills/snipara/SKILL.md",
  ]);
  if (names.some((name) => !allowed.has(name)) || !names.includes("skills/snipara/SKILL.md"))
    throw new Error(
      "Unexpected directory package file; local scripts, hooks and app bindings are forbidden."
    );
  for (const name of ["plugin.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json"]) {
    const manifest = JSON.parse(readFileSync(join(root, name), "utf8"));
    if (
      manifest.apps != null ||
      manifest.hooks != null ||
      manifest.extensions?.["com.openai"]?.apps != null ||
      manifest.extensions?.["com.openai"]?.hooks != null
    )
      throw new Error("Directory manifests cannot declare app bindings or lifecycle hooks.");
  }
  const portable = JSON.parse(readFileSync(join(root, "mcp.json"), "utf8"));
  if (Object.keys(portable.mcpServers).join() !== MCP_SERVER_NAME)
    throw new Error("Expected exactly one remote MCP server.");
  const server = portable.mcpServers[MCP_SERVER_NAME];
  if (
    server.type !== "streamable-http" ||
    server.headers ||
    !/^https:\/\/api\.snipara\.com\/mcp(?:\/[a-z0-9][a-z0-9_-]{0,127})?$/.test(server.url)
  )
    throw new Error(
      "Expected a canonical account or project Hosted MCP endpoint without embedded credentials."
    );
  const compat = JSON.parse(readFileSync(join(root, ".mcp.json"), "utf8"));
  if (
    Object.keys(compat.mcpServers).join() !== MCP_SERVER_NAME ||
    compat.mcpServers[MCP_SERVER_NAME].url !== server.url ||
    compat.mcpServers[MCP_SERVER_NAME].headers
  )
    throw new Error("Compatibility MCP configuration differs from the public contract.");
  return names;
}

export function assertDesktopPackage(root) {
  const names = inventory(root).map((item) => item.path);
  if (
    names.some(
      (name) =>
        name === "hooks" ||
        name.startsWith("hooks/") ||
        name.startsWith("test/") ||
        name === ".app.json"
    )
  )
    throw new Error("Desktop submission cannot contain lifecycle hooks, tests or app bindings.");
  for (const name of ["plugin.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json"]) {
    const manifest = JSON.parse(readFileSync(join(root, name), "utf8"));
    const openai = manifest.extensions?.["com.openai"];
    if (
      manifest.apps != null ||
      manifest.hooks != null ||
      openai?.apps != null ||
      openai?.hooks != null
    )
      throw new Error("Desktop submission has a hidden hook or app binding.");
    if (
      (name === "plugin.json" && openai?.requires_local_executor !== true) ||
      (name === ".codex-plugin/plugin.json" && manifest.requires_local_executor !== true)
    )
      throw new Error("Desktop execution must be declared in both supported manifests.");
  }
  const config = readConfig(root);
  if (
    config.project !== null ||
    config.connection !== "account" ||
    !config.modules.snipara ||
    !config.modules.companion ||
    !config.modules.orchestrator
  )
    throw new Error("Full desktop submission must retain all modules without a preset project.");
  for (const name of ["snipara", "settings", "companion", "orchestrator"])
    if (!names.includes(`skills/${name}/SKILL.md`))
      throw new Error("Missing desktop skill: " + name);
  for (const [name, type] of [
    ["mcp.json", "streamable-http"],
    [".mcp.json", "http"],
  ]) {
    const { mcpServers } = JSON.parse(readFileSync(join(root, name), "utf8"));
    const server = mcpServers?.[MCP_SERVER_NAME];
    if (
      Object.keys(mcpServers || {}).join() !== MCP_SERVER_NAME ||
      !server ||
      Object.keys(server).sort().join() !== "type,url" ||
      server.type !== type ||
      server.url !== "https://api.snipara.com/mcp"
    )
      throw new Error("Desktop MCP must use the native-compatible OAuth discovery declaration.");
  }
  return names;
}

function legal(root, listing) {
  writeFileSync(
    join(root, "NOTICE"),
    (listing.publisher || "Publisher confirmation pending") +
      "\n" +
      listing.licenseScope +
      "\nThe Snipara name, icons and logos are not licensed under the plugin code license. No backend, application code, secret or account access is included. Publisher verification and directory approval are separate steps.\n"
  );
  if (listing.license === "MIT" && listing.publisher) {
    writeFileSync(
      join(root, "LICENSE"),
      "MIT License\n\nCopyright (c) 2026 " +
        listing.publisher +
        '\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n'
    );
  }
}

function archive(root, target) {
  const names = inventory(root).map((item) => item.path);
  const result = spawnSync("zip", ["-X", "-q", target, "-@"], {
    cwd: root,
    input: names.join("\n") + "\n",
    encoding: "utf8",
    shell: false,
  });
  if (result.error || result.status !== 0)
    throw new Error("Unable to create plugin ZIP with the system zip command.");
  return { file: target, sha256: sha(readFileSync(target)), files: names.length };
}

export function exportDistribution(sourceRoot, destination, project, { desktopOnly = false } = {}) {
  const source = realpathSync(sourceRoot);
  const config = validateConfig(
    {
      ...readConfig(source),
      project: project ?? null,
      connection: project ? "project" : "account",
    },
    true
  );
  const listing = validateListing(JSON.parse(readFileSync(join(source, "listing.json"), "utf8")));
  const desktopCases = JSON.parse(readFileSync(join(source, "review-cases.json"), "utf8"));
  if (desktopOnly)
    desktopCases.negative[1] = {
      description:
        "N2: Gmail access is outside Snipara's declared capabilities. Do not call Snipara or local runtime tools, install a connector, or claim access to an external mailbox.",
      prompt: "Read my Gmail inbox with Snipara and summarize today's unread messages.",
    };
  const requested = resolve(destination);
  // Never update an existing Git checkout, release or user directory in place.
  if (existsSync(requested))
    throw new Error("Distribution output already exists; choose a new destination.");
  const target = join(realpathSync(dirname(requested)), relative(dirname(requested), requested));
  if (within(source, target) || within(target, source))
    throw new Error("Distribution output cannot overlap source.");
  const stage = mkdtempSync(join(dirname(target), ".snipara-distribution-"));
  try {
    const native = buildPlugin(
      source,
      join(stage, "native-marketplace"),
      { ...config, project: null, connection: "account" },
      false,
      { bootstrap: true, marketplaceName: "snipara", desktopOnly }
    );
    const nativeRoot = native.plugin;
    for (const name of ["plugin.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json"]) {
      const manifest = JSON.parse(readFileSync(join(nativeRoot, name), "utf8"));
      if (listing.repositoryURL) manifest.repository = listing.repositoryURL;
      else delete manifest.repository;
      delete manifest.license;
      if (listing.publisher) manifest.author.name = listing.publisher;
      if (listing.license && listing.publisher) manifest.license = listing.license;
      if (desktopOnly) {
        const interfaceFields = { ...listing.interface, developerName: listing.publisher };
        interfaceFields.shortDescription = "Context, workflows and control";
        interfaceFields.longDescription =
          "Desktop plugin for sourced Snipara project context and reviewed memory, local Companion checkpoints and explicit Orchestrator coordination. Sign in to one authorized project through native OAuth. Companion and Orchestrator are optional, independently disableable local programs installed only on request at pinned versions. They require an explicitly configured project and separate runtime authentication. No lifecycle hook runs at session start. Tasks, memory writes and runtime credential sharing require authorization. A Snipara account and authorized project access are required.";
        interfaceFields.capabilities = [
          "Retrieve sourced context",
          "Recall reviewed decisions",
          "Save local checkpoints",
          "Coordinate explicit workflows",
        ];
        if (name === "plugin.json")
          Object.assign(manifest.extensions["com.openai"], {
            interface: interfaceFields,
            review: { ...listing.review, test_cases: desktopCases },
            publication: listing.publication,
          });
        if (name === ".codex-plugin/plugin.json")
          Object.assign(manifest, {
            interface: interfaceFields,
            extensions: {
              ...manifest.extensions,
              "com.openai": {
                ...manifest.extensions?.["com.openai"],
                review: {
                  ...listing.review,
                  test_cases: desktopCases,
                },
                publication: listing.publication,
              },
            },
          });
      }
      json(join(nativeRoot, name), manifest);
    }
    if (desktopOnly) {
      json(join(nativeRoot, "review-cases.json"), desktopCases);
      const readme = join(nativeRoot, "README.md");
      writeFileSync(
        readme,
        "# Snipara for Codex desktop — submission candidate\n\n" +
          "All three modules are retained. This candidate requires local execution and has no lifecycle hooks. Companion and Orchestrator remain optional programs installed and invoked only on request. Native Snipara OAuth uses the hosted remote MCP; local runtime credentials remain separate. This remote-MCP-plus-local-program combination still requires OpenAI eligibility confirmation; no submission, policy approval or clean-host acceptance is claimed.\n\n" +
          readFileSync(readme, "utf8")
      );
      assertDesktopPackage(nativeRoot);
    }
    const marketPath = join(stage, "native-marketplace", ".claude-plugin", "marketplace.json");
    const market = JSON.parse(readFileSync(marketPath, "utf8"));
    if (listing.publisher) market.owner.name = listing.publisher;
    json(marketPath, market);
    legal(nativeRoot, listing);
    // Authoring tests belong beside the installable plugin, never inside it.
    // Keep them available to repository CI without installing test fixtures.
    const tests = join(source, "..", "snipara-tests");
    if (existsSync(tests)) {
      const destination = join(stage, "native-marketplace", "plugins", "snipara-tests");
      mkdirSync(destination);
      for (const name of readdirSync(tests).filter((name) => name.endsWith(".test.mjs") && lstatSync(join(tests, name)).isFile()))
        cpSync(join(tests, name), join(destination, name));
    }
    const markerPath = join(stage, "native-marketplace", ".snipara-native-plugin.json");
    const marker = JSON.parse(readFileSync(markerPath, "utf8"));
    marker.files = inventory(join(stage, "native-marketplace"))
      .map((item) => item.path)
      .filter((name) => name !== ".snipara-native-plugin.json");
    json(markerPath, marker);

    const directory = join(stage, "directory-draft");
    mkdirSync(join(directory, "skills"), { recursive: true });
    cpSync(join(source, "catalog", "snipara"), join(directory, "skills", "snipara"), {
      recursive: true,
    });
    cpSync(join(source, "catalog", "directory", "connect"), join(directory, "skills", "connect"), {
      recursive: true,
    });
    cpSync(join(source, "assets"), join(directory, "assets"), { recursive: true });
    const base = JSON.parse(readFileSync(join(source, "plugin.json"), "utf8"));
    if (listing.repositoryURL) base.repository = listing.repositoryURL;
    else delete base.repository;
    delete base.license;
    base.description = "Sourced project context and reviewed memory through Snipara Hosted MCP.";
    base.keywords = ["context", "memory", "documentation", "sources"];
    if (listing.publisher) base.author.name = listing.publisher;
    if (listing.license && listing.publisher) base.license = listing.license;
    const interfaceFields = { ...listing.interface };
    if (listing.publisher) interfaceFields.developerName = listing.publisher;
    base.extensions = {
      "com.openai": {
        interface: interfaceFields,
        onboardingSkill: "./skills/connect/SKILL.md",
        review: {
          ...listing.review,
          test_cases: JSON.parse(readFileSync(join(source, "review-cases.json"), "utf8")),
        },
        publication: listing.publication ?? {
          release_notes:
            "Initial directory draft: Hosted MCP, connection guidance and shared context/memory skill. Local runtime modules are limited to the native distribution.",
        },
      },
    };
    json(join(directory, "plugin.json"), base);
    json(join(directory, "config.json"), {
      ...config,
      modules: { snipara: true, companion: false, orchestrator: false },
    });
    const url = project ? "https://api.snipara.com/mcp/" + project : "https://api.snipara.com/mcp";
    json(join(directory, "mcp.json"), {
      $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
      mcpServers: {
        [MCP_SERVER_NAME]: {
          type: "streamable-http",
          url,
          extensions: { "com.openai": { auth: { type: "oauth", client: { mode: "dcr" } } } },
        },
      },
    });
    json(join(directory, ".mcp.json"), {
      mcpServers: { [MCP_SERVER_NAME]: { type: "http", url } },
    });
    mkdirSync(join(directory, ".claude-plugin"));
    mkdirSync(join(directory, ".codex-plugin"));
    const identity = Object.fromEntries(
      Object.entries(base).filter(([key]) => !["$schema", "extensions"].includes(key))
    );
    json(join(directory, ".claude-plugin", "plugin.json"), {
      ...identity,
      privacyPolicyUrl: interfaceFields.privacyPolicyURL,
    });
    json(join(directory, ".codex-plugin", "plugin.json"), {
      ...identity,
      skills: "./skills/",
      mcpServers: "./.mcp.json",
      interface: interfaceFields,
      extensions: { "com.openai": { onboardingSkill: "./skills/connect/SKILL.md" } },
    });
    legal(directory, listing);
    writeFileSync(
      join(directory, "README.md"),
      "# Snipara directory draft\n\nVersion " +
        base.version +
        ". Hosted MCP and source context/memory skills only. Companion, Orchestrator, installers and lifecycle hooks are excluded.\n\n**Review draft, not submitted or published.** Connection: " +
        (project ? "review project " + project : "account MCP with explicit project selection") +
        ". Account-mode drafts select a project in native OAuth; the optional project URL is a dedicated review fixture. The eight reviewer cases, recording, reviewer access and portal checks must be completed before official submission.\n\n[Website](" +
        interfaceFields.websiteURL +
        ") · [Support](" +
        interfaceFields.supportURL +
        ") · [Privacy](" +
        interfaceFields.privacyPolicyURL +
        ") · [Terms](" +
        interfaceFields.termsOfServiceURL +
        ")\n\nUse native OAuth; never paste secrets into the archive or chat. The full native variant comes from the same source and requires per-user project setup.\n"
    );
    assertDirectoryPackage(directory);
    mkdirSync(join(stage, "archives"));
    const archives = [
      {
        variant: "native",
        ...archive(
          nativeRoot,
          join(
            stage,
            "archives",
            (desktopOnly ? "snipara-codex-desktop-" : "snipara-native-") + base.version + ".zip"
          )
        ),
      },
      {
        variant: "directory-draft",
        ...archive(
          directory,
          join(stage, "archives", "snipara-directory-draft-" + base.version + ".zip")
        ),
      },
    ].map((entry) => ({ ...entry, file: relative(stage, entry.file) }));
    const readiness = {
      status: "prepared-not-published",
      version: base.version,
      publisher: listing.publisher,
      license: listing.license,
      licenseScope: listing.licenseScope,
      native: {
        target: desktopOnly ? "codex-desktop" : "native",
        requiresLocalExecutor: desktopOnly,
        lifecycleHooks: !desktopOnly,
        project: null,
        connection: "account",
        modules: config.modules,
        setupRequired: true,
        installedAcceptance: "not-run",
        readyToPublish: false,
        blockers: [
          ...(!listing.publisher ? ["Publisher identity not confirmed"] : []),
          ...(!listing.license ? ["Plugin license not confirmed"] : []),
          "Clean native installation and customer project setup acceptance not recorded",
          "Account MCP/OAuth migration and hosted deployment not verified",
          "Dedicated public repository and installation URL not verified",
          ...(desktopOnly
            ? [
                "OpenAI desktop eligibility for remote MCP plus local runtimes unverified",
                "Exact desktop package clean installation and main workflows unverified",
              ]
            : []),
        ],
      },
      directory: {
        project: project ?? null,
        scope: project ? "project-bound-review-draft" : "account-project-selection-draft",
        submitted: false,
        readyToSubmit: false,
        modules: { snipara: true, companion: false, orchestrator: false },
        blockers: [
          ...(!listing.publisher ? ["Publisher identity not confirmed"] : []),
          ...(!listing.license ? ["Plugin license not confirmed"] : []),
          "Account project selection is implemented locally; hosted deployment and migration not verified",
          ...(project
            ? [
                "Project-bound URL is a review fixture only; export without --project for customer account onboarding",
              ]
            : []),
          "Native fresh OAuth, refresh and sourced-answer acceptance not recorded",
          "Eight host review cases not run; dedicated reviewer access not verified",
          "Real host demo recording and reviewer-accessible URL missing",
          "Publisher platform verification, geography and policy attestations pending",
          "Public URL access checked separately; plugin-specific policy coverage still needs review",
        ],
      },
      archives,
    };
    json(join(stage, "distribution-manifest.json"), readiness);
    writeFileSync(
      join(stage, "README.md"),
      "# Snipara plugin distributions\n\nPrepared version " +
        base.version +
        "; no publication or official approval claimed.\n\n- native-marketplace/: complete Claude Code/Codex plugin, three independently switchable modules on by default. No project preselected. Native OAuth uses the account MCP; local runtimes need explicit project setup.\n- directory-draft/: hook-free Hosted MCP/context package, account connection by default or an explicit project review fixture. Hosted deployment, fresh native OAuth and the listed review requirements remain gates before public submission.\n- archives/: ZIPs and checksums in distribution-manifest.json.\n\nOnly plugin files are exported. No application repository, credentials, OAuth tokens or engine source is included. Publisher and license are recorded in distribution-manifest.json; see each package's LICENSE and NOTICE for their scope. Remaining publication prerequisites are listed in the manifest. Marketplace registration does not imply directory approval.\n"
    );
    json(join(stage, "inventory.json"), inventory(stage));
    if (existsSync(target))
      throw new Error("Output appeared during export; refusing to overwrite it.");
    renameSync(stage, target);
    return { output: target, ...readiness };
  } finally {
    if (existsSync(stage)) rmSync(stage, { recursive: true, force: true });
  }
}
