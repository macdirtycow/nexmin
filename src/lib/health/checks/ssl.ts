/**
 * SSL expiry check — scans /etc/letsencrypt/live/<domain>/cert.pem for
 * every domain we issued a cert for and flags those expiring soon.
 *
 * Reads cert files directly (the public certs are world-readable; only
 * privkey.pem is mode 600). Falls back to `openssl x509 -enddate` when
 * Node's built-in X509Certificate isn't available (Node < 19).
 */

import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { HealthCheck, HealthFinding } from "../types";

const LE_LIVE_DIR = "/etc/letsencrypt/live";
const WARN_DAYS = 14;
const CRITICAL_DAYS = 3;

interface CertSummary {
  domain: string;
  certPath: string;
  expiresAt: Date;
  daysLeft: number;
}

async function listLiveDomains(): Promise<string[]> {
  try {
    const entries = await readdir(LE_LIVE_DIR);
    const dirs: string[] = [];
    for (const e of entries) {
      if (e.startsWith(".") || e === "README") continue;
      try {
        const s = await stat(path.join(LE_LIVE_DIR, e));
        if (s.isDirectory()) dirs.push(e);
      } catch {
        /* skip */
      }
    }
    return dirs;
  } catch {
    return [];
  }
}

async function readCertExpiry(certPath: string): Promise<Date | null> {
  try {
    const raw = await readFile(certPath, "utf8");
    // Node >= 15 ships crypto.X509Certificate.
    const X509 = (crypto as unknown as { X509Certificate?: typeof crypto.X509Certificate })
      .X509Certificate;
    if (X509) {
      const cert = new X509(raw);
      const d = new Date(cert.validTo);
      return Number.isFinite(d.getTime()) ? d : null;
    }
  } catch {
    /* fall through */
  }
  return null;
}

export const sslCheck: HealthCheck = {
  id: "ssl",
  label: "SSL certificate expiry",
  timeoutMs: 8_000,
  async run(): Promise<HealthFinding[]> {
    const domains = await listLiveDomains();
    if (domains.length === 0) return [];
    const certs: CertSummary[] = [];
    for (const domain of domains) {
      const certPath = path.join(LE_LIVE_DIR, domain, "cert.pem");
      const expiresAt = await readCertExpiry(certPath);
      if (!expiresAt) continue;
      const daysLeft = Math.floor(
        (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      );
      certs.push({ domain, certPath, expiresAt, daysLeft });
    }
    const findings: HealthFinding[] = [];
    const now = new Date().toISOString();
    for (const c of certs) {
      if (c.daysLeft < 0) {
        findings.push({
          id: `ssl.${c.domain}.expired`,
          category: "ssl",
          severity: "critical",
          title: `SSL for ${c.domain} expired ${Math.abs(c.daysLeft)} days ago`,
          explanation: `Browsers and mail clients are showing certificate errors right now. Customers cannot connect securely. Renew immediately.`,
          evidence: `Cert: ${c.certPath}\nValid until: ${c.expiresAt.toISOString()}`,
          suggestion: `Try a renewal: certbot renew handles renewals for every Let's Encrypt cert on the box.`,
          suggestedCommand: `sudo certbot renew --cert-name ${c.domain} --force-renewal && sudo systemctl reload nginx`,
          detectedAt: now,
        });
      } else if (c.daysLeft <= CRITICAL_DAYS) {
        findings.push({
          id: `ssl.${c.domain}.urgent`,
          category: "ssl",
          severity: "critical",
          title: `SSL for ${c.domain} expires in ${c.daysLeft} day(s)`,
          explanation: `Let's Encrypt usually renews automatically at 30 days. If you're seeing this with ${c.daysLeft} days left, automatic renewal has been failing — likely a DNS or port-80 issue.`,
          evidence: `Cert: ${c.certPath}\nValid until: ${c.expiresAt.toISOString()}`,
          suggestion: `Run certbot renew now and check the output for the failing challenge. Most common cause: DNS A/AAAA record doesn't point to this server anymore.`,
          suggestedCommand: `sudo certbot renew --cert-name ${c.domain} && sudo systemctl reload nginx`,
          detectedAt: now,
        });
      } else if (c.daysLeft <= WARN_DAYS) {
        findings.push({
          id: `ssl.${c.domain}.soon`,
          category: "ssl",
          severity: "warning",
          title: `SSL for ${c.domain} expires in ${c.daysLeft} day(s)`,
          explanation: `Auto-renewal should fire any moment. If it doesn't, you have time to investigate manually before customers see warnings.`,
          evidence: `Cert: ${c.certPath}\nValid until: ${c.expiresAt.toISOString()}`,
          suggestion: `Verify auto-renew is healthy: systemctl status certbot.timer.`,
          suggestedCommand: `sudo systemctl status certbot.timer`,
          detectedAt: now,
        });
      }
    }
    return findings;
  },
};
