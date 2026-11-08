import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createNativeAuth } from "../snipara/lib/native-auth.mjs";
import { createNativeCredentialStore, validateNativeGrant } from "../snipara/lib/native-credentials.mjs";
import { createNativeBroker, createProjectClient, observedStatsProject } from "../snipara/lib/native-broker.mjs";
import { observeSource, readSourceBinding, writeSourceBinding } from "../snipara/lib/source-binding.mjs";

const identity = { kind: "repository", fingerprint: "a".repeat(64) };
const source = { ...identity, root: "/fixture/repo", repository: "github.com/example/repo" };
const binding = { source: identity, workspaceId: "team-a", projectId: "project-a", projectSlug: "project-a" };
const grant = () => ({ client_id: "snipara-native-plugin", token_type: "Bearer", source: identity, project_id: "project-a", project_slug: "project-a", workspace_id: "team-a", workspace_slug: "team-a", access_token: "fake-access-token", refresh_token: "fake-refresh-token", expires_at: 900000, revision: 1 });
const request = (name, args = {}) => ({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } });
const textResult = data => ({ content: [{ type: "text", text: JSON.stringify(data) }] });
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } });

function fixture({ credentials = grant(), stats = "project-a", duringCall = () => {} } = {}) {
  let currentSource = source, savedBinding = binding, saved = credentials, time = 100000, writes = 0, starts = 0;
  const calls = [], notices = [], intents = [];
  const broker = createNativeBroker({
    cwd: "/fixture/repo", expectedSource: identity, observer: () => currentSource,
    readBinding: () => { if (!savedBinding) throw Object.assign(new Error("missing"), { code: "binding_missing" }); return savedBinding; },
    writeBinding: (_cwd, value) => { if (savedBinding && savedBinding.projectId !== value.projectId) throw new Error("different binding"); savedBinding = { ...binding, ...value }; writes++; },
    assertBinding: (_cwd, bound, observed) => { if (observed.projectId !== bound.projectId || observed.workspaceId !== bound.workspaceId) throw new Error("project mismatch"); },
    store: { read: () => saved, save: (_source, value) => { saved = { ...value, revision: (saved?.revision || 0) + 1 }; writes++; return saved; } },
    auth: {
      start: async intent => { starts++; intents.push(intent); return { source: intent, deviceCode: "private-device", userCode: "ABCD", verificationUrl: "https://www.snipara.com/device", expiresAt: time + 100000, interval: 5 }; },
      poll: async pending => ({ ...grant(), source: pending.source }),
      refresh: async previous => ({ ...previous, access_token: "new-fake-access", expires_at: time + 100000 }),
    },
    projectClient: actual => ({ call: async (method, params) => { calls.push({ method, params, project: actual.project_id }); if (params?.name !== "snipara_stats") duringCall(() => { currentSource = { ...source, fingerprint: "b".repeat(64) }; }); return params?.name === "snipara_stats" ? textResult({ data: { project_id: stats } }) : method === "tools/list" ? { tools: [{ name: "snipara_context_query" }] } : textResult({ ok: true }); } }),
    now: () => time, notify: value => notices.push(value),
  });
  return { broker, calls, notices, intents, source: value => { currentSource = value; }, binding: value => { savedBinding = value; }, advance: value => { time += value; }, writes: () => writes, starts: () => starts, saved: () => saved };
}

test("unconnected catalog only exposes connection tools and never contacts upstream", async () => {
  const f = fixture({ credentials: null });
  const result = await f.broker.handle({ method: "tools/list" });
  assert.deepEqual(result.tools.map(t => t.name), ["snipara_connect", "snipara_connection_status"]); assert.equal(f.calls.length, 0);
  await assert.rejects(f.broker.handle(request("snipara_context_query")), /Connect/);
});

test("every remote operation checks actual token project before forwarding", async () => {
  const f = fixture(); await f.broker.handle(request("snipara_context_query"));
  assert.deepEqual(f.calls.map(c => c.params.name), ["snipara_stats", "snipara_context_query"]);
  assert.ok(f.calls.every(c => c.project === "project-a"));
});

