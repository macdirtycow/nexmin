export interface HostDisk {
  mount: string;
  totalKb: number;
  usedKb: number;
  availKb: number;
  usePct: number;
}

export interface HostMetrics {
  hostname: string;
  uptimeSeconds: number;
  loadAvg: [number, number, number];
  cpuCount: number;
  memory: {
    totalKb: number;
    availableKb: number;
    usedKb: number;
    usePct: number;
  };
  disks: HostDisk[];
  firewall?: { tool: string; summary: string };
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatKb(kb: number): string {
  if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(1)} GB`;
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}
