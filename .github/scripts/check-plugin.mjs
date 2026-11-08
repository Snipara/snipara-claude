import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { TextDecoder } from "node:util";
const read = path => JSON.parse(readFileSync(path, "utf8"));
const bindings = read("review/plugin-delivery-bindings.json");
const claude = read(".claude-plugin/marketplace.json"), codex = read(".agents/plugins/marketplace.json");
assert.equal(claude.name, "snipara-plugins");
assert.equal(codex.name, "snipara");
assert.equal(claude.plugins.length, 1);
assert.equal(codex.plugins.length, 1);
assert.equal(claude.plugins[0].name, "snipara");
assert.equal(claude.plugins[0].source, "./plugins/snipara");
assert.deepEqual(codex.plugins[0].source, { source: "local", path: "./plugins/snipara" });
assert.equal(claude.plugins[0].version, bindings.nativeVersion);
assert.equal(codex.plugins[0].version, bindings.nativeVersion);
function checkInventory(root, expected) {
  const parents = new Set();
  for (const row of expected) {
    const parts = row.path.split("/");
    for (let i = 1; i < parts.length; i++) parents.add(parts.slice(0, i).join("/"));
  }
  function walk(prefix = "") {
    return readdirSync(join(root, prefix)).sort().flatMap(name => {
      const relative = prefix ? prefix + "/" + name : name, info = lstatSync(join(root, relative));
      assert.ok(!info.isSymbolicLink(), relative);
      if (info.isDirectory()) {
        assert.ok(parents.has(relative), "Unexpected package directory: " + relative);
        return walk(relative);
      }
      assert.ok(info.isFile(), relative);
      assert.equal(info.mode & 0o777, 0o644, relative);
      return [relative];
    });
  }
  assert.deepEqual(walk(), expected.map(row => row.path).sort());
  for (const row of expected) {
    const body = readFileSync(join(root, row.path));
    assert.equal(body.length, row.bytes, row.path);
    assert.equal(createHash("sha256").update(body).digest("hex"), row.sha256, row.path);
  }
}
const nativeRoot = "plugins/snipara", directoryRoot = "plugins/snipara-directory";
checkInventory(nativeRoot, bindings.native);
assert.equal(bindings.native.length, 37);
for (const name of ["plugin.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json"]) {
  const manifest = read(join(nativeRoot, name));
  assert.equal(manifest.name, "snipara");
  assert.equal(manifest.version, bindings.nativeVersion);
  assert.equal(manifest.hooks, undefined);
}
assert.equal(read(join(nativeRoot, ".codex-plugin/plugin.json")).requires_local_executor, true);
assert.equal(read(join(nativeRoot, "plugin.json")).extensions["com.openai"].requires_local_executor, true);
for (const name of ["mcp.json", ".mcp.json"]) assert.deepEqual(read(join(nativeRoot, name)).mcpServers, {});
assert.equal(read(join(nativeRoot, "config.json")).connection, "source");
assert.equal(read(join(nativeRoot, "config.json")).project, null);
const allowed = [".claude-plugin/plugin.json", ".mcp.json", "LICENSE", "NOTICE", "README.md", "assets/icon.png", "skills/connect/SKILL.md", "skills/snipara/SKILL.md"];
assert.deepEqual(bindings.claudeDirectory.map(row => row.path).sort(), allowed.sort());
checkInventory(directoryRoot, bindings.claudeDirectory);
assert.equal(read(join(directoryRoot, ".claude-plugin/plugin.json")).version, bindings.claudeDirectoryVersion);
assert.equal(read(join(directoryRoot, ".claude-plugin/plugin.json")).hooks, undefined);
assert.deepEqual(read(join(directoryRoot, ".mcp.json")), { mcpServers: { "snipara-plugin": { type: "http", url: "https://api.snipara.com/mcp" } } });
for (const root of [nativeRoot, directoryRoot]) {
  const manifest = read(join(root, ".claude-plugin/plugin.json"));
  for (const field of ["privacyPolicyUrl", "supportUrl", "termsOfServiceUrl", "documentationUrl"]) {
    const url = new URL(manifest[field]);
    assert.equal(url.protocol, "https:");
    assert.ok(!url.username && !url.password);
  }
  assert.equal(manifest.name, "snipara");
  assert.equal(manifest.license, "MIT");
  assert.ok(readFileSync(join(root, "LICENSE")).length > 0);
  assert.ok(readFileSync(join(root, "NOTICE")).length > 0);
  const icon = readFileSync(join(root, manifest.icon));
  assert.ok(icon.length <= 256 * 1024);
  assert.equal(icon.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(icon.toString("ascii", 12, 16), "IHDR");
  assert.equal(icon.readUInt32BE(16), icon.readUInt32BE(20));
  assert.ok(icon.readUInt32BE(16) >= 512 && icon.readUInt32BE(16) <= 2048);
}
for (const name of allowed.filter(name => name !== "assets/icon.png")) {
  const body = readFileSync(join(directoryRoot, name));
  assert.ok(body.length <= 256 * 1024 && !body.includes(0));
  assert.ok(!new TextDecoder("utf-8", { fatal: true }).decode(body).startsWith("#!"));
}
console.log("Exact native37 and isolated Claude Directory8 payloads, marketplace identities, source routing, icons and legal files pass.");
