import { lstatSync } from "node:fs";
import { basename, join } from "node:path";
import { assertSourceBinding, observeSource, readSourceBinding, writeSourceBinding } from "./source-binding.mjs";
import { createNativeAuth, MCP_ORIGIN, readBoundedResponse } from "./native-auth.mjs";
import { createNativeCredentialStore } from "./native-credentials.mjs";

const PROTOCOL = "2025-03-26";
const UPSTREAM_PROTOCOL = "2024-11-05";
const HOST_PROTOCOLS = new Set(["2024-11-05", "2025-03-26", "2025-06-18", "2025-11-25"]);
const CROSS_PROJECT_TOOLS = new Set(["multi_project_query", "list_client_projects", "create_client_project"].flatMap(name => [`snipara_${name}`, `rlm_${name}`]));
const FORWARDED = new Set(["tools/list", "tools/call", "prompts/list", "prompts/get", "resources/list", "resources/read", "resources/templates/list"]);
const BOOTSTRAP = [
  { name: "snipara_connect", description: "Connect this repository to Snipara. Open the returned Snipara page to sign in, create a workspace if needed, and approve its project.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "snipara_connection_status", description: "Check this repository's Snipara connection or complete an approved browser sign-in. Returns no tokens.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
];
const content = (data) => ({ content: [{ type: "text", text: JSON.stringify(data) }] });

function assertProjectArguments(value, grant, depth = 0) {
  if (depth > 32) throw new Error("Invalid Snipara argument nesting.");
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { for (const item of value) assertProjectArguments(item, grant, depth + 1); return; }
  for (const [key, item] of Object.entries(value)) {
    let allowed;
    if (["project_id", "projectId", "project_slug", "projectSlug", "project_id_or_slug", "projectIdOrSlug"].includes(key) || (depth === 0 && key === "project")) allowed = [grant.project_id, grant.project_slug];
    if (["workspace_id", "workspaceId", "team_id", "teamId"].includes(key) || (depth === 0 && key === "workspace")) allowed = [grant.workspace_id, grant.workspace_slug].filter(Boolean);
    if (allowed && !allowed.includes(item)) throw new Error("This operation requests another Snipara project or workspace.");
    if (["project_ids", "projectIds"].includes(key) && (!Array.isArray(item) || item.length !== 1 || ![grant.project_id, grant.project_slug].includes(item[0]))) throw new Error("This operation requests another Snipara project or workspace.");
    assertProjectArguments(item, grant, depth + 1);
  }
}

/** One upstream client per verified project grant, never account-wide /mcp. */
export function createProjectClient(grant, { fetchImpl = fetch } = {}) {
  const endpoint = `${MCP_ORIGIN}/mcp/${encodeURIComponent(grant.project_id)}`;
  let sequence = 0, session, ready = false;
  async function request(method, params, notification = false) {
    const id = ++sequence;
    let response;
    try { response = await fetchImpl(endpoint, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${grant.access_token}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": UPSTREAM_PROTOCOL, ...(session ? { "Mcp-Session-Id": session } : {}) },
      body: JSON.stringify({ jsonrpc: "2.0", ...(notification ? {} : { id }), method, ...(params === undefined ? {} : { params }) }),
    }); } catch { throw new Error("Snipara is unavailable. Retry shortly."); }
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Snipara authorization expired or was refused. Connect again." : "Snipara request failed. Retry shortly.");
    const nextSession = response.headers.get("mcp-session-id");
    if (nextSession) { if (nextSession.length > 1024 || /[\r\n]/.test(nextSession)) throw new Error("Invalid Snipara session."); session = nextSession; }
    // The actual hosted transport returns 204 for initialized notifications;
    // Streamable HTTP peers may instead return 202. Neither carries identity.
    if (notification && (response.status === 202 || response.status === 204 || response.body === null)) return;
    const body = await readBoundedResponse(response);
    if (notification && !body.trim()) return;
    let messages;
    try {
      messages = response.headers.get("content-type")?.includes("text/event-stream")
        ? body.split(/\r?\n\r?\n/).filter(Boolean).map(event => event.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n")).filter(Boolean).map(text => JSON.parse(text))
        : [JSON.parse(body)];
    } catch { throw new Error("Snipara returned an invalid MCP response."); }
    const message = messages.find(item => item?.jsonrpc === "2.0" && item.id === id);
    if (!message || message.error || !("result" in message)) throw new Error("Snipara could not complete this MCP request.");
    return message.result;
  }
  return {
    async call(method, params) {
      if (!ready) {
        const initialized = await request("initialize", { protocolVersion: UPSTREAM_PROTOCOL, capabilities: {}, clientInfo: { name: "snipara-native-plugin", version: "1.0.0" } });
        if (initialized?.protocolVersion !== UPSTREAM_PROTOCOL) throw new Error("Unsupported Snipara upstream MCP protocol.");
        await request("notifications/initialized", undefined, true); ready = true;
      }
      return request(method, params);
    },
  };
}

export function observedStatsProject(result) {
  if (!result || result.isError) throw new Error("Cannot verify Snipara's authorized project.");
  const candidates = [];
  if (result.structuredContent) candidates.push(result.structuredContent);
  for (const item of result.content || []) {
    if (item.type === "text" && typeof item.text === "string") { try { candidates.push(JSON.parse(item.text)); } catch { /* Other text is not identity evidence. */ } }
  }
  const ids = new Set(candidates.flatMap(value => [value?.project_id, value?.data?.project_id]).filter(value => typeof value === "string"));
  if (ids.size !== 1) throw new Error("Cannot verify Snipara's authorized project.");
  return [...ids][0];
}

/** Anchor is supplied by the native host's regular project stdio launch, never model arguments. */
export function createNativeBroker({ cwd, expectedSource, observer = observeSource, readBinding = readSourceBinding, writeBinding = writeSourceBinding, assertBinding = assertSourceBinding, store = createNativeCredentialStore(), auth = createNativeAuth(), projectClient = createProjectClient, now = Date.now, notify = () => {} } = {}) {
  if (!expectedSource || !["repository", "local-repository", "folder"].includes(expectedSource.kind) || !/^[a-f0-9]{64}$/.test(expectedSource.fingerprint || "")) throw new Error("Launch Snipara through this repository's project configuration.");
  let pending, client, clientGrant;
  function current() {
    const source = observer(cwd);
    if (source.kind !== expectedSource.kind || source.fingerprint !== expectedSource.fingerprint) throw new Error("This Snipara configuration belongs to another repository. Set up Snipara in this repository.");
    return source;
  }
  current();
  function bindingOrMissing() { try { return readBinding(cwd); } catch (error) { if (error.code === "binding_missing") return null; throw error; } }
  function compare(grant, binding) {
    if (!binding) throw new Error("Connect this repository to Snipara first.");
    assertBinding(cwd, binding, { projectId: grant.project_id, workspaceId: grant.workspace_id });
    if (binding.projectSlug !== grant.project_slug) throw new Error("Snipara project binding changed. Connect again.");
  }
  function compareExisting(grant) { const binding = bindingOrMissing(); if (binding) compare(grant, binding); return binding; }
  function restoreBinding(grant) {
    const source = current();
    // This automatic write must stay in an owned source directory. Private grants
    // are authority; an absent or writable public binding is never authority.
    for (const directory of [source.root, join(source.root, ".snipara")]) {
      let stat;
      try { stat = lstatSync(directory); } catch (error) { if (error.code === "ENOENT" && directory !== source.root) continue; throw error; }
      if (!stat.isDirectory() || stat.isSymbolicLink() || (process.platform !== "win32" && ((stat.mode & 0o022) !== 0 || (typeof process.getuid === "function" && stat.uid !== process.getuid())))) throw new Error("Snipara can only restore a binding in an owned source directory that other users cannot modify.");
    }
    const approved = store.read(expectedSource);
    if (!approved || approved.project_id !== grant.project_id || approved.workspace_id !== grant.workspace_id) throw new Error("Snipara's private source connection changed. Retry connection status.");
    current(); compareExisting(grant);
    writeBinding(cwd, { workspaceId: grant.workspace_id, projectId: grant.project_id, projectSlug: grant.project_slug });
    current(); compare(grant, bindingOrMissing());
  }
  async function verified(grant, binding, allowNewBinding = false) {
    current();
    if (!allowNewBinding) compare(grant, binding);
    else if (binding) compare(grant, binding);
    const clientFields = ["project_id", "workspace_id", "revision", "access_token"];
    if (!client || !clientGrant || clientFields.some(key => clientGrant[key] !== grant[key])) {
      client = projectClient(grant); clientGrant = Object.fromEntries(clientFields.map(key => [key, grant[key]]));
    }
    const projectId = observedStatsProject(await client.call("tools/call", { name: "snipara_stats", arguments: {} }));
    current();
    if (projectId !== grant.project_id) { client = undefined; throw new Error("Snipara authorized a different project. Connect again."); }
    if (binding) compare(grant, binding);
    return client;
  }
  async function connected() {
    current(); let grant = store.read(expectedSource); const binding = bindingOrMissing();
    if (!grant) throw new Error("Connect this repository to Snipara first.");
    if (binding) compare(grant, binding);
    if (grant.expires_at <= now() + 30000) {
      grant = await store.withLock(expectedSource, async locked => {
        // Another host process may already have rotated this source's refresh token.
        const previous = locked.read(); current();
        if (!previous) throw new Error("Connect this repository to Snipara first.");
        compareExisting(previous);
        if (previous.expires_at > now() + 30000) return previous;
        // The lock/CAS save assigns exactly the next revision. Keep the verified
        // client's session when that same refreshed grant is subsequently saved.
        const refreshed = { ...await auth.refresh(previous), revision: previous.revision + 1 }; current(); compareExisting(refreshed);
        // Validate the new token against the actual upstream project before saving it.
        await verified(refreshed, bindingOrMissing(), true); return locked.save(refreshed, previous.revision);
      });
    }
    const verifiedClient = await verified(grant, bindingOrMissing(), true);
    if (!bindingOrMissing()) restoreBinding(grant);
    current(); compare(grant, bindingOrMissing());
    return { grant, client: verifiedClient };
  }
  async function status() {
    current();
    if (pending) {
      if (pending.expiresAt <= now()) { pending = undefined; return content({ status: "expired", message: "Run snipara_connect to try again." }); }
      if (pending.nextPollAt > now()) return content({ status: "awaiting_browser", retry_after: Math.ceil((pending.nextPollAt - now()) / 1000) });
      pending.nextPollAt = now() + pending.interval * 1000;
      try {
        const grant = await auth.poll(pending); const source = current();
        const binding = bindingOrMissing(); await verified(grant, binding, true);
        const previous = store.read(expectedSource);
        if (previous && (previous.project_id !== grant.project_id || previous.workspace_id !== grant.workspace_id)) throw new Error("This repository has a different private connection. Reconnect explicitly.");
        // Browser-approved source grant and actual token identity agree; never retarget an existing binding.
        writeBinding(cwd, { workspaceId: grant.workspace_id, projectId: grant.project_id, projectSlug: grant.project_slug });
        current(); compare(grant, bindingOrMissing());
        store.save(source, grant, previous?.revision ?? null); pending = undefined; client = undefined;
        notify({ jsonrpc: "2.0", method: "notifications/tools/list_changed" });
      } catch (error) {
        if (["authorization_pending", "slow_down", "temporarily_unavailable"].includes(error.code)) {
          if (error.code === "slow_down") pending.interval = Math.min(60, pending.interval + 5);
          pending.nextPollAt = now() + pending.interval * 1000;
          return content({ status: "awaiting_browser", retry_after: pending.interval });
        }
        pending = undefined; throw error;
      }
    }
    if (!store.read(expectedSource)) return content({ status: "disconnected", message: "Run snipara_connect to connect this repository." });
    const { grant } = await connected();
    return content({ status: "connected", project: grant.project_slug, workspace: grant.workspace_slug || grant.workspace_id, source: expectedSource });
  }
  return {
    async handle(message) {
      current();
      if (message.method === "initialize") return { protocolVersion: HOST_PROTOCOLS.has(message.params?.protocolVersion) ? message.params.protocolVersion : PROTOCOL, capabilities: { tools: { listChanged: true } }, serverInfo: { name: "snipara-native-plugin", version: "1.0.0" }, instructions: "Use snipara_connect once for this repository, then snipara_connection_status after browser approval. This connection is scoped to this host project session. After changing repositories, start or reload the host session in the new project before using Snipara." };
      if (message.method === "ping") return {};
      if (message.method?.startsWith("notifications/")) return undefined;
      if (message.method === "tools/call" && BOOTSTRAP.some(tool => tool.name === message.params?.name)) {
        if (message.params?.arguments && Object.keys(message.params.arguments).length) throw new Error("Connection tools do not accept project or path overrides.");
        if (message.params.name === "snipara_connection_status") return status();
        const source = current(), binding = bindingOrMissing(), previous = store.read(expectedSource);
        if (previous && binding) compare(previous, binding);
        const known = binding ? { project_id: binding.projectId, workspace_id: binding.workspaceId } : previous ? { project_id: previous.project_id, workspace_id: previous.workspace_id } : {};
        if (!pending || pending.expiresAt <= now()) pending = await auth.start({ kind: source.kind, fingerprint: source.fingerprint, label: basename(source.root).replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, 120).trim() || "Project", ...(source.repository ? { repository: source.repository } : {}), ...known });
        pending.nextPollAt = now() + pending.interval * 1000;
        return content({ status: "awaiting_browser", verification_url: pending.verificationUrl, user_code: pending.userCode, retry_after: pending.interval, message: "Open this page to sign in and approve the workspace and project for this repository. Then check snipara_connection_status." });
      }
      if (!FORWARDED.has(message.method)) throw new Error("Unsupported MCP method.");
      if (message.method === "tools/list" && !store.read(expectedSource)) return { tools: BOOTSTRAP };
      let connection;
      try { connection = await connected(); }
      catch (error) { if (message.method === "tools/list") return { tools: BOOTSTRAP }; throw error; }
      current(); compare(connection.grant, bindingOrMissing());
      if (message.method === "tools/call") {
        if (CROSS_PROJECT_TOOLS.has(message.params?.name)) throw new Error("This Snipara connection supports this project only.");
        assertProjectArguments(message.params?.arguments, connection.grant);
      }
      const result = await connection.client.call(message.method, message.params);
      current(); compare(connection.grant, bindingOrMissing());
      if (message.method === "tools/list") {
        if (!Array.isArray(result?.tools)) throw new Error("Invalid Snipara tool catalog.");
        return { ...result, tools: [...BOOTSTRAP, ...result.tools.filter(tool => !CROSS_PROJECT_TOOLS.has(tool.name) && !BOOTSTRAP.some(own => own.name === tool.name))] };
      }
      return result;
    },
  };
}
