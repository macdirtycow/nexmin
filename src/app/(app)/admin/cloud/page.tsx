import { AdminCloudView } from "@/components/AdminCloudView";
import { requireAdminPage } from "@/lib/admin-api";

export default async function AdminCloudPage() {
  await requireAdminPage();
  return <AdminCloudView initialError="" />;
}
