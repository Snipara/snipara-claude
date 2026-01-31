# Authentication & LLM Account Guide

Complete reference for authenticating with Snipara and understanding how it works with your LLM provider (Claude, OpenAI, Cursor, etc.).

---

## Table of Contents

- [Quick Setup (Recommended)](#quick-setup-recommended)
- [How Snipara Authentication Works](#how-snipara-authentication-works)
- [Method 1: API Key](#method-1-api-key)
- [Method 2: OAuth Device Flow](#method-2-oauth-device-flow)
- [Using Snipara With Your LLM](#using-snipara-with-your-llm)
- [Why No OAuth With OpenAI or Claude](#why-no-oauth-with-openai-or-claude)
- [Setup By Client](#setup-by-client)
- [Token Management](#token-management)
- [Troubleshooting](#troubleshooting)

---

## Quick Setup (Recommended)

The fastest way to get started with Snipara in Claude Code:

### /snipara:quickstart

One command that handles everything: sign-in, account creation, and `.mcp.json` configuration.

```
/snipara:quickstart
```

**What happens:**
1. Checks if `.mcp.json` already has Snipara configured
2. If not, starts the device flow with auto-provisioning
3. Opens your browser to sign in with GitHub or Google
4. Auto-creates a free account and "My Project" if needed
5. Writes `.mcp.json` with your API key and project endpoint

### /snipara:login

If you already have `.mcp.json` but need to re-authenticate or switch accounts:

```
/snipara:login
```

This runs the device flow with `auto_provision: true`, meaning:
- New users get a free account + project created automatically
- Existing users get their current project selected
- The `.mcp.json` is written/updated with the returned API key

Both commands use the enhanced device flow that returns an API key directly, so you don't need to manually copy keys from the dashboard.

---

## How Snipara Authentication Works

Snipara has its **own authentication system**, separate from any LLM provider. When you authenticate with Snipara, you are authenticating with the **context optimization service** - not with Claude, OpenAI, or any other AI provider.

```
┌─────────────────────────────────────────────────────────────────────┐
│  TWO SEPARATE AUTH SYSTEMS                                          │
│                                                                     │
│  1. Snipara Auth (API key or OAuth)                                │
│     └── Authenticates you to the context optimization service      │
│     └── Returns optimized documentation context                    │
│                                                                     │
│  2. LLM Auth (your existing account)                               │
│     └── Claude Pro/Max: Built into Claude Code, no key needed      │
│     └── OpenAI: API key (OPENAI_API_KEY) for RLM Runtime only     │
│     └── Cursor/Windsurf: Built into the IDE                       │
│                                                                     │
│  These are INDEPENDENT. Snipara does not connect to or proxy       │
│  your LLM provider. It provides context; your LLM reasons.        │
└─────────────────────────────────────────────────────────────────────┘
```

The flow:

```
Your Docs ──> Snipara (optimizes to ~5K tokens) ──> Your LLM (reasons over context)
                    │                                       │
              Snipara auth                          Your LLM account
              (API key or OAuth)                    (Pro/Max/API key)
```

---

## Method 1: API Key

The simplest authentication method. Generate a key from the Snipara dashboard.

### Getting a Key

1. Sign in at [snipara.com](https://snipara.com)
2. Go to **Project > API Keys**
3. Click **"Generate Key"**
4. Copy the key immediately (it is shown only once)

### Key Formats

| Format | Scope | Use Case |
|---|---|---|
| `rlm_pk_...` | Single project | Most common - one project per key |
| `rlm_team_...` | All team projects | Multi-project queries, shared context |

### Configuration

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "snipara": {
      "type": "http",
      "url": "https://api.snipara.com/mcp/<your-project-slug>",
      "headers": {
        "X-API-Key": "rlm_pk_your_key_here"
      }
    }
  }
}
```

### Security

- Keys are hashed (SHA-256) before storage - Snipara cannot retrieve your original key
- Only the prefix is visible in the dashboard
- Set expiration dates when possible
- Revoke immediately if compromised: **Project > API Keys > Revoke**

---

## Method 2: OAuth Device Flow

Browser-based login for users who prefer not to manage API keys. The `/snipara:login` and `/snipara:quickstart` commands use this flow with `auto_provision: true` to auto-create accounts and projects.

### How It Works

```
┌─────────────┐                              ┌─────────────┐
│  Your CLI   │                              │   Snipara   │
└──────┬──────┘                              └──────┬──────┘
       │                                            │
       │  1. POST /api/oauth/device/code            │
       │───────────────────────────────────────────>│
       │                                            │
       │  {device_code, user_code, uri}             │
       │<───────────────────────────────────────────│
       │                                            │
       │  2. Display: "Go to snipara.com/device"    │
       │     Display: "Enter code: ABCD-1234"       │
       │                                            │
       │           3. User opens browser,           │
       │              enters code, logs in          │
       │                           ────────────────>│
       │                                            │
       │  4. Poll: POST /api/oauth/device/token     │
       │───────────────────────────────────────────>│
       │                                            │
       │  {access_token, refresh_token}             │
       │<───────────────────────────────────────────│
```

### Step-by-Step

**1. Request a device code:**

```bash
curl -X POST https://snipara.com/api/oauth/device/code \
  -H "Content-Type: application/json" \
  -d '{"client_id": "claude-code", "auto_provision": true}'
```

> **Note:** `auto_provision: true` tells the server to auto-create an account and project if the user doesn't have one. Omit it for the standard flow where the user selects a project manually.

Response:

```json
{
  "device_code": "abc123def456ghi789...",
  "user_code": "ABCD-1234",
  "verification_uri": "https://snipara.com/device",
  "verification_uri_complete": "https://snipara.com/device?code=ABCD-1234",
  "expires_in": 900,
  "interval": 5
}
```

**2. Open the link and log in:**

Go to [snipara.com/device](https://snipara.com/device) and enter your code (e.g., `ABCD-1234`). Log in with GitHub, Google, or email.

Or open the complete URL directly: `https://snipara.com/device?code=ABCD-1234`

**3. Poll for the token:**

```bash
curl -X POST https://snipara.com/api/oauth/device/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
    "device_code": "abc123def456ghi789...",
    "client_id": "snipara_cli"
  }'
```

Poll responses:

| Response | Meaning | Action |
|---|---|---|
| `{"error": "authorization_pending"}` | User hasn't completed login yet | Keep polling at `interval` seconds |
| `{"error": "slow_down"}` | Polling too fast | Increase interval by 5 seconds |
| `{"error": "expired_token"}` | Device code expired (15 min) | Restart the flow |
| `{"error": "access_denied"}` | User denied authorization | Show error, stop polling |
| `{"access_token": "..."}` | Success | Save tokens, stop polling |

Success response (with `auto_provision: true`):

```json
{
  "access_token": "snipara_at_abc123...",
  "token_type": "Bearer",
  "expires_in": 2592000,
  "refresh_token": "snipara_rt_def456...",
  "project_id": "proj_abc",
  "project_slug": "my-project",
  "project_name": "My Project",
  "api_key": "rlm_pk_abc123...",
  "server_url": "https://api.snipara.com",
  "mcp_endpoint": "https://api.snipara.com/mcp/my-project"
}
```

> When `auto_provision` was used, the response includes `api_key`, `project_slug`, `mcp_endpoint`, and `server_url` for direct `.mcp.json` configuration.

**4. Use the API key in `.mcp.json`:**

```json
{
  "mcpServers": {
    "snipara": {
      "type": "http",
      "url": "https://api.snipara.com/mcp/my-project",
      "headers": {
        "X-API-Key": "rlm_pk_abc123..."
      }
    }
  }
}
```

Or use the OAuth token instead:

```json
{
  "mcpServers": {
    "snipara": {
      "type": "http",
      "url": "https://api.snipara.com/mcp/my-project",
      "headers": {
        "Authorization": "Bearer snipara_at_abc123..."
      }
    }
  }
}
```

### Token Lifecycle

| Token | Format | Validity | Purpose |
|---|---|---|---|
| Access token | `snipara_at_...` | 30 days | Authenticates MCP requests |
| Refresh token | `snipara_rt_...` | 90 days | Obtains new access tokens |

### Refreshing Tokens

When your access token expires, use the refresh token to get a new one:

```bash
curl -X POST https://snipara.com/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "snipara_rt_def456..."
  }'
```

Response:

```json
{
  "access_token": "snipara_at_new789...",
  "token_type": "Bearer",
  "expires_in": 2592000,
  "refresh_token": "snipara_rt_new012..."
}
```

Update your `.mcp.json` with the new access token.

### Revoking Tokens

Revoke a single token:

```bash
curl -X POST https://snipara.com/api/oauth/revoke \
  -H "Content-Type: application/json" \
  -d '{
    "token": "snipara_at_abc123...",
    "token_type_hint": "access_token"
  }'
```

Revoke all tokens (from dashboard):

**Settings > Active Sessions > Revoke All**

---

## Using Snipara With Your LLM

### Quick Reference

| Your Setup | Snipara Auth | LLM Access | What You Configure |
|---|---|---|---|
| **Claude Code + Pro/Max** | API key or OAuth | Built into Claude Code | `.mcp.json` with Snipara auth only |
| **Claude Code + API** | API key or OAuth | `ANTHROPIC_API_KEY` | `.mcp.json` + env var |
| **Cursor** | API key or OAuth | Built into Cursor | `.mcp.json` with Snipara auth only |
| **Windsurf** | API key or OAuth | Built into Windsurf | `.mcp.json` with Snipara auth only |
| **RLM Runtime + Anthropic** | API key or OAuth | `ANTHROPIC_API_KEY` | `.mcp.json` + env var |
| **RLM Runtime + OpenAI** | API key or OAuth | `OPENAI_API_KEY` | `.mcp.json` + env var |

### Claude Pro / Max Users

If you have a Claude Pro ($20/mo) or Max ($100-200/mo) subscription, you already have full LLM access through Claude Code. Snipara works as an MCP server that Claude Code connects to natively.

**What you need:**
1. Snipara authentication (API key or OAuth) in `.mcp.json`
2. That's it. No additional API keys.

**How it works:**
- Claude Code connects to Snipara MCP using your Snipara auth
- Snipara returns optimized documentation context (~5K tokens)
- Claude (powered by your Pro/Max subscription) reasons over that context
- You get answers grounded in your documentation

### Cursor / Windsurf Users

These IDEs have built-in LLM access. Add Snipara as an MCP server in your IDE's configuration and authenticate with an API key or OAuth token.

### RLM Runtime Users

RLM Runtime executes code in Docker isolation using an LLM for recursive task decomposition. This is a separate feature from Snipara's context optimization and requires its own LLM API key:

```bash
# For Anthropic (Claude API)
export ANTHROPIC_API_KEY=sk-ant-your-key-here

# Or for OpenAI (GPT API)
export OPENAI_API_KEY=sk-your-key-here
```

You need **both** Snipara auth (for context) and an LLM API key (for RLM Runtime execution).

---

## Why No OAuth With OpenAI or Claude

A common question: "Can I log in with my OpenAI or Claude account to use Snipara?"

The short answer: **No, and here's why.**

### OpenAI: No Third-Party OAuth Exists

OpenAI does not offer a "Login with OpenAI" OAuth flow for third-party applications. Their authentication model:

- **OpenAI API**: API key Bearer auth only (`sk-...`). No OAuth.
- **Apps SDK**: Uses OAuth 2.1, but in the **reverse direction** - ChatGPT connects to your MCP server, not your app connecting to OpenAI on behalf of the user.
- **No user-delegation flow**: There is no way for a third-party app to authenticate as an OpenAI user and bill against their account.

The community has [requested this](https://community.openai.com/t/proposal-for-oauth-authorization-in-third-party-applications-to-enhance-api-usage-and-security/559482), but OpenAI has not implemented it.

### Anthropic (Claude): Blocked for Third Parties

Anthropic had an OAuth system that third-party tools exploited, and they shut it down:

- **January 9, 2026**: Anthropic blocked third-party tools from using Claude Pro/Max subscription OAuth tokens. The error message: *"This credential is only authorized for use with Claude Code."*
- **Why**: Third-party tools (like OpenCode with 650K+ monthly users) were spoofing the Claude Code client identity to use $200/mo Max subscriptions for unlimited tokens - usage that would cost $1,000+ at API rates.
- **Result**: Subscription OAuth tokens now only work with the official Claude Code CLI. Using them in other tools violates Anthropic's Terms of Service.

Sources:
- [Anthropic crackdown on third-party harnesses](https://venturebeat.com/technology/anthropic-cracks-down-on-unauthorized-claude-usage-by-third-party-harnesses)
- [Claude Code OAuth restrictions](https://jpcaparas.medium.com/claude-code-cripples-third-party-coding-agents-from-using-oauth-6548e9b49df3)
- [OpenCode ToS violation notice](https://github.com/anomalyco/opencode/issues/6930)

### Why This Doesn't Affect Snipara

Snipara is an **MCP server**, not a third-party harness or Claude Code alternative. The architecture is fundamentally different:

```
Third-party harness (BLOCKED):
  Harness ──spoofs──> Claude OAuth ──> Uses Pro/Max tokens
  (Pretends to be Claude Code)

Snipara (WORKS CORRECTLY):
  Claude Code (official) ──> Snipara MCP Server ──> Returns context
  (Claude Code connects to Snipara as a tool, not the other way around)
```

- Snipara does not use your Claude subscription tokens
- Snipara does not proxy LLM requests through your account
- Snipara does not pretend to be Claude Code
- Snipara is a standard MCP server that any MCP-compatible client connects to

Your Claude Pro/Max subscription powers the LLM reasoning inside Claude Code. Snipara provides the optimized documentation context to that LLM. They are two independent services that work together.

---

## Setup By Client

### Claude Code

```json
// .mcp.json
{
  "mcpServers": {
    "snipara": {
      "type": "http",
      "url": "https://api.snipara.com/mcp/<your-project-slug>",
      "headers": {
        "X-API-Key": "rlm_pk_your_key_here"
      }
    }
  }
}
```

Or with OAuth:

```json
{
  "mcpServers": {
    "snipara": {
      "type": "http",
      "url": "https://api.snipara.com/mcp/<your-project-slug>",
      "headers": {
        "Authorization": "Bearer snipara_at_your_token_here"
      }
    }
  }
}
```

### Cursor

Add Snipara as an MCP server in Cursor's settings. Use the same `.mcp.json` format or configure via Cursor's MCP server UI.

### Windsurf

Add Snipara as an MCP server in Windsurf's configuration with the same auth headers.

### Direct API (curl / HTTP)

```bash
# With API key
curl -X POST https://api.snipara.com/mcp/<project-slug> \
  -H "Content-Type: application/json" \
  -H "X-API-Key: rlm_pk_your_key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "rlm_ask",
      "arguments": {"question": "How does auth work?"}
    }
  }'

# With OAuth token
curl -X POST https://api.snipara.com/mcp/<project-slug> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer snipara_at_your_token" \
  -d '{...}'
```

---

## Token Management

### Best Practices

1. **Prefer API keys for automation** - They don't expire (unless you set expiration)
2. **Prefer OAuth for personal use** - Browser login, no key to manage
3. **Never commit keys or tokens** - Use `.env` files or system keychains
4. **Use project keys over team keys** - Least privilege principle
5. **Rotate regularly** - Generate new keys periodically
6. **Monitor usage** - Check dashboard for unexpected patterns

### Secure Storage

**macOS (Keychain):**

```bash
security add-generic-password -a "snipara" -s "api-key" -w "rlm_pk_..."
```

**Linux (Secret Service):**

```bash
secret-tool store --label="Snipara API Key" service snipara key api
```

**Environment variable (.env):**

```bash
# .env (add to .gitignore!)
SNIPARA_API_KEY=rlm_pk_your_key_here
```

### Rate Limits

| Plan | Requests/Minute | Monthly Queries |
|---|---|---|
| FREE | 10 | 100 |
| PRO | 60 | 5,000 |
| TEAM | 100 | 20,000 |
| ENTERPRISE | 1,000 | Unlimited |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705320000
```

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| "Invalid API key" | Key revoked, expired, or wrong project | Generate a new key in dashboard |
| "OAuth token expired" | Access token past 30 days | Refresh with `snipara_rt_...` token |
| "Refresh token expired" | Refresh token past 90 days | Re-authenticate via device flow |
| "Rate limit exceeded" | Too many requests | Wait and retry, or upgrade plan |
| "authorization_pending" | User hasn't completed device flow | Continue polling at interval |
| "Device code expired" | 15-minute window passed | Restart the device flow |
| 401 Unauthorized | Missing or malformed auth header | Check header format (X-API-Key or Bearer) |
| 403 Forbidden | Key doesn't have access to this project | Use correct project key or team key |

### Debug a Request

```bash
curl -v https://api.snipara.com/mcp/<project-slug> \
  -H "X-API-Key: rlm_pk_..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Check response headers:
- `X-Request-Id` - Include in support tickets
- `X-RateLimit-Remaining` - Requests left in current window
- HTTP status code and error body

---

_Last updated: January 2026_
