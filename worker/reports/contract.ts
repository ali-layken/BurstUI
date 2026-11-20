// The numbers and patterns of docs/reports.md, in one place. The Worker validates against these and the /report/<app>
// pages (src/components/ReportForm.astro) import them too, so the form refuses exactly what the server would.

/** App slug -> its table. The only place a table name comes from: never from a request. */
export const APPS = {
  surfworld: { table: "reports_surfworld", title: "Surf World" },
  doopwatcher: { table: "reports_doopwatcher", title: "DoopWatcher" },
} as const;
export type AppSlug = keyof typeof APPS;
export const isApp = (s: string): s is AppSlug => Object.prototype.hasOwnProperty.call(APPS, s);

export const LIMITS = {
  /** Body as sent (gzip size if gzip). */
  sentBytes: 64 * 1024,
  /** Body after unpacking. */
  unpackedBytes: 512 * 1024,
  buildChars: 48,
  signatureChars: 120,
  platformKeys: 12,
  platformValueChars: 80,
  contextKeys: 32,
  contextStringChars: 200,
  /** Key names in platform / context / log data. Not in the contract's text; see docs/reports.md "Server details". */
  keyChars: 32,
  noteChars: 2000,
  logLines: 400,
  logMsgChars: 300,
  logSrcChars: 32,
  files: 2,
  /** Each file, decoded (before base64). */
  fileBytes: 48 * 1024,
  fileNameChars: 64,
  /** Per UTC day. */
  perInstallPerDay: 10,
  perAddressPerDay: 30,
  perAppPerDay: 2000,
  /** The same install sending the same signature again within this window gets the first report's id back. */
  sameSignatureMs: 24 * 60 * 60 * 1000,
  keepDays: 90,
} as const;

export const BUILD_PATTERN = /^[a-z]+-[0-9]+\+[0-9a-z.]+$/;
export const FILE_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;
export const KEY_PATTERN = /^[A-Za-z0-9_.-]+$/;
export const SRC_PATTERN = /^[a-z0-9_.-]+$/;
export const INSTALL_PATTERN = /^[0-9a-f]{32}$/;
export const SESSION_PATTERN = /^[0-9a-f]{16}$/;
/** ISO 8601 in UTC: Z (or +00:00) required, fraction optional. */
export const WHEN_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|\+00:00)$/;
export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export const KINDS = ["crash", "problem"] as const;
export const TOP_LEVEL_KEYS = [
  "v", "app", "build", "kind", "signature", "when", "install", "session",
  "platform", "context", "note", "log", "files",
] as const;

/** A build name that is valid for this app: the pattern, the length, and the app's own slug in front. */
export function isBuildFor(app: AppSlug, build: string): boolean {
  return build.length <= LIMITS.buildChars && BUILD_PATTERN.test(build) && build.startsWith(`${app}-`);
}
