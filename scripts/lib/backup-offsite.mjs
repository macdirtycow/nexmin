import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import {
  emit,
  fail,
  QADBAK_DIR,
  readDomainConfigJson,
  resolveDomainUser,
} from "./provisioning-common.mjs";
import { mkdir } from "node:fs/promises";
import { cloudCredentialsResolve } from "./cloud-credentials.mjs";

const exec = promisify(execFile);

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function listRemoteBackups(domain) {
  const policy = await readDomainConfigJson(domain, "backup-policy.json", {
    offsite: false,
    providerId: "default",
  });
  if (!policy.offsite) {
    emit({ ok: true, remote: [], reason: "offsite disabled" });
    return;
  }
  let cred;
  try {
    cred = await cloudCredentialsResolve(policy.providerId || "default");
  } catch {
    emit({ ok: true, remote: [], reason: "no credentials" });
    return;
  }
  const prefix = `${cred.prefix}/${domain}/`.replace(/\/+/g, "/");
  const env = {
    ...process.env,
    AWS_ACCESS_KEY_ID: cred.accessKey,
    AWS_SECRET_ACCESS_KEY: cred.secretKey,
  };
  if (cred.endpoint) env.AWS_ENDPOINT_URL = cred.endpoint;
  const uri = `s3://${cred.bucket}/${prefix}`;
  const { stdout } = await exec(
    "aws",
    ["s3", "ls", uri, "--recursive", "--human-readable"],
    { env, timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
  );
  const remote = stdout
    .split("\n")
    .filter((l) => l.includes(".tar.gz"))
    .map((l) => {
      const parts = l.trim().split(/\s+/);
      const key = parts[parts.length - 1] ?? "";
      return {
        key: key.replace(prefix, ""),
        size: parts[2] ?? "",
        modified: `${parts[0] ?? ""} ${parts[1] ?? ""}`.trim(),
        uri: `s3://${cred.bucket}/${key}`,
      };
    });
  emit({ ok: true, remote, bucket: cred.bucket, prefix });
}

export async function maybeUploadBackupOffsite(domain, archivePath, archiveName) {
  const policy = await readDomainConfigJson(domain, "backup-policy.json", {
    offsite: false,
    providerId: "default",
  });
  if (!policy.offsite) return { uploaded: false, reason: "offsite disabled" };
  if (!(await isPremiumOffsiteEnabled())) {
    return { uploaded: false, reason: "offsite-backup premium inactive" };
  }
  let cred;
  try {
    cred = await cloudCredentialsResolve(policy.providerId || "default");
  } catch {
    return { uploaded: false, reason: "no cloud credentials" };
  }
  const key = `${cred.prefix}/${domain}/${archiveName}`.replace(/\/+/g, "/");
  const env = {
    ...process.env,
    AWS_ACCESS_KEY_ID: cred.accessKey,
    AWS_SECRET_ACCESS_KEY: cred.secretKey,
  };
  if (cred.endpoint) {
    env.AWS_ENDPOINT_URL = cred.endpoint;
  }
  const dest = `s3://${cred.bucket}/${key}`;
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await exec(
        "aws",
        ["s3", "cp", archivePath, dest, "--only-show-errors"],
        { env, timeout: 900_000, maxBuffer: 8 * 1024 * 1024 },
      );
      return { uploaded: true, uri: dest, key, attempts: attempt };
    } catch (e) {
      lastErr = e;
      if (attempt < 3) await sleep(2000 * attempt);
    }
  }
  throw lastErr;
}

export async function pullRemoteBackupToLocal(domain, remoteKey) {
  const policy = await readDomainConfigJson(domain, "backup-policy.json", {
    offsite: false,
    providerId: "default",
  });
  const cred = await cloudCredentialsResolve(policy.providerId || "default");
  const { user, home } = await resolveDomainUser(domain);
  const localDir = path.join(home, "backups");
  await mkdir(localDir, { recursive: true });
  const key = String(remoteKey || "").trim();
  if (key.includes("..") || key.includes("/") || !/^[\w.-]+\.tar\.gz$/.test(key)) {
    fail("Invalid remote backup key");
  }
  const s3Key = `${cred.prefix}/${domain}/${key}`.replace(/\/+/g, "/");
  const env = {
    ...process.env,
    AWS_ACCESS_KEY_ID: cred.accessKey,
    AWS_SECRET_ACCESS_KEY: cred.secretKey,
  };
  if (cred.endpoint) env.AWS_ENDPOINT_URL = cred.endpoint;
  const dest = path.join(localDir, path.basename(key));
  await exec(
    "aws",
    ["s3", "cp", `s3://${cred.bucket}/${s3Key}`, dest, "--only-show-errors"],
    { env, timeout: 900_000, maxBuffer: 8 * 1024 * 1024 },
  );
  await exec("chown", [`${user}:${user}`, dest]);
  emit({ ok: true, file: path.basename(key), path: dest, s3Key });
}
