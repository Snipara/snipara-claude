import assert from "node:assert/strict";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  symlinkSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  exportDistribution,
  assertDirectoryPackage,
  validateListing,
  inventory,
  assertDesktopPackage,
} from "../snipara/lib/distribution.mjs";
import { invocation } from "../snipara/lib/runtime.mjs";
import { buildPlugin } from "../snipara/lib/build.mjs";
import { applyOptions, readConfig } from "../snipara/lib/config.mjs";
const source = resolve(dirname(fileURLToPath(import.meta.url)), "../snipara");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "snipara-distribution-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test("desktop candidate retains all modules and declares local execution without hooks", (t) => {
  const output = join(fixture(t), "desktop");
  const result = exportDistribution(source, output, undefined, { desktopOnly: true });
  const root = join(output, "native-marketplace/plugins/snipara");
  assertDesktopPackage(root);
  assert.equal(result.native.target, "codex-desktop");
  assert.equal(result.native.lifecycleHooks, false);
  assert.equal(result.native.readyToPublish, false);
  assert.equal(existsSync(join(root, "scripts/session-start.sh")), false);
  assert.equal(existsSync(join(root, "hooks")), false);
  const portable = read(join(root, "plugin.json")).extensions["com.openai"];
  const codex = read(join(root, ".codex-plugin/plugin.json"));
  assert.equal(portable.requires_local_executor, true);
  assert.equal(codex.requires_local_executor, true);
  assert.ok(portable.interface.shortDescription.length <= 30);
  assert.deepEqual(codex.interface, portable.interface);
  assert.deepEqual(codex.extensions["com.openai"].review, portable.review);
  assert.match(portable.review.test_cases.negative[1].description, /Gmail/);
  assert.deepEqual(read(join(root, "review-cases.json")), portable.review.test_cases);
  assert.equal(read(join(root, "config.json")).project, null);
  assert.deepEqual(read(join(root, "mcp.json")).mcpServers["snipara-plugin"], {
    type: "streamable-http",
    url: "https://api.snipara.com/mcp",
  });
  const archive = result.archives.find((entry) => entry.variant === "native");
  assert.match(archive.file, /snipara-codex-desktop-/);
  assert.equal(
    createHash("sha256")
      .update(readFileSync(join(output, archive.file)))
      .digest("hex"),
    archive.sha256
  );
});

test("desktop settings preserve hook-free targeting and explicit module switches", (t) => {
  const parent = fixture(t);
  exportDistribution(source, join(parent, "desktop"), undefined, { desktopOnly: true });
  const root = join(parent, "desktop/native-marketplace/plugins/snipara");
  const config = applyOptions(readConfig(root), { project: "customer-project", companion: "off" });
  const target = join(parent, "configured");
  const result = buildPlugin(root, target, config);
  assert.equal(existsSync(join(result.plugin, "hooks")), false);
  assert.equal(existsSync(join(result.plugin, "skills/companion")), false);
  assert.equal(existsSync(join(result.plugin, "skills/orchestrator")), true);
  const m = read(join(result.plugin, "plugin.json")).extensions["com.openai"];
  assert.equal(m.requires_local_executor, true);
  assert.equal(
    m.interface.longDescription,
    read(join(root, "plugin.json")).extensions["com.openai"].interface.longDescription
  );
  assert.ok(m.review.test_cases.positive.length === 5);
  assert.deepEqual(
    read(join(result.plugin, ".codex-plugin/plugin.json")).extensions["com.openai"].review,
    m.review
  );
  assert.deepEqual(read(join(result.plugin, "mcp.json")).mcpServers["snipara-plugin"], {
    type: "streamable-http",
    url: "https://api.snipara.com/mcp",
  });
  assert.equal(
    read(join(result.plugin, ".mcp.json")).mcpServers["snipara-plugin"].url,
    "https://api.snipara.com/mcp"
  );
  buildPlugin(result.plugin, target, applyOptions(config, { orchestrator: "off" }), true);
  assert.equal(existsSync(join(result.plugin, "hooks")), false);
  assert.equal(existsSync(join(result.plugin, "skills/orchestrator")), false);
});

test("desktop gate rejects server fields that prevent native MCP loading", (t) => {
  const output = join(fixture(t), "desktop");
  exportDistribution(source, output, undefined, { desktopOnly: true });
  const root = join(output, "native-marketplace/plugins/snipara");
  for (const name of ["mcp.json", ".mcp.json"]) {
    const path = join(root, name);
    const original = readFileSync(path, "utf8");
    const mcp = JSON.parse(original);
    mcp.mcpServers["snipara-plugin"].extensions = {
      "com.openai": { auth: { type: "oauth", client: { mode: "dcr" } } },
    };
    writeFileSync(path, JSON.stringify(mcp));
    assert.throws(() => assertDesktopPackage(root), /native-compatible OAuth discovery/);
    writeFileSync(path, original);
  }
  assertDesktopPackage(root);
});

