/**
 * Service status check — verifies the Qadbak hosting stack daemons are
 * actually running.
 *
 * Each service we depend on is listed with a friendly name + the
 * symptom-in-prose if it's down. We use `systemctl is-active` because it
 * exits 0 only for "active" status and works without sudo.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import type { HealthCheck, HealthFinding } from "../types";

const execFileAsync = promisify(execFile);

interface ServiceSpec {
  unit: string;
  friendly: string;
  symptom: string;
  /** Skip the check entirely if this returns true (e.g. service is optional). */
  skipIf?: () => boolean;
}

const SERVICES: ServiceSpec[] = [
  { unit: "nginx", friendly: "nginx (web server)",
    symptom: "Customer websites will return 502/connection refused." },
  { unit: "mariadb", friendly: "MariaDB (database)",
    symptom: "Databases are unreachable; PHP sites that depend on a DB will throw errors." },
  { unit: "postfix", friendly: "Postfix (outbound mail)",
    symptom: "Outgoing mail queues up and never gets delivered." },
  { unit: "dovecot", friendly: "Dovecot (IMAP/POP3)",
    symptom: "Mail clients cannot fetch or send mail through SMTP-AUTH." },
  { unit: "named", friendly: "BIND9 (DNS server)",
    symptom: "DNS records for hosted domains stop resolving from outside." },
  { unit: "fail2ban", friendly: "fail2ban (brute-force protection)",
    symptom: "SSH and panel-login brute-force attempts are no longer blocked." },
];

async function probe(unit: string): Promise<{ active: boolean; state: string; raw: string }> {
  try {
    const { stdout } = await execFileAsync("systemctl", ["is-active", unit], { timeout: 3_000 });
    const state = stdout.trim();
    return { active: state === "active", state, raw: state };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    const state = (err.stdout || err.stderr || err.message || "unknown").toString().trim();
    return { active: false, state: state.split("\n").pop() ?? "unknown", raw: state };
  }
}

export const servicesCheck: HealthCheck = {
  id: "services",
  label: "Hosting-stack daemons",
  timeoutMs: 8_000,
  async run(): Promise<HealthFinding[]> {
    const findings: HealthFinding[] = [];
    const now = new Date().toISOString();
    const probes = await Promise.all(
      SERVICES.filter((s) => !s.skipIf?.()).map(async (s) => ({
        spec: s,
        result: await probe(s.unit),
      })),
    );
    for (const { spec, result } of probes) {
      if (result.active) continue;
      // "inactive" for an optional service (named, fail2ban) is a warning, not critical.
      const optional = spec.unit === "named" || spec.unit === "fail2ban";
      findings.push({
        id: `service.${spec.unit}.${result.state}`,
        category: "services",
        severity: optional && result.state === "inactive" ? "warning" : "critical",
        title: `${spec.friendly} is ${result.state}`,
        explanation: `${spec.symptom} ${
          optional
            ? `If you intentionally don't use ${spec.unit}, you can dismiss this.`
            : `This is a core hosting service — restart it as soon as you can.`
        }`,
        evidence: `systemctl is-active ${spec.unit} → ${result.state}`,
        suggestion: `Inspect the last failure: journalctl -u ${spec.unit} -n 50 --no-pager`,
        suggestedCommand: `sudo systemctl status ${spec.unit} && sudo systemctl restart ${spec.unit}`,
        detectedAt: now,
      });
    }
    return findings;
  },
};
