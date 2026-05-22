import type { QadbakNode } from "./servers";
import { nodeAgentToken } from "./servers";

export type NodeHealth = {
  id: string;
  name: string;
  agentUrl: string;
  ok: boolean;
  latencyMs?: number;
  detail?: Record<string, unknown>;
  error?: string;
};

export async function probeNodeHealth(node: QadbakNode): Promise<NodeHealth> {
  const agentUrl = node.agentUrl?.replace(/\/$/, "");
  if (!agentUrl) {
    return {
      id: node.id,
      name: node.name,
      agentUrl: "",
      ok: false,
      error: "No agentUrl configured",
    };
  }
  const start = Date.now();
  try {
    const res = await fetch(`${agentUrl}/health`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const body = (await res.json()) as Record<string, unknown>;
    const latencyMs = Date.now() - start;
    return {
      id: node.id,
      name: node.name,
      agentUrl,
      ok: res.ok && body.ok === true,
      latencyMs,
      detail: body,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      id: node.id,
      name: node.name,
      agentUrl,
      ok: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function agentVirtualminCall(
  node: QadbakNode,
  program: string,
  params: Record<string, string> = {},
): Promise<{ status: number; body: string }> {
  const token = nodeAgentToken();
  const agentUrl = node.agentUrl?.replace(/\/$/, "");
  if (!agentUrl || !token) {
    throw new Error("Node agent URL or QADBAK_NODE_AGENT_TOKEN not configured");
  }
  const res = await fetch(`${agentUrl}/v1/virtualmin/call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ program, params }),
    signal: AbortSignal.timeout(120_000),
    cache: "no-store",
  });
  const data = (await res.json()) as {
    ok?: boolean;
    status?: number;
    body?: string;
    error?: string;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? `Agent call failed (${res.status})`);
  }
  return { status: data.status ?? 200, body: data.body ?? "" };
}
