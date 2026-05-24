import { redirect } from "next/navigation";
import { requireSession } from "./session";

export async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== "admin") {
    const err = new Error("Only administrators may perform this action.");
    (err as Error & { code?: string }).code = "FORBIDDEN";
    throw err;
  }
  return session;
}

/** For server components under /admin */
export async function requireAdminPage() {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/dashboard");
  return session;
}
