import { createInterface } from "node:readline";
import { createNativeBroker } from "../lib/native-broker.mjs";

const args = process.argv.slice(2);
const expected = {};
for (let index = 0; index < args.length; index += 2) {
  const key = args[index];
  if (!["--source-kind", "--source-fingerprint"].includes(key) || !args[index + 1] || expected[key]) { process.stderr.write("Invalid Snipara project launch configuration.\n"); process.exit(1); }
  expected[key] = args[index + 1];
}
const send = value => process.stdout.write(`${JSON.stringify(value)}\n`);
let broker;
try { broker = createNativeBroker({ cwd: process.cwd(), expectedSource: { kind: expected["--source-kind"], fingerprint: expected["--source-fingerprint"] }, notify: send }); }
catch { process.stderr.write("Snipara cannot verify this repository. Run its project setup and restart the host session.\n"); process.exit(1); }
// Serialize requests so concurrent sign-in/refresh cannot overwrite one another.
let queue = Promise.resolve();
const input = createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false });
input.on("line", line => {
  if (Buffer.byteLength(line) > 2 * 1024 * 1024) { input.close(); process.exitCode = 1; return; }
  queue = queue.then(async () => {
    let message;
    try { message = JSON.parse(line); if (message?.jsonrpc !== "2.0" || typeof message.method !== "string" || Array.isArray(message)) throw new Error(); }
    catch { send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Invalid MCP request." } }); return; }
    try { const result = await broker.handle(message); if (message.id !== undefined) send({ jsonrpc: "2.0", id: message.id, result: result ?? {} }); }
    catch (error) {
      if (message.id !== undefined) {
        // All public errors are controlled messages; never serialize exceptions, tokens or request bodies.
        const safe = typeof error.message === "string" && /^(Snipara|This |Connect |Cannot |Invalid |Launch |Unsupported |Connection |The source|Repository|Workspace)/.test(error.message) ? error.message : "Snipara could not verify this connection. Reconnect this repository.";
        send({ jsonrpc: "2.0", id: message.id, error: { code: -32000, message: safe } });
      }
    }
  });
});
