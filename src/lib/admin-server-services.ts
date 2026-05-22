import { getProvisioner } from "./provisioner";
import type { Role } from "./types";
import type { ServerService } from "./virtualmin";
import {
  controlNativeServerService,
  listNativeServerServices,
  probeHostServicesSudo,
} from "./host-services-sudo";

export async function listAdminServerServices(actor: {
  role: Role;
  domains: string[];
}): Promise<{ services: ServerService[]; source: "native" | "virtualmin" }> {
  if (await probeHostServicesSudo()) {
    try {
      const services = await listNativeServerServices();
      if (services.length > 0) {
        return { services, source: "native" };
      }
    } catch {
      /* fall through */
    }
  }
  const services = await getProvisioner().listServerStatuses(actor);
  return { services, source: "virtualmin" };
}

export async function controlAdminServerService(
  service: string,
  action: "start" | "stop" | "restart",
  actor: { role: Role; domains: string[] },
): Promise<{ source: "native" | "virtualmin" }> {
  if (await probeHostServicesSudo()) {
    try {
      await controlNativeServerService(service, action);
      return { source: "native" };
    } catch {
      if (action !== "restart") throw new Error(
        "Native service control unavailable. Run: sudo bash /opt/qadbak/scripts/configure-host-services-sudo.sh",
      );
    }
  }
  if (action !== "restart") {
    throw new Error("Start/stop requires host-services sudo on the server.");
  }
  await getProvisioner().restartServer(service, actor);
  return { source: "virtualmin" };
}
