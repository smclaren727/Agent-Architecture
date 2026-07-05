// Phase 5.3 — cross-repo acceptance for the world-knowledge loop.
//
// Black-box: Overlay serves an arbitrary markdown folder as WORLD-KNOWLEDGE through the
// single search lens (distinct from doctrine); Vault edits a file in that SAME folder as a
// loose vault; Overlay re-reads the edit; and world-knowledge never silently becomes
// doctrine. Treats both product repos as black boxes (no imports) — it only spawns the
// built Agent-Vault server and the built Overlay CLI over one shared folder.
//
// The proof has five points:
//   1. world-knowledge served    — `search --kind world-knowledge` returns the kv file.
//   2. distinct from doctrine     — the same query with NO `--kind` excludes it.
//   3. Vault edits the kv folder  — PUT /api/vaults/kv/files/... writes the loose note.
//   4. Overlay re-reads the edit  — `search --kind world-knowledge` returns the new token.
//   5. boundary holds             — the new token never appears under doctrine kinds.
//
// Prerequisites (build the siblings first):
//   - Agent-Overlay: cargo build  (target/debug/overlay — the Rust CLI, the R1 default)
//   - Agent-Vault:   cargo build --release -p vault-server  (target/release/agent-vault-server — the Rust server, the R3 default)
//
// Run: node acceptance/world-knowledge-loop.mjs
//
// Implementation selection: the two planes exercised here are spawned from env-selected
// JSON argv arrays (ACCEPTANCE_OVERLAY_CMD / ACCEPTANCE_VAULT_CMD). Since the R1/R3
// cutovers the Overlay default is the Rust `overlay` binary and Vault defaults to the
// Rust `agent-vault-server` binary. Either plane can be substituted without touching the
// harness. See acceptance/README.md.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const developer = path.resolve(here, "../..");
const overlayRepo = path.join(developer, "Agent-Overlay");
const vaultRepo = path.join(developer, "Agent-Vault");
const overlayBin = path.join(overlayRepo, "target", "debug", "overlay");
const vaultBin = path.join(vaultRepo, "target", "release", "agent-vault-server");

