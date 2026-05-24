export type ArchiveFormat = "zip" | "tar.gz";

export function isArchiveFileName(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.endsWith(".zip") ||
    n.endsWith(".tar") ||
    n.endsWith(".tar.gz") ||
    n.endsWith(".tgz")
  );
}

export function detectArchiveFormat(
  name: string,
): ArchiveFormat | "tar" | null {
  const n = name.toLowerCase();
  if (n.endsWith(".zip")) return "zip";
  if (n.endsWith(".tar.gz") || n.endsWith(".tgz")) return "tar.gz";
  if (n.endsWith(".tar")) return "tar";
  return null;
}

export function archiveFormatLabel(
  format: ArchiveFormat | "tar" | null | undefined,
): string {
  switch (format) {
    case "zip":
      return "ZIP";
    case "tar.gz":
      return "TAR.GZ";
    case "tar":
      return "TAR";
    default:
      return "Archive";
  }
}

export function defaultExtractFolderName(archiveFileName: string): string {
  const lower = archiveFileName.toLowerCase();
  if (lower.endsWith(".tar.gz")) return archiveFileName.slice(0, -7);
  if (lower.endsWith(".tgz")) return archiveFileName.slice(0, -4);
  if (lower.endsWith(".zip")) return archiveFileName.slice(0, -4);
  if (lower.endsWith(".tar")) return archiveFileName.slice(0, -4);
  return archiveFileName.replace(/\.[^.]+$/, "") || "extracted";
}

export function defaultArchiveOutputName(
  cwd: string,
  format: ArchiveFormat,
): string {
  const base =
    cwd.split("/").filter(Boolean).pop() ?? "files";
  const stamp = new Date().toISOString().slice(0, 10);
  const ext = format === "zip" ? "zip" : "tar.gz";
  return `${base}-${stamp}.${ext}`;
}
