import { randomBytes } from "node:crypto";
import { closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, parse, resolve, sep } from "node:path";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
export function validateNativeGrant(value, source) {
  if (!value || value.client_id !== "snipara-native-plugin" || value.token_type !== "Bearer"
      || !["repository", "local-repository", "folder"].includes(source?.kind) || !/^[a-f0-9]{64}$/.test(source?.fingerprint || "")
      || value.source?.kind !== source.kind || value.source?.fingerprint !== source.fingerprint
      || !ID.test(value.project_id || "") || !ID.test(value.workspace_id || "")
      || !/^[a-z0-9][a-z0-9_-]{0,127}$/.test(value.project_slug || "")
      || ![value.access_token, value.refresh_token].every(v => typeof v === "string" && v.length >= 8 && v.length <= 16384 && !/[\r\n\x00]/.test(v))
      || !Number.isSafeInteger(value.expires_at) || value.expires_at <= 0 || value.expires_at > 8640000000000000) throw new Error("Invalid Snipara authorization. Connect again.");
  return value;
}

function regular(path, directory = false) {
  const s = lstatSync(path);
  if (s.isSymbolicLink() || (directory ? !s.isDirectory() : !s.isFile())
      || (process.platform !== "win32" && ((s.mode & 0o077) !== 0 || (typeof process.getuid === "function" && s.uid !== process.getuid()))))
    throw new Error("Snipara credential storage must be private and owned by the current user.");
}

/** Dedicated store: never reads Claude/Codex credential stores or repository env files. */
export function createNativeCredentialStore({ directory } = {}) {
  const protectedRoot = directory === undefined ? join(homedir(), ".snipara") : dirname(resolve(directory));
  directory ??= join(protectedRoot, "native-plugin", "connections");
  const root = resolve(directory);
  function prepare() {
    // Reject symlinks in every parent, including a dangling final symlink.
    let current = parse(root).root;
    for (const part of root.slice(current.length).split(/[\\/]/).filter(Boolean)) {
      current = join(current, part);
      try { if (lstatSync(current).isSymbolicLink()) throw new Error("Unsafe Snipara credential path."); }
      catch (e) { if (e.code !== "ENOENT") throw e; mkdirSync(current, { mode: 0o700 }); }
      if (current === protectedRoot || current.startsWith(`${protectedRoot}${sep}`)) {
        const stat = lstatSync(current);
        if (!stat.isDirectory() || (process.platform !== "win32" && ((stat.mode & 0o022) !== 0 || (typeof process.getuid === "function" && stat.uid !== process.getuid())))) throw new Error("Snipara credential parent directories must be owned and not writable by other users.");
      }
    }
    regular(root, true);
  }
  function pathFor(source) {
    if (!["repository", "local-repository", "folder"].includes(source?.kind) || !/^[a-f0-9]{64}$/.test(source?.fingerprint || "")) throw new Error("Invalid source identity.");
    return join(root, `${source.kind}-${source.fingerprint}.json`);
  }
  function read(source) {
    prepare(); const file = pathFor(source);
    try { regular(file); } catch (e) { if (e.code === "ENOENT") return null; throw e; }
    if (lstatSync(file).size > 65536) throw new Error("Invalid Snipara credential file.");
    const value = JSON.parse(readFileSync(file, "utf8"));
    if (!Number.isSafeInteger(value.revision) || value.revision < 1) throw new Error("Invalid Snipara credential revision.");
    validateNativeGrant(value, source); return value;
  }
  function saveUnlocked(source, grant, expectedRevision = null) {
    prepare(); validateNativeGrant(grant, source); const file = pathFor(source);
    let temp;
    try {
      const previous = read(source);
      if ((previous?.revision ?? null) !== expectedRevision) throw new Error("Snipara connection changed concurrently. Retry connection status.");
      const value = { ...grant, revision: (previous?.revision || 0) + 1 };
      temp = join(dirname(file), `.connection-${randomBytes(16).toString("hex")}.tmp`);
      writeFileSync(temp, `${JSON.stringify(value)}\n`, { flag: "wx", mode: 0o600 });
      renameSync(temp, file); return value;
    } finally { if (temp && existsSync(temp)) unlinkSync(temp); }
  }
  function save(source, grant, expectedRevision = null) {
    prepare(); const lock = `${pathFor(source)}.lock`; let fd;
    try { fd = openSync(lock, "wx", 0o600); }
    catch { throw new Error("Snipara connection changed concurrently. Retry connection status."); }
    try { return saveUnlocked(source, grant, expectedRevision); }
    finally { closeSync(fd); unlinkSync(lock); }
  }
  async function withLock(source, callback) {
    prepare(); const lock = `${pathFor(source)}.lock`, deadline = Date.now() + 3000; let fd;
    while (fd === undefined) {
      try { fd = openSync(lock, "wx", 0o600); }
      catch (error) {
        if (error.code !== "EEXIST" || Date.now() >= deadline) throw new Error("Snipara connection is busy or an earlier sign-in stopped. Retry or repair its private connection lock.");
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    try { return await callback({ read: () => read(source), save: (grant, revision) => saveUnlocked(source, grant, revision) }); }
    finally { closeSync(fd); unlinkSync(lock); }
  }
  return { read, save, withLock };
}
