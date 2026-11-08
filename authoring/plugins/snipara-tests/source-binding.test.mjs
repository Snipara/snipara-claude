import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  assertSourceBinding, createSourceBinding, normalizeRepositoryRemote, observeSource,
  readSourceBinding, SourceBindingError, writeSourceBinding,
} from "../snipara/lib/source-binding.mjs";
import { invocation } from "../snipara/lib/runtime.mjs";
import { applyOptions, validateConfig, VERSIONS } from "../snipara/lib/config.mjs";

const project = { workspaceId: "team_one", projectId: "project_a", projectSlug: "repo-a" };
const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../snipara");
const runtimeConfig = { schemaVersion: 1, project: project.projectSlug, connection: "project", modules: { snipara: true, companion: true, orchestrator: true } };
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "snipara-source-binding-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function git(root, ...args) {
  const result = spawnSync("git", ["-C", root, ...args], {
    encoding: "utf8", shell: false, timeout: 5000,
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
  });
  assert.equal(result.status, 0, result.stderr);
}
function repository(root, name, remote) {
  const path = join(root, name);
  mkdirSync(path, { recursive: true });
  git(path, "init", "--quiet");
  if (remote) git(path, "remote", "add", "origin", remote);
  return path;
}
const code = (expected) => (error) => error instanceof SourceBindingError && error.code === expected;

test("credential-free Git spellings identify the same repository", () => {
  for (const value of ["https://GitHub.com/Owner/Repo.git", "git@github.com:Owner/Repo.git", "ssh://git@github.com/Owner/Repo.git", "ssh://git@github.com:22/Owner/Repo.git"])
    assert.equal(normalizeRepositoryRemote(value), "github.com/owner/repo");
  assert.equal(normalizeRepositoryRemote("https://git.example.test:8443/Team/Repo.git"), "git.example.test:8443/Team/Repo");
});

test("unsafe remote errors never echo credentials or accept path ambiguity", () => {
  for (const remote of ["https://secret@example.com/owner/repo", "https://user:secret@example.com/repo", "ssh://git:secret@example.com/repo", "file:///private/repo", "../local/repo", "https://github.com/o/../repo", "https://github.com/o/%2e%2e/repo", "https://github.com/o/repo?token=secret", "https://github.com/o/repo#secret", "https://github.com/o/repo\nsecret"])
    assert.throws(() => normalizeRepositoryRemote(remote), (error) => code("unsafe_remote")(error) && !error.message.includes("secret"));
});

test("A to B to A source checks prevent cross-project operations", (t) => {
  const root = fixture(t);
  const a = repository(root, "a", "git@github.com:team/a.git");
  const b = repository(root, "b", "https://github.com/team/b.git");
  const bindingA = writeSourceBinding(a, project);
  const bindingB = writeSourceBinding(b, { ...project, projectId: "project_b", projectSlug: "repo-b" });
  const calls = [];
  const call = (source, binding, projectId) => {
    assertSourceBinding(source, binding, { workspaceId: project.workspaceId, projectId });
    calls.push(projectId);
  };
  call(a, bindingA, "project_a");
  assert.throws(() => call(b, bindingA, "project_a"), code("source_mismatch"));
  call(b, bindingB, "project_b");
  call(a, bindingA, "project_a");
  assert.deepEqual(calls, ["project_a", "project_b", "project_a"]);
});

