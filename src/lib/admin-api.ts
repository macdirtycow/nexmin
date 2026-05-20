import { redirect } from "next/navigation";
import { requireSession } from "./session";

export async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== "admin") {
    throw new Error("Alleen beheerders mogen deze actie uitvoeren.");
  }
  return session;
}

/** For server components under /admin */
export async function requireAdminPage() {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/dashboard");
  return session;
}
