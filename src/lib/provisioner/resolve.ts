import { createHybridProvisioner } from "./hybrid-adapter";
import { createLegacyRemoteProvisioner } from "./legacy-remote-adapter";
import type { Provisioner, ProvisionerId } from "./types";

function normalizeProvisionerId(raw: string | undefined): ProvisionerId {
  const id = (raw ?? "legacy-remote").trim().toLowerCase();
  if (id === "legacy-remote" || id === "mock" || id === "native" || id === "hybrid") {
    return id;
  }
  console.warn(
    `[Qadbak] Unknown QADBAK_PROVISIONER="${raw}" — using legacy-remote provisioner`,
  );
  return "legacy-remote";
}

function createProvisioner(id: ProvisionerId): Provisioner {
  if (id === "hybrid") return createHybridProvisioner(false);
  if (id === "native") return createHybridProvisioner(true);
  // mock: hosting-remote.ts handles QADBAK_LEGACY_API_MOCK inside hostingRemoteCall
  return createLegacyRemoteProvisioner();
}

let cached: Provisioner | null = null;

export function getProvisionerId(): ProvisionerId {
  return normalizeProvisionerId(process.env.QADBAK_PROVISIONER);
}

/** Singleton provisioner for server code (API routes, RSC loaders). */
export function getProvisioner(): Provisioner {
  if (!cached) {
    cached = createProvisioner(getProvisionerId());
  }
  return cached;
}

/** Tests or after env change in dev. */
export function resetProvisioner(): void {
  cached = null;
}
