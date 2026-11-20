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
    /** Files whose bytes are none of FILE_TYPES are kept as "bin" (the apps' own files: replays, logs). */
    unknownFiles: true,
  },
  problem: {
    sentBytes: 512 * 1024,
    unpackedBytes: 1024 * 1024,
    files: 3,
    fileBytes: 200 * 1024,
    /** Every file must be one of FILE_TYPES. */
    unknownFiles: false,
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
export type FileType = keyof typeof FILE_TYPES | "bin";

/** Bytes stored per app (payload + files), so the free plan's 500 MB database (both apps together) cannot fill up. */
export const BUDGET = {
  perAppPerDayBytes: 40 * 1024 * 1024,
  perAppTotalBytes: 200 * 1024 * 1024,
} as const;

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
