# Snipara

Snipara helps Claude answer questions using documents already stored in your
authorized Snipara project. Search the relevant knowledge, retrieve exact passages
and check the source behind an answer. A Snipara account, access to a project and
at least one document in that project are required. The plugin is free; any
Snipara service subscription is purchased separately on snipara.com.

## Connect and use

Add or connect the Snipara connector offered by Claude. Sign in through Snipara's
OAuth flow, review the requested access and choose a project you can access.
Claude Code connects to the bundled remote MCP declaration; in Claude chat and
Cowork, open the plugin's Connectors tab and connect Snipara there. Reconnect to
choose another project. No API key or local credential file is required.

New to Snipara? Use Sign up in the connection page. If you have no project,
choose Set up my project and connect the repository or folder you work with.
The personal workspace is created if needed. New setup projects include
`SNIPARA_USAGE.md`; ask what it says about adding documents once it is indexed.
Add your own Markdown or text documents from the project's document import
controls on the Snipara website, or use its supported repository connection.
Check indexing before asking questions about a new source.

The connection stays on the project you authorize. When you change work, choose
the corresponding project by reconnecting. This Directory package cannot detect
your local repository or switch projects automatically.

Try these requests with documents already present in your project:

- Find the documented setup steps for this project and cite the source.
- What conditions does the release note require before launch? Quote the relevant passage.
- What evidence is missing from the stored project documents for this decision?

Compare citations with the original Snipara documents. If no source supports an
answer, the plugin should say so. A project without indexed documents may return
no results. For connection problems, reconnect in Claude, check project access
and contact support if the problem persists.

## Scope and data handling

The plugin sends the project queries and source requests needed for your task
to Snipara's hosted MCP at https://api.snipara.com/mcp. OAuth credentials are
managed by the host. The chosen project's access controls still apply. Project
documents may contain personal information; the service's privacy policy covers
their processing and retention.

This package contains Markdown instructions, JSON configuration, license text
and one PNG icon. It has no hooks, scripts, local MCP process, package manager
configuration, installers or local workflow runtimes. It does not read machine
credentials, import Claude files or chat history, save conversation content,
build user profiles or capture session memories. It retrieves knowledge already
stored in Snipara; it does not index your local repository.

This is the Claude Directory package. The separately distributed native plugin
has different local capabilities and installation requirements. Directory
validation, policy review and publication are separate from package preparation.

[Website](https://www.snipara.com) · [Documentation](https://www.snipara.com/docs/integration/claude-code) · [Support](https://www.snipara.com/contact) · [Privacy](https://www.snipara.com/privacy) · [Terms](https://www.snipara.com/terms)
