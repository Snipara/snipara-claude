import assert from "node:assert/strict";
import { readFileSync, realpathSync, existsSync } from "node:fs";
import { resolve, sep } from "node:path";

const root = realpathSync("plugins/snipara");
const read = path => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const manifest = read(".claude-plugin/plugin.json");
assert.ok(!existsSync(resolve(root, "test")), "test fixtures must stay outside the installed plugin");
assert.equal(manifest.name, "snipara");
assert.ok(manifest.version && manifest.description);
for (const field of ["privacyPolicyUrl", "supportUrl", "termsOfServiceUrl", "documentationUrl"]) {
  const url = new URL(manifest[field]);
  assert.equal(url.protocol, "https:", field);
  assert.ok(!url.username && !url.password, field);
}
assert.ok(manifest.license || readFileSync(resolve(root, "LICENSE")).length);
assert.ok(readFileSync(resolve(root, "README.md")).length);
assert.equal(typeof manifest.icon, "string");
const iconPath = realpathSync(resolve(root, manifest.icon));
assert.ok(iconPath.startsWith(root + sep), "icon must be inside plugin");
const icon = readFileSync(iconPath);
assert.ok(icon.length < 2 * 1024 * 1024, "icon must be under 2 MB");
assert.equal(icon.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
assert.equal(icon.toString("ascii", 12, 16), "IHDR");
const width = icon.readUInt32BE(16);
assert.equal(width, icon.readUInt32BE(20), "icon must be square");
assert.ok(width >= 512 && width <= 2048);
const mcp = read(".mcp.json").mcpServers;
assert.deepEqual(Object.keys(mcp), ["snipara-plugin"]);
assert.equal(mcp["snipara-plugin"].url, "https://api.snipara.com/mcp");
assert.ok(!mcp["snipara-plugin"].headers, "native MCP must use host OAuth");
console.log("Published Claude manifest, icon, legal files and native MCP checks pass.");
