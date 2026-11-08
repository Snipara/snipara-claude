import { createHash } from "node:crypto";
import {
  existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, isAbsolute, join, resolve } from "node:path";

const FILE = "source-binding.json";
const MAX_BYTES = 8192;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
const SLUG = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const fingerprint = (value) => createHash("sha256").update(value).digest("hex");

export class SourceBindingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SourceBindingError";
    this.code = code;
  }
}

function fail(code, message) { throw new SourceBindingError(code, message); }

/** Normalize supported Git remotes without persisting embedded credentials. */
export function normalizeRepositoryRemote(remote) {
  if (typeof remote !== "string" || !remote || remote.length > 2048 || /[\\%\s\x00-\x1f\x7f]/.test(remote)
      || /\/\.{1,2}(?:\/|$)/.test(remote))
    fail("unsafe_remote", "Repository remote is unsupported or contains unsafe credentials.");
  let hostname, port = "", repositoryPath;
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(remote)) {
      const url = new URL(remote);
      if (!["https:", "http:", "ssh:"].includes(url.protocol) || url.password || url.search || url.hash
          || (url.protocol !== "ssh:" && url.username)) throw new Error();
      if (url.username && !/^[A-Za-z0-9_.-]+$/.test(url.username)) throw new Error();
      hostname = url.hostname.toLowerCase();
      // Default ports identify the same repository across transport spellings.
      port = url.port && !(url.protocol === "ssh:" && url.port === "22") ? `:${url.port}` : "";
      repositoryPath = url.pathname;
    } else {
      const match = remote.match(/^(?:([A-Za-z0-9_.-]+)@)?([A-Za-z0-9.-]+):([^:]+)$/);
      if (!match) throw new Error();
      hostname = match[2].toLowerCase();
      repositoryPath = match[3];
    }
    repositoryPath = repositoryPath.replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "");
    if (!hostname || !/^[A-Za-z0-9.-]+$/.test(hostname) || !repositoryPath
        || !/^[A-Za-z0-9_./~-]+$/.test(repositoryPath)
        || repositoryPath.split("/").some((part) => !part || part === "." || part === "..")) throw new Error();
  } catch {
    fail("unsafe_remote", "Repository remote is unsupported or contains unsafe credentials.");
  }
  if (["github.com", "gitlab.com", "bitbucket.org"].includes(hostname)) repositoryPath = repositoryPath.toLowerCase();
  return `${hostname}${port}/${repositoryPath}`;
}

function git(cwd, args) {
  // Ambient Git overrides must not make another repository look like this one.
  const names = ["PATH", "HOME", "USERPROFILE", "SystemRoot", "WINDIR", "TMPDIR", "TMP", "TEMP"];
  const env = Object.fromEntries(names.filter((key) => typeof process.env[key] === "string").map((key) => [key, process.env[key]]));
  const result = spawnSync("git", ["--no-optional-locks", "-C", cwd, ...args], {
    encoding: "utf8", timeout: 5000, maxBuffer: 16384, shell: false,
    env: { ...env, LC_ALL: "C", GIT_TERMINAL_PROMPT: "0" },
  });
  if (result.error || result.signal) fail("source_unavailable", "Cannot verify the current repository. Reconnect before using Snipara.");
  return result;
}

/** Observe the actual repository root, or an explicit non-Git folder. No network. */
export function observeSource(workspacePath) {
  if (typeof workspacePath !== "string" || !workspacePath || !isAbsolute(workspacePath))
    fail("source_unavailable", "Choose an explicit absolute workspace folder.");
  let folder;
  try {
    folder = realpathSync(workspacePath);
    if (!lstatSync(folder).isDirectory()) throw new Error();
  } catch { fail("source_unavailable", "Workspace folder is unavailable."); }
  const rootResult = git(folder, ["rev-parse", "--show-toplevel"]);
  if (rootResult.status !== 0) {
    if (rootResult.status !== 128 || !rootResult.stderr.includes("not a git repository"))
      fail("source_unavailable", "Cannot verify the current repository. Reconnect before using Snipara.");
    return { root: folder, kind: "folder", fingerprint: fingerprint(`folder:${folder}`) };
  }
  let root;
  try { root = realpathSync(rootResult.stdout.trim()); }
  catch { fail("source_unavailable", "Repository root is unavailable."); }
  const remote = git(root, ["config", "--includes", "--get", "remote.origin.url"]);
  if (remote.status === 0) {
    const repository = normalizeRepositoryRemote(remote.stdout.replace(/\r?\n$/, ""));
    return { root, kind: "repository", fingerprint: fingerprint(`repository:${repository}`), repository };
  }
  if (remote.status !== 1) fail("source_unavailable", "Cannot verify the repository remote.");
  const commonResult = git(root, ["rev-parse", "--git-common-dir"]);
  if (commonResult.status !== 0) fail("source_unavailable", "Cannot verify the local repository identity.");
  let common;
  try { common = realpathSync(resolve(root, commonResult.stdout.trim())); }
  catch { fail("source_unavailable", "Cannot verify the local repository identity."); }
  return { root, kind: "local-repository", fingerprint: fingerprint(`local-repository:${common}`) };
}

