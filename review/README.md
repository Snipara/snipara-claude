# Official directory review preparation

Status: prepared materials; not submitted, not approved.

Publisher: Starbox Group Gmbh. Plugin code/documentation: MIT. All platform-supported
countries requested. The plugin is free; a Snipara account is required and any
subscription is purchased separately on snipara.com. No payment tool is provided.

## Dedicated account and fixtures

Create a reviewer-only workspace/project containing `atlas-rollout-note.md`.
Seed the proposed decision and explicitly review it before the memory-recall case.
Grant only the project permissions needed by the cases. Use no customer documents.
The server currently supports GitHub/Google OAuth and email magic-link sign-in;
no public username/password provider is implemented. Reviewer login must be tested
without access to the publisher's mailbox, phone, social account or private network.
Reviewer credentials and private instructions belong in the secure portal fields,
never this repository or a ZIP. No reviewer account has been provisioned by this release.

## Rehearsal and recording

Run `cases.json` with that account against the exact submitted package.
Record version, OAuth project consent and a real stats result, then:

1. Ask what must happen before the Atlas launch; show the source citation.
2. Ask for the cited section; show the actual chunk content.
3. Recall the reviewed Atlas launch decision.
4. Ask for the approved price; show the lack of approval evidence.
5. Demonstrate that the directory package cannot run a local worker or deploy.
6. Confirm that a request to store a production credential causes no memory write.

Record actual host interactions, not a transcript replay, marketing video or mockup.
Check playback, readability and absence of secrets. Host the recording at a
reviewer-accessible URL and add it as `review.demo_recording_url` before rebuilding
the final ZIP. The demo recording has not yet been made.

## Portals

Claude: https://claude.ai/directory/manage — submit the remote MCP connector first,
then the `plugins/snipara` bundle from this repository under the same organization.
The `claude-plugins-official` marketplace is a separate partner channel.

OpenAI: https://platform.openai.com/plugins — upload the hook-free `directory-draft`
ZIP after preparation, select the verified publisher, verify the MCP domain, connect
OAuth, resolve scans and run the review cases against the saved draft. An upload is
not a review submission. The publisher completes legal/policy attestations.
Publication occurs separately after review approval.

## Evidence boundary

Normal installed Claude Code 2.1.100 and Codex 0.162.0-alpha.2 produced sourced answers
through their plugin MCP, with real source chunks. These tests used the publisher's
Snipara documentation project, not the dedicated Atlas reviewer account.
Companion 3.7.0 preserved a local workflow checkpoint between processes. Orchestrator
1.9.0 initialized and reconciled an observe-mode controller without worker dispatch.
Packaging checks cover all eight module combinations. Native refresh and revoked/
downgraded access acceptance, the eight Atlas host cases, recording, portal domain/
identity verification and scans remain pending. No official listing is claimed.
