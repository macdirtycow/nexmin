import { AdminServerView } from "@/components/AdminServerView";
import { requireAdminPage } from "@/lib/admin-api";
import { listBandwidth, listServerStatuses } from "@/lib/virtualmin";

export default async function AdminServerPage() {
  const session = await requireAdminPage();
  let bandwidth: Awaited<ReturnType<typeof listBandwidth>> = [];
  let services: Awaited<ReturnType<typeof listServerStatuses>> = [];
  let error = "";
  try {
    [bandwidth, services] = await Promise.all([
      listBandwidth(session),
      listServerStatuses(session),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Kon servergegevens niet laden.";
  }
  return (
    <AdminServerView
      initialBandwidth={bandwidth}
      initialServices={services}
      initialError={error}
    />
  );
}