test("desktop submission gate inspects hidden compatibility manifests", (t) => {
  const output = join(fixture(t), "desktop");
  exportDistribution(source, output, undefined, { desktopOnly: true });
  const root = join(output, "native-marketplace/plugins/snipara");
  const path = join(root, ".claude-plugin/plugin.json");
  const original = read(path);
  writeFileSync(path, JSON.stringify({ ...original, hooks: "./hooks.json" }));
  assert.throws(() => assertDesktopPackage(root), /hidden hook/);
  writeFileSync(path, JSON.stringify(original));
  mkdirSync(join(root, "hooks"));
  writeFileSync(join(root, "hooks/x.json"), "{}");
  assert.throws(() => assertDesktopPackage(root), /lifecycle hooks/);
});

test("customer distribution uses account MCP with no review project preset", (t) => {
  const output = join(fixture(t), "release");
  const result = exportDistribution(source, output);
  const root = join(output, "directory-draft");
  assert.equal(
    read(join(root, "mcp.json")).mcpServers["snipara-plugin"].url,
    "https://api.snipara.com/mcp"
  );
  assert.equal(read(join(root, "config.json")).project, null);
  assert.equal(result.directory.project, null);
  assert.equal(result.directory.scope, "account-project-selection-draft");
  assert.equal(result.directory.readyToSubmit, false);
  assert.deepEqual(
    read(join(root, "mcp.json")).mcpServers["snipara-plugin"].extensions["com.openai"].auth,
    { type: "oauth", client: { mode: "dcr" } }
  );
  const manifest = read(join(root, "plugin.json"));
  assert.equal(manifest.repository, "https://github.com/Snipara/snipara-claude");
  assert.deepEqual(manifest.extensions["com.openai"].publication.countries, []);
  assert.equal(manifest.extensions["com.openai"].review.commerce, false);
  assert.match(manifest.extensions["com.openai"].review.commerce_description, /snipara\.com/);
  assertDirectoryPackage(root);
});

test("native bootstrap has account MCP, all modules and no inherited project execution", (t) => {
  const output = join(fixture(t), "release");
  const result = exportDistribution(source, output, "review-fixture");
  assert.equal(result.output, realpathSync(output));
  assert.equal(result.native.readyToPublish, false);
  const root = join(output, "native-marketplace/plugins/snipara");
  assert.equal(existsSync(join(root, "test")), false);
  assert.equal(existsSync(join(root, "package.json")), false);
  for (const name of ["plugin.test.mjs", "distribution.test.mjs"])
    assert.ok(existsSync(join(output, "native-marketplace/plugins/snipara-tests", name)));
  const config = read(join(root, "config.json"));
  assert.equal(config.project, null);
  assert.deepEqual(config.modules, { snipara: true, companion: true, orchestrator: true });
  assert.equal(
    read(join(root, "mcp.json")).mcpServers["snipara-plugin"].url,
    "https://api.snipara.com/mcp"
  );
  const presentation = read(join(root, "plugin.json")).extensions["com.openai"];
  assert.equal(presentation.onboardingSkill, "./skills/settings/SKILL.md");
  assert.ok(presentation.interface.shortDescription.length <= 30);
  assert.equal(presentation.interface.logo, "./assets/icon.png");
  assert.deepEqual(readdirSync(join(root, "skills")).sort(), [
    "companion",
    "orchestrator",
    "settings",
    "snipara",
  ]);
  let probed = false;
  assert.throws(
    () =>
      invocation(config, "companion", ["workflow", "start"], {
        env: { SNIPARA_PROJECT: "developer-project" },
        probe: () => {
          probed = true;
          return { status: 0, stdout: "3.7.0" };
        },
      }),
    /Choose your project/
  );
  assert.equal(probed, false);
  const setup = spawnSync(
    process.execPath,
    [
      join(root, "scripts/snipara.mjs"),
      "build",
      "--project",
      "customer-project",
      "--output",
      join(dirname(output), "customer-profile"),
    ],
    { encoding: "utf8" }
  );
  assert.equal(setup.status, 0, setup.stderr);
  assert.equal(
    read(join(dirname(output), "customer-profile/plugins/snipara/mcp.json")).mcpServers[
      "snipara-plugin"
    ].url,
    "https://api.snipara.com/mcp/customer-project"
  );
});

