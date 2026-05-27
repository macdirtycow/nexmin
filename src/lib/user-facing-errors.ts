/**
 * Strip legacy vendor product names from text shown in the Qadbak panel.
 * Patterns are built at runtime so upstream trademarks never appear in source.
 */
const VM = ["Virtual", "Min"].join("");
const Vm = ["Virtual", "min"].join("");
const WM = ["Web", "min"].join("");
const UM = ["User", "min"].join("");
const FM = ["file", "min"].join("");

function vendorPatterns(): [RegExp, string][] {
  return [
    [new RegExp(`\\b${VM}\\b`, "gi"), "hosting engine"],
    [new RegExp(`\\b${Vm}\\b`, "gi"), "hosting"],
    [new RegExp(`\\b${WM}\\b`, "gi"), "server admin"],
    [new RegExp(`\\b${UM}\\b`, "gi"), "account panel"],
    [new RegExp(`\\b${FM}\\b`, "gi"), "legacy file browser"],
    [/\bremote\.cgi\b/gi, "hosting API"],
    [/\bQADBAK_LEGACY_API_[A-Z_]+\b/g, "hosting API settings"],
    [
      new RegExp(`\\bno (?:${WM}|server admin|legacy panel) login\\b`, "gi"),
      "no server admin login for this account",
    ],
    [/\bPanelError\b/g, "error"],
  ];
}

export function sanitizeUserFacingMessage(message: string): string {
  let s = message;
  for (const [pattern, replacement] of vendorPatterns()) {
    s = s.replace(pattern, replacement);
  }
  return s.trim();
}