test("same repository worktrees and nested working directories preserve identity", (t) => {
  const root = fixture(t);
  const a = repository(root, "a", "https://github.com/team/a.git");
  git(a, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--allow-empty", "--quiet", "-m", "initial");
  const worktree = join(root, "worktree");
  git(a, "worktree", "add", "--quiet", "--detach", worktree);
  const nested = join(worktree, "src"); mkdirSync(nested);
  const binding = createSourceBinding(a, project);
  assert.equal(assertSourceBinding(nested, binding, { projectId: project.projectId }), binding);
  assert.equal(observeSource(nested).root, observeSource(worktree).root);
  git(a, "config", "extensions.worktreeConfig", "true");
  git(worktree, "config", "--worktree", "remote.origin.url", "https://github.com/fork/a.git");
  assert.throws(() => assertSourceBinding(nested, binding, { projectId: project.projectId }), code("source_mismatch"));
});

test("forks, remote changes and copied bindings are rejected", (t) => {
  const root = fixture(t);
  const a = repository(root, "a", "https://github.com/team/a.git");
  const b = repository(root, "b", "https://github.com/fork/a.git");
  const binding = writeSourceBinding(a, project);
  mkdirSync(join(b, ".snipara"));
  writeFileSync(join(b, ".snipara/source-binding.json"), JSON.stringify(binding));
  assert.throws(() => readSourceBinding(b), code("source_mismatch"));
  git(a, "remote", "set-url", "origin", "https://github.com/team/changed.git");
  assert.throws(() => assertSourceBinding(a, binding, { projectId: project.projectId }), code("source_mismatch"));
});

test("nested repository does not inherit the parent repository binding", (t) => {
  const root = fixture(t);
  const a = repository(root, "a", "https://github.com/team/a.git");
  const nested = repository(a, "nested", "https://github.com/team/nested.git");
  const binding = writeSourceBinding(a, project);
  assert.throws(() => assertSourceBinding(nested, binding, { projectId: project.projectId }), code("source_mismatch"));
  assert.throws(() => readSourceBinding(nested), code("binding_missing"));
});

test("local repositories without a remote reuse worktrees but reject an unrelated repository", (t) => {
  const root = fixture(t);
  const a = repository(root, "a");
  const b = repository(root, "b");
  git(a, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--allow-empty", "--quiet", "-m", "initial");
  const worktree = join(root, "worktree");
  git(a, "worktree", "add", "--quiet", "--detach", worktree);
  const binding = createSourceBinding(a, project);
  assert.equal(binding.source.kind, "local-repository");
  assert.equal(assertSourceBinding(worktree, binding, { projectId: project.projectId }), binding);
  assert.throws(() => assertSourceBinding(b, binding, { projectId: project.projectId }), code("source_mismatch"));
});

test("ambient Git directory overrides cannot redirect source observation", (t) => {
  const root = fixture(t);
  const a = repository(root, "a", "https://github.com/team/a.git");
  const b = repository(root, "b", "https://github.com/team/b.git");
  const binding = createSourceBinding(a, project);
  const previous = process.env.GIT_DIR;
  process.env.GIT_DIR = join(a, ".git");
  try {
    assert.throws(() => assertSourceBinding(b, binding, { projectId: project.projectId }), code("source_mismatch"));
  } finally {
    if (previous === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = previous;
  }
});

test("same-named non-Git folders have distinct bindings without global fallback", (t) => {
  const root = fixture(t);
  const a = join(root, "one", "docs"), b = join(root, "two", "docs");
  mkdirSync(a, { recursive: true }); mkdirSync(b, { recursive: true });
  const binding = writeSourceBinding(a, project);
  assert.equal(binding.source.kind, "folder");
  assert.throws(() => assertSourceBinding(b, binding, { projectId: project.projectId }), code("source_mismatch"));
  assert.throws(() => readSourceBinding(b), code("binding_missing"));
});

test("OAuth project must be observed and tenant/project mismatches fail closed", (t) => {
  const root = fixture(t);
  const binding = createSourceBinding(root, project);
  assert.throws(() => assertSourceBinding(root, binding), code("authorization_unknown"));
  assert.throws(() => assertSourceBinding(root, binding, { projectId: "other" }), code("project_mismatch"));
  assert.throws(() => assertSourceBinding(root, binding, { workspaceId: "other", projectId: project.projectId }), code("project_mismatch"));
});

test("idempotent explicit setup retains binding and rejects retargeting or secrets", (t) => {
  const root = fixture(t);
  const binding = writeSourceBinding(root, project);
  assert.deepEqual(writeSourceBinding(root, project), binding);
  assert.deepEqual(readSourceBinding(root), binding);
  assert.throws(() => writeSourceBinding(root, { ...project, projectId: "other" }), code("binding_exists"));
  const payload = readFileSync(join(root, ".snipara/source-binding.json"), "utf8");
  assert.equal(payload.includes(root), false);
  assert.throws(() => createSourceBinding(root, { ...project, workspaceId: 123 }), code("invalid_binding"));
  assert.throws(() => assertSourceBinding(root, { ...binding, apiKey: "secret" }, { projectId: project.projectId }), code("invalid_binding"));
});

test("symlinked binding destinations and oversized JSON are rejected", (t) => {
  const root = fixture(t);
  const outside = fixture(t);
  symlinkSync(outside, join(root, ".snipara"), "dir");
  assert.throws(() => writeSourceBinding(root, project), code("unsafe_binding_path"));
  rmSync(join(root, ".snipara")); mkdirSync(join(root, ".snipara"));
  writeFileSync(join(root, ".snipara/source-binding.json"), " ".repeat(8193));
  assert.throws(() => readSourceBinding(root), code("invalid_binding"));
});

test("source-bound config is explicit and legacy profiles retain their shape", () => {
  assert.equal(validateConfig(runtimeConfig).sourceBound, undefined);
  assert.equal(applyOptions(runtimeConfig, { sourceBound: "on" }).sourceBound, true);
  assert.equal(applyOptions(runtimeConfig, { sourceBound: "off" }).sourceBound, false);
  assert.throws(() => applyOptions(runtimeConfig, { sourceBound: "maybe" }), /source-bound/);
  assert.throws(() => validateConfig({ ...runtimeConfig, sourceBound: "true" }), /boolean/);
  assert.throws(() => validateConfig({ ...runtimeConfig, project: null, connection: "account", sourceBound: true }, true), /Choose a project/);
});

test("native runtime blocks copied, wrong-project and unknown source before its runtime probe", (t) => {
  const root = fixture(t);
  const a = repository(root, "a", "https://github.com/team/a.git");
  const b = repository(root, "b", "https://github.com/team/b.git");
  const binding = writeSourceBinding(a, project);
  mkdirSync(join(b, ".snipara"));
  writeFileSync(join(b, ".snipara/source-binding.json"), JSON.stringify(binding));
  let probes = 0;
  const probe = () => { probes++; return { status: 0, stdout: VERSIONS.companion }; };
  const args = ["workflow", "start", "--goal", "example"];
  assert.throws(() => invocation(runtimeConfig, "companion", args, { cwd: b, probe }), code("source_mismatch"));
  assert.throws(() => invocation({ ...runtimeConfig, project: "other" }, "companion", args, { cwd: a, probe }), code("project_mismatch"));
  assert.throws(() => invocation({ ...runtimeConfig, sourceBound: true }, "companion", args, { cwd: root, probe }), code("binding_missing"));
  assert.equal(probes, 0);
  const call = invocation({ ...runtimeConfig, sourceBound: true }, "companion", args, { cwd: a, probe });
  assert.equal(probes, 1);
  assert.equal(call.options.env.SNIPARA_PROJECT_ID, project.projectId);
  assert.equal(call.options.env.SNIPARA_PROJECT_SLUG, project.projectSlug);
});

test("help/local status remain available and unbound legacy runtime behavior remains compatible", (t) => {
  const root = fixture(t);
  const probe = () => ({ status: 0, stdout: VERSIONS.companion });
  for (const args of [["--help"], ["--version"], ["workflow", "status", "--json"]])
    assert.equal(invocation({ ...runtimeConfig, sourceBound: true }, "companion", args, { cwd: root, probe }).options.cwd, root);
  assert.equal(invocation(runtimeConfig, "companion", ["workflow", "start"], { cwd: root, probe }).options.env.SNIPARA_PROJECT_ID, project.projectSlug);
});

test("interleaved native runtime launches keep A and B project environments separate", (t) => {
  const root = fixture(t);
  const a = repository(root, "a", "https://github.com/team/a.git");
  const b = repository(root, "b", "https://github.com/team/b.git");
  writeSourceBinding(a, project);
  writeSourceBinding(b, { ...project, projectId: "project_b", projectSlug: "repo-b" });
  const probe = () => ({ status: 0, stdout: VERSIONS.companion });
  const launch = (cwd, projectSlug) => invocation({ ...runtimeConfig, sourceBound: true, project: projectSlug }, "companion", ["workflow", "start"], { cwd, probe });
  const first = launch(a, "repo-a"), second = launch(b, "repo-b"), back = launch(a, "repo-a");
  assert.equal(first.options.env.SNIPARA_PROJECT_ID, "project_a");
  assert.equal(second.options.env.SNIPARA_PROJECT_ID, "project_b");
  assert.equal(back.options.env.SNIPARA_PROJECT_ID, "project_a");
  assert.notEqual(first.options.env, second.options.env);
});

test("bind-source and source-status operate only on process cwd without environment fallback", (t) => {
  const root = fixture(t);
  const script = join(pluginRoot, "scripts/snipara.mjs");
  const run = (args) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8", env: { ...process.env, SNIPARA_WORKSPACE_DIR: pluginRoot, SNIPARA_PROJECT_ID: "wrong-global" } });
  const result = run(["bind-source", "--workspace-id", project.workspaceId, "--project-id", project.projectId, "--project", project.projectSlug]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), readSourceBinding(root));
  const status = run(["source-status"]);
  assert.equal(status.status, 0, status.stderr);
  assert.equal(JSON.parse(status.stdout).projectId, project.projectId);
  for (const args of [
    ["bind-source", "--workspace-id", project.workspaceId, "--project-id", project.projectId, "--project", project.projectSlug, "--output", pluginRoot],
    ["source-status", "--dir", pluginRoot],
    ["bind-source", "--project", project.projectSlug],
  ]) assert.equal(run(args).status, 1);
});

test("native ingest rejects effective source paths from another repository before probing", (t) => {
  const root = fixture(t);
  const a = repository(root, "a", "https://github.com/team/a.git");
  const b = repository(root, "b", "https://github.com/team/b.git");
  writeSourceBinding(a, project);
  writeFileSync(join(b, "README.md"), "Other repository");
  writeFileSync(join(b, "manifest.json"), JSON.stringify([{ path: "README.md", content: "Other repository" }]));
  let probes = 0;
  const probe = () => { probes++; return { status: 0, stdout: VERSIONS.companion }; };
  for (const args of [
    ["source", "sync", b, "--apply"],
    ["source", "sync", "--prefix", "docs", b, "--apply"],
    ["onboard-folder", b, "--apply"],
    ["sync-documents", "--dir", b],
    ["sync-documents", `--dir=${b}`],
    ["sync-documents", "-d", b],
    ["sync-documents", `-d${b}`],
    ["sync-documents", "--file", join(b, "manifest.json")],
    ["sync-documents", `--file=${join(b, "manifest.json")}`],
    ["sync-documents", `-f${join(b, "manifest.json")}`],
    ["sync-documents", "-rf", join(b, "manifest.json")],
    ["upload", "--path", "README.md", "--file", join(b, "README.md")],
  ]) assert.throws(() => invocation({ ...runtimeConfig, sourceBound: true }, "companion", args, { cwd: a, probe }), code("source_argument_mismatch"));
  assert.equal(probes, 0);
});

test("same-source document imports permit output artifacts outside the source folder", (t) => {
  const root = fixture(t);
  const a = repository(root, "a", "https://github.com/team/a.git");
  const docs = join(a, "docs"); mkdirSync(docs);
  writeFileSync(join(docs, "README.md"), "This repository");
  writeSourceBinding(a, project);
  let probes = 0;
  const probe = () => { probes++; return { status: 0, stdout: VERSIONS.companion }; };
  for (const args of [
    ["source", "sync", "docs", "--apply"],
    ["onboard-folder", "docs", "--apply", "--write-manifest", join(root, "output.json")],
    ["sync-documents", "--dir=docs", "--recursive"],
    ["sync-documents", "-ddocs"],
    ["upload", "--path", "remote/README.md", "--file=docs/README.md"],
    ["workflow", "start", "--goal", "Example", "--dir", docs],
  ]) {
    const call = invocation({ ...runtimeConfig, sourceBound: true }, "companion", args, { cwd: a, probe });
    assert.equal(call.options.env.SNIPARA_WORKSPACE_DIR, observeSource(a).root);
    assert.equal(call.options.env.SNIPARA_PROJECT_ID, project.projectId);
  }
  assert.equal(probes, 6);
});

test("nested repositories and symlink escapes are rejected for direct and recursive ingest", (t) => {
  const root = fixture(t);
  const a = repository(root, "a", "https://github.com/team/a.git");
  const b = repository(root, "b", "https://github.com/team/b.git");
  const nested = repository(a, "nested", "https://github.com/team/nested.git");
  writeSourceBinding(a, project);
  symlinkSync(b, join(a, "outside"), "dir");
  const probe = () => assert.fail("runtime must not be probed");
  for (const args of [
    ["source", "sync", nested, "--apply"],
    ["source", "sync", "outside", "--apply"],
    ["source", "sync", a, "--apply"],
    ["onboard-folder", a, "--apply"],
    ["sync-documents", "--dir", a, "--recursive"],
  ]) assert.throws(() => invocation({ ...runtimeConfig, sourceBound: true }, "companion", args, { cwd: a, probe }), code("source_argument_mismatch"));
});

test("project, tenant and workspace overrides cannot bypass the source binding", (t) => {
  const root = fixture(t);
  const a = repository(root, "a", "https://github.com/team/a.git");
  const b = repository(root, "b", "https://github.com/team/b.git");
  writeSourceBinding(a, project);
  for (const name of ["companion", "orchestrator"]) {
    const probe = () => assert.fail("runtime must not be probed");
    for (const tail of [
      ["--project", "other"], ["--project=other"],
      ["--project-id", "other"], ["--project-id=other"],
      ["--workspace-id=other"], ["--team-id", "other"],
      ["--workspace", b], [`--workspace=${b}`], ["--dir", b], [`--dir=${b}`],
    ]) assert.throws(() => invocation({ ...runtimeConfig, sourceBound: true }, name, ["workflow", "start", ...tail], { cwd: a, probe }), code("source_argument_mismatch"));
  }
});

test("stale Companion local project metadata and post-launch retargeting are refused", (t) => {
  const root = fixture(t);
  writeSourceBinding(root, project);
  mkdirSync(join(root, ".snipara/companion"));
  writeFileSync(join(root, ".snipara/companion/config.json"), JSON.stringify({ projectId: "other", apiKey: "never-print-this" }));
  const probe = () => assert.fail("runtime must not be probed");
  assert.throws(() => invocation({ ...runtimeConfig, sourceBound: true }, "companion", ["workflow", "start"], { cwd: root, probe }), (error) => code("source_argument_mismatch")(error) && !error.message.includes("never-print-this"));
  rmSync(join(root, ".snipara/companion/config.json"));
  for (const args of [["login"], ["init", "--project", project.projectSlug], ["source", "watch", root, "--apply"]])
    assert.throws(() => invocation({ ...runtimeConfig, sourceBound: true }, "companion", args, { cwd: root, probe }), code("source_argument_mismatch"));
});

test("Orchestrator cwd JSON cannot override bound project or execution repository", (t) => {
  const root = fixture(t);
  const a = repository(root, "a", "https://github.com/team/a.git");
  const b = repository(root, "b", "https://github.com/team/b.git");
  writeSourceBinding(a, project);
  const valid = { snipara_api_key: "do-not-echo-this", snipara_project: project.projectSlug, repo_path: a, prod_url: "https://example.invalid" };
  const probe = () => assert.fail("runtime must not be probed");
  for (const filename of [".agentic.json", ".snipara-orchestrator.json"]) {
    for (const invalid of [
      { ...valid, snipara_project: "other" },
      { ...valid, repo_path: b },
      { ...valid, repo_path: "../b" },
      { ...valid, repo_path: undefined },
    ]) {
      writeFileSync(join(a, filename), JSON.stringify(invalid));
      assert.throws(() => invocation({ ...runtimeConfig, sourceBound: true }, "orchestrator", ["run"], { cwd: a, probe }), (error) => code("source_argument_mismatch")(error) && !error.message.includes("do-not-echo-this"));
    }
    rmSync(join(a, filename));
  }
});

test("Orchestrator honors qualified cwd config precedence and pins no-config fallback", (t) => {
  const root = fixture(t);
  const a = repository(root, "a", "https://github.com/team/a.git");
  const docs = join(a, "docs"); mkdirSync(docs);
  writeSourceBinding(a, project);
  const probe = () => ({ status: 0, stdout: VERSIONS.orchestrator });
  const launch = (cwd = a) => invocation({ ...runtimeConfig, sourceBound: true }, "orchestrator", ["run"], { cwd, probe, env: { REPO_PATH: "/wrong-inherited-root" } });
  const noConfig = launch();
  assert.equal(noConfig.options.env.REPO_PATH, observeSource(a).root);
  // JSON lookup is cwd-only; an ancestor Companion file must not choose repo_path.
  mkdirSync(join(root, ".snipara/companion"), { recursive: true });
  writeFileSync(join(root, ".snipara/companion/config.json"), JSON.stringify({ projectId: "other", apiKey: "never-print" }));
  assert.equal(launch(docs).options.env.REPO_PATH, observeSource(a).root);
  const valid = { snipara_api_key: "test-key", snipara_project: project.projectSlug, repo_path: "docs", prod_url: "https://example.invalid" };
  writeFileSync(join(a, ".agentic.json"), JSON.stringify(valid));
  writeFileSync(join(a, ".snipara-orchestrator.json"), JSON.stringify({ ...valid, snipara_project: "ignored-second-project" }));
  assert.equal(launch().options.env.SNIPARA_PROJECT_SLUG, project.projectSlug);
  rmSync(join(a, ".agentic.json"));
  assert.throws(() => launch(), code("source_argument_mismatch"));
});