test("directory draft shares context skill and excludes all executable native components", (t) => {
  const output = join(fixture(t), "release");
  const result = exportDistribution(source, output, "review-fixture");
  const root = join(output, "directory-draft");
  assert.deepEqual(readdirSync(join(root, "skills")).sort(), ["connect", "snipara"]);
  assert.equal(
    readFileSync(join(root, "skills/snipara/SKILL.md"), "utf8"),
    readFileSync(join(source, "catalog/snipara/SKILL.md"), "utf8")
  );
  for (const name of ["hooks", "scripts", "lib", "catalog", ".app.json"])
    assert.equal(existsSync(join(root, name)), false);
  assert.equal(
    read(join(root, "mcp.json")).mcpServers["snipara-plugin"].url,
    "https://api.snipara.com/mcp/review-fixture"
  );
  assert.equal(result.directory.readyToSubmit, false);
  assert.match(result.directory.blockers.join(" "), /hosted deployment/);
  const cases = read(join(root, "plugin.json")).extensions["com.openai"].review.test_cases;
  assert.equal(cases.positive.length, 5);
  assert.equal(cases.negative.length, 3);
  assertDirectoryPackage(root);
  mkdirSync(join(root, "hooks"));
  writeFileSync(join(root, "hooks/hooks.json"), "{}");
  assert.throws(() => assertDirectoryPackage(root), /Unexpected directory package/);
});

test("directory gate checks hidden compatibility manifests and MCP credentials", (t) => {
  const output = join(fixture(t), "release");
  exportDistribution(source, output, "review-fixture");
  const root = join(output, "directory-draft");
  const path = join(root, ".codex-plugin/plugin.json");
  const manifest = read(path);
  writeFileSync(path, JSON.stringify({ ...manifest, hooks: "./hooks.json" }));
  assert.throws(() => assertDirectoryPackage(root), /lifecycle hooks/);
  writeFileSync(path, JSON.stringify(manifest));
  const mcp = read(join(root, ".mcp.json"));
  mcp.mcpServers["snipara-plugin"].headers = { Authorization: "fake-test-token" };
  writeFileSync(join(root, ".mcp.json"), JSON.stringify(mcp));
  assert.throws(() => assertDirectoryPackage(root), /public contract/);
});

test("ZIP inventory and SHA256 match actual bytes including hidden manifests", (t) => {
  const output = join(fixture(t), "release");
  const result = exportDistribution(source, output, "review-fixture");
  for (const entry of result.archives) {
    const path = join(output, entry.file);
    assert.equal(createHash("sha256").update(readFileSync(path)).digest("hex"), entry.sha256);
    const entries = spawnSync("unzip", ["-Z1", path], { encoding: "utf8" });
    assert.equal(entries.status, 0);
    const root =
      entry.variant === "native"
        ? join(output, "native-marketplace/plugins/snipara")
        : join(output, "directory-draft");
    assert.deepEqual(
      entries.stdout.trim().split("\n"),
      inventory(root).map((item) => item.path)
    );
    assert.match(entries.stdout, /\.claude-plugin\/plugin.json/);
  }
});

test("exports preserve existing directories and reject source overlap, bad slug and symlink files", (t) => {
  const parent = fixture(t);
  const existing = join(parent, "existing");
  mkdirSync(existing);
  writeFileSync(join(existing, "keep.txt"), "keep");
  assert.throws(() => exportDistribution(source, existing, "review-fixture"), /already exists/);
  assert.equal(readFileSync(join(existing, "keep.txt"), "utf8"), "keep");
  assert.throws(
    () => exportDistribution(source, join(source, "release"), "review-fixture"),
    /overlap/
  );
  assert.throws(() => exportDistribution(source, join(parent, "bad"), "../escape"), /slug/);
  assert.equal(existsSync(join(parent, "bad")), false);
  symlinkSync(join(existing, "keep.txt"), join(existing, "link"));
  assert.throws(() => inventory(existing), /regular files/);
});

test("listing rejects credential URLs, long subtitles and duplicate prompts", () => {
  const listing = read(join(source, "listing.json"));
  assert.doesNotThrow(() => validateListing(listing));
  assert.throws(
    () =>
      validateListing({
        ...listing,
        interface: { ...listing.interface, supportURL: "https://user:secret@example.com" },
      }),
    /Invalid public/
  );
  assert.throws(
    () =>
      validateListing({
        ...listing,
        interface: { ...listing.interface, shortDescription: "x".repeat(31) },
      }),
    /shortDescription/
  );
  assert.throws(
    () =>
      validateListing({
        ...listing,
        interface: { ...listing.interface, defaultPrompt: ["ask me", " ask  me "] },
      }),
    /prompts/
  );
});

test("distribution exports additional regular test modules and omits symlink fixtures", (t) => {
  const parent=fixture(t), copy=join(parent,"plugins/snipara"), tests=join(parent,"plugins/snipara-tests");
  cpSync(source,copy,{recursive:true});mkdirSync(tests,{recursive:true});
  writeFileSync(join(tests,"future-surface.test.mjs"),"// additional independent regression\n");
  writeFileSync(join(parent,"outside.mjs"),"// excluded symlink target\n");
  symlinkSync(join(parent,"outside.mjs"),join(tests,"linked.test.mjs"));
  const output=join(parent,"exported");exportDistribution(copy,output);
  const exported=join(output,"native-marketplace/plugins/snipara-tests");
  assert.equal(readFileSync(join(exported,"future-surface.test.mjs"),"utf8"),"// additional independent regression\n");
  assert.equal(existsSync(join(exported,"linked.test.mjs")),false);
});
