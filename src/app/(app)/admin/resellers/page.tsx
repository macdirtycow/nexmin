import { AdminResellersView } from "@/components/AdminResellersView";
import { requireAdminPage } from "@/lib/admin-api";
import { listResellers } from "@/lib/virtualmin";

export default async function AdminResellersPage() {
  const session = await requireAdminPage();
  let resellers: Awaited<ReturnType<typeof listResellers>> = [];
  let error = "";
  try {
    resellers = await listResellers(session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load resellers.";
  }
  return (
    <AdminResellersView initialResellers={resellers} initialError={error} />
  );
}
