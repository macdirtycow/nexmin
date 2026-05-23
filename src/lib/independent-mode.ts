import { isIndependentMode } from "./provisioner/native-stub";

export { isIndependentMode };

/** Whether Webmin / VirtualMin login links and embeds should appear. */
export function webminUiEnabled(): boolean {
  if (isIndependentMode()) return false;
  const v = process.env.QADBAK_DISABLE_WEBMIN?.trim().toLowerCase();
  return !(v === "true" || v === "1" || v === "yes");
}
