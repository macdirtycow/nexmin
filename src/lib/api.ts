import { NextResponse } from "next/server";
import { PanelError } from "./hosting-remote";
import { sanitizeUserFacingMessage } from "./user-facing-errors";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: sanitizeUserFacingMessage(message) }, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof Error && err.message === "UNAUTHORIZED") {
    return jsonError("You are not logged in.", 401);
  }
  if (
    err instanceof Error &&
    (err as Error & { code?: string }).code === "FORBIDDEN"
  ) {
    return jsonError(err.message, 403);
  }
  if (err instanceof PanelError) {
    return jsonError(err.message, 502);
  }
  if (err instanceof Error) {
    const status = (err as Error & { status?: number }).status;
    if (status === 429) {
      return jsonError(err.message, 429);
    }
    if (err.message.includes("not found")) {
      return jsonError(err.message, 404);
    }
    return jsonError(err.message, 400);
  }
  return jsonError("Unknown error.", 500);
}
