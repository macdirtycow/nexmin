import { AdminSystemView } from "@/components/AdminSystemView";
import { requireAdminPage } from "@/lib/admin-api";
import { getProvisioner } from "@/lib/provisioner";

export default async function AdminSystemPage() {
  const session = await requireAdminPage();
  let features: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listGlobalFeatures"]>> = [];
  let error = "";
  try {
    features = await getProvisioner().listGlobalFeatures(session);
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
