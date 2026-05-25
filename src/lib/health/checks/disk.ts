/**
 * Disk usage check — uses the existing getHostMetrics() output so we
 * never have to fork `df` twice on the same page-load.
 *
 * Thresholds tuned for "you have time to react" — warnings start at 85%
 * because filesystems behave nonlinearly above that (extents fragment,
 * journals tighten), and critical at 95% because below 5% free root
 * filesystems break systemd timers.
 */

import { getHostMetrics, formatKb } from "@/lib/host-metrics";
import type { HealthCheck, HealthFinding } from "../types";

const WARN_PCT = 85;
const CRITICAL_PCT = 95;

export const diskCheck: HealthCheck = {
  id: "disk",
  label: "Disk usage",
  timeoutMs: 4_000,
  async run(): Promise<HealthFinding[]> {
    const metrics = await getHostMetrics();
    const findings: HealthFinding[] = [];
    for (const d of metrics.disks) {
      if (d.usePct >= CRITICAL_PCT) {
        findings.push({
          id: `disk.${d.mount}.critical`,
          category: "disk",
          severity: "critical",
          title: `${d.mount} is ${d.usePct}% full`,
          explanation: `Only ${formatKb(d.availKb)} free on ${d.mount}. Below 5% free, log writes start failing silently and systemd timers can stop firing. Free space immediately.`,
          evidence: `Total: ${formatKb(d.totalKb)}\nUsed: ${formatKb(d.usedKb)}\nAvail: ${formatKb(d.availKb)}\nUse%: ${d.usePct}%`,
          suggestion: `Run journalctl --vacuum-size=200M and check /var/log for old gz logs. If /home is the culprit, look for large backup tarballs in /home/*/backups/.`,
          suggestedCommand: suggestForMount(d.mount),
          detectedAt: new Date().toISOString(),
        });
      } else if (d.usePct >= WARN_PCT) {
        findings.push({
          id: `disk.${d.mount}.warn`,
          category: "disk",
          severity: "warning",
          title: `${d.mount} is ${d.usePct}% full`,
          explanation: `${formatKb(d.availKb)} free on ${d.mount}. You have a few weeks of headroom at current growth, but plan a cleanup or volume resize before it fills up.`,
          evidence: `Total: ${formatKb(d.totalKb)}\nUsed: ${formatKb(d.usedKb)}\nAvail: ${formatKb(d.availKb)}\nUse%: ${d.usePct}%`,
          suggestion: `Audit big consumers: sudo du -sh /var/log /var/cache /home/*/backups | sort -h`,
          suggestedCommand: `sudo du -sh /var/log /var/cache /home/*/backups 2>/dev/null | sort -h`,
          detectedAt: new Date().toISOString(),
        });
      }
    }
    return findings;
  },
};

function suggestForMount(mount: string): string {
  if (mount === "/var" || mount.startsWith("/var/")) {
    return `sudo journalctl --vacuum-size=200M && sudo apt-get clean`;
  }
  if (mount.startsWith("/home")) {
    return `sudo du -sh /home/*/backups 2>/dev/null | sort -h | tail`;
  }
  return `sudo du -h --max-depth=2 ${mount} 2>/dev/null | sort -h | tail`;
}
