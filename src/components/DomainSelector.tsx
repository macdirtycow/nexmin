"use client";

import { useRouter } from "next/navigation";

export function DomainSelector({
  domains,
  current,
  basePath,
}: {
  domains: string[];
  current: string;
  basePath: string;
}) {
  const router = useRouter();
  if (domains.length <= 1) return null;

  return (
    <select
      className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm"
      value={current}
      onChange={(e) => router.push(`${basePath}/${encodeURIComponent(e.target.value)}`)}
    >
      {domains.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  );
}
