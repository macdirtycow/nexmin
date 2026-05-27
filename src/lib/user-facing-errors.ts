/**
 * Remove legacy backend product names from text shown in the Qadbak panel.
 * Internal code may still reference VirtualMin/Webmin; users should not.
 */
export function sanitizeUserFacingMessage(message: string): string {
  let s = message;
  const replacements: [RegExp, string][] = [
    [/\bVirtualMin\b/gi, "hosting engine"],
    [/\bVirtualmin\b/gi, "hosting"],
    [/\bWebmin\b/gi, "server admin"],
    [/\bUsermin\b/gi, "account panel"],
    [/\bfilemin\b/gi, "legacy file browser"],
    [/\bremote\.cgi\b/gi, "hosting API"],
    [/\bVIRTUALMIN_[A-Z_]+\b/g, "hosting API settings"],
  ];
  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }
  return s.trim();
}
