import * as vm from "../hosting-remote";
import type { Provisioner } from "./types";

/** legacy hosting API `remote.cgi` — current production backend. */
export function createLegacyRemoteProvisioner(): Provisioner {
  return {
    id: "legacy-remote",
    label: "Hosting API (legacy)",
    ...vm,
  };
}
