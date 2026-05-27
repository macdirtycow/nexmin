import * as vm from "../virtualmin";
import type { Provisioner } from "./types";

/** VirtualMin `remote.cgi` — current production backend. */
export function createVirtualminProvisioner(): Provisioner {
  return {
    id: "virtualmin",
    label: "Hosting API (legacy)",
    ...vm,
  };
}
