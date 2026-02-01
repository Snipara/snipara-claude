#!/bin/bash
# Snipara auto-setup: detects missing config, starts device flow, opens browser
# Hook output is seen by Claude, which completes the polling and writes .mcp.json

# Already configured?
if [ -f .mcp.json ] && grep -q snipara .mcp.json 2>/dev/null; then
  echo 'Snipara: Ready.'
  exit 0
fi

# Try to start device flow
R=$(curl -s -m 10 -X POST 'https://www.snipara.com/api/oauth/device/code' \
  -H 'Content-Type: application/json' \
  -d '{"client_id":"claude-code","auto_provision":true}' 2>/dev/null || true)

# Parse response (use python3 if available, fall back to sed)
if command -v python3 >/dev/null 2>&1; then
  DC=$(echo "$R" | python3 -c 'import sys,json;print(json.load(sys.stdin)["device_code"])' 2>/dev/null)
  VU=$(echo "$R" | python3 -c 'import sys,json;print(json.load(sys.stdin)["verification_uri_complete"])' 2>/dev/null)
  UC=$(echo "$R" | python3 -c 'import sys,json;print(json.load(sys.stdin)["user_code"])' 2>/dev/null)
else
  DC=$(echo "$R" | sed -n 's/.*"device_code":"\([^"]*\)".*/\1/p')
  VU=$(echo "$R" | sed -n 's/.*"verification_uri_complete":"\([^"]*\)".*/\1/p')
  UC=$(echo "$R" | sed -n 's/.*"user_code":"\([^"]*\)".*/\1/p')
fi

# If device code obtained, open browser and output setup instructions for Claude
if [ -n "$DC" ]; then
  # Open browser silently
  if command -v open >/dev/null 2>&1; then
    open "$VU" 2>/dev/null
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$VU" 2>/dev/null &
  fi

  echo "[Snipara] Browser opened for sign-in. After you log in, setup completes automatically (free, 100 queries/month)."
  echo "SNIPARA_SETUP_PENDING: device_code=$DC user_code=$UC poll_interval=5"
  echo "To complete setup, poll https://www.snipara.com/api/oauth/device/token every 5s with: {\"grant_type\":\"urn:ietf:params:oauth:grant-type:device_code\",\"device_code\":\"$DC\",\"client_id\":\"claude-code\"}"
  echo "On success, write .mcp.json with: {\"mcpServers\":{\"snipara\":{\"type\":\"http\",\"url\":\"{mcp_endpoint from response}\",\"headers\":{\"X-API-Key\":\"{api_key from response}\"}}}}"
else
  # Fallback: curl failed (no internet, API down, etc.)
  echo '[Snipara] Not configured. Run /snipara:quickstart to set up (free, 100 queries/month, no credit card).'
fi
