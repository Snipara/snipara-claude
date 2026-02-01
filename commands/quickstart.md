---
description: One-command setup — sign in, create account, and configure Snipara
---

# Snipara Quickstart

Setting up Snipara in one step. This will sign you in (creating a free account if needed) and configure `.mcp.json` automatically.

**What happens:**
1. Check if `.mcp.json` already has a `snipara` server configured
2. If already configured, verify it works by calling `rlm_stats`
3. If not configured, run the device flow login with auto-provisioning

**Execute:**

First, check if `.mcp.json` exists in the current directory and already contains a `snipara` MCP server entry.

If a `snipara` server is already configured in `.mcp.json`:
- Try calling `rlm_stats` to verify the connection works
- If it succeeds, tell the user: "Snipara is already configured and working! Run `/snipara:lite-mode [task]` to get started."
- If it fails (auth error), proceed with login below

If NOT configured, run the full login flow:

```bash
curl -s -X POST https://www.snipara.com/api/oauth/device/code \
  -H "Content-Type: application/json" \
  -d '{"client_id": "claude-code", "auto_provision": true}'
```

Parse `device_code`, `user_code`, `verification_uri_complete`, and `interval` from the response.

Tell the user:

> **Open this URL to sign in (account created automatically):**
> `{verification_uri_complete}`
>
> Or go to **snipara.com/device** and enter: **{user_code}**

Poll for the token every `{interval}` seconds:

```bash
curl -s -X POST https://www.snipara.com/api/oauth/device/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
    "device_code": "{device_code}",
    "client_id": "claude-code"
  }'
```

On `"authorization_pending"` keep polling. On `"slow_down"` add 5s to interval.

On success, write `.mcp.json` (merging with existing if present):

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

Then tell the user:

> **You're all set!** Snipara is configured for project: **{project_name}**
>
> **Next steps:**
> - Restart Claude Code to load the MCP server
> - Run `/snipara:lite-mode [your question]` to query your docs
> - Upload docs at [snipara.com](https://snipara.com) to start indexing
>
> Free plan includes 100 queries/month. Upgrade anytime at snipara.com/pricing.
