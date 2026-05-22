import { createVirtualminProvisioner } from "./virtualmin-adapter";
import type { Provisioner, ProvisionerId } from "./types";

function normalizeProvisionerId(raw: string | undefined): ProvisionerId {
  const id = (raw ?? "virtualmin").trim().toLowerCase();
  if (id === "virtualmin" || id === "mock" || id === "native") return id;
  console.warn(
    `[Qadbak] Unknown QADBAK_PROVISIONER="${raw}" — using virtualmin`,
  );
  return "virtualmin";
}

function createProvisioner(id: ProvisionerId): Provisioner {
  if (id === "native") {
    throw new Error(
      "QADBAK_PROVISIONER=native is not implemented yet (see docs/QADBAK-INDEPENDENCE-8-PHASES.md phase 8).",
    );
  }
  // mock: virtualmin.ts handles VIRTUALMIN_MOCK inside virtualMinCall
  return createVirtualminProvisioner();
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
