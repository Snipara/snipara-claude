import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setupNativeConnection } from "../snipara/lib/native-setup.mjs";
import { writeSourceBinding } from "../snipara/lib/source-binding.mjs";
import { invocation } from "../snipara/lib/runtime.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "snipara-setup-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const plugin = join(root, "plugin"), cwd = join(root, "project");
  mkdirSync(join(plugin, "scripts"), { recursive: true });
  mkdirSync(cwd);
  writeFileSync(join(plugin, "scripts/native-mcp.mjs"), "// test fixture\n");
  return { root, plugin, cwd };
}

test("project Codex setup omits cwd, is repeatable and never overwrites existing settings", (t) => {
  const { plugin, cwd } = fixture(t);
  const first = setupNativeConnection(plugin, "codex", { cwd });
  assert.equal(first.status, "configured");
  const content = readFileSync(first.configuration, "utf8");
  assert.match(content, /source-fingerprint/);
  assert.doesNotMatch(content, /^cwd\s*=/m);
  assert.equal(setupNativeConnection(plugin, "codex", { cwd }).status, "configured");
  writeFileSync(first.configuration, 'model = "custom"\n');
  const conflict = setupNativeConnection(plugin, "codex", { cwd });
  assert.equal(conflict.status, "merge_required");
  assert.equal(readFileSync(first.configuration, "utf8"), 'model = "custom"\n');
  assert.match(conflict.snippet, /mcp_servers.snipara-repository/);
});

test("Claude setup preserves unrelated project servers and settings", (t) => {
  const { plugin, cwd } = fixture(t);
  const config = join(cwd, ".mcp.json");
  writeFileSync(config, JSON.stringify({ custom: true, mcpServers: { other: { command: "other" } } }));
  const pending = setupNativeConnection(plugin, "claude", { cwd });
  assert.equal(pending.status, "merge_required");
  const result = JSON.parse(readFileSync(config));
  assert.equal(result.custom, true);
  assert.equal(result.mcpServers.other.command, "other");
  assert.equal(result.mcpServers["snipara-repository"], undefined);
  const proposed = JSON.parse(pending.snippet).mcpServers["snipara-repository"];
  assert.equal(proposed.cwd, undefined);
  writeFileSync(config, JSON.stringify({ ...result, mcpServers: { ...result.mcpServers, "snipara-repository": proposed } }));
  assert.equal(setupNativeConnection(plugin, "claude", { cwd }).status, "configured");
});

test("copied Claude server config is refused instead of silently retargeted", (t) => {
  const { root, plugin, cwd } = fixture(t);
  const first = setupNativeConnection(plugin, "claude", { cwd });
  const other = join(root, "another-project");
  mkdirSync(other);
  const content = readFileSync(first.configuration);
  writeFileSync(join(other, ".mcp.json"), content);
  assert.throws(() => setupNativeConnection(plugin, "claude", { cwd: other }), /different Snipara/);
  assert.deepEqual(readFileSync(join(other, ".mcp.json")), content);
});

test("setup rejects symlink configurations and existing direct bypasses", (t) => {
  const { root, plugin, cwd } = fixture(t);
  const outside = join(root, "outside.json");
  writeFileSync(outside, "{}");
  symlinkSync(outside, join(cwd, ".mcp.json"));
  assert.throws(() => setupNativeConnection(plugin, "claude", { cwd }), /regular/);
  rmSync(join(cwd, ".mcp.json"));
  writeFileSync(join(cwd, ".mcp.json"), JSON.stringify({ mcpServers: { "snipara-plugin": { url: "https://api.snipara.com/mcp" } } }));
  assert.throws(() => setupNativeConnection(plugin, "claude", { cwd }), /older direct/);
  for (const entry of [
    { custom: { url: "https://api.snipara.com/mcp/project-a", headers: { Authorization: "Bearer never-show" } } },
    { snipara: { command: "uvx", args: ["snipara-mcp"] } },
    { renamed: { command: "uvx", args: ["snipara-mcp@1.0.0"] } },
  ]) {
    const before = JSON.stringify({ mcpServers: entry });
    writeFileSync(join(cwd, ".mcp.json"), before);
    assert.throws(() => setupNativeConnection(plugin, "claude", { cwd }), (error) => /older direct/.test(error.message) && !error.message.includes("never-show"));
    assert.equal(readFileSync(join(cwd, ".mcp.json"), "utf8"), before);
  }
  assert.equal(readFileSync(outside, "utf8"), "{}");
});

test("setup refuses plugin cache execution and unknown clients", (t) => {
  const { plugin, cwd } = fixture(t);
  assert.throws(() => setupNativeConnection(plugin, "codex", { cwd: join(plugin, "scripts") }), /your project/);
  assert.throws(() => setupNativeConnection(plugin, "unknown", { cwd }), /codex or claude/);
});

test("a public source binding cannot authorize optional runtimes in source profiles", (t) => {
  const { cwd } = fixture(t);
  writeSourceBinding(cwd, { projectId: "project-forged", projectSlug: "forged", workspaceId: "workspace-forged" });
  const config = { schemaVersion: 1, connection: "source", project: null,
    modules: { snipara: true, companion: true, orchestrator: true } };
  let probed = false;
  for (const [name, args] of [["companion", ["workflow", "start"]], ["orchestrator", ["run"]]])
    assert.throws(() => invocation(config, name, args, { cwd,
      env: { RLM_API_KEY: "must-not-forward", SNIPARA_PROJECT: "project-forged" },
      shareSniparaCredentials: true, probe: () => { probed = true; return { status: 0 }; } }), /does not authenticate Companion or Orchestrator/);
  assert.equal(probed, false);
});
