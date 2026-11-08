import { validateNativeGrant } from "./native-credentials.mjs";

export const NATIVE_CLIENT_ID = "snipara-native-plugin";
export const OAUTH_ORIGIN = "https://www.snipara.com";
export const MCP_ORIGIN = "https://api.snipara.com";
const MAX_RESPONSE = 2 * 1024 * 1024;

export async function readBoundedResponse(response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Snipara returned an empty response.");
  let bytes = 0; const chunks = [];
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > MAX_RESPONSE) throw new Error("Snipara response is too large."); chunks.push(value); }
  } finally { await reader.cancel().catch(() => {}); }
  const joined = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: true }).decode(joined);
}

export function createNativeAuth({ fetchImpl = fetch, now = Date.now } = {}) {
  async function post(path, body) {
    let response;
    try { response = await fetchImpl(`${OAUTH_ORIGIN}${path}`, { method: "POST", redirect: "error", signal: AbortSignal.timeout(15000), headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) }); }
    catch { throw new Error("Snipara sign-in is unavailable. Retry shortly."); }
    let data; try { data = JSON.parse(await readBoundedResponse(response)); } catch { throw new Error("Snipara returned an invalid sign-in response."); }
    if (!response.ok) {
      const allowed = ["authorization_pending", "slow_down", "access_denied", "expired_token", "invalid_grant", "invalid_client", "temporarily_unavailable"];
      const error = new Error("Snipara sign-in could not complete."); error.code = allowed.includes(data.error) ? data.error : "authorization_failed"; throw error;
    }
    return data;
  }
  function grant(data, source) {
    const expires = data.expires_in;
    if (!Number.isSafeInteger(expires) || expires <= 0 || expires > 366 * 86400) throw new Error("Invalid Snipara token expiry.");
    const fields = ["client_id", "workspace_id", "workspace_slug", "workspace_name", "project_id", "project_slug", "project_name", "project_repository", "access_token", "refresh_token", "token_type", "scope"];
    const selected = Object.fromEntries(fields.filter(key => data[key] !== undefined).map(key => [key, data[key]]));
    return validateNativeGrant({ ...selected, source: data.source ?? source, expires_at: now() + expires * 1000 }, source);
  }
  return {
    async start(source) {
      const result = await post("/api/oauth/device/code", { client_id: NATIVE_CLIENT_ID, scope: "mcp:read mcp:write", auto_provision: true, source });
      const url = new URL(result.verification_uri_complete || result.verification_uri);
      if (url.origin !== OAUTH_ORIGIN || url.pathname !== "/device" || url.hash || url.username || url.password || [...url.searchParams.keys()].some(key => key !== "code")
          || typeof result.device_code !== "string" || !result.device_code || result.device_code.length > 2048
          || typeof result.user_code !== "string" || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(result.user_code)
          || !Number.isSafeInteger(result.expires_in) || result.expires_in <= 0 || result.expires_in > 1800) throw new Error("Invalid Snipara sign-in request.");
      return { deviceCode: result.device_code, userCode: result.user_code, verificationUrl: url.href, expiresAt: now() + result.expires_in * 1000, interval: Math.max(5, Math.min(60, Number(result.interval) || 5)), source };
    },
    async poll(pending) {
      const result = await post("/api/oauth/device/token", { client_id: NATIVE_CLIENT_ID, grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code: pending.deviceCode });
      if (!result.source || Object.keys(result.source).sort().join(",") !== Object.keys(pending.source).sort().join(",")
          || Object.keys(pending.source).some(key => result.source[key] !== pending.source[key])) throw new Error("Snipara sign-in source did not match this repository.");
      return grant(result, pending.source);
    },
    async refresh(previous) {
      const result = grant(await post("/api/oauth/token", { client_id: NATIVE_CLIENT_ID, grant_type: "refresh_token", refresh_token: previous.refresh_token }), previous.source);
      if (result.project_id !== previous.project_id || result.workspace_id !== previous.workspace_id) throw new Error("Snipara refresh authorized a different project. Connect again.");
      return result;
    },
  };
}