function validateBinding(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || Object.keys(value).sort().join(",") !== "projectId,projectSlug,schemaVersion,source,workspaceId"
      || value.schemaVersion !== 1 || typeof value.workspaceId !== "string" || !ID.test(value.workspaceId)
      || typeof value.projectId !== "string" || !ID.test(value.projectId)
      || typeof value.projectSlug !== "string" || !SLUG.test(value.projectSlug) || !value.source || typeof value.source !== "object"
      || Object.keys(value.source).sort().join(",") !== "fingerprint,kind"
      || !["repository", "local-repository", "folder"].includes(value.source.kind)
      || !/^[a-f0-9]{64}$/.test(value.source.fingerprint || ""))
    fail("invalid_binding", "Source binding is invalid. Reconnect this repository.");
  return value;
}

export function createSourceBinding(workspacePath, { workspaceId, projectId, projectSlug } = {}) {
  const { kind, fingerprint: identity } = observeSource(workspacePath);
  return validateBinding({ schemaVersion: 1, workspaceId, projectId, projectSlug, source: { kind, fingerprint: identity } });
}

/** Call before any project operation, using the OAuth project actually observed. */
export function assertSourceBinding(workspacePath, binding, observedProject) {
  validateBinding(binding);
  const source = observeSource(workspacePath);
  if (source.kind !== binding.source.kind || source.fingerprint !== binding.source.fingerprint)
    fail("source_mismatch", "This repository is not connected to that Snipara project. Connect this repository before continuing.");
  if (!observedProject || typeof observedProject !== "object" || typeof observedProject.projectId !== "string" || !ID.test(observedProject.projectId))
    fail("authorization_unknown", "Verify this connection's authorized project before continuing.");
  if (observedProject.projectId !== binding.projectId
      || (observedProject.workspaceId !== undefined && observedProject.workspaceId !== binding.workspaceId))
    fail("project_mismatch", "This connection authorizes a different Snipara project. Reconnect this repository.");
  return binding;
}

function bindingPath(source) {
  const directory = join(source.root, ".snipara");
  if (existsSync(directory) && (lstatSync(directory).isSymbolicLink() || !lstatSync(directory).isDirectory()))
    fail("unsafe_binding_path", "The source binding directory must be a regular directory.");
  const target = join(directory, FILE);
  if (existsSync(target) && (lstatSync(target).isSymbolicLink() || !lstatSync(target).isFile()))
    fail("unsafe_binding_path", "The source binding must be a regular file.");
  return target;
}

export function readSourceBinding(workspacePath) {
  const source = observeSource(workspacePath);
  const target = bindingPath(source);
  if (!existsSync(target)) fail("binding_missing", "Connect this repository to Snipara before continuing.");
  if (lstatSync(target).size > MAX_BYTES) fail("invalid_binding", "Source binding is invalid. Reconnect this repository.");
  let binding;
  try { binding = JSON.parse(readFileSync(target, "utf8")); }
  catch { fail("invalid_binding", "Source binding is invalid. Reconnect this repository."); }
  validateBinding(binding);
  if (source.kind !== binding.source.kind || source.fingerprint !== binding.source.fingerprint)
    fail("source_mismatch", "This repository is not connected to that Snipara project. Connect this repository before continuing.");
  return binding;
}

/** Explicit setup only; retries may reuse the same binding but never retarget it. */
export function writeSourceBinding(workspacePath, project) {
  const binding = createSourceBinding(workspacePath, project);
  const target = bindingPath(observeSource(workspacePath));
  if (existsSync(target)) {
    const previous = readSourceBinding(workspacePath);
    if (previous.workspaceId !== binding.workspaceId || previous.projectId !== binding.projectId
        || previous.projectSlug !== binding.projectSlug)
      fail("binding_exists", "This source already has a different project binding. Reconnect explicitly before replacing it.");
    return previous;
  }
  mkdirSync(dirname(target), { recursive: true });
  // Exclusive creation prevents concurrent setup from overwriting another binding.
  try { writeFileSync(target, `${JSON.stringify(binding, null, 2)}\n`, { flag: "wx", mode: 0o600 }); }
  catch (error) {
    if (error?.code === "EEXIST") fail("binding_exists", "A source binding was created concurrently. Recheck this repository.");
    throw error;
  }
  return binding;
}
