---
description: Start FULL mode workflow for complex features with RLM Runtime integration
---

# FULL Mode Workflow (Snipara + RLM Runtime)

Starting FULL mode for complex development (token budget: ~8-15K).

**Best for:**
- Multi-day features
- Architectural changes
- 5+ files affected
- Team documentation needed
- Safe code execution required

**Workflow:**

**Phase 1: Context Loading**
1. Load team standards: `rlm_shared_context()`
2. Recall previous context: `rlm_recall("$ARGUMENTS progress")`
3. Query comprehensive context: `rlm_context_query("$ARGUMENTS", max_tokens=8000)`

**Phase 2: Planning**
4. Generate plan: `rlm_plan("$ARGUMENTS")`
5. Decompose: `rlm_decompose("$ARGUMENTS", max_depth=2)`
6. Upload spec (if exists): `rlm_upload_document(path="docs/features/...", content="...")`

**Phase 3: Implementation (Chunk-by-Chunk with RLM)**
For each chunk:
7. Query context: `rlm_context_query(query="chunk task", max_tokens=6000)`
8. Execute with RLM Runtime:
```bash
rlm run --env docker "
    Implement: {chunk_task}
    Context: {snipara_context}
    Steps:
    1. Write implementation
    2. Write tests
    3. Run tests
    4. Return results
"
```
9. Remember decisions: `rlm_remember(type="decision", content="...")`

**Phase 4: Verification**
10. Run full test suite with RLM:
```bash
rlm run --env docker "
    Run full test suite:
    - pytest
    - pnpm lint
    - pnpm type-check
    - SKIP_ENV_VALIDATION=true pnpm build
"
```

**Phase 5: Documentation**
11. Upload implementation: `rlm_upload_document()`
12. Store summary: `rlm_store_summary()`

**Phase 6: Session Save**
13. Remember progress: `rlm_remember(type="context", content="Completed X, next: Y")`

**View Execution:**
- Logs: `rlm logs`
- Trajectory: `rlm visualize`

Let me start Phase 1 for: $ARGUMENTS
