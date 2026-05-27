/** Shape returned by mail-dns-hints / GET /api/domains/.../mail-dns */

export type MailDnsRecord = {
  type: string;
  name: string;
  value: string;
  priority?: string;
  note?: string;
};

export type ExternalMailProvider = {
  id: string;
  name: string;
  setupUrl?: string;
  steps: string[];
  mx: { priority: number; host: string; note?: string }[];
};

export type MailDnsHints = {
  domain?: string;
  mailHost?: string;
  records?: MailDnsRecord[];
  ports?: string;
  externalProviders?: ExternalMailProvider[];
  onThisServer?: {
    imap?: string;
    smtp?: string;
    note?: string;
  };
};
