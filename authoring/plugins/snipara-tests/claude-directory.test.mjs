import assert from "node:assert/strict";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { assertClaudeDirectoryPackage, CLAUDE_DIRECTORY_VERSION, exportClaudeDirectory, inventory } from "../snipara/lib/distribution.mjs";

const source = resolve(dirname(fileURLToPath(import.meta.url)), "../snipara");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
function fixture(t) {
  const parent = mkdtempSync(join(tmpdir(), "snipara-claude-directory-"));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const output = join(parent, "release");
  const receipt = exportClaudeDirectory(source, output);
  return { parent, output, root: join(output, "plugin"), receipt };
}

test("Claude package is source-preserving, OAuth-only and contains exactly its reviewed files", (t) => {
  const before = inventory(source);
  const { root, output, receipt } = fixture(t);
  assert.deepEqual(inventory(source), before);
  assert.equal(receipt.version, CLAUDE_DIRECTORY_VERSION);
  assert.equal(receipt.submitted, false);
  assert.equal(receipt.approved, false);
  const files = assertClaudeDirectoryPackage(root);
  assert.equal(files.length, 8);
  assert.equal(existsSync(join(root, "plugin.json")), false);
  assert.equal(existsSync(join(root, "config.json")), false);
  assert.equal(existsSync(join(root, "scripts")), false);
  assert.equal(existsSync(join(root, "hooks")), false);
  const manifest = read(join(root, ".claude-plugin/plugin.json"));
  assert.equal(manifest.name, "snipara");
  assert.equal(manifest.version, CLAUDE_DIRECTORY_VERSION);
  assert.equal(manifest.author.name, "Starbox Group Gmbh");
  assert.equal(manifest.privacyPolicyUrl, "https://www.snipara.com/privacy");
  assert.deepEqual(read(join(root, ".mcp.json")), {
    mcpServers: { "snipara-plugin": { type: "http", url: "https://api.snipara.com/mcp" } },
  });
  assert.deepEqual(receipt.packageInventory, files);
  const { output: outputPath, ...savedReceipt } = receipt;
  assert.equal(outputPath, output);
  assert.deepEqual(read(join(output, "preparation.json")), savedReceipt);
});

test("ZIP round trip preserves hidden manifests, bytes and file inventory", (t) => {
  const { root, parent, output, receipt } = fixture(t);
  const archive = join(output, receipt.archive.file);
  assert.equal(createHash("sha256").update(readFileSync(archive)).digest("hex"), receipt.archive.sha256);
  const unpacked = join(parent, "unpacked");
  mkdirSync(unpacked);
  const result = spawnSync("unzip", ["-q", archive, "-d", unpacked], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(assertClaudeDirectoryPackage(unpacked), inventory(root));
});

test("Claude exporter refuses existing output and project or module switches", (t) => {
  const { output, parent } = fixture(t);
  const before = inventory(output);
  assert.throws(() => exportClaudeDirectory(source, output), /already exists/);
  assert.deepEqual(inventory(output), before);
  for (const extra of [["--project", "private-project"], ["--companion", "on"], ["--connection", "project"]]) {
    const result = spawnSync(process.execPath, [join(source, "scripts/snipara.mjs"), "export-claude", "--output", join(parent, "rejected"), ...extra], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /takes only --output/);
    assert.equal(existsSync(join(parent, "rejected")), false);
  }
});

for (const file of ["hooks/hooks.json", "scripts/run.mjs", ".npmrc", "pnpm-workspace.yaml", "plugin.json"]) {
  test("Claude gate rejects forbidden package entry: " + file, (t) => {
    const { root } = fixture(t);
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), "{}");
    assert.throws(() => assertClaudeDirectoryPackage(root), /unexpected/);
  });
}

test("Claude gate rejects empty hook directories and symbolic links", (t) => {
  const { root, parent } = fixture(t);
  mkdirSync(join(root, "hooks"));
  assert.throws(() => assertClaudeDirectoryPackage(root), /unexpected directory/);
  rmSync(join(root, "hooks"), { recursive: true });
  const file = join(root, "README.md");
  cpSync(file, join(parent, "outside.md"));
  rmSync(file);
  symlinkSync(join(parent, "outside.md"), file);
  assert.throws(() => assertClaudeDirectoryPackage(root), /regular files/);
});

for (const [name, content] of [
  ["shebang", Buffer.from("#!/bin/sh\n")],
  ["NUL", Buffer.from("text\0hidden")],
  ["invalid UTF-8", Buffer.from([0xff, 0xfe])],
  ["oversized text", Buffer.alloc(256 * 1024 + 1, 65)],
]) {
  test("Claude gate rejects " + name + " even in an allowed Markdown filename", (t) => {
    const { root } = fixture(t);
    writeFileSync(join(root, "README.md"), content);
    assert.throws(() => assertClaudeDirectoryPackage(root), /UTF-8|shebang/);
  });
}

test("Claude gate rejects executable permissions and a script disguised as an icon", (t) => {
  const { root } = fixture(t);
  const file = join(root, "README.md");
  chmodSync(file, 0o755);
  assert.throws(() => assertClaudeDirectoryPackage(root), /not be executable/);
  chmodSync(file, 0o644);
  writeFileSync(join(root, "assets/icon.png"), "console.log('not an image');");
  assert.throws(() => assertClaudeDirectoryPackage(root), /PNG image/);
});

test("Claude gate rejects hook declarations and machine credential configurations", (t) => {
  const { root } = fixture(t);
  const path = join(root, ".claude-plugin/plugin.json");
  const original = readFileSync(path);
  for (const key of ["hooks", "commands", "mcpServers", "$schema", "extensions"]) {
    writeFileSync(path, JSON.stringify({ ...JSON.parse(original), [key]: {} }));
    assert.throws(() => assertClaudeDirectoryPackage(root), /unsupported component/);
  }
  writeFileSync(path, original);
  const mcpPath = join(root, ".mcp.json");
  const mcp = read(mcpPath);
  for (const additions of [{ headers: { Authorization: "Bearer ${RLM_API_KEY}" } }, { command: "node" }, { env: { KEY: "${KEY}" } }]) {
    writeFileSync(mcpPath, JSON.stringify({ mcpServers: { "snipara-plugin": { ...mcp.mcpServers["snipara-plugin"], ...additions } } }));
    assert.throws(() => assertClaudeDirectoryPackage(root), /OAuth without credentials/);
  }
});

test("directory skills have no native config, credential forwarding or automatic memory capture", (t) => {
  const { root } = fixture(t);
  for (const skill of ["connect", "snipara"]) {
    const content = readFileSync(join(root, "skills", skill, "SKILL.md"), "utf8");
    assert.doesNotMatch(content, /config\.json|scripts\/|\$\{|RLM_API_KEY|SNIPARA_API_KEY|snipara_remember|snipara_end_of_task_commit/);
    assert.match(content, /OAuth/);
  }
  assert.match(readFileSync(join(root, "skills/snipara/SKILL.md"), "utf8"), /Do not save conversation content/);
});
