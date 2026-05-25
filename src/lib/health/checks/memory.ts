/**
 * Memory pressure check — flags low available memory + heavy swap use.
 * Available is more useful than free on modern Linux (it counts
 * reclaimable cache), which is why getHostMetrics() exposes it.
 */

import fs from "fs/promises";
import { getHostMetrics, formatKb } from "@/lib/host-metrics";
import type { HealthCheck, HealthFinding } from "../types";

const WARN_USE_PCT = 85;
const CRITICAL_USE_PCT = 95;
const LOW_AVAIL_MB = 200;
const SWAP_HEAVY_USE_PCT = 50;

export const memoryCheck: HealthCheck = {
  id: "memory",
  label: "Memory pressure",
  timeoutMs: 2_000,
  async run(): Promise<HealthFinding[]> {
    const findings: HealthFinding[] = [];
    const metrics = await getHostMetrics();
    const mem = metrics.memory;
    const availMb = Math.round(mem.availableKb / 1024);
    const now = new Date().toISOString();

    if (mem.usePct >= CRITICAL_USE_PCT || availMb < LOW_AVAIL_MB / 2) {
      findings.push({
        id: "memory.critical",
        category: "memory",
        severity: "critical",
        title: `RAM ${mem.usePct}% used — only ${availMb} MB available`,
        explanation: `The OOM killer fires when available drops below kernel reserves. You're close. Find the heaviest process and decide if you need a bigger VPS or a service restart.`,
        evidence: `Total: ${formatKb(mem.totalKb)}\nUsed: ${formatKb(mem.usedKb)}\nAvail: ${formatKb(mem.availableKb)}\nUse%: ${mem.usePct}%`,
        suggestion: `ps aux --sort=-%mem | head shows the top RAM consumers. Most common offenders on a Qadbak VPS are PHP-FPM pools (per-domain) and MariaDB.`,
        suggestedCommand: `ps aux --sort=-%mem | head`,
        detectedAt: now,
      });
    } else if (mem.usePct >= WARN_USE_PCT || availMb < LOW_AVAIL_MB) {
      findings.push({
        id: "memory.warn",
        category: "memory",
        severity: "warning",
        title: `RAM ${mem.usePct}% used — ${availMb} MB available`,
        explanation: `Memory is getting tight. Linux will start swapping more aggressively, which slows everything down. Check what's eating it and consider raising mariadb's innodb_buffer_pool_size limit or reducing PHP-FPM workers per domain.`,
        evidence: `Total: ${formatKb(mem.totalKb)}\nUsed: ${formatKb(mem.usedKb)}\nAvail: ${formatKb(mem.availableKb)}\nUse%: ${mem.usePct}%`,
        suggestion: `Use ps aux --sort=-%mem to spot consumers.`,
        suggestedCommand: `ps aux --sort=-%mem | head`,
        detectedAt: now,
      });
    }

    // Swap pressure — read /proc/meminfo directly to avoid plumbing it through host-metrics.
    try {
      const meminfo = await fs.readFile("/proc/meminfo", "utf8");
      const swapTotal = parseInt(/SwapTotal:\s+(\d+)/.exec(meminfo)?.[1] ?? "0", 10);
      const swapFree = parseInt(/SwapFree:\s+(\d+)/.exec(meminfo)?.[1] ?? "0", 10);
      if (swapTotal > 0) {
        const swapUsed = swapTotal - swapFree;
        const swapPct = Math.round((swapUsed / swapTotal) * 100);
        if (swapPct >= SWAP_HEAVY_USE_PCT) {
          findings.push({
            id: "memory.swap.heavy",
            category: "memory",
            severity: swapPct >= 80 ? "warning" : "info",
            title: `Swap is ${swapPct}% used (${formatKb(swapUsed)})`,
            explanation: `Heavy swap use means the kernel is paging RAM to disk to keep the system going. It works but it's slow — pages can take 1000× longer than RAM. If this stays high, your VPS doesn't have enough RAM for its workload.`,
            evidence: `SwapTotal: ${formatKb(swapTotal)}\nSwapUsed: ${formatKb(swapUsed)}\nSwapFree: ${formatKb(swapFree)}`,
            suggestion: `Look at the top swappers: cat /proc/*/status 2>/dev/null | grep -E '^(Name|VmSwap)' | paste - - | sort -k4 -h | tail`,
            suggestedCommand: `for pid in $(ls /proc | grep -E '^[0-9]+$'); do swap=$(awk '/^VmSwap/ {print $2}' /proc/$pid/status 2>/dev/null); [ -n "$swap" ] && [ "$swap" -gt 1024 ] && echo "$swap KB - $(cat /proc/$pid/comm 2>/dev/null)"; done | sort -n | tail`,
            detectedAt: now,
          });
        }
      }
    } catch {
      // /proc/meminfo unavailable (non-Linux) — silently skip swap check.
    }
    return findings;
  },
};
