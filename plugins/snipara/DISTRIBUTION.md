# Distribution surfaces

The authoring source produces separate native and remote artifacts. This
onboarding candidate is local and unpublished. Package generation and static
validation do not establish native installation, policy approval or deployment.

| Surface                       | Connection                                                               | Local code                                                         |
| ----------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Native Codex / Claude Code    | Regular project-scoped stdio component with browser device authorization | Setup, source checks and private OAuth storage; no lifecycle hooks |
| OpenAI remote directory draft | Remote account OAuth with explicit project selection                     | None                                                               |
| Reduced Claude Directory      | Remote account OAuth with explicit project selection                     | None; exactly eight allowed files                                  |

## Native source profile

The global plugin supplies skills and explicit setup. It registers no direct
remote MCP server, so it cannot bypass repository routing. Setup writes a regular
project connection with cwd omitted and expected source identity. The client
must reload/approve the project before the component is active. Existing config
is preserved; merges are returned for inspection rather than blindly replacing
settings. Disable an older direct Snipara connection for this profile.

The component keeps its own OAuth credentials outside repositories and never
reads native host credential stores. First connection requires browser sign-in
and explicit source/workspace/project approval. Different sources have independent
private associations; copied configuration and source changes fail closed.
Lost associations require new approval. Fingerprints express local intent, not
remote ownership proof.

Use a new chat/session on repository change unless actual host/version reload
has been qualified. A shell `cd` alone does not switch the host project. Claude
Code documents project reload from 2.1.246; older versions require a fresh session.
Pinned Codex source supports the regular-stdio design, but current installed-app
acceptance remains unperformed. Global hosted memory connections are independent.

Companion/Orchestrator skills are included and independently disableable. Their
programs and credentials remain separate. The source profile permits local
status/help only; hosted/execution work needs an explicit project runtime profile
and authentication. No install or task runs at session start.

## Remote directory packages

Remote OAuth chooses an accessible project explicitly and reconnects to change
it. These packages cannot automatically observe a local repository. The Claude
package contains only its manifest, MCP declaration, README, LICENSE, NOTICE,
icon and two Markdown skills. It contains no hooks/scripts, runtime installers,
environment secrets or extraction of Claude conversations/files. The previously
submitted public version remains separate from this unpublished candidate.

## Prepare artifacts

```bash
node plugins/snipara/scripts/snipara.mjs export --output /absolute/new-directory
node plugins/snipara/scripts/snipara.mjs export-desktop --output /absolute/new-desktop-directory
node plugins/snipara/scripts/snipara.mjs export-claude --output /absolute/new-claude-directory
```

Outputs contain inventories, ZIP hashes and outstanding acceptance gates.
Existing output/source directories are not overwritten. A remote review fixture
may use `export --project <review-slug>`; do not publish that fixture as universal
onboarding. No account or credential is included in any package.

Before release, bind the exact source and package hashes to standalone Sandbox
receipts and independent native review. Then qualify actual browser signup,
workspace/project consent, host trust/reload, source switching and the first
indexed cited answer. Confirm the owning public repository, installed artifact,
registry/listing and hosted backend versions. Push, submission, publication and
deployment require separate authorization; no exporter performs them.
