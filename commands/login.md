---
description: Sign in to Snipara via browser (auto-creates free account if needed)
---

# Snipara Login (Device Flow)

Sign in to Snipara through your browser. This will automatically create a free account and project if you don't have one.

**Steps:**

1. Request a device code from Snipara with auto-provisioning enabled
2. Open the verification URL in your browser
3. Sign in with GitHub or Google (account auto-created if new)
4. Poll for completion and receive API key + project info
5. Write `.mcp.json` with the returned credentials

**Execute:**

Run the following bash command to start the device flow:

```bash
curl -s -X POST https://www.snipara.com/api/oauth/device/code \
  -H "Content-Type: application/json" \
  -d '{"client_id": "claude-code", "auto_provision": true}'
```

Parse the JSON response to extract `device_code`, `user_code`, `verification_uri_complete`, `interval`, and `expires_in`.

Then tell the user:

> **Open this URL in your browser to sign in:**
> `{verification_uri_complete}`
>
> Or go to **snipara.com/device** and enter code: **{user_code}**
>
> Waiting for you to complete sign-in...

Poll for the token every `{interval}` seconds (default 5):

```bash
curl -s -X POST https://www.snipara.com/api/oauth/device/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
    "device_code": "{device_code}",
    "client_id": "claude-code"
  }'
```

Handle polling responses:
- `"authorization_pending"` → keep polling
- `"slow_down"` → increase interval by 5 seconds
- `"expired_token"` → code expired, restart the flow
- `"access_denied"` → user denied, stop

On success the response includes:
- `access_token` — OAuth bearer token
- `api_key` — Project API key (when auto_provision was true)
- `project_slug` — Project slug
- `project_name` — Project name
- `server_url` — API server URL
- `mcp_endpoint` — Full MCP endpoint URL

Write or update `.mcp.json` in the current working directory:

```json
{
  "mcpServers": {
    "snipara": {
      "type": "http",
      "url": "{mcp_endpoint}",
      "headers": {
        "X-API-Key": "{api_key}"
      }
    }
  }
}
```

If `.mcp.json` already exists, merge the `snipara` server entry into the existing `mcpServers` object without removing other servers.

After writing the file, confirm success:

> Signed in! Snipara is configured for project **{project_name}** ({project_slug}).
> MCP endpoint: `{mcp_endpoint}`
>
> Restart Claude Code to pick up the new MCP server, or run `/snipara:lite-mode` to start querying.
