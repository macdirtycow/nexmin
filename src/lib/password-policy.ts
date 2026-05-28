const MIN_LENGTH = Number(process.env.QADBAK_PASSWORD_MIN_LENGTH ?? "12") || 12;

export function validatePanelPassword(password: string): string | null {
  const p = password ?? "";
  if (p.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters.`;
  }
  if (p.length > 256) {
    return "Password is too long.";
  }
  const lower = p.toLowerCase();
  if (lower === "changeme" || lower === "password" || lower === "admin123") {
    return "Choose a stronger password.";
  }
  return null;
}
