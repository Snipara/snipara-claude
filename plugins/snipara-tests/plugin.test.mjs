import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  existsSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { applyOptions, MODULES, readConfig, validateConfig, VERSIONS } from "../snipara/lib/config.mjs";
import { buildPlugin } from "../snipara/lib/build.mjs";
import { installRuntime, invocation, runtimeEnvironment } from "../snipara/lib/runtime.mjs";

const source = resolve(dirname(fileURLToPath(import.meta.url)), "../snipara");
const defaults = readConfig(source);
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const fixture = (t) => {
  const root = mkdtempSync(join(tmpdir(), "snipara-plugin-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
};

test("account profiles use a distinct MCP namespace and keep their OAuth URL when configuring local runtime project and switches", (t) => {
  const output = join(fixture(t), "marketplace");
  const built = buildPlugin(source, output, defaults);
  assert.deepEqual(Object.keys(read(join(built.plugin, "mcp.json")).mcpServers), [
    "snipara-plugin",
  ]);
  assert.deepEqual(Object.keys(read(join(built.plugin, ".mcp.json")).mcpServers), [
    "snipara-plugin",
  ]);
  assert.equal(
    read(join(built.plugin, "mcp.json")).mcpServers["snipara-plugin"].url,
    "https://api.snipara.com/mcp"
  );
  const configured = applyOptions(defaults, { project: "customer-project-id", companion: "off" });
  buildPlugin(source, output, configured, true);
  assert.equal(
    read(join(built.plugin, "mcp.json")).mcpServers["snipara-plugin"].url,
    "https://api.snipara.com/mcp"
  );
  assert.equal(readConfig(built.plugin).project, "customer-project-id");
  assert.equal(existsSync(join(built.plugin, "skills/companion")), false);
  const off = applyOptions(configured, { snipara: "off" });
  buildPlugin(source, output, off, true);
  assert.deepEqual(read(join(built.plugin, "mcp.json")).mcpServers, {});
  assert.throws(() => applyOptions(defaults, { connection: "unknown" }), /Connection/);
});

for (let mask = 0; mask < 8; mask++) {
  test(`native profile ${mask}: registration, skills and runtime switches agree`, (t) => {
    const config = {
      ...defaults,
      project: "example-project",
      connection: "project",
      modules: Object.fromEntries(MODULES.map((name, i) => [name, Boolean(mask & (1 << i))])),
    };
    const output = join(fixture(t), "marketplace");
    const result = buildPlugin(source, output, config);
    const root = result.plugin;
    const portable = read(join(root, "mcp.json"));
    const legacy = read(join(root, ".mcp.json"));
    const enabled = MODULES.filter((name) => config.modules[name]);
    assert.deepEqual(readdirSync(join(root, "skills")).sort(), ["settings", ...enabled].sort());
    assert.deepEqual(
      Object.keys(portable.mcpServers),
      config.modules.snipara ? ["snipara-plugin"] : []
    );
    assert.deepEqual(Object.keys(legacy.mcpServers), Object.keys(portable.mcpServers));
    if (config.modules.snipara) {
      assert.equal(
        portable.mcpServers["snipara-plugin"].url,
        "https://api.snipara.com/mcp/example-project"
      );
      assert.equal(
        legacy.mcpServers["snipara-plugin"].url,
        portable.mcpServers["snipara-plugin"].url
      );
      assert.equal(portable.mcpServers["snipara-plugin"].type, "streamable-http");
      assert.equal(legacy.mcpServers["snipara-plugin"].type, "http");
      assert.equal(portable.mcpServers["snipara-plugin"].headers, undefined);
    }
    for (const path of ["plugin.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json"]) {
      assert.equal(read(join(root, path)).name, "snipara");
    }
    assert.equal(read(join(output, ".agents/plugins/marketplace.json")).plugins.length, 1);
    assert.equal(read(join(output, ".claude-plugin/marketplace.json")).plugins.length, 1);
    const session = spawnSync(
      process.execPath,
      [join(root, "scripts/snipara.mjs"), "session-start"],
      { encoding: "utf8" }
    );
    assert.equal(session.status, 0, session.stderr);
    assert.equal(session.stdout.trim().length > 0, mask !== 0);
    const hooks = read(join(root, "hooks/hooks.json")).hooks;
    if (mask !== 0) {
      const command = hooks.SessionStart[0].hooks[0].command;
      assert.equal(command, 'sh "${CLAUDE_PLUGIN_ROOT}/scripts/session-start.sh"');
      const hook = spawnSync("sh", ["-c", command], {
        encoding: "utf8",
        env: { PATH: process.env.PATH, CLAUDE_PLUGIN_ROOT: root },
      });
      assert.equal(hook.status, 0, hook.stderr);
      assert.match(hook.stdout, /configured project and module switches/);
      assert.ok(hook.stdout.includes(JSON.stringify(config, null, 2)));
    } else assert.deepEqual(hooks, {});
    for (const name of ["companion", "orchestrator"]) {
      let probed = false;
      const probe = () => {
        probed = true;
        return { status: 0, stdout: VERSIONS[name] };
      };
      if (config.modules[name]) {
        assert.equal(invocation(config, name, ["--version"], { probe }).options.shell, false);
        assert.equal(probed, true);
      } else {
        assert.throws(() => invocation(config, name, ["--version"], { probe }), /is off/);
        assert.equal(probed, false);
        assert.throws(() => installRuntime(config, name, { execute: probe }), /is off/);
        assert.equal(probed, false);
      }
    }
  });
}

test("configure preserves other modules and can run from its own generated bundle", (t) => {
  const output = join(fixture(t), "marketplace");
  const initial = applyOptions(defaults, { project: "my-project" });
  const built = buildPlugin(source, output, initial);
  const originalVersion = read(join(built.plugin, "plugin.json")).version;
  // A bundled settings skill must be able to configure its marketplace, without writing a cache.
  const result = spawnSync(
    process.execPath,
    [
      join(built.plugin, "scripts/snipara.mjs"),
      "configure",
      "--output",
      output,
      "--orchestrator",
      "off",
    ],
    { encoding: "utf8" }
  );
  assert.equal(result.status, 0, result.stderr);
  const next = readConfig(built.plugin);
  assert.deepEqual(next.modules, { snipara: true, companion: true, orchestrator: false });
  assert.equal(next.project, "my-project");
  assert.equal(existsSync(join(built.plugin, "skills/orchestrator")), false);
  assert.notEqual(read(join(built.plugin, "plugin.json")).version, originalVersion);
  const enabled = applyOptions(next, { orchestrator: "on" });
  buildPlugin(source, output, enabled, true);
  assert.equal(existsSync(join(built.plugin, "skills/orchestrator/SKILL.md")), true);
  assert.equal(read(join(built.plugin, "plugin.json")).version, originalVersion);
});

test("configure preserves files added by a user to a generated marketplace", (t) => {
  const output = join(fixture(t), "marketplace");
  const config = applyOptions(defaults, { project: "my-project" });
  buildPlugin(source, output, config);
  writeFileSync(join(output, "notes.txt"), "user notes");
  assert.throws(() => buildPlugin(source, output, config, true), /unowned files/);
  assert.equal(readFileSync(join(output, "notes.txt"), "utf8"), "user notes");
});

test("bad settings fail before output mutation", (t) => {
  const output = join(fixture(t), "output");
  for (const project of ["../escape", "https://other.example/mcp", "$(touch file)", "a/b", ""]) {
    assert.throws(() => buildPlugin(source, output, { ...defaults, project }));
    assert.equal(existsSync(output), false);
  }
  assert.throws(() => validateConfig({ ...defaults, apiKey: "fake-test-credential" }));
  assert.throws(() =>
    validateConfig({ ...defaults, modules: { ...defaults.modules, companion: "false" } })
  );
  assert.throws(() =>
    validateConfig({ ...defaults, modules: { ...defaults.modules, unknown: true } })
  );
  assert.throws(() => applyOptions(defaults, { companion: "maybe" }));
});

test("unrelated directories, source overlap and symlink targets are preserved", (t) => {
  const parent = fixture(t);
  const unrelated = join(parent, "unrelated");
  mkdirSync(unrelated);
  writeFileSync(join(unrelated, "keep.txt"), "keep");
  const config = applyOptions(defaults, { project: "my-project" });
  assert.throws(() => buildPlugin(source, unrelated, config), /owned/);
  assert.throws(() => buildPlugin(source, unrelated, config, true), /owned/);
  assert.equal(readFileSync(join(unrelated, "keep.txt"), "utf8"), "keep");
  const linked = join(parent, "linked");
  symlinkSync(unrelated, linked);
  assert.throws(() => buildPlugin(source, linked, config), /symlink/);
  assert.throws(() => buildPlugin(source, join(source, "output"), config), /overlap/);
});

test("runtime keeps arguments literal and rejects stale or missing dependencies", () => {
  const config = applyOptions(defaults, { project: "my-project" });
  const args = ["workflow", "start", "--goal", "$(touch sentinel); literal goal"];
  const call = invocation(config, "companion", args, {
    probe: () => ({ status: 0, stdout: VERSIONS.companion }),
  });
  assert.deepEqual(call.args.slice(-args.length), args);
  assert.equal(call.options.shell, false);
  assert.equal(call.options.env.SNIPARA_COMPANION_SKIP_NPM_VERSION_CHECK, "1");
  assert.equal(call.options.env.SNIPARA_PROJECT, "my-project");
  assert.equal(call.options.env.SNIPARA_API_URL, "https://api.snipara.com");
  assert.throws(
    () => invocation(config, "companion", args, { probe: () => ({ status: 0, stdout: "3.6.24" }) }),
    /Install the pinned/
  );
  assert.throws(
    () =>
      invocation(config, "orchestrator", args, {
        probe: () => ({ error: new Error("not installed") }),
      }),
    /Install the pinned/
  );
});

test("Snipara off rejects hosted work before even probing dependencies", () => {
  const config = applyOptions(defaults, { snipara: "off" });
  let calls = 0;
  const probe = () => {
    calls++;
    return { status: 0, stdout: VERSIONS.companion };
  };
  for (const args of [
    ["query", "private context"],
    ["workflow", "start"],
    ["workflow", "status", "--unexpected"],
    ["htask", "next"],
  ]) {
    assert.throws(() => invocation(config, "companion", args, { probe }), /Snipara is off/);
  }
  assert.throws(
    () => invocation(config, "orchestrator", ["controller", "run", "--execute"], { probe }),
    /Snipara is off/
  );
  assert.equal(calls, 0);
  const local = invocation(config, "companion", ["workflow", "status", "--json"], { probe });
  assert.equal(local.options.shell, false);
});

test("CLI rejects unknown and repeated flags without creating output", (t) => {
  const output = join(fixture(t), "output");
  for (const flags of [
    ["--snipara", "maybe"],
    ["--api-key", "fake-test-value"],
    ["--companion", "on", "--companion", "off"],
  ]) {
    const result = spawnSync(
      process.execPath,
      [
        join(source, "scripts/snipara.mjs"),
        "build",
        "--project",
        "my-project",
        "--output",
        output,
        ...flags,
      ],
      { encoding: "utf8" }
    );
    assert.equal(result.status, 1);
    assert.equal(existsSync(output), false);
  }
});

test("runtime and installers exclude unrelated secrets and loader flags", () => {
  const env = {
    PATH: "/usr/bin", HOME: "/test-home", TMPDIR: "/tmp",
    SNIPARA_API_KEY: "test-snipara", RLM_API_KEY: "test-legacy",
    OPENAI_API_KEY: "test-provider", NPM_TOKEN: "test-npm",
    AWS_SECRET_ACCESS_KEY: "test-cloud", NODE_OPTIONS: "--inspect",
    PYTHONPATH: "/injected", LD_PRELOAD: "/injected.so",
    SNIPARA_PROJECT: "inherited-wrong-project",
  };
  assert.deepEqual(runtimeEnvironment(env), {
    PATH: "/usr/bin", HOME: "/test-home", TMPDIR: "/tmp",
  });
  const config = { ...defaults, project: "explicit-project" };
  let probeEnv;
  const call = invocation(config, "companion", ["--help"], {
    env,
    probe: (_command, _args, options) => {
      probeEnv = options.env;
      return { status: 0, stdout: VERSIONS.companion };
    },
  });
  assert.deepEqual(probeEnv, call.options.env);
  assert.equal(call.options.env.SNIPARA_PROJECT, "explicit-project");
  assert.equal(call.options.env.SNIPARA_API_KEY, undefined);
  for (const key of ["OPENAI_API_KEY", "NPM_TOKEN", "NODE_OPTIONS", "PYTHONPATH", "LD_PRELOAD"])
    assert.equal(call.options.env[key], undefined);
  const optedIn = runtimeEnvironment(env, true);
  assert.equal(optedIn.SNIPARA_API_KEY, "test-snipara");
  assert.equal(optedIn.RLM_API_KEY, "test-legacy");
  assert.equal(optedIn.OPENAI_API_KEY, undefined);
});

test("CLI requires per-invocation opt-in before sharing Snipara keys", (t) => {
  const directory = fixture(t);
  const stub = join(directory, "snipara-companion");
  writeFileSync(stub, `#!/usr/bin/env node
if (process.argv[2] === '--version') console.log(${JSON.stringify(VERSIONS.companion)});
else console.log(JSON.stringify({ snipara: process.env.SNIPARA_API_KEY,
  legacy: process.env.RLM_API_KEY, unrelated: process.env.OPENAI_API_KEY,
  loader: process.env.NODE_OPTIONS, args: process.argv.slice(2) }));
`);
  chmodSync(stub, 0o755);
  for (const consent of [false, true]) {
    const args = [join(source, "scripts/snipara.mjs"), "companion",
      ...(consent ? ["--with-snipara-credentials"] : []), "--help"];
    const result = spawnSync(process.execPath, args, {
      encoding: "utf8", cwd: directory,
      env: { PATH: directory + ":" + dirname(process.execPath),
        SNIPARA_API_KEY: "test-snipara", RLM_API_KEY: "test-legacy",
        OPENAI_API_KEY: "test-provider", NODE_OPTIONS: "--no-warnings" },
    });
    assert.equal(result.status, 0, result.stderr);
    const observed = JSON.parse(result.stdout);
    assert.equal(observed.snipara, consent ? "test-snipara" : undefined);
    assert.equal(observed.legacy, consent ? "test-legacy" : undefined);
    assert.equal(observed.unrelated, undefined);
    assert.equal(observed.loader, undefined);
    assert.deepEqual(observed.args, ["--help"]);
  }
});

test("pinned package installation does not inherit account or registry secrets", (t) => {
  let calls = 0;
  installRuntime(defaults, "companion", {
    cwd: fixture(t), env: { PATH: "/usr/bin", NPM_TOKEN: "test-registry",
      SNIPARA_API_KEY: "test-snipara", PLUGIN_DATA: join(fixture(t), "runtime") },
    execute: (_command, args, options) => {
      calls++;
      assert.ok(args.includes("snipara-companion@" + VERSIONS.companion));
      assert.equal(options.env.NPM_TOKEN, undefined);
      assert.equal(options.env.SNIPARA_API_KEY, undefined);
      return { status: 0 };
    },
  });
  assert.equal(calls, 1);
});
