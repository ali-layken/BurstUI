// The numbers and patterns of docs/reports.md, in one place. The Worker validates against these and the /report/<app>
// pages (src/components/ReportForm.astro) import them too, so the form refuses exactly what the server would.

/** App slug -> its table. The only place a table name comes from: never from a request. */
export const APPS = {
  surfworld: { table: "reports_surfworld", title: "Surf World" },
  doopwatcher: { table: "reports_doopwatcher", title: "DoopWatcher" },
} as const;
export type AppSlug = keyof typeof APPS;
export const isApp = (s: string): s is AppSlug => Object.prototype.hasOwnProperty.call(APPS, s);

/**
 * What a report may weigh, by its kind. A `crash` is what the apps send by themselves and keeps the version-1 numbers;
 * a `problem` is a person's report (the /report/<app> pages) and may carry screenshots. The body is read and unpacked
 * against READ_CAPS (the larger of the two), then held to its own kind's numbers before anything else is checked.
 */
export const KIND_LIMITS = {
  crash: {
    /** Body as sent (gzip size if gzip). */
    sentBytes: 64 * 1024,
    /** Body after unpacking. */
    unpackedBytes: 512 * 1024,
    files: 2,
    /** Each file, decoded (before base64). */
    fileBytes: 48 * 1024,
  },
  problem: {
    sentBytes: 512 * 1024,
    unpackedBytes: 1024 * 1024,
    files: 3,
    fileBytes: 200 * 1024,
  },
} as const;
export const READ_CAPS = { sentBytes: 512 * 1024, unpackedBytes: 1024 * 1024 } as const;

/**
 * What a file is, decided from its bytes only (worker/reports/files.ts), never from its name or anything the client
 * says. The extension is what the reader gives the file when it writes it out.
 */
export const FILE_TYPES = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
  gif: "gif",
  /** Surf World's replay: starts with "SWR1" (wallride-godot scripts/replay/replay_format.gd). */
  swr: "swr",
  /** Valid UTF-8 without NUL. */
  text: "txt",
} as const;
/** Every file must be one of these; anything else is refused (docs/reports.md, "Files"). */
export type FileType = keyof typeof FILE_TYPES;

const MB = 1024 * 1024;
/**
 * The daily limits, per app and per UTC day, kept as counter rows (store.ts, report_limits) so that a check is a
 * handful of primary-key reads and the insert itself re-checks them in the same transaction. Counts are reports
 * stored; bytes are counted bytes (store.ts countedBytes: what a row really takes).
 */
export const DAILY = {
  /** Each kind has its own count and bytes, so neither can spend the other's. */
  kind: {
    crash: { reports: 1200, bytes: 10 * MB },
    problem: { reports: 500, bytes: 40 * MB },
  },
  /** One IPv4 address, or one IPv6 /64. */
  address: { reports: 30, bytes: 2 * MB },
  /** One IPv6 /48 (a home's /56, a tunnel provider's /48...). */
  net48: { reports: 100 },
  /** One network operator (request.cf.asn): one ISP, VPN or cloud provider. */
  network: { reports: 300, bytes: 10 * MB },
  /** One install id (the client's own choice, so only a courtesy limit). */
  install: { reports: 10 },
} as const;

/**
 * Bytes stored per app in all. When a new report would not fit, the files of the oldest reports are deleted to make
 * room, then (if that is not enough) the oldest reports themselves: a full budget shortens how long old reports are
 * kept, it never refuses new ones for longer than a day (docs/reports.md, "Budget").
 */
export const TOTAL_BYTES = 200 * MB;
/** How many of the oldest reports one eviction looks at (bounds its rows read). */
export const EVICT_SCAN = 25;

export const LIMITS = {
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
  fileNameChars: 64,
  /** Builds are numbered 1, 2, 3...: a number this large is junk (and would sort first). */
  buildNumberBelow: 1_000_000,
  /** The note column keeps this much; the payload keeps all of it. */
  noteColumnChars: 200,
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
