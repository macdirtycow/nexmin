import { AdminListView } from "@/components/AdminListView";
import { requireAdminPage } from "@/lib/admin-api";
import { listPlans } from "@/lib/virtualmin";

export default async function AdminPlansPage() {
  const session = await requireAdminPage();
  let plans: Awaited<ReturnType<typeof listPlans>> = [];
  let error = "";
  try {
    plans = await listPlans(session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Kon plannen niet laden.";
  }
  return (
    <AdminListView
      title="Plan"
      apiPath="/api/admin/plans"
      itemsKey="plans"
      nameKey="name"
      items={plans}
      initialError={error}
      createLabel="Accountplan aanmaken"
    />
  );
}
