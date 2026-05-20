import { AppShell } from "@/components/AppShell";
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
  return (
    <AppShell username={session.username} role={session.role}>
      {children}
    </AppShell>
  );
}
