import {
  emit,
  resolveDomainUser,
  readDomainConfigJson,
  writeDomainConfigJson,
} from "./provisioning-common.mjs";

const DEFAULTS = {
  catchAll: "",
  autoresponder: "",
  autoresponderEnabled: false,
};

export async function mailSettingsGet(domain) {
  await resolveDomainUser(domain);
  const settings = await readDomainConfigJson(domain, "mail-settings.json", DEFAULTS);
  emit({ ok: true, settings, source: "qadbak-domain-config" });
}

export async function mailSettingsSet(domain, settingsJson) {
  await resolveDomainUser(domain);
  let settings = settingsJson;
  if (typeof settingsJson === "string") {
    try {
      settings = JSON.parse(settingsJson);
    } catch {
      settings = DEFAULTS;
    }
  }
  await writeDomainConfigJson(domain, "mail-settings.json", {
    ...DEFAULTS,
    ...settings,
  });
  emit({ ok: true });
}