test("different or unknown token project blocks catalogs and tools", async () => {
  const f = fixture({ stats: "project-b" });
  assert.deepEqual((await f.broker.handle({ method: "tools/list" })).tools.map(t => t.name), ["snipara_connect", "snipara_connection_status"]);
  assert.equal(f.calls.length, 1);
  await assert.rejects(f.broker.handle(request("snipara_context_query")), /different project/);
  assert.throws(() => observedStatsProject(textResult({ status: "ok" })), /Cannot verify/);
  assert.throws(() => observedStatsProject({ isError: true, structuredContent: { project_id: "project-a" } }), /Cannot verify/);
});

test("repository changes invalidate an already connected process before any further upstream call", async () => {
  const f = fixture(); await f.broker.handle(request("snipara_context_query")); const count = f.calls.length;
  f.source({ ...source, fingerprint: "b".repeat(64) });
  await assert.rejects(f.broker.handle(request("snipara_context_query")), /another repository/); assert.equal(f.calls.length, count);
});

test("a source change during a hosted call withholds its result", async () => {
  const f = fixture({ duringCall: change => change() });
  await assert.rejects(f.broker.handle(request("snipara_context_query")), /another repository/);
  assert.equal(f.calls.length, 2);
});

test("project/workspace overrides and cross-project tools cannot escape the source grant", async () => {
  for (const args of [{ project_id: "project-b" }, { workspaceId: "team-b" }, { items: [{ project_id: "project-b" }] }, { project_ids: [] }]) {
    const f = fixture(); await assert.rejects(f.broker.handle(request("snipara_context_query", args)), /another Snipara/);
    assert.equal(f.calls.length, 1);
  }
  const f = fixture(); await assert.rejects(f.broker.handle(request("snipara_multi_project_query")), /this project only/); assert.equal(f.calls.length, 1);
  await fixture().broker.handle(request("snipara_context_query", { project_id: "project-a", workspace_id: "team-a", document_path: "docs/project-b.md" }));
});

test("host protocol negotiation supports old and current host requests", async () => {
  for (const version of ["2024-11-05", "2025-03-26", "2025-06-18", "2025-11-25"]) {
    assert.equal((await fixture().broker.handle({ method: "initialize", params: { protocolVersion: version } })).protocolVersion, version);
  }
});

test("copied registration is refused at startup", () => {
  assert.throws(() => createNativeBroker({ cwd: "/fixture/b", expectedSource: identity, observer: () => ({ ...source, fingerprint: "b".repeat(64) }) }), /another repository/);
});

test("changed public binding and workspace mismatch block before stats", async () => {
  const f = fixture(); f.binding({ ...binding, workspaceId: "team-b" });
  await assert.rejects(f.broker.handle(request("snipara_context_query")), /mismatch/); assert.equal(f.calls.length, 0);
});

test("browser flow is bounded, omits secrets, verifies token then persists matching source", async () => {
  const f = fixture({ credentials: null }); f.binding(null);
  const start = await f.broker.handle(request("snipara_connect"));
  assert.equal(f.starts(), 1); assert.ok(!JSON.stringify(start).includes("private-device"));
  assert.equal(JSON.parse((await f.broker.handle(request("snipara_connection_status"))).content[0].text).status, "awaiting_browser");
  assert.equal(f.writes(), 0); f.advance(5000);
  const status = await f.broker.handle(request("snipara_connection_status"));
  assert.equal(JSON.parse(status.content[0].text).status, "connected"); assert.equal(f.writes(), 2); assert.equal(f.notices.length, 1);
  assert.ok(!JSON.stringify(status).includes("fake-access-token"));
});

test("browser authorization for the wrong actual project persists nothing", async () => {
  const f = fixture({ credentials: null, stats: "project-b" }); f.binding(null);
  await f.broker.handle(request("snipara_connect")); f.advance(5000);
  await assert.rejects(f.broker.handle(request("snipara_connection_status")), /different project/); assert.equal(f.writes(), 0);
});

test("bootstrap refuses model path and project overrides", async () => {
  const f = fixture(); await assert.rejects(f.broker.handle(request("snipara_connect", { root: "/other" })), /overrides/); assert.equal(f.starts(), 0);
});

test("source labels trim surrounding folder whitespace before the browser intent is sent", async () => {
  const f = fixture({ credentials: null }); f.binding(null); f.source({ ...source, root: "/fixture/  Repo  " });
  await f.broker.handle(request("snipara_connect")); assert.equal(f.intents[0].label, "Repo");
  f.advance(5000); assert.equal(JSON.parse((await f.broker.handle(request("snipara_connection_status"))).content[0].text).status, "connected");
});

