import { readFile } from "node:fs/promises";
import path from "node:path";
import { jsonError } from "@/lib/api";

const LOGO_FILE = path.join(process.cwd(), "data", "branding", "logo.png");

export async function GET() {
  try {
    const buf = await readFile(LOGO_FILE);
    return new Response(buf, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return jsonError("Logo not found.", 404);
  }
}
