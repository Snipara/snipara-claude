import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
const source = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "snipara-public-delivery-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const path of [".claude-plugin", ".agents", "plugins/snipara", "plugins/snipara-directory", "review/plugin-delivery-bindings.json", ".github/scripts/check-plugin.mjs"]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    cpSync(join(source, path), join(root, path), { recursive: true });
  }
  return root;
}
const check = cwd => spawnSync(process.execPath, [".github/scripts/check-plugin.mjs"], { cwd, encoding: "utf8", timeout: 10000 });
test("public delivery accepts the exact separately qualified native37 and Claude8 payloads", t => {
  const result = check(fixture(t));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Exact native37 and isolated Claude Directory8/);
});
test("public delivery refuses a script in the Claude scan root even if added to its inventory", t => {
  const root = fixture(t), path = "unrequested.mjs", body = "export const synthetic = true;\n";
  writeFileSync(join(root, "plugins/snipara-directory", path), body);
  const manifest = JSON.parse(readFileSync(join(root, "review/plugin-delivery-bindings.json"), "utf8"));
  manifest.claudeDirectory.push({ path, bytes: Buffer.byteLength(body), sha256: createHash("sha256").update(body).digest("hex"), mode: "100644" });
  writeFileSync(join(root, "review/plugin-delivery-bindings.json"), JSON.stringify(manifest));
  assert.notEqual(check(root).status, 0);
});
test("public delivery refuses an empty hook directory in the Claude scan root", t => {
  const root = fixture(t);
  mkdirSync(join(root, "plugins/snipara-directory/hooks"));
  assert.notEqual(check(root).status, 0);
});
test("public delivery refuses a global remote bypass even with a matching native file inventory", t => {
  const root = fixture(t), path = ".mcp.json", body = JSON.stringify({ mcpServers: { "snipara-plugin": { type: "http", url: "https://api.snipara.com/mcp" } } });
  writeFileSync(join(root, "plugins/snipara", path), body);
  const manifest = JSON.parse(readFileSync(join(root, "review/plugin-delivery-bindings.json"), "utf8"));
  const item = manifest.native.find(item => item.path === path);
  item.bytes = Buffer.byteLength(body);
  item.sha256 = createHash("sha256").update(body).digest("hex");
  writeFileSync(join(root, "review/plugin-delivery-bindings.json"), JSON.stringify(manifest));
  assert.notEqual(check(root).status, 0);
});
