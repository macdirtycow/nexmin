import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonOk } from "@/lib/api";
import { getProvisioner } from "@/lib/provisioner";
import {
  virtualMinFetch,
  virtualMinTlsInsecureEnabled,
} from "@/lib/virtualmin-http";

/** Admin-only: verify VirtualMin API from the running Qadbak process env. */
export async function GET() {
  try {
    await requireAdmin();
    const url = process.env.VIRTUALMIN_URL ?? "";
    const user = process.env.VIRTUALMIN_USER ?? "";
    const pass = process.env.VIRTUALMIN_PASS ?? "";
    let probeStatus = 0;
    let probeBytes = 0;
    let probePreview = "";
    if (url && user && pass) {
      const body = new URLSearchParams({
        program: "list-domains",
        json: "1",
        multiline: "",
      });
      const auth = Buffer.from(`${user}:${pass}`).toString("base64");
      const res = await virtualMinFetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      probeStatus = res.status;
      const text = await res.text();
      probeBytes = text.length;
      probePreview = text.slice(0, 120).replace(/\s+/g, " ");
    }
    const domains = await getProvisioner().listDomains({
      role: "admin",
      domains: [],
    });
    return jsonOk({
      virtualminUrl: url,
      tlsInsecure: virtualMinTlsInsecureEnabled(),
      mock: process.env.VIRTUALMIN_MOCK === "true",
      probeStatus,
      probeBytes,
      probePreview,
      domainCount: domains.length,
      domains: domains.map((d) => d.name),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
