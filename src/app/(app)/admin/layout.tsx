import { AdminNav } from "@/components/AdminNav";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Serverbeheer</h1>
        <p className="mt-1 text-sm text-panel-muted">
          Resellers, plannen, templates en systeemstatus
        </p>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
