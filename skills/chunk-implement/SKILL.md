---
name: chunk-implement
description: Implement complex features by breaking them into chunks, querying Snipara for context, and using RLM Runtime for safe execution of each chunk. Use for multi-step implementations spanning multiple files.
---

When implementing complex features (5+ files, multiple steps):

**Phase 1: Upload & Plan**
1. Upload feature document: `rlm_upload_document(path="docs/features/...", content="...")`
2. Generate plan: `rlm_plan(query="Implement X", max_tokens=16000)`
3. Decompose: `rlm_decompose(query="Implement X", max_depth=2)`

**Phase 2: Chunk-by-Chunk Implementation**
For each chunk:
1. Query context: `rlm_context_query(query="chunk task", max_tokens=6000)`
2. Implement using RLM Runtime:
```python
from rlm import RLM

rlm = RLM(backend="anthropic", environment="docker")

result = rlm.completion(f"""
    Implement: {chunk_task}

    Context: {snipara_context}

    Steps:
    1. Write implementation
    2. Write tests
    3. Run tests with pytest
    4. Return results
""")
```
3. Remember decisions: `rlm_remember(type="decision", content="...")`

**Phase 3: Verification**
```python
rlm.completion("""
    Run full test suite:
    - pytest
    - pnpm lint
    - pnpm type-check
    - pnpm build
""")
```

**Benefits:**
- Context-aware: Each chunk gets relevant docs from Snipara
- Safe execution: RLM Runtime uses Docker isolation
- Iterative: Test each chunk independently
- Traceable: Full trajectory logs for debugging

**Example:**
```
User: Implement OAuth 2.0 integration

Phase 1: Planning
- Upload spec → Plan → Decompose into 6 chunks

Phase 2: Implement chunks
Chunk 1: Database schema
  → rlm_context_query("OAuth database schema")
  → RLM: Write migration + tests + run
  → rlm_remember("decision", "Used JWT tokens table")

Chunk 2: OAuth provider config
  → rlm_context_query("OAuth configuration patterns")
  → RLM: Write config + env vars + tests
  → rlm_remember("decision", "Support Google + GitHub providers")

... repeat for remaining chunks ...

Phase 3: Integration test
  → RLM: Run full test suite
```
