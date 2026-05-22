#!/usr/bin/env node
/**
 * List/control allowlisted systemd units for Qadbak admin (phase 4).
 * Usage: host-services-helper.mjs list|status|start|stop|restart <unit>
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

/** Unit names without .service suffix */
const ALLOWED = [
  "nginx",
  "apache2",
  "httpd",
  "postfix",
  "dovecot",
  "named",
  "bind9",
  "mariadb",
  "mysql",
  "php8.3-fpm",
  "php8.2-fpm",
  "php8.1-fpm",
  "php-fpm",
];

function unitName(name) {
  const base = name.replace(/\.service$/i, "");
  if (!ALLOWED.includes(base)) {
    throw new Error(`Service not allowed: ${base}`);
  }
  return `${base}.service`;
}

async function isActive(unit) {
  try {
    const { stdout } = await exec("systemctl", ["is-active", unit], { timeout: 8000 });
    const state = stdout.trim();
    return state === "active" || state === "activating" ? "running" : state;
  } catch (e) {
    const code = e?.code;
    if (code === 3 || code === 4) return "stopped";
    return "unknown";
  }
}

async function cmdList() {
  const services = [];
  for (const base of ALLOWED) {
    const unit = `${base}.service`;
    try {
      await exec("systemctl", ["cat", unit], { timeout: 3000 });
    } catch {
      continue;
    }
    const status = await isActive(unit);
    services.push({ service: base, status, unit });
  }
  return { ok: true, services };
}

async function cmdControl(action, name) {
  const unit = unitName(name);
  await exec("systemctl", [action, unit], { timeout: 120_000 });
  const status = await isActive(unit);
  return { ok: true, service: name.replace(/\.service$/i, ""), status, action };
}

async function main() {
  const [action, arg] = process.argv.slice(2);
  let result;
  if (action === "list") {
    result = await cmdList();
  } else if (["start", "stop", "restart", "status"].includes(action) && arg) {
    if (action === "status") {
      const unit = unitName(arg);
      result = {
        ok: true,
        service: arg.replace(/\.service$/i, ""),
        status: await isActive(unit),
      };
    } else {
      result = await cmdControl(action, arg);
    }
  } else {
    console.error(JSON.stringify({ ok: false, error: "Usage: list | start|stop|restart|status <unit>" }));
    process.exit(1);
  }
  console.log(JSON.stringify(result));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message ?? String(err) }));
  process.exit(1);
});
