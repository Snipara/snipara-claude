import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { observeSource } from "../snipara/lib/source-binding.mjs";

const script = resolve(dirname(fileURLToPath(import.meta.url)), "../snipara/scripts/native-mcp.mjs");
test("real stdio bootstrap frames messages, exposes no credentials and rejects model root overrides", (t) => {
  const root = mkdtempSync(join(tmpdir(), "snipara-stdio-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cwd = join(root, "project"), home = join(root, "home");
  mkdirSync(cwd); mkdirSync(home, { mode: 0o700 });
  const source = observeSource(cwd);
  const result = spawnSync(process.execPath, [script, "--source-kind", source.kind, "--source-fingerprint", source.fingerprint], {
    cwd, env: { PATH: process.env.PATH, HOME: home }, timeout: 10000, encoding: "utf8",
    input: [
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {} } }),
      "broken-json",
      JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "snipara_connect", arguments: { root: "/other-project" } } }),
    ].join("\n") + "\n",
  });
  assert.equal(result.status, 0, result.stderr);
  const messages = result.stdout.trim().split("\n").map(line => JSON.parse(line));
  assert.equal(messages.length, 4);
  assert.equal(messages[0].id, 1);
  assert.equal(messages[1].error.code, -32700);
  assert.deepEqual(messages[2].result.tools.map(tool => tool.name), ["snipara_connect", "snipara_connection_status"]);
  assert.match(messages[3].error.message, /do not accept project or path overrides/);
  assert.doesNotMatch(result.stdout, /access_token|refresh_token|device_code|Authorization/);
});
