import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { listS3Buckets, listS3Files, uploadS3File } from "@/lib/virtualmin";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as {
      action?: string;
      accessKey?: string;
      secretKey?: string;
      bucket?: string;
      key?: string;
      source?: string;
    };
    const accessKey = body.accessKey?.trim();
    const secretKey = body.secretKey?.trim();
    if (!accessKey || !secretKey) {
      return jsonError("Access key and secret key are required.");
    }

    if (body.action === "buckets") {
      const buckets = await listS3Buckets(accessKey, secretKey, session);
      return jsonOk({ buckets });
    }

    if (body.action === "files") {
      if (!body.bucket?.trim()) return jsonError("Bucket is required.");
      const files = await listS3Files(
        body.bucket.trim(),
        accessKey,
        secretKey,
        session,
      );
      return jsonOk({ files });
    }

    if (body.action === "upload") {
      if (!body.bucket?.trim() || !body.key?.trim()) {
        return jsonError("Bucket and file name are required.");
      }
      const result = await uploadS3File(
        {
          bucket: body.bucket.trim(),
          key: body.key.trim(),
          accessKey,
          secretKey,
          source: body.source?.trim(),
        },
        session,
      );
      await auditLog(session.username, "upload-s3-file", undefined, body.bucket);
      return jsonOk({ ok: true, result });
    }

    return jsonError("Unknown action.");
  } catch (err) {
    return handleApiError(err);
  }
}
