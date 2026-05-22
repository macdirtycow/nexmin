import { AdminResellersView } from "@/components/AdminResellersView";
import { requireAdminPage } from "@/lib/admin-api";
import { getProvisioner } from "@/lib/provisioner";

export default async function AdminResellersPage() {
  const session = await requireAdminPage();
  let resellers: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listResellers"]>> = [];
  let error = "";
  try {
    resellers = await getProvisioner().listResellers(session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load resellers.";
  }
  return (
    <AdminResellersView initialResellers={resellers} initialError={error} />
  );
}
