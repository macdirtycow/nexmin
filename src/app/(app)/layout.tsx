import { AppShell } from "@/components/AppShell";
import { displayBranding, loadPanelBranding, logoPublicPath } from "@/lib/branding";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const stored = await loadPanelBranding();
  const b = displayBranding(stored);
  return (
    <AppShell
      username={session.username}
      role={session.role}
      brandName={b.brandName}
      logoUrl={logoPublicPath(b.hasLogo)}
    >
      {children}
    </AppShell>
  );
}
