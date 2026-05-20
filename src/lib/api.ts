import { NextResponse } from "next/server";
import { VirtualMinError } from "./virtualmin";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof Error && err.message === "UNAUTHORIZED") {
    return jsonError("You are not logged in.", 401);
  }
  if (err instanceof VirtualMinError) {
    return jsonError(err.message, 502);
  }
  if (err instanceof Error) {
    if (err.message.includes("not found")) {
      return jsonError(err.message, 404);
    }
    return jsonError(err.message, 400);
  }
  return jsonError("Unknown error.", 500);
}
