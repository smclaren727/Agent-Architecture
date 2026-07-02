// Phase 4.4 — cross-repo acceptance for the capture → triage → review loop.
//
// Black-box: spawns the Agent-Vault server and an Agent-Runner `run` loop over one
// shared overlay workspace, drops a capture note through Vault's HTTP API, and asserts
// the Runner-dispatched triage harness files a memory proposal and a completed
// trajectory that Vault then surfaces. Treats both product repos as black boxes (no
// imports), so it depends on neither — it only spawns their built entry points and the
// built Overlay CLI.
//
// Prerequisites (build the siblings first):
//   - Agent-Overlay: cargo build  (target/debug/overlay — the Rust CLI, the R1 default)
//   - Agent-Runner:  cargo build  (target/debug/agent-runner — the Rust runner, the R2 default)
//   - Agent-Vault:   no build (plain JS), Node 24+ for node:sqlite
//
// Run: node acceptance/capture-triage-loop.mjs
//
// Implementation selection: the three planes are spawned from env-selected JSON argv
// arrays (ACCEPTANCE_OVERLAY_CMD / ACCEPTANCE_RUNNER_CMD / ACCEPTANCE_VAULT_CMD).
// Since the R1/R2 cutovers the Overlay and Runner defaults are the Rust binaries;
// Vault defaults to its TS entry point until R3. Any plane can be substituted
// without touching the harness. See acceptance/README.md.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const developer = path.resolve(here, "../..");
const overlayRepo = path.join(developer, "Agent-Overlay");
const vaultRepo = path.join(developer, "Agent-Vault");
const runnerRepo = path.join(developer, "Agent-Runner");
const overlayBin = path.join(overlayRepo, "target", "debug", "overlay");
const runnerBin = path.join(runnerRepo, "target", "debug", "agent-runner");
const vaultBin = path.join(vaultRepo, "target", "release", "agent-vault-server");

// Each knob is a JSON argv array ([command, ...args]) — arrays because the TS entry
// points need a Node interpreter prefix; a native binary is just a one-element array.
// The Overlay, Runner, and Vault defaults are all the Rust binaries (R1/R2/R3
// cutovers); the frozen TS forms remain selectable explicitly (Overlay's lives at
// the `ts-core-final` tag; the TS Runner only in Agent-Runner's pre-cutover
// history; the TS Vault only in Agent-Vault's pre-R3.9 history).
if (!process.env.ACCEPTANCE_OVERLAY_CMD && !existsSync(overlayBin)) {
  throw new Error(
    `The Rust overlay binary is missing at ${overlayBin} — run \`cargo build\` in Agent-Overlay, ` +
    `or set ACCEPTANCE_OVERLAY_CMD to an explicit JSON argv array.`
  );
}
if (!process.env.ACCEPTANCE_RUNNER_CMD && !existsSync(runnerBin)) {
  throw new Error(
    `The Rust agent-runner binary is missing at ${runnerBin} — run \`cargo build\` in Agent-Runner, ` +
    `or set ACCEPTANCE_RUNNER_CMD to an explicit JSON argv array.`
  );
}
if (!process.env.ACCEPTANCE_VAULT_CMD && !existsSync(vaultBin)) {
  throw new Error(
    `The Rust agent-vault-server binary is missing at ${vaultBin} — run ` +
    `\`cargo build --release -p vault-server\` in Agent-Vault, ` +
    `or set ACCEPTANCE_VAULT_CMD to an explicit JSON argv array.`
  );
}
const overlayCmd = commandFromEnv("ACCEPTANCE_OVERLAY_CMD", [overlayBin]);
const runnerCmd = commandFromEnv("ACCEPTANCE_RUNNER_CMD", [runnerBin]);
const vaultCmd = commandFromEnv("ACCEPTANCE_VAULT_CMD", [vaultBin]);

function commandFromEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${name} must be a JSON argv array (["command", ...args]): ${error.message}`);
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every((entry) => typeof entry === "string" && entry.length > 0)) {
    throw new Error(`${name} must be a non-empty JSON array of strings`);
  }
  return parsed;
}

// OVERLAY_CLI_PATH is consumed by the dispatched triage executor
// (templates/default-workspace/adapters/triage-capture-harness.mjs), which re-launches
// `overlay serve` as `process.execPath $OVERLAY_CLI_PATH -W <ws> serve …` — i.e. it
// always wraps the value in a Node interpreter. So the variable is only coherent for
// the two-element `[node, <cli.js>]` command form; for any other shape (e.g. a
// one-element native `overlay` binary) we leave it unset and the executor falls back
// to resolving `overlay` on PATH — which is what a native cutover installs.
function overlayCliPathFor(cmd) {
  const interpreter = path.basename(cmd[0]).replace(/\.exe$/i, "");
  const isNodeForm = cmd.length === 2 && (cmd[0] === process.execPath || interpreter === "node");
  return isNodeForm ? cmd[1] : undefined;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "phase4-acceptance-"));
  const workspace = path.join(tempRoot, "workspace");
  const vaultCwd = path.join(tempRoot, "vault-cwd");
  const children = [];

  try {
    // 1. Shared workspace from the Overlay template; activate the capture-triage trigger.
    await cp(path.join(overlayRepo, "templates/default-workspace"), workspace, { recursive: true });
    const triggerPath = path.join(workspace, "triggers", "capture-triage.yaml");
    const trigger = await readFile(triggerPath, "utf8");
    await writeFile(triggerPath, trigger.replace("status: draft", "status: active"), "utf8");
    await mkdir(path.join(vaultCwd, "vault"), { recursive: true });

    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;

    // 2. Vault server over the shared workspace.
    children.push(
      spawnService("vault", vaultCmd[0], vaultCmd.slice(1), {
        cwd: vaultCwd,
        env: {
          ...process.env,
          HOST: "127.0.0.1",
          PORT: String(port),
          AGENT_VAULT_WORKSPACE: workspace,
          AGENT_VAULT_UI: path.join(vaultRepo, "ui"),
          AGENT_VAULT_DB: path.join(vaultCwd, "agent-vault.sqlite"),
          AGENT_VAULT_WATCH: "0",
          AGENT_VAULT_WORKSPACE_WATCH: "0"
        }
      })
    );
    await waitFor(() => tryJson(`${base}/api/trajectories`), 20_000, "Vault server to accept requests");
    log("vault ready");

    // 3. Runner loop watching the same workspace. The Runner's --overlay-command /
    //    --overlay-arg flags are derived from ACCEPTANCE_OVERLAY_CMD (first element =
    //    command, rest = args); OVERLAY_CLI_PATH (see overlayCliPathFor) lets the triage
    //    harness locate `overlay serve` from the /tmp workspace.
    const runnerEnv = { ...process.env };
    delete runnerEnv.OVERLAY_CLI_PATH;
    const overlayCliPath = overlayCliPathFor(overlayCmd);
    if (overlayCliPath) {
      runnerEnv.OVERLAY_CLI_PATH = overlayCliPath;
    }
    children.push(
      spawnService("runner", runnerCmd[0], [
        ...runnerCmd.slice(1), "run",
        "--workspace", workspace,
        "--overlay-command", overlayCmd[0],
        ...overlayCmd.slice(1).flatMap((arg) => ["--overlay-arg", arg])
      ], {
        cwd: runnerRepo,
        env: runnerEnv
      })
    );
    // Let the Runner read the seam and take its baseline scan before we write the note,
    // so the capture is detected as a creation rather than swallowed by the baseline.
    await delay(3_000);
    log("runner loop started");

    // 4. Drop a capture through Vault (data plane).
    const statement = "The team standardizes on pnpm via Corepack for all repositories.";
    const captureRes = await fetch(`${base}/api/capture`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: `# Capture\n\n${statement}\n` })
    });
    assert(captureRes.status === 201, `capture POST expected 201, got ${captureRes.status}`);
    log("capture posted");

    // 5. The loop should produce a pending proposal and a completed trajectory.
    const proposal = await waitFor(async () => {
      const queue = await tryJson(`${base}/api/memory/proposals?status=pending`);
      return queue?.items?.length ? queue.items[0] : undefined;
    }, 45_000, "a pending memory proposal to appear in Vault");
    log(`proposal surfaced: ${proposal.id}`);

    const trajectories = await tryJson(`${base}/api/trajectories`);
    const runs = trajectories?.trajectories ?? [];
    assert(runs.length > 0, "expected at least one trajectory run surfaced by Vault");
    const completed = runs.find((run) => run?.outcome?.completed === true || run?.metadata?.outcome?.completed === true);
    assert(completed, `expected a completed trajectory; saw: ${JSON.stringify(runs.map((r) => r.run_id))}`);
    const runId = completed.run_id ?? completed.runId ?? completed.metadata?.run_id;

    // 6. The proposal must link to the run that produced it — the integration point.
    const linked = proposal.agentRunId ?? proposal.run_id ?? proposal.proposed_fact?.source_run_id;
    assert(linked && runId && linked === runId, `proposal should link to the producing run (proposal link ${linked ?? "n/a"}, run ${runId ?? "n/a"})`);

    console.log("\nPASS — capture → triage → review loop is live across all three planes.");
    console.log(`  capture posted to Vault (${base}/api/capture)`);
    console.log(`  proposal ${proposal.id} awaiting review, linked to run ${runId}`);
    console.log(`  trajectory ${runId} completed and surfaced by Vault`);
  } finally {
    for (const child of children) {
      child.kill("SIGTERM");
    }
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function spawnService(name, command, args, options) {
  const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
  const tag = (stream) => (chunk) => {
    const text = chunk.toString("utf8").trimEnd();
    if (text) {
      process.stderr.write(`[${name}:${stream}] ${text}\n`);
    }
  };
  child.stdout.on("data", tag("out"));
  child.stderr.on("data", tag("err"));
  child.on("error", (error) => process.stderr.write(`[${name}] spawn error: ${error.message}\n`));
  return child;
}

async function waitFor(fn, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(400);
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${label}${lastError ? `: ${lastError.message}` : ""}`);
}

async function tryJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    return undefined;
  }
  return response.json();
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function log(message) {
  process.stderr.write(`[acceptance] ${message}\n`);
}

main().catch((error) => {
  console.error(`\nFAIL — ${error.message}`);
  process.exitCode = 1;
});
