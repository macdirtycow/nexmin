import { AdminServerView } from "@/components/AdminServerView";
import { requireAdminPage } from "@/lib/admin-api";
import { getProvisioner } from "@/lib/provisioner";

export default async function AdminServerPage() {
  const session = await requireAdminPage();
  let bandwidth: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listBandwidth"]>> = [];
  let services: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listServerStatuses"]>> = [];
  let error = "";
  try {
    [bandwidth, services] = await Promise.all([
      getProvisioner().listBandwidth(session),
      getProvisioner().listServerStatuses(session),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load server data.";
  }
  return (
    <AdminServerView
      initialBandwidth={bandwidth}
      initialServices={services}
      initialError={error}
    />
  );
}
