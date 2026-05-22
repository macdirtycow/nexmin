import { AdminServerView } from "@/components/AdminServerView";
import { requireAdminPage } from "@/lib/admin-api";
import { listAdminServerServices } from "@/lib/admin-server-services";
import { getProvisioner } from "@/lib/provisioner";

export default async function AdminServerPage() {
  const session = await requireAdminPage();
  let bandwidth: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listBandwidth"]>> = [];
  let services: Awaited<ReturnType<typeof listAdminServerServices>>["services"] = [];
  let error = "";
  try {
    const [bw, svc] = await Promise.all([
      getProvisioner().listBandwidth(session),
      listAdminServerServices(session),
    ]);
    bandwidth = bw;
    services = svc.services;
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load server data.";
  }
  return (
    <div className="space-y-6">
      <p className="text-sm text-panel-muted">
        Start, stop, and restart stack services. Configure native control with{" "}
        <code className="text-xs">configure-host-services-sudo.sh</code> on the VPS.
      </p>
      <AdminServerView
        initialBandwidth={bandwidth}
        initialServices={services}
        initialError={error}
      />
    </div>
  );
}
