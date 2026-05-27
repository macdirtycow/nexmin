/** Per-install API path salt (set in .env.local at install/update). */
export function installSalt(): string {
  return (
    process.env.QADBAK_INSTALL_SALT?.trim() ||
    process.env.NEXT_PUBLIC_QADBAK_API_SALT?.trim() ||
    ""
  );
}

export function apiPath(pathname: string): string {
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const salt = installSalt();
  if (!salt) return `/api${p}`;
  return `/api/x/${salt}${p}`;
}

/** Stable tag for license-server anti-piracy correlation (not secret). */
export function installFingerprintTag(): string | null {
  const salt = installSalt();
  if (!salt) return null;
  return `qb-${salt.slice(0, 12)}`;
}
