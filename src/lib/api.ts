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
    return jsonError("Je bent niet ingelogd.", 401);
  }
  if (err instanceof VirtualMinError) {
    return jsonError(err.message, 502);
  }
  if (err instanceof Error) {
    if (err.message.includes("niet gevonden")) {
      return jsonError(err.message, 404);
    }
    return jsonError(err.message, 400);
  }
  return jsonError("Onbekende fout.", 500);
}
