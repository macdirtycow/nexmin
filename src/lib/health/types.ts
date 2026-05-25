/**
 * Self-healing health checks — types.
 *
 * Each check function inspects ONE aspect of the host (disk, RAM, certs,
 * services, mail queue, …) and returns zero or more HealthFinding objects.
 * Findings are written in plain English with a recommended action and
 * (optionally) a copyable shell command — never raw stack traces.
 *
 * The goal is a panel that explains what's wrong AND what to do about it,
 * not a chatbot that hallucinates.
 */

export type HealthSeverity = "info" | "warning" | "critical";

export type HealthCategory =
  | "disk"
  | "memory"
  | "ssl"
  | "services"
  | "mail"
  | "backup"
  | "security"
  | "config";

export interface HealthFinding {
  /** Stable id, e.g. "disk.root.85pct" — used for dedupe across runs. */
  id: string;
  category: HealthCategory;
  severity: HealthSeverity;
  /** Short headline, ~50 chars max. */
  title: string;
  /** 1-3 sentence plain-English explanation of why this matters. */
  explanation: string;
  /** Raw evidence — numbers, log lines, command output. Sanitized. */
  evidence?: string;
  /** What the admin should do. Plain English. */
  suggestion?: string;
  /** Optional shell command the admin can copy-paste to fix it. */
  suggestedCommand?: string;
  /** Optional link to relevant docs / panel page. */
  docsUrl?: string;
  /** When the finding was produced. */
  detectedAt: string;
}

export interface HealthCheckResult {
  checkId: string;
  /** Wall-clock duration of the check. */
  durationMs: number;
  /** True if the check ran without throwing. Findings can still be empty. */
  ok: boolean;
  /** Sanitized error message if the check failed to execute. */
  error?: string;
  findings: HealthFinding[];
}

export interface HealthReport {
  generatedAt: string;
  totalMs: number;
  checks: HealthCheckResult[];
  /** Flat list of all findings, sorted by severity then category. */
  findings: HealthFinding[];
  counts: {
    info: number;
    warning: number;
    critical: number;
    total: number;
  };
}

export interface HealthCheck {
  /** Stable id used in HealthCheckResult.checkId. */
  id: string;
  /** Human-readable label shown when a check is running/failed. */
  label: string;
  /** Reasonable per-check timeout, defaults to 5_000ms. */
  timeoutMs?: number;
  /** The check function. Throw to mark the check failed. */
  run(): Promise<HealthFinding[]>;
}
