import { isIndependentMode } from "./provisioner/native-stub";

export { isIndependentMode };

/** Whether server admin / legacy hosting API login links and embeds should appear. */
export function legacyPanelUiEnabled(): boolean {
  if (isIndependentMode()) return false;
  const v = process.env.QADBAK_DISABLE_LEGACY_PANEL?.trim().toLowerCase();
  return !(v === "true" || v === "1" || v === "yes");
}
