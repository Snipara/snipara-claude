# Snipara Workflows Guide

Complete guide to using Snipara + RLM Runtime workflows in Claude Code.

## Table of Contents

- [LITE Mode Workflow](#lite-mode-workflow)
- [FULL Mode Workflow](#full-mode-workflow)
- [Memory-Driven Development](#memory-driven-development)
- [Team Collaboration Workflow](#team-collaboration-workflow)
- [Chunk-by-Chunk Implementation](#chunk-by-chunk-implementation)
- [RLM Runtime Workflow](#rlm-runtime-workflow)

---

## LITE Mode Workflow

**Use when:** Quick bug fixes, small features (<5 files), known file locations

**Token Budget:** ~3-5K

### Steps

1. **Query Context**
   ```bash
   /snipara:lite authentication timeout bug
   ```

2. **Claude automatically:**
   - Calls `mcp__snipara__rlm_context_query("authentication timeout bug", max_tokens=4000)`
   - Gets ~4K tokens of relevant context
   - Shows you the most relevant sections

3. **You review the context** and Claude suggests next steps

4. **Read specific files** identified from context

5. **Edit code** to fix the issue

6. **Test changes**

### Example: Fix Authentication Timeout

```bash
User: Fix the authentication timeout bug

Claude: Let me query Snipara for context on authentication timeouts...

[Calls rlm_context_query("authentication timeout", max_tokens=4000)]

I found context about:
- JWT token expiration settings in auth/config.ts:23
- Session timeout middleware in middleware/session.ts:45
- Redis connection timeout in utils/redis.ts:12

Based on the context, the issue is likely in middleware/session.ts where the
timeout is set to 5 minutes but should be 30 minutes according to the spec.

Let me read the file...

[Reads middleware/session.ts]

I'll update the timeout from 300000 to 1800000...

[Edits the file]

The fix is complete. The session timeout is now 30 minutes.
```

---

## FULL Mode Workflow

**Use when:** Complex features, 5+ files, architectural changes, multi-day work

**Token Budget:** ~8-15K

### Phases

#### Phase 1: Context Loading

```bash
/snipara:full OAuth 2.0 integration
```

**Claude automatically:**
1. Loads team standards: `mcp__snipara__rlm_shared_context()`
2. Recalls previous context: `mcp__snipara__rlm_recall("OAuth integration progress")`
3. Queries comprehensive context: `mcp__snipara__rlm_context_query("OAuth 2.0 integration", max_tokens=8000)`

#### Phase 2: Planning

**Claude automatically:**
4. Generates execution plan: `mcp__snipara__rlm_plan("OAuth 2.0 integration")`
5. Decomposes into chunks: `mcp__snipara__rlm_decompose("OAuth 2.0 integration", max_depth=2)`

**Example plan output:**
```
Execution Plan for OAuth 2.0 Integration:

Chunk 1: Database Schema
  - Create oauth_tokens table
  - Add provider_id to users table
  - Dependencies: None

Chunk 2: OAuth Provider Configuration
  - Add Google OAuth config
  - Add GitHub OAuth config
  - Dependencies: Chunk 1

Chunk 3: Authorization Endpoint
  - /auth/oauth/authorize route
  - State parameter generation
  - Dependencies: Chunk 2

Chunk 4: Token Exchange Endpoint
  - /auth/oauth/callback route
  - Token validation
  - Dependencies: Chunk 3

Chunk 5: Token Refresh Logic
  - Refresh token endpoint
  - Background refresh job
  - Dependencies: Chunk 4

Chunk 6: Integration Tests
  - OAuth flow test
  - Token refresh test
  - Dependencies: All chunks
```

#### Phase 3: Implementation (Chunk-by-Chunk)

For each chunk:

**Step 1: Query context**
```bash
mcp__snipara__rlm_context_query(
  query="OAuth database schema for tokens",
  max_tokens=6000
)
```

**Step 2: Implement (with RLM Runtime if needed)**
```bash
# Option A: Direct implementation by Claude
Claude reads context → Writes code → Writes tests

# Option B: With RLM Runtime (for complex logic)
/snipara:docker Write OAuth token table migration following the context from Snipara. Include indexes for provider_id and user_id. Write tests for the migration.
```

**Step 3: Remember decisions**
```bash
/snipara:remember type=decision "OAuth tokens table uses composite key (user_id, provider_id). Added index on expires_at for cleanup job."
```

#### Phase 4: Verification

```bash
# Run full test suite
pnpm test

# Or with RLM Runtime
/snipara:docker Run full test suite: pytest, pnpm lint, pnpm type-check, pnpm build
```

#### Phase 5: Documentation

```bash
# Upload implementation docs
mcp__snipara__rlm_upload_document(
  path="docs/oauth-integration.md",
  content="<implementation details>"
)

# Store summary
mcp__snipara__rlm_store_summary(
  document_path="src/auth/oauth.ts",
  summary="OAuth 2.0 integration supporting Google and GitHub providers",
  summary_type="technical"
)
```

#### Phase 6: Session Save

```bash
/snipara:remember type=context "Completed OAuth integration chunks 1-4. Next: Token refresh logic (chunk 5). All tests passing."
```

### Complete Example

```bash
User: Implement OAuth 2.0 integration with Google and GitHub

Claude: Starting FULL mode for OAuth 2.0 integration...

=== Phase 1: Context Loading ===

[Calls rlm_shared_context()]
Loaded team coding standards:
- MANDATORY: All auth endpoints require rate limiting
- BEST_PRACTICES: Use Redis for session storage

[Calls rlm_recall("OAuth integration")]
No previous context found. Starting fresh.

[Calls rlm_context_query("OAuth 2.0 integration", max_tokens=8000)]
Found relevant context:
- Existing auth patterns in src/auth/
- Database schema conventions
- Redis connection setup
- OAuth library recommendations

=== Phase 2: Planning ===

[Calls rlm_plan()]
Generated 6-chunk execution plan (shown above)

[Calls rlm_decompose()]
Identified dependencies between chunks

=== Phase 3: Implementation ===

**Chunk 1: Database Schema**

[Calls rlm_context_query("OAuth database schema")]
Retrieved: Database naming conventions, migration patterns

Implementing database migration...

[Writes: db/migrations/001_create_oauth_tokens.sql]
[Writes: db/migrations/002_add_oauth_to_users.sql]
[Writes: tests/db/test_oauth_schema.py]

[Runs tests]
✓ All migration tests pass

[Calls rlm_remember()]
Saved: "OAuth tokens table created with composite key (user_id, provider_id)"

**Chunk 2: OAuth Provider Configuration**

[Calls rlm_context_query("OAuth provider configuration")]
Retrieved: Config patterns, environment variable setup

[Writes: src/auth/oauth/providers/google.ts]
[Writes: src/auth/oauth/providers/github.ts]
[Writes: tests/auth/test_oauth_providers.py]

✓ Tests pass

**Chunk 3-5: Endpoints and Token Logic**
[Similar process for each chunk...]

**Chunk 6: Integration Tests**

[Calls rlm_context_query("OAuth integration testing patterns")]

[Writes: tests/integration/test_oauth_flow.py]

[Runs: pnpm test]
✓ All 47 tests pass

=== Phase 4: Verification ===

Running full test suite...
✓ pytest: 47 passed
✓ pnpm lint: No issues
✓ pnpm type-check: No errors
✓ pnpm build: Success

=== Phase 5: Documentation ===

[Uploads: docs/oauth-integration.md]
[Stores summaries for all modified files]

=== Phase 6: Session Save ===

[Calls rlm_remember()]
Saved: "Completed OAuth 2.0 integration. All 6 chunks implemented. All tests passing. Ready for code review."

✅ FULL mode complete!

Summary:
- 6 chunks implemented
- 12 files created/modified
- 47 tests passing
- All checks pass
- Documentation updated
```

---

## Memory-Driven Development

Use Snipara's memory system for session continuity across days/weeks.

### Pattern 1: End-of-Session Save

```bash
# Before ending your session
/snipara:remember type=context "Completed user registration API. Next: Email verification endpoint. Blocker: Need SMTP credentials from ops team."
```

### Pattern 2: Start-of-Session Recall

```bash
# At start of new session
/snipara:recall last session progress

# Returns:
# - "Completed user registration API. Next: Email verification..."
# - Confidence: 0.95
# - Stored: 2 days ago
```

### Pattern 3: Decision Tracking

```bash
# Record important decisions
/snipara:remember type=decision "Chose JWT over sessions for API authentication. Reason: Mobile app requires stateless auth."

# Later, recall decisions
/snipara:recall JWT authentication decisions

# Returns all JWT-related decisions with context
```

### Pattern 4: Learning Capture

```bash
# Capture learnings from bugs/issues
/snipara:remember type=learning "Redis connection pool exhaustion happens when worker count > pool size. Solution: Set pool size = worker count * 2"

# Later, when debugging similar issue
/snipara:recall Redis connection pool issues
```

### Complete Memory Workflow

```bash
=== Day 1: Start Feature ===

User: Implement payment processing with Stripe

Claude: Let me check if we have any previous context...

[Calls rlm_recall("payment processing Stripe")]
No previous memories found.

[Implements Stripe webhook endpoint]

[At end of session]
/snipara:remember type=context "Implemented Stripe webhook endpoint. Handles payment_intent.succeeded and payment_intent.failed events. Next: Add subscription webhook handlers. Note: Webhook signature verification is in src/payments/stripe/verify.ts"

=== Day 2: Continue Feature ===

Claude: Recalling previous session...

[Calls rlm_recall("payment processing progress")]

Retrieved:
- "Implemented Stripe webhook endpoint..." (from Day 1)
- Confidence: 0.98

Let me continue with subscription webhook handlers...

[Implements subscription handlers]

[Calls rlm_remember()]
Decision: "Using webhook events instead of polling for subscription status changes. More reliable and real-time."

[At end of session]
/snipara:remember type=context "Completed webhook handlers for payments and subscriptions. Next: Add retry logic for failed webhooks. All existing tests passing."

=== Day 3: Review & Recall ===

User: What decisions did we make about the payment system?

[Calls rlm_recall("payment decisions", type="decision")]

Retrieved decisions:
1. "Using webhook events instead of polling..." (from Day 2)
2. Earlier related decisions...

Let me summarize our payment implementation decisions...
```

---

## Team Collaboration Workflow

Use team features for shared standards and multi-project search.

### 1. Load Team Standards

```bash
/snipara:shared

# Returns:
# === MANDATORY Standards (40% priority) ===
# - All API endpoints must have Zod schema validation
# - Never expose internal errors to clients
# - Use Prisma for all database access
#
# === BEST PRACTICES (30% priority) ===
# - Prefer functional components with hooks
# - Use server actions for mutations
# ...
```

### 2. Inject Team Standards for Session

```bash
/snipara:inject Follow team TypeScript standards from shared context. All endpoints must have Zod validation. Use Prisma for DB access.

# Now all queries in this session will consider team standards
```

### 3. Multi-Project Search

```bash
# Search across ALL team projects
/snipara:team rate limiting implementation

# Returns results from multiple projects:
# Project: Main API
# - src/middleware/rate-limit.ts
# - Uses Redis with sliding window
#
# Project: Admin Dashboard
# - lib/rate-limit.ts
# - Uses in-memory LRU cache
#
# Project: Worker Service
# - utils/throttle.ts
# - Custom token bucket implementation
```

### 4. Team Workflow Example

```bash
User: Implement rate limiting for our new API endpoints

Claude: Let me check our team's existing implementations...

[Calls rlm_multi_project_query("rate limiting implementation")]

Found implementations in 3 projects:
1. Main API: Redis-based sliding window
2. Admin Dashboard: In-memory LRU cache
3. Worker Service: Token bucket algorithm

[Calls rlm_shared_context()]

Team standard: Use Redis for all rate limiting (MANDATORY)

Based on team standards and existing implementations, I'll use the
Redis-based approach from Main API...

[Implements following team pattern]

[Calls rlm_remember()]
Decision: "Used Redis rate limiting pattern from Main API project. Configured 100 req/min per user."
```

---

## Chunk-by-Chunk Implementation

For complex features spanning multiple files and systems.

### When to Use

- Feature affects 5+ files
- Multiple subsystems involved
- Requires testing each component independently
- Long implementation (multi-hour/multi-day)

### Workflow

#### 1. Upload Feature Spec

```bash
# If you have a written spec/PRD
mcp__snipara__rlm_upload_document(
  path="docs/features/real-time-notifications.md",
  content="<feature specification>"
)
```

#### 2. Generate Plan & Decompose

```bash
/snipara:plan Implement real-time notifications system from docs/features/real-time-notifications.md

# Returns 8 chunks with dependencies
```

#### 3. Implement Chunk-by-Chunk

**For Each Chunk:**

```bash
# Step 1: Query context for this specific chunk
/snipara:lite WebSocket connection management patterns

# Step 2: Implement
# [Claude implements based on context]

# Step 3: Test immediately
pnpm test src/notifications/websocket.test.ts

# Step 4: Remember
/snipara:remember type=decision "WebSocket connections use socket.io with Redis adapter for horizontal scaling"

# Step 5: Move to next chunk
```

#### 4. Full Integration Test

```bash
# After all chunks complete
pnpm test:integration

# Or with RLM Runtime
/snipara:docker Run full integration test suite for notifications system
```

### Example: Real-Time Notifications

```bash
Feature: Real-time notifications with WebSocket

Chunks:
1. WebSocket server setup
2. Redis pub/sub for multi-server
3. Notification data model
4. User subscription management
5. Permission/filtering logic
6. Frontend WebSocket client
7. Retry/reconnection logic
8. Integration tests

=== Chunk 1: WebSocket Server ===

[Query context]
/snipara:lite WebSocket server setup with socket.io

[Implement]
- src/notifications/server.ts
- Socket.io setup with authentication

[Test]
✓ WebSocket connection test passes

[Remember]
/snipara:remember type=decision "Using socket.io v4 with JWT authentication middleware"

=== Chunk 2: Redis Pub/Sub ===

[Query context]
/snipara:lite Redis pub/sub for WebSocket scaling

[Implement]
- src/notifications/redis-adapter.ts
- Pub/sub channel: `notifications:${userId}`

[Test]
✓ Multi-server message delivery test passes

[Remember]
/snipara:remember type=decision "Redis pub/sub channel per user for targeted delivery"

=== Chunks 3-7 ===
[Similar process...]

=== Chunk 8: Integration Tests ===

[Test full system]
/snipara:docker Run integration tests for notification system with multiple simulated users and servers

✓ All scenarios pass:
- Connection/disconnection
- Message delivery
- Retry logic
- Permission filtering

=== Complete ===

Summary:
- 8 chunks implemented
- 15 files created/modified
- All tests passing
- Ready for code review
```

---

## RLM Runtime Workflow

Use RLM Runtime for safe code execution with Docker isolation.

### When to Use RLM Runtime

- Running tests in isolation
- Validating implementations
- Complex data processing/parsing
- Executing potentially unsafe code
- Needing execution traces/logs

### Basic Execution

```bash
# Local execution (trusted code)
/snipara:run Parse JSON logs and extract top 5 error messages

# Docker isolation (recommended)
/snipara:docker Parse JSON logs and extract top 5 error messages
```

### With Snipara Context

```bash
# Step 1: Get context from Snipara
/snipara:lite log parsing patterns

# Step 2: Execute with RLM using that context
/snipara:docker Based on the log parsing patterns from Snipara, parse logs/api.log and extract:
1. Top 5 error messages by frequency
2. Timestamp of first occurrence for each
3. Affected endpoints

Output as JSON.
```

### View Results

```bash
# View recent executions
/snipara:logs

# Launch interactive dashboard
/snipara:visualize

# Check specific trajectory
/snipara:logs --id traj_abc123
```

### Complete Example

```bash
User: Analyze our API logs and find the most common errors

Claude: Let me first get context about our log format...

[Calls rlm_context_query("API log format structure")]

Retrieved:
- Log format: JSON with timestamp, level, message, meta
- Location: logs/api.log
- Error logs have level="error"

Now I'll use RLM Runtime to safely parse and analyze the logs...

/snipara:docker """
Parse logs/api.log (JSON format):
1. Filter entries with level="error"
2. Count by message
3. Return top 5 with:
   - Error message
   - Count
   - First occurrence timestamp
   - Sample meta object
Output as JSON.
"""

[RLM Runtime executes in Docker]

Execution complete! Trajectory ID: traj_20260129_143052

Results:
{
  "top_errors": [
    {
      "message": "Database connection timeout",
      "count": 1247,
      "first_seen": "2026-01-28T10:23:45Z",
      "sample_meta": {"db": "users", "timeout_ms": 5000}
    },
    {
      "message": "Rate limit exceeded",
      "count": 892,
      "first_seen": "2026-01-28T11:15:22Z",
      "sample_meta": {"user_id": "usr_123", "endpoint": "/api/data"}
    },
    ...
  ]
}

Analysis:
1. Database timeouts are the #1 issue (1,247 occurrences)
2. Rate limiting is #2 (892 occurrences)

Let me query Snipara for our database connection configuration...

[Calls rlm_context_query("database connection pool configuration")]

I found the issue: connection pool size is 10 but we have 50 workers.
Let me check if we have any previous learnings about this...

[Calls rlm_recall("database connection pool")]

Retrieved learning:
"Redis connection pool exhaustion happens when worker count > pool size.
Solution: Set pool size = worker count * 2"

The same principle applies here. I recommend increasing the database
connection pool from 10 to 100 (50 workers * 2).

Would you like me to make this change?
```

---

## Best Practices

### 1. Choose the Right Workflow

| Scenario | Workflow | Reason |
|----------|----------|--------|
| Bug fix, <3 files | LITE | Fast, focused |
| New feature, 5+ files | FULL | Comprehensive planning |
| Multi-day feature | FULL + Memory | Session continuity |
| Team project | FULL + Team | Follow standards |
| Code execution needed | FULL + RLM | Safe execution |

### 2. Use Memory Consistently

- **End every session** with context save
- **Start every session** with context recall
- **Record decisions** as you make them
- **Capture learnings** from bugs

### 3. Leverage Team Features

- Load team standards at session start
- Use multi-project search for existing patterns
- Inject standards for complex implementations

### 4. RLM Runtime Tips

- Use Docker for anything untrusted
- Always query Snipara context first
- Check logs/visualize for debugging
- Keep trajectories for post-mortem analysis

### 5. Chunk Size

- Aim for 30-60 minute chunks
- Each chunk should be independently testable
- Chunk boundaries should align with modules/components

---

## Troubleshooting

### Context Not Relevant?

```bash
# Try different search terms
/snipara:search database connection pool  # More specific

# Or query with more context
/snipara:lite database connection pool configuration for PostgreSQL with Prisma
```

### Memory Not Recalling?

```bash
# Check what's stored
mcp__snipara__rlm_memories(limit=20)

# Try different query terms
/snipara:recall authentication  # Instead of "auth"
```

### RLM Runtime Fails?

```bash
# Check logs
/snipara:logs

# View trajectory
/snipara:visualize

# Verify Docker running
docker --version
docker ps
```

### Team Features Not Working?

```bash
# Verify team plan
# Team features require TEAM plan or higher

# Check collections
mcp__snipara__rlm_list_collections()
```

---

## Next Steps

- Read [SKILLS.md](./SKILLS.md) for skill development
- Read [HOOKS.md](./HOOKS.md) for automation hooks
- Read [RLM_INTEGRATION.md](./RLM_INTEGRATION.md) for RLM Runtime details
