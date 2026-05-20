import { AdminSystemView } from "@/components/AdminSystemView";
import { requireAdminPage } from "@/lib/admin-api";
import { listGlobalFeatures } from "@/lib/virtualmin";

export default async function AdminSystemPage() {
  const session = await requireAdminPage();
  let features: Awaited<ReturnType<typeof listGlobalFeatures>> = [];
  let error = "";
  try {
    features = await listGlobalFeatures(session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load system features.";
  }
  return (
    <AdminSystemView
      initialFeatures={features}
      initialBundles={["LAMP", "LEMP", "Minimal"]}
      initialError={error}
    />
  );
}
