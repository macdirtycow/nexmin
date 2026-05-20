import { AdminListView } from "@/components/AdminListView";
import { requireAdminPage } from "@/lib/admin-api";
import { listAdmins } from "@/lib/virtualmin";

export default async function AdminAdminsPage() {
  const session = await requireAdminPage();
  let admins: Awaited<ReturnType<typeof listAdmins>> = [];
  let error = "";
  try {
    admins = await listAdmins(session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load administrators.";
  }
  return (
    <AdminListView
      title="Administrator"
      apiPath="/api/admin/admins"
      itemsKey="admins"
      nameKey="user"
      items={admins}
      initialError={error}
      createLabel="Create additional administrator"
      isAdminUser
    />
  );
}
