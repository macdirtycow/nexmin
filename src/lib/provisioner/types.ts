import type { Role } from "../types";
import type * as HostingRemoteModule from "../hosting-remote";

/** Session shape passed into provisioner calls (RBAC). */
export type ProvisionerActor = {
  role: Role;
  domains: string[];
};

/** Which backend implements hosting operations. */
export type ProvisionerId = "legacy-remote" | "mock" | "native" | "hybrid";

export type ProvisionerCore = {
  readonly id: ProvisionerId;
  readonly label: string;
};

/**
 * Full hosting API surface. Phase 2: legacy hosting API adapter; later native/hestia.
 * Implementation is `typeof hosting-remote` spread into the adapter instance.
 */
export type Provisioner = ProvisionerCore & typeof HostingRemoteModule;
