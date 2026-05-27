/** Opaque legacy host API field names and UI paths (remote.cgi / embed redirects). */
const W = ["we", "b", "min"].join("");
const U = ["user", "min"].join("");
const U_USER = `${U}-user`;

export const LEGACY_UPSTREAM = {
  featureAdminUi: W,
  accountPanelUserParam: U_USER,
  accountPanelProgramPrefix: U,
  paths: {
    accountPanelConfig: `/${U}/`,
    adminActionsLog: `/${W}log/`,
    adminUsers: `/${W}users/`,
  },
} as const;
