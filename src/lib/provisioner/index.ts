/**
 * Hosting provisioner abstraction (phase 2).
 * UI and API should call getProvisioner() — not import hosting-remote.ts directly.
 */
export {
  getProvisioner,
  getProvisionerId,
  resetProvisioner,
} from "./resolve";
export { createLegacyRemoteProvisioner } from "./legacy-remote-adapter";
export { createHybridProvisioner } from "./hybrid-adapter";
export type { Provisioner, ProvisionerActor, ProvisionerId } from "./types";

/** @deprecated Import types from @/lib/provisioner or @/lib/hosting-remote during migration */
export { PanelError } from "../errors";
export type {
  HostedDomain,
  HostedMailbox,
  HostedDatabase,
} from "../types";
export type {
  CreateDomainInput,
  DnsRecord,
  SslCert,
  MailAlias,
  UrlRedirect,
  ScheduledBackup,
  CronJob,
  ImapMailbox,
  FtpAccount,
  SharedAddress,
  BandwidthRow,
  ServerService,
  Reseller,
  AccountPlan,
  ServerTemplate,
  ExtraAdmin,
  S3Bucket,
  S3File,
  GlobalFeature,
  PhpVersion,
  PhpDirectory,
  PhpIniSetting,
  ProtectedDirectory,
  ProtectedUser,
  MailSecuritySettings,
  MailDomainSettings,
  DomainFeatureFlag,
  DomainLimits,
  AvailableScript,
  InstalledScript,
  ProxyRoute,
} from "../hosting-remote";
