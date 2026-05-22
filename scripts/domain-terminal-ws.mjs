#!/usr/bin/env node
/**
 * WebSocket terminal for Qadbak — domain-scoped bash via sudo (no Webmin).
 * Listens on 127.0.0.1:QADBAK_TERMINAL_WS_PORT (default 3001).
 * nginx should proxy /ws/domain-terminal → this server.
 */
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { WebSocketServer } from "ws";
import pty from "node-pty";
import { jwtVerify } from "jose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const file = path.join(ROOT, ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvLocal();

const PORT = Number(process.env.QADBAK_TERMINAL_WS_PORT || "3001");
const HOST = process.env.QADBAK_TERMINAL_WS_HOST || "127.0.0.1";
const RUNNER =
  process.env.QADBAK_TERMINAL_RUNNER ||
  path.join(ROOT, "scripts/run-domain-terminal.sh");
const MOCK = process.env.VIRTUALMIN_MOCK === "true";

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET missing or too short.");
  }
  return new TextEncoder().encode(secret);
}

async function verifyTerminalToken(token) {
  const { payload } = await jwtVerify(token, secretKey(), {
    algorithms: ["HS256"],
  });
  if (payload.purpose !== "terminal-ws") {
    throw new Error("Invalid token purpose.");
  }
  const domain = String(payload.domain || "");
  const unixUser = String(payload.unixUser || "");
  if (!domain || !unixUser) throw new Error("Invalid token payload.");
  return { domain, unixUser };
}

function spawnShell(unixUser) {
  if (MOCK) {
    return pty.spawn("/bin/bash", ["-l"], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: process.env.HOME || "/tmp",
      env: {
        ...process.env,
        TERM: "xterm-256color",
        PS1: `\\u@mock-${unixUser}:\\w\\$ `,
      },
    });
  }
  return pty.spawn("sudo", ["-n", RUNNER, unixUser], {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd: `/home/${unixUser}`,
    env: {
      ...process.env,
      TERM: "xterm-256color",
    },
  });
}

const server = http.createServer((_req, res) => {
  res.writeHead(426, { "Content-Type": "text/plain" });
  res.end("WebSocket upgrade required.");
});

const wss = new WebSocketServer({ server, path: "/ws/domain-terminal" });

wss.on("connection", async (ws, req) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const token = url.searchParams.get("token");
  if (!token) {
    ws.close(4401, "Missing token");
    return;
  }

  let unixUser;
  try {
    ({ unixUser } = await verifyTerminalToken(token));
  } catch (err) {
    ws.close(4403, err instanceof Error ? err.message : "Invalid token");
    return;
  }

  let term;
  try {
    term = spawnShell(unixUser);
  } catch (err) {
    ws.close(4500, err instanceof Error ? err.message : "Spawn failed");
    return;
  }

  term.onData((data) => {
    if (ws.readyState === ws.OPEN) ws.send(data);
  });

  term.onExit(() => {
    if (ws.readyState === ws.OPEN) ws.close(1000, "Shell exited");
  });

  ws.on("message", (raw) => {
    const text = typeof raw === "string" ? raw : raw.toString("utf8");
    try {
      if (text.startsWith("{")) {
        const msg = JSON.parse(text);
        if (msg.t === "resize" && msg.cols && msg.rows) {
          term.resize(
            Math.min(500, Math.max(2, Number(msg.cols))),
            Math.min(200, Math.max(2, Number(msg.rows))),
          );
          return;
        }
      }
    } catch {
      /* plain input */
    }
    term.write(text);
  });

  ws.on("close", () => {
    try {
      term.kill();
    } catch {
      /* ignore */
    }
  });
});

server.listen(PORT, HOST, () => {
  process.stdout.write(
    `Qadbak terminal WS listening on ${HOST}:${PORT}/ws/domain-terminal (mock=${MOCK})\n`,
  );
});
