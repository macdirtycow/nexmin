import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import { promisify } from "util";
import type { HostDisk, HostMetrics } from "./host-metrics-format";

export type { HostDisk, HostMetrics } from "./host-metrics-format";
export { formatKb, formatUptime } from "./host-metrics-format";

const execFileAsync = promisify(execFile);

function parseMeminfo(raw: string): HostMetrics["memory"] {
  const lines = Object.fromEntries(
    raw
      .split("\n")
      .map((l) => l.split(":"))
      .filter((p) => p.length === 2)
      .map(([k, v]) => [k.trim(), Number.parseInt(v.trim(), 10) || 0]),
  );
  const totalKb = lines.MemTotal ?? 0;
  const availableKb = lines.MemAvailable ?? lines.MemFree ?? 0;
  const usedKb = Math.max(0, totalKb - availableKb);
  const usePct = totalKb > 0 ? Math.round((usedKb / totalKb) * 100) : 0;
  return { totalKb, availableKb, usedKb, usePct };
}

function parseDf(raw: string): HostDisk[] {
  const disks: HostDisk[] = [];
  for (const line of raw.split("\n").slice(1)) {
    if (!line.trim()) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 6) continue;
    const mount = parts[5];
    if (!mount.startsWith("/") || mount.startsWith("/snap")) continue;
    const totalKb = Number.parseInt(parts[1], 10) || 0;
    const usedKb = Number.parseInt(parts[2], 10) || 0;
    const availKb = Number.parseInt(parts[3], 10) || 0;
    const usePct = Number.parseInt(String(parts[4]).replace("%", ""), 10) || 0;
    if (
      mount === "/" ||
      mount.startsWith("/home") ||
      mount === "/var" ||
      mount.startsWith("/var/")
    ) {
      disks.push({ mount, totalKb, usedKb, availKb, usePct });
    }
  }
  return disks.sort((a, b) => (a.mount === "/" ? -1 : b.mount === "/" ? 1 : 0));
}

async function readFirewallSummary(): Promise<HostMetrics["firewall"] | undefined> {
  try {
    const { stdout } = await execFileAsync("ufw", ["status"], { timeout: 5000 });
    const active = /Status:\s*active/i.test(stdout);
    return { tool: "ufw", summary: active ? "UFW active" : stdout.split("\n")[0]?.trim() || "ufw" };
  } catch {
    try {
      const { stdout } = await execFileAsync("firewall-cmd", ["--state"], { timeout: 5000 });
      return { tool: "firewalld", summary: stdout.trim() };
    } catch {
      return undefined;
    }
  }
}

/** Host CPU/RAM/disk from /proc and df (no Webmin). Server-only. */
export async function getHostMetrics(): Promise<HostMetrics> {
  const [memRaw, loadRaw, uptimeRaw, dfRaw] = await Promise.all([
    fs.readFile("/proc/meminfo", "utf8"),
    fs.readFile("/proc/loadavg", "utf8"),
    fs.readFile("/proc/uptime", "utf8"),
    execFileAsync("df", ["-kP"]).then((r) => r.stdout),
  ]);

  const loadParts = loadRaw.trim().split(/\s+/);
  const loadAvg: [number, number, number] = [
    Number.parseFloat(loadParts[0] ?? "0"),
    Number.parseFloat(loadParts[1] ?? "0"),
    Number.parseFloat(loadParts[2] ?? "0"),
  ];
  const uptimeSeconds = Math.floor(Number.parseFloat(uptimeRaw.split(/\s+/)[0] ?? "0"));

  const firewall = await readFirewallSummary();

  return {
    hostname: os.hostname(),
    uptimeSeconds,
    loadAvg,
    cpuCount: os.cpus().length,
    memory: parseMeminfo(memRaw),
    disks: parseDf(dfRaw),
    firewall,
  };
}
