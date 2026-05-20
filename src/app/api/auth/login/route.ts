import { auditLog } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import {
  createSession,
  sessionCookieOptions,
} from "@/lib/session";
import { findUserByUsername, verifyPassword } from "@/lib/users";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };
    if (!body.username || !body.password) {
      return jsonError("Username and password are required.");
    }

    const user = await findUserByUsername(body.username);
    if (!user || !(await verifyPassword(user, body.password))) {
      return jsonError("Invalid credentials.", 401);
    }

    const token = await createSession({
      userId: user.id,
      username: user.username,
      role: user.role,
      domains: user.domains,
    });

    const jar = await cookies();
    jar.set(sessionCookieOptions(token));

    await auditLog(user.username, "login");

    return jsonOk({
      username: user.username,
      role: user.role,
      domains: user.domains,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("SESSION_SECRET")) {
      return jsonError(err.message, 500);
    }
    return jsonError("Sign-in failed.", 500);
  }
}
