---
name: execute-code
description: Execute code safely using RLM Runtime with Docker isolation when you need to run tests, validate implementations, or execute complex computations. Use when the user asks to run code, test implementations, or when you need to verify code behavior.
---

When you need to execute code safely:

1. Check if RLM Runtime is installed:
   - Run: `which rlm` or `rlm --version`
   - If not found, suggest: `pip install rlm-runtime[all]`

2. For safe execution, use Docker environment:
   - `rlm run --env docker "Your task here"`
   - Docker provides isolation from host system

3. For quick local execution (trusted code only):
   - `rlm run "Your task here"`

4. Common patterns:
   - **Run tests**: `rlm run --env docker "Run pytest for the authentication module"`
   - **Validate code**: `rlm run --env docker "Check if the API endpoint returns valid JSON"`
   - **Complex computation**: `rlm run --env docker "Parse logs and extract top 5 error messages"`

5. View execution logs:
   - `rlm logs` - See recent executions
   - `rlm visualize` - Launch interactive trajectory viewer

**When to use:**
- User asks to "run tests", "execute code", "validate implementation"
- You need to verify code behavior before suggesting changes
- Complex data processing or computation needed
- Running potentially unsafe user code (always use Docker)

**When NOT to use:**
- Simple code review or explanation
- Reading or editing files (use Read/Edit tools instead)
- git operations (use Bash tool instead)
