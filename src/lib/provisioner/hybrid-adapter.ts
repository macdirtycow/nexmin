import * as vm from "../hosting-remote";
import { applyNativeOverrides } from "./apply-native-overrides";
import { createUnimplementedProvisioner, isIndependentMode } from "./native-stub";
import { createLegacyRemoteProvisioner } from "./legacy-remote-adapter";
import {
  findDomainByNameNative,
  listDomainsNative,
  resolveDomainUnixUserNative,
} from "./native-domains";
import { listEnabledNativeFeatures } from "./native-features";
import type { Provisioner } from "./types";

function legacyPanelDisabled(): boolean {
  if (isIndependentMode()) return true;
  const v = process.env.QADBAK_DISABLE_LEGACY_PANEL?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function vmFallbackEnabled(): boolean {
  const v = process.env.QADBAK_LEGACY_API_FALLBACK?.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no") return false;
  return Boolean(process.env.QADBAK_LEGACY_API_URL?.trim());
}

export function createHybridProvisioner(strictNative = false): Provisioner {
  const independent = strictNative || !vmFallbackEnabled();
  const backend =
    vmFallbackEnabled() && !strictNative ? createLegacyRemoteProvisioner() : null;

  const nativeList = listEnabledNativeFeatures();
  const label = independent
    ? `Qadbak independent (${nativeList.join(",") || "domains only"})`
    : `Qadbak hybrid (${nativeList.join(",") || "domains"}+legacy API fallback)`;

  const engine = backend ?? (independent ? createUnimplementedProvisioner() : vm);

  let hybrid: Provisioner = {
    ...engine,
    id: independent ? "native" : "hybrid",
    label,
    listDomains: listDomainsNative,
    resolveDomainUnixUser: resolveDomainUnixUserNative,
    findDomainByName: async (domainName, actor) => {
      const hit = await findDomainByNameNative(domainName, actor);
      if (hit) return hit;
      if (backend) return backend.findDomainByName(domainName, actor);
      return undefined;
    },
    createDomainLegacyLoginLink: async (...args) => {
      if (legacyPanelDisabled()) {
        throw new Error(
          "Legacy control-panel login is disabled (QADBAK_DISABLE_LEGACY_PANEL).",
        );
      }
      if (!backend) throw new Error("Hosting API fallback is not configured.");
      return backend.createDomainLegacyLoginLink(...args);
    },
  };

  hybrid = applyNativeOverrides(hybrid);
  return hybrid;
}
