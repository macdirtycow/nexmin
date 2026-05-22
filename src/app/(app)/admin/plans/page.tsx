import { AdminListView } from "@/components/AdminListView";
import { requireAdminPage } from "@/lib/admin-api";
import { getProvisioner } from "@/lib/provisioner";

export default async function AdminPlansPage() {
  const session = await requireAdminPage();
  let plans: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listPlans"]>> = [];
  let error = "";
  try {
    plans = await getProvisioner().listPlans(session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load plans.";
  }
  return (
    <AdminListView
      title="Plan"
      apiPath="/api/admin/plans"
      itemsKey="plans"
      nameKey="name"
      items={plans}
      initialError={error}
      createLabel="Create account plan"
    />
  );
}