// Each knob is a JSON argv array ([command, ...args]) — arrays because the TS entry
// points need a Node interpreter prefix; a native binary is just a one-element array.
// The Overlay and Vault defaults are the Rust binaries (R1/R3 cutovers); the frozen
// TS forms remain selectable explicitly (Overlay's CLI lives at Agent-Overlay's
// `ts-core-final` tag; the TS Vault only in Agent-Vault's pre-R3.9 history).
// (No Runner in this loop, so ACCEPTANCE_RUNNER_CMD is not consumed here.)
if (!process.env.ACCEPTANCE_OVERLAY_CMD && !existsSync(overlayBin)) {
  throw new Error(
    `The Rust overlay binary is missing at ${overlayBin} — run \`cargo build\` in Agent-Overlay, ` +
    `or set ACCEPTANCE_OVERLAY_CMD to an explicit JSON argv array.`
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

// Coined tokens so a hit is unambiguous: nothing in the doctrine template contains them.
const INITIAL_TOKEN = "ELDERBERRYPROTOCOL";
const EDITED_TOKEN = "MARMALADEDIRECTIVE";
const VAULT_RELPATH = "notes/standards.md";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "phase5-acceptance-"));
  const workspace = path.join(tempRoot, "workspace");
  const vaultCwd = path.join(tempRoot, "vault-cwd");
  const knowledgeVault = path.join(tempRoot, "kv");
  const vaultsConfig = path.join(tempRoot, "vaults.json");
  const children = [];

  try {
    // 1. A shared knowledge-vault folder with a loose note (no required frontmatter).
    await mkdir(path.join(knowledgeVault, "notes"), { recursive: true });
    await writeFile(
      path.join(knowledgeVault, VAULT_RELPATH),
      `# Standards\n\nThe ${INITIAL_TOKEN} governs how loose world-knowledge notes are written.\n`,
      "utf8"
    );

    // 2. Overlay workspace from the template; point its knowledge_vaults at the SAME folder.
    //    The template's top-level keys sit at column 0, so a raw append is valid YAML.
    await cp(path.join(overlayRepo, "templates/default-workspace"), workspace, { recursive: true });
    await writeFile(
      path.join(workspace, "overlay.yaml"),
      `\nknowledge_vaults:\n  - "${knowledgeVault}"\n`,
      { flag: "a" }
    );

    // 3. Vault registers the SAME folder as an open (loose-markdown) vault and serves it over HTTP.
    await mkdir(path.join(vaultCwd, "vault"), { recursive: true });
    await writeFile(
      vaultsConfig,
      `${JSON.stringify({ vaults: [{ id: "kv", label: "KV", path: knowledgeVault, mode: "open" }] }, null, 2)}\n`,
      "utf8"
    );

    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    children.push(
      spawnService("vault", vaultCmd[0], vaultCmd.slice(1), {
        cwd: vaultCwd,
        env: {
          ...process.env,
          HOST: "127.0.0.1",
          PORT: String(port),
          AGENT_VAULT_WORKSPACE: workspace,
          AGENT_VAULT_VAULTS: vaultsConfig,
          AGENT_VAULT_DB: path.join(vaultCwd, "agent-vault.sqlite"),
          AGENT_VAULT_WATCH: "0",
          AGENT_VAULT_WORKSPACE_WATCH: "0"
        }
      })
    );
    await waitFor(async () => {
      const data = await tryJson(`${base}/api/vaults`);
      return data?.vaults?.some((vault) => vault.id === "kv") ? data.vaults : undefined;
    }, 20_000, "Vault to list the kv knowledge vault");
    log("vault ready; kv knowledge vault registered (loose)");

    // 4. world-knowledge SERVED — Overlay returns the kv file under the world-knowledge lens.
    const initialKnowledge = await runOverlaySearch(workspace, INITIAL_TOKEN, "world-knowledge");
    const initialHit = initialKnowledge.find((hit) => hit.kind === "world-knowledge");
    assert(
      initialHit && initialHit.uri.startsWith("knowledge://"),
      `expected a world-knowledge hit with a knowledge:// URI for ${INITIAL_TOKEN}; got ${formatHits(initialKnowledge)}`
    );
    assert(
      initialHit.uri.includes(VAULT_RELPATH),
      `world-knowledge hit should point at the kv file (${VAULT_RELPATH}); got ${initialHit.uri}`
    );
    log(`world-knowledge served: ${initialHit.uri}`);

    // 5. DISTINCT FROM DOCTRINE — the same query under the default (doctrine) lens excludes it.
    const initialDoctrine = await runOverlaySearch(workspace, INITIAL_TOKEN);
    assertNoWorldKnowledge(
      initialDoctrine,
      `${INITIAL_TOKEN} must not surface as doctrine (default search); got ${formatHits(initialDoctrine)}`
    );
    log("distinct from doctrine: default search excludes the world-knowledge note");

    // 6. Vault EDITS the knowledge vault — a loose write to the same file, new unique token.
    const edited = `# Standards\n\nThe ${EDITED_TOKEN} supersedes the prior loose world-knowledge note.\n`;
    const editRes = await fetch(`${base}/api/vaults/kv/files/${VAULT_RELPATH}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: edited })
    });
    assert(editRes.ok, `vault edit PUT expected 2xx, got ${editRes.status}`);
    log(`vault edited kv/${VAULT_RELPATH}`);

    // 7. Overlay RE-READS the edit — the new token is retrievable as world-knowledge.
    //    Overlay rebuilds its index per search, so this should be immediate; waitFor
    //    absorbs any filesystem-flush lag without masking a real failure.
    const editedHit = await waitFor(async () => {
      const hits = await runOverlaySearch(workspace, EDITED_TOKEN, "world-knowledge");
      return hits.find((hit) => hit.kind === "world-knowledge" && hit.uri.startsWith("knowledge://"));
    }, 15_000, "Overlay to re-read the edited world-knowledge note");
    assert(
      editedHit.uri.includes(VAULT_RELPATH),
      `re-read world-knowledge hit should point at the edited kv file; got ${editedHit.uri}`
    );
    log(`overlay re-read the edit: ${editedHit.uri}`);

    // 8. BOUNDARY HOLDS — the edited world-knowledge never becomes doctrine, under the
    //    default lens AND when a doctrine kind is named explicitly.
    const editedDoctrineDefault = await runOverlaySearch(workspace, EDITED_TOKEN);
    assertNoWorldKnowledge(
      editedDoctrineDefault,
      `${EDITED_TOKEN} leaked into the default (doctrine) lens; got ${formatHits(editedDoctrineDefault)}`
    );
    const editedDoctrineKind = await runOverlaySearch(workspace, EDITED_TOKEN, "memory-fact");
    assertNoWorldKnowledge(
      editedDoctrineKind,
      `${EDITED_TOKEN} leaked into an explicit doctrine kind (memory-fact); got ${formatHits(editedDoctrineKind)}`
    );
    log("boundary holds: edited world-knowledge stays out of doctrine (default + explicit kind)");

    // 9. Cross-check Vault's own re-index of the loose edit (confirms the edit is real,
    //    not just an Overlay-side read of the file).
    const vaultSearch = await tryJson(`${base}/api/search?q=${EDITED_TOKEN}&vault=kv`);
    const rows = Array.isArray(vaultSearch) ? vaultSearch : [];
    assert(
      rows.some((row) => row.vault === "kv" && (row.path ?? "").includes("standards")),
      `Vault search should surface the edited kv note for ${EDITED_TOKEN}; got ${JSON.stringify(rows)}`
    );
    log("vault re-indexed the loose edit");

    console.log("\nPASS — world-knowledge loop is live across both planes.");
    console.log(`  served    : ${initialHit.uri} (world-knowledge lens)`);
    console.log(`  distinct  : ${INITIAL_TOKEN} absent from the doctrine lens`);
    console.log(`  vault-edit: PUT ${base}/api/vaults/kv/files/${VAULT_RELPATH} -> 2xx`);
    console.log(`  re-read   : ${editedHit.uri} (${EDITED_TOKEN} via world-knowledge lens)`);
    console.log(`  boundary  : ${EDITED_TOKEN} never appears under doctrine kinds`);
  } finally {
    for (const child of children) {
      child.kill("SIGTERM");
    }
    await rm(tempRoot, { recursive: true, force: true });
  }
}

// Spawn the Overlay CLI (per ACCEPTANCE_OVERLAY_CMD) and collect parsed search hits.
// The CLI prints, per hit, `"<kind> <id> score=<n> <uri>"` followed by an indented
// excerpt line, or the single line "No results found." when empty.
function runOverlaySearch(workspace, query, kind) {
  return new Promise((resolve, reject) => {
    const args = [...overlayCmd.slice(1), "-W", workspace, "search", query];
    if (kind) {
      args.push("--kind", kind);
    }
    const child = spawn(overlayCmd[0], args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`overlay search exited ${code}: ${stderr.trim() || stdout.trim()}`));
        return;
      }
      resolve(parseSearchHits(stdout));
    });
  });
}

const HIT_LINE = /^(world-knowledge|memory-section|memory-fact|workflow|skill|prompt|standard)\s+(.+?)\s+score=(\d+)\s+(\S+)$/;

function parseSearchHits(stdout) {
  const hits = [];
  for (const line of stdout.split("\n")) {
    const match = line.match(HIT_LINE);
    if (match) {
      hits.push({ kind: match[1], id: match[2], score: Number(match[3]), uri: match[4] });
    }
  }
  return hits;
}

function assertNoWorldKnowledge(hits, message) {
  assert(!hits.some((hit) => hit.kind === "world-knowledge"), message);
}

function formatHits(hits) {
  return hits.length ? hits.map((hit) => `${hit.kind} ${hit.uri}`).join(", ") : "No results found.";
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
