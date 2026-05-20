import { handleApiError, jsonOk } from "@/lib/api";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return jsonOk(null, 401);
    }
    return jsonOk(session);
  } catch (err) {
    return handleApiError(err);
  }
}
