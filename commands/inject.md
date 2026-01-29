---
description: Set session context that applies to all subsequent queries
---

# Inject Session Context

Setting session context: $ARGUMENTS

This context will be prepended to all queries in this session.

**Common uses:**
- Inject coding standards
- Set project requirements
- Add constraints/rules

Calling `rlm_inject(context="$ARGUMENTS", append=false)`
