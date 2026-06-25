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
//   - Agent-Overlay: pnpm build   (packages/cli/dist + packages/core/dist)
//   - Agent-Runner:  npm run build (dist/)
//   - Agent-Vault:   no build (plain JS), Node 24+ for node:sqlite
//
// Run: node acceptance/capture-triage-loop.mjs

import { spawn } from "node:child_process";
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
const overlayCli = path.join(overlayRepo, "packages/cli/dist/index.js");

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
      spawnService("vault", process.execPath, [path.join(vaultRepo, "server", "main.js")], {
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

    // 3. Runner loop watching the same workspace. OVERLAY_CLI_PATH lets the triage
    //    harness locate `overlay serve` from the /tmp workspace.
    children.push(
      spawnService("runner", process.execPath, [
        path.join(runnerRepo, "dist", "main.js"), "run",
        "--workspace", workspace,
        "--overlay-command", process.execPath,
        "--overlay-arg", overlayCli
      ], {
        cwd: runnerRepo,
        env: { ...process.env, OVERLAY_CLI_PATH: overlayCli }
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