test("stats identity accepts actual flat/data content shapes and rejects ambiguity", () => {
  assert.equal(observedStatsProject(textResult({ project_id: "a" })), "a");
  assert.equal(observedStatsProject({ structuredContent: { data: { project_id: "a" } } }), "a");
  assert.throws(() => observedStatsProject({ structuredContent: { project_id: "a" }, ...textResult({ project_id: "b" }) }), /Cannot verify/);
});

test("project transport pins endpoint and authorization, supports finite SSE", async () => {
  const calls = [];
  const client = createProjectClient({ ...grant(), mcp_endpoint: "https://evil.example/mcp" }, { fetchImpl: async (url, options) => {
    calls.push({ url, options }); const body = JSON.parse(options.body);
    if (!body.id) return new Response(null, { status: 202 });
    return new Response(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: body.id, result: body.method === "initialize" ? { protocolVersion: "2024-11-05" } : { tools: [] } })}\n\n`, { headers: { "Content-Type": "text/event-stream", "mcp-session-id": "test-session" } });
  } });
  await client.call("tools/list"); assert.equal(calls.length, 3);
  assert.ok(calls.every(c => c.url === "https://api.snipara.com/mcp/project-a" && c.options.redirect === "error"));
  assert.equal(calls[2].options.headers.Authorization, "Bearer fake-access-token"); assert.equal(calls[2].options.headers["Mcp-Session-Id"], "test-session");
});

test("device client pins origins, source intent and rejects wrong returned source", async () => {
  const calls = [], intent = { ...identity, label: "Repo" };
  const auth = createNativeAuth({ now: () => 1000, fetchImpl: async (url, options) => {
    calls.push({ url, options }); return url.endsWith("/code") ? json({ device_code: "private-device", user_code: "ABCD-EFGH", verification_uri: "https://www.snipara.com/device", expires_in: 600, interval: 1 }) : json({ ...grant(), source: { ...intent, fingerprint: "b".repeat(64) }, expires_in: 3600 });
  } });
  const pending = await auth.start(intent); assert.equal(pending.interval, 5);
  assert.equal(JSON.parse(calls[0].options.body).client_id, "snipara-native-plugin"); assert.equal(calls[0].options.redirect, "error");
  await assert.rejects(auth.poll(pending), /source did not match/);
});

test("OAuth pending errors are classified without reflecting remote error descriptions", async () => {
  const auth = createNativeAuth({ fetchImpl: async () => json({ error: "authorization_pending", error_description: "secret-leak" }, 400) });
  await assert.rejects(auth.poll({ source: identity, deviceCode: "private-device" }), error => error.code === "authorization_pending" && !error.message.includes("secret-leak"));
});

test("refresh cannot change authorized project", async () => {
  const auth = createNativeAuth({ fetchImpl: async () => json({ ...grant(), source: identity, project_id: "project-b", expires_in: 3600 }) });
  await assert.rejects(auth.refresh(grant()), /different project/);
});

test("private credential store uses scoped files, private permissions and revision compare-and-swap", () => {
  const root = mkdtempSync(join(realpathSync(tmpdir()), "snipara-native-test-"));
  try {
    const store = createNativeCredentialStore({ directory: join(root, "connections") });
    assert.equal(store.read(identity), null); const saved = store.save(identity, grant()); assert.equal(saved.revision, 1);
    const file = join(root, "connections", `repository-${identity.fingerprint}.json`);
    assert.equal(JSON.parse(readFileSync(file)).project_id, "project-a");
    assert.throws(() => store.save(identity, grant()), /concurrently/);
    assert.equal(store.save(identity, grant(), 1).revision, 2);
    if (process.platform !== "win32") { chmodSync(file, 0o644); assert.throws(() => store.read(identity), /private/); }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("credential storage refuses symlink directories and token files", () => {
  const root = mkdtempSync(join(realpathSync(tmpdir()), "snipara-native-test-"));
  try {
    const link = join(root, "link"); symlinkSync(root, link, "dir");
    assert.throws(() => createNativeCredentialStore({ directory: join(link, "connections") }).read(identity), /Unsafe/);
    const store = createNativeCredentialStore({ directory: join(root, "connections") }); store.read(identity);
    const target = join(root, "target"); writeFileSync(target, "{}"); symlinkSync(target, join(root, "connections", `repository-${identity.fingerprint}.json`));
    assert.throws(() => store.read(identity), /private/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("private grants reject invalid token types, source kinds and fractional expiry", () => {
  assert.throws(() => validateNativeGrant({ ...grant(), token_type: "apikey" }, identity), /Invalid/);
  assert.throws(() => validateNativeGrant({ ...grant(), expires_at: 1.5 }, identity), /Invalid/);
  assert.throws(() => validateNativeGrant(grant(), { ...identity, kind: "unknown" }), /Invalid/);
});

test("app-owned credential ancestors cannot be writable by another group", () => {
  if (process.platform === "win32") return;
  const root = mkdtempSync(join(realpathSync(tmpdir()), "snipara-native-test-"));
  try {
    chmodSync(root, 0o770);
    assert.throws(() => createNativeCredentialStore({ directory: join(root, "connections") }).read(identity), /not writable/);
  } finally { chmodSync(root, 0o700); rmSync(root, { recursive: true, force: true }); }
});

test("two brokers lock before refresh rotation and reload the current credential", async () => {
  const root = mkdtempSync(join(realpathSync(tmpdir()), "snipara-native-test-"));
  try {
    const directory = join(root, "connections"), firstStore = createNativeCredentialStore({ directory });
    firstStore.save(identity, { ...grant(), expires_at: 1 }); let rotations = 0;
    function instance(store) {
      return createNativeBroker({ cwd: source.root, expectedSource: identity, observer: () => source,
        readBinding: () => binding, assertBinding: (_cwd, value, actual) => assert.equal(value.projectId, actual.projectId),
        store, now: () => 100000,
        auth: { refresh: async previous => { rotations++; await new Promise(resolve => setTimeout(resolve, 10)); return { ...previous, access_token: "rotated-test-access", expires_at: 1000000 }; } },
        projectClient: () => ({ call: async (_method, params) => params?.name === "snipara_stats" ? textResult({ project_id: "project-a" }) : textResult({ ok: true }) }),
      });
    }
    const a = instance(firstStore), b = instance(createNativeCredentialStore({ directory }));
    await Promise.all([a.handle(request("snipara_context_query")), b.handle(request("snipara_context_query"))]);
    assert.equal(rotations, 1); assert.equal(firstStore.read(identity).revision, 2);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("device verification links cannot leave the pinned public sign-in page", async () => {
  for (const verification_uri of ["https://evil.example/device", "https://www.snipara.com/settings", "https://www.snipara.com/device?redirect=https://evil.example"]) {
    const auth = createNativeAuth({ fetchImpl: async () => json({ device_code: "fake-device", user_code: "ABCD-EFGH", verification_uri, expires_in: 600 }) });
    await assert.rejects(auth.start({ ...identity, label: "Repo" }), /Invalid/);
  }
});

function realSources(t) {
  const root = mkdtempSync(join(realpathSync(tmpdir()), "snipara-real-source-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = join(root, "private", "connections"), store = createNativeCredentialStore({ directory });
  const tokens = new Map(), calls = []; let browserStarts = 0, clientCreations = 0, refreshHandler;
  function approve(path, projectId, publicBinding = true) {
    const observed = observeSource(path);
    const value = { ...grant(), source: { kind: observed.kind, fingerprint: observed.fingerprint }, project_id: projectId, project_slug: projectId, workspace_id: `workspace-${projectId}`, workspace_slug: `workspace-${projectId}`, access_token: `fixture-access-${projectId}`, refresh_token: `fixture-refresh-${projectId}`, expires_at: Date.now() + 3600000 };
    store.save(observed, value); tokens.set(value.access_token, projectId);
    if (publicBinding) writeSourceBinding(path, { workspaceId: value.workspace_id, projectId, projectSlug: value.project_slug });
    return value;
  }
  function broker(path) {
    return createNativeBroker({ cwd: path, expectedSource: observeSource(path), store,
      auth: { start: async () => { browserStarts++; throw new Error("Unexpected browser approval for an approved source."); }, refresh: async previous => { if (refreshHandler) return refreshHandler(previous); throw new Error("Unexpected refresh in this source fixture."); } },
      projectClient: authorized => { clientCreations++; return { call: async (method, params) => {
        // Resolve identity from the supplied token, independently of its claimed project.
        const actualProject = tokens.get(authorized.access_token);
        calls.push({ method, name: params?.name, actualProject, token: authorized.access_token, source: authorized.source.fingerprint });
        await Promise.resolve();
        if (!actualProject) throw new Error("Snipara authorization was refused.");
        return params?.name === "snipara_stats" ? textResult({ project_id: actualProject }) : textResult({ project_id: actualProject, source: authorized.source.fingerprint });
      } }; },
    });
  }
  return { root, directory, store, tokens, calls, approve, broker, browserStarts: () => browserStarts, clientCreations: () => clientCreations, onRefresh: handler => { refreshHandler = handler; } };
}

function fixtureGit(path, ...args) {
  const result = spawnSync("git", ["-C", path, ...args], { shell: false, encoding: "utf8", timeout: 5000, env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_TERMINAL_PROMPT: "0" } });
  assert.equal(result.status, 0, result.stderr);
}
function realRepository(path, remote) {
  mkdirSync(path, { recursive: true }); fixtureGit(path, "init", "--quiet");
  if (remote) fixtureGit(path, "remote", "add", "origin", remote);
  return path;
}

for (const kind of ["repository", "folder"]) test(`real ${kind} A to B to A and concurrent brokers keep distinct project credentials`, async t => {
  const f = realSources(t);
  const a = join(f.root, "left", "app"), b = join(f.root, "right", "app");
  if (kind === "repository") { realRepository(a, "https://github.com/fixture/a.git"); realRepository(b, "git@github.com:fixture/b.git"); }
  else { mkdirSync(a, { recursive: true }); mkdirSync(b, { recursive: true }); }
  const sourceA = observeSource(a), sourceB = observeSource(b);
  assert.equal(sourceA.kind, kind); assert.notEqual(sourceA.fingerprint, sourceB.fingerprint);
  const grantA = f.approve(a, "project-a"), grantB = f.approve(b, "project-b");
  const call = async broker => JSON.parse((await broker.handle(request("snipara_context_query"))).content[0].text);
  assert.equal((await call(f.broker(a))).project_id, "project-a");
  assert.equal((await call(f.broker(b))).project_id, "project-b");
  assert.equal((await call(f.broker(a))).project_id, "project-a");
  assert.deepEqual(f.calls.filter(c => c.name === "snipara_context_query").map(c => c.token), [grantA.access_token, grantB.access_token, grantA.access_token]);
  const [resultA, resultB] = await Promise.all([call(f.broker(a)), call(f.broker(b))]);
  assert.deepEqual([resultA.project_id, resultB.project_id], ["project-a", "project-b"]);
  assert.deepEqual([resultA.source, resultB.source], [sourceA.fingerprint, sourceB.fingerprint]);
  assert.equal(f.browserStarts(), 0);
  // A public B binding cannot recover A's private authorization after B's private state is lost.
  rmSync(join(f.directory, `${sourceB.kind}-${sourceB.fingerprint}.json`));
  const before = f.calls.length;
  await assert.rejects(call(f.broker(b)), /Connect this repository/); assert.equal(f.calls.length, before);
  assert.equal((await call(f.broker(a))).project_id, "project-a");
});

test("an approved Git worktree restores its missing public binding after token verification without browser approval", async t => {
  const f = realSources(t), main = realRepository(join(f.root, "main"), "https://github.com/fixture/shared.git");
  fixtureGit(main, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "commit", "--allow-empty", "--quiet", "-m", "initial");
  const worktree = join(f.root, "worktree"); fixtureGit(main, "worktree", "add", "--quiet", "--detach", worktree);
  const approved = f.approve(main, "shared-project"), nested = join(worktree, "src"); mkdirSync(nested);
  assert.equal(observeSource(main).fingerprint, observeSource(nested).fingerprint);
  assert.equal(existsSync(join(worktree, ".snipara", "source-binding.json")), false);
  const result = JSON.parse((await f.broker(nested).handle(request("snipara_context_query"))).content[0].text);
  assert.equal(result.project_id, "shared-project"); assert.equal(readSourceBinding(worktree).projectId, "shared-project");
  assert.equal(f.calls[0].name, "snipara_stats"); assert.ok(f.calls.every(call => call.token === approved.access_token));
  assert.equal(f.store.read(observeSource(worktree)).revision, 1); assert.equal(f.browserStarts(), 0);
  if (process.platform !== "win32") assert.equal(lstatSync(join(worktree, ".snipara", "source-binding.json")).mode & 0o777, 0o600);
});

test("a privately approved folder restores a deleted public binding without changing its credential", async t => {
  const f = realSources(t), folder = join(f.root, "folder"); mkdirSync(folder);
  f.approve(folder, "folder-project", false);
  const result = JSON.parse((await f.broker(folder).handle(request("snipara_connection_status"))).content[0].text);
  assert.equal(result.status, "connected"); assert.equal(readSourceBinding(folder).projectId, "folder-project");
  assert.equal(f.store.read(observeSource(folder)).revision, 1); assert.equal(f.browserStarts(), 0);
});

test("a token for another actual project cannot restore a missing public binding", async t => {
  const f = realSources(t), repo = realRepository(join(f.root, "repo"), "https://github.com/fixture/invalid.git");
  const approved = f.approve(repo, "project-a", false); f.tokens.set(approved.access_token, "project-b");
  await assert.rejects(f.broker(repo).handle(request("snipara_context_query")), /different project/);
  assert.equal(existsSync(join(repo, ".snipara", "source-binding.json")), false);
  assert.deepEqual(f.calls.map(call => call.name), ["snipara_stats"]); assert.equal(f.browserStarts(), 0);
});

test("private source authorization never retargets a conflicting public binding", async t => {
  const f = realSources(t), folder = join(f.root, "folder"); mkdirSync(folder);
  f.approve(folder, "project-a", false);
  writeSourceBinding(folder, { workspaceId: "workspace-project-b", projectId: "project-b", projectSlug: "project-b" });
  await assert.rejects(f.broker(folder).handle(request("snipara_context_query")), /different Snipara project/);
  assert.equal(readSourceBinding(folder).projectId, "project-b"); assert.equal(f.calls.length, 0); assert.equal(f.browserStarts(), 0);
});

test("automatic binding restoration refuses public parents writable by other users", async t => {
  if (process.platform === "win32") return;
  const f = realSources(t), folder = join(f.root, "folder"); mkdirSync(folder); mkdirSync(join(folder, ".snipara"));
  f.approve(folder, "folder-project", false); chmodSync(join(folder, ".snipara"), 0o777);
  await assert.rejects(f.broker(folder).handle(request("snipara_context_query")), /owned source directory/);
  assert.equal(existsSync(join(folder, ".snipara", "source-binding.json")), false);
  assert.deepEqual(f.calls.map(call => call.name), ["snipara_stats"]);
});

test("fresh private-store reads reuse one upstream session until token refresh changes the grant", async t => {
  const f = realSources(t), folder = join(f.root, "folder"); mkdirSync(folder);
  f.approve(folder, "folder-project"); const broker = f.broker(folder), observed = observeSource(folder);
  await broker.handle(request("snipara_context_query")); await broker.handle(request("snipara_context_query"));
  assert.equal(f.clientCreations(), 1);
  assert.deepEqual(f.calls.map(call => call.name), ["snipara_stats", "snipara_context_query", "snipara_stats", "snipara_context_query"]);
  const previous = f.store.read(observed); f.store.save(observed, { ...previous, expires_at: 1 }, previous.revision); let rotations = 0;
  f.onRefresh(old => { rotations++; const access_token = "fixture-rotated-folder-project"; f.tokens.set(access_token, "folder-project"); return { ...old, access_token, expires_at: Date.now() + 3600000 }; });
  await broker.handle(request("snipara_context_query")); await broker.handle(request("snipara_context_query"));
  assert.equal(rotations, 1); assert.equal(f.clientCreations(), 2);
  assert.equal(f.calls.at(-1).token, "fixture-rotated-folder-project"); assert.equal(f.browserStarts(), 0);
});

function hosted204Fixture(t, { bodylessStats = false } = {}) {
  const f = realSources(t), folder = join(f.root, "http-folder"); mkdirSync(folder);
  let time = 100000, intent; const requests = [];
  const fetchImpl = async (url, options) => {
    const body = JSON.parse(options.body); requests.push({ url, method: body.method, name: body.params?.name });
    assert.equal(options.redirect, "error");
    if (url === "https://www.snipara.com/api/oauth/device/code") {
      intent = body.source;
      return json({ device_code: "fixture-private-device", user_code: "ABCD-EFGH", verification_uri: "https://www.snipara.com/device", expires_in: 600, interval: 5 });
    }
    if (url === "https://www.snipara.com/api/oauth/device/token") {
      assert.equal(body.device_code, "fixture-private-device");
      return json({ ...grant(), source: intent, project_id: "http-project", project_slug: "http-project", workspace_id: "http-workspace", workspace_slug: "http-workspace", expires_in: 3600 });
    }
    assert.equal(url, "https://api.snipara.com/mcp/http-project");
    assert.equal(options.headers.Authorization, "Bearer fake-access-token");
    if (body.method === "notifications/initialized") {
      assert.equal("id" in body, false);
      // mcp_transport.py returns Response(status_code=204) when handle_request
      // returns None for notifications. Preserve the actual bodyless contract.
      return new Response(null, { status: 204 });
    }
    if (body.method === "initialize") return json({ jsonrpc: "2.0", id: body.id, result: { protocolVersion: "2024-11-05", serverInfo: { name: "snipara", version: "1.0.0" }, capabilities: { tools: {} } } }, 200, { "Mcp-Session-Id": "fixture-http-session" });
    assert.equal(options.headers["Mcp-Session-Id"], "fixture-http-session");
    if (body.params?.name === "snipara_stats" && bodylessStats) return new Response(null, { status: 204 });
    return json({ jsonrpc: "2.0", id: body.id, result: textResult(body.params?.name === "snipara_stats" ? { project_id: "http-project" } : { answer: "fixture answer", project_id: "http-project" }) });
  };
  const broker = createNativeBroker({ cwd: folder, expectedSource: observeSource(folder), store: f.store,
    auth: createNativeAuth({ fetchImpl, now: () => time }), now: () => time,
    projectClient: authorized => createProjectClient(authorized, { fetchImpl }),
  });
  return { ...f, folder, broker, requests, advance: () => { time += 5000; } };
}

test("actual hosted 204 notification contract supports approval, token verification, persistence and hosted calls", async t => {
  const f = hosted204Fixture(t);
  assert.equal(f.store.read(observeSource(f.folder)), null);
  const start = await f.broker.handle(request("snipara_connect"));
  assert.ok(!JSON.stringify(start).includes("fixture-private-device")); f.advance();
  const status = await f.broker.handle(request("snipara_connection_status"));
  assert.equal(JSON.parse(status.content[0].text).status, "connected");
  assert.equal(f.store.read(observeSource(f.folder)).project_id, "http-project");
  assert.equal(readSourceBinding(f.folder).workspaceId, "http-workspace");
  const hosted = await f.broker.handle(request("snipara_context_query", { query: "fixture question" }));
  assert.equal(JSON.parse(hosted.content[0].text).answer, "fixture answer");
  assert.deepEqual(f.requests.filter(r => r.method).slice(0, 3).map(r => r.method === "tools/call" ? r.name : r.method), ["initialize", "notifications/initialized", "snipara_stats"]);
  assert.ok(!JSON.stringify(status).includes("fake-access-token"));
});

test("a bodyless ordinary stats response cannot supply identity or persist authorization", async t => {
  const f = hosted204Fixture(t, { bodylessStats: true });
  await f.broker.handle(request("snipara_connect")); f.advance();
  await assert.rejects(f.broker.handle(request("snipara_connection_status")), /empty response/);
  assert.equal(f.store.read(observeSource(f.folder)), null);
  assert.equal(existsSync(join(f.folder, ".snipara", "source-binding.json")), false);
  assert.equal(f.requests.some(r => r.name === "snipara_context_query"), false);
});

test("actual collection link and unlink contracts cannot route to a different project", async () => {
  for (const prefix of ["snipara", "rlm"]) for (const operation of ["link_collection", "unlink_collection"]) {
    const name = `${prefix}_${operation}`, f = fixture();
    await assert.rejects(f.broker.handle(request(name, { collection_id: "fixture-collection", project_id_or_slug: "other-project" })), /another Snipara project/);
    assert.deepEqual(f.calls.map(call => call.params?.name), ["snipara_stats"]);
    await fixture().broker.handle(request(name, { collection_id: "fixture-collection", project_id_or_slug: "project-a" }));
    await fixture().broker.handle(request(name, { collection_id: "fixture-collection" }));
  }
});

test("actual account-level project listing and creation aliases are unavailable in a source connection", async () => {
  for (const prefix of ["snipara", "rlm"]) for (const operation of ["list_client_projects", "create_client_project"]) {
    const f = fixture(); await assert.rejects(f.broker.handle(request(`${prefix}_${operation}`, { name: "Another project" })), /this project only/);
    assert.deepEqual(f.calls.map(call => call.params?.name), ["snipara_stats"]);
  }
});
