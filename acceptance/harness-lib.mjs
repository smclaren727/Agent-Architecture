import { spawn } from "node:child_process";
import { createServer } from "node:http";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function commandFromEnv(name, fallback) {
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

export function spawnService(name, command, args, options) {
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

export async function waitFor(fn, timeoutMs, label) {
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

export async function tryJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    return undefined;
  }
  return response.json();
}

export function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function log(message) {
  process.stderr.write(`[acceptance] ${message}\n`);
}
