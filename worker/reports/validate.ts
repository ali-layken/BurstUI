// Strict validation of one report against docs/reports.md. Everything in a report is hostile: this only checks shapes
// and limits and copies the known fields into a fresh object, so nothing unexpected (extra keys, __proto__, odd types)
// travels further. The result is stored as data; it is never executed, rendered as HTML, put into SQL text or used as
// a path.
import {
  type AppSlug,
  FILE_NAME_PATTERN,
  INSTALL_PATTERN,
  type FileType,
  isBuildFor,
  KEY_PATTERN,
  KIND_LIMITS,
  KINDS,
  LIMITS,
  LOG_LEVELS,
  SESSION_PATTERN,
  SRC_PATTERN,
  TOP_LEVEL_KEYS,
  WHEN_PATTERN,
} from "./contract";
import { decodeBase64, detectType } from "./files";

export class Invalid extends Error {}

type Flat = Record<string, string | number | boolean>;

export interface LogLine {
  t: number;
  lvl: (typeof LOG_LEVELS)[number];
  src: string;
  msg: string;
  data?: Flat;
}

export interface Report {
  v: 1;
  app: AppSlug;
  build: string;
  kind: (typeof KINDS)[number];
  signature: string;
  when: string;
  install: string;
  session: string;
  platform: Record<string, string>;
  context: Flat;
  note: string;
  log: LogLine[];
  /** Decoded; typed by their bytes. Stored apart from the rest of the report (store.ts). */
  files: ReportFile[];
}

export interface ReportFile {
  name: string;
  type: FileType;
  data: Uint8Array<ArrayBuffer>;
}

/** The report as stored in the payload blob: everything but the files' bytes, which live in the files table. */
export const payloadOf = (r: Report) => ({
  ...r,
  files: r.files.map((f) => ({ name: f.name, type: f.type, bytes: f.data.byteLength })),
});

const fail = (msg: string): never => {
  throw new Invalid(msg);
};

const isPlainObject = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;

/** Length in characters (code points), the way a person and Godot's String.length() count. */
const chars = (s: string) => {
  let n = 0;
  for (const _ of s) n++;
  return n;
};

// C0 controls, DEL and C1 controls. Refused in short identifying fields (build, signature, platform values, src,
// keys); free text (note, msg, context and data strings) may hold them and the reader escapes them when printing.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

function text(x: unknown, field: string, max: number, opts: { min?: number; noControl?: boolean } = {}): string {
  if (typeof x !== "string") fail(`${field}: must be a string`);
  const s = x as string;
  const n = chars(s);
  if (n < (opts.min ?? 0)) fail(`${field}: must not be empty`);
  if (n > max) fail(`${field}: at most ${max} characters`);
  if (opts.noControl && CONTROL.test(s)) fail(`${field}: control characters are not allowed`);
  return s;
}

function exactKeys(o: Record<string, unknown>, allowed: readonly string[], field: string) {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) fail(`${field}: unknown key "${k.slice(0, 40)}"`);
}

function key(k: string, field: string) {
  if (k.length === 0 || k.length > LIMITS.keyChars || !KEY_PATTERN.test(k)) {
    fail(`${field}: key "${k.slice(0, 40)}" must be 1-${LIMITS.keyChars} characters of A-Z a-z 0-9 _ . -`);
  }
}

/** A flat object of string / finite number / boolean values. */
function flat(x: unknown, field: string, maxKeys: number, maxString: number): Flat {
  if (!isPlainObject(x)) fail(`${field}: must be an object`);
  const o = x as Record<string, unknown>;
  const keys = Object.keys(o);
  if (keys.length > maxKeys) fail(`${field}: at most ${maxKeys} keys`);
  const out: Flat = Object.create(null);
  for (const k of keys) {
    key(k, field);
    const v = o[k];
    if (typeof v === "string") out[k] = text(v, `${field}.${k}`, maxString);
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
    else fail(`${field}.${k}: must be a string, a number or a boolean`);
  }
  return out;
}

function base64Size(b64: string, field: string): number {
  if (b64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) fail(`${field}: must be standard base64 with padding`);
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return (b64.length / 4) * 3 - pad;
}

export function validateReport(input: unknown, app: AppSlug): Report {
  if (!isPlainObject(input)) fail("report: must be a JSON object");
  const r = input as Record<string, unknown>;
  exactKeys(r, TOP_LEVEL_KEYS, "report");

  if (r.v !== 1) fail("v: must be 1");
  if (r.app !== app) fail(`app: must be "${app}", the app in the address`);

  const build = text(r.build, "build", LIMITS.buildChars, { min: 1, noControl: true });
  if (!isBuildFor(app, build)) fail(`build: must look like ${app}-<number>+<commit>`);
  const buildNumber = Number(build.slice(app.length + 1, build.indexOf("+")));
  if (!Number.isSafeInteger(buildNumber)) fail("build: the number is too large");

  if (!KINDS.includes(r.kind as never)) fail(`kind: must be one of ${KINDS.join(", ")}`);
  const signature = text(r.signature, "signature", LIMITS.signatureChars, { min: 1, noControl: true });

  const when = text(r.when, "when", 40, { min: 1 });
  if (!WHEN_PATTERN.test(when) || Number.isNaN(Date.parse(when))) fail("when: must be an ISO 8601 time in UTC, like 2026-11-20T17:01:22Z");

  const install = typeof r.install === "string" ? r.install.toLowerCase() : "";
  if (!INSTALL_PATTERN.test(install)) fail("install: must be 32 hex digits");
  const session = typeof r.session === "string" ? r.session.toLowerCase() : "";
  if (!SESSION_PATTERN.test(session)) fail("session: must be 16 hex digits");

  // platform: flat, strings only.
  const platform: Record<string, string> = Object.create(null);
  if (r.platform !== undefined) {
    if (!isPlainObject(r.platform)) fail("platform: must be an object");
    const p = r.platform as Record<string, unknown>;
    const keys = Object.keys(p);
    if (keys.length > LIMITS.platformKeys) fail(`platform: at most ${LIMITS.platformKeys} keys`);
    for (const k of keys) {
      key(k, "platform");
      platform[k] = text(p[k], `platform.${k}`, LIMITS.platformValueChars, { noControl: true });
    }
  }

  const context = r.context === undefined ? {} : flat(r.context, "context", LIMITS.contextKeys, LIMITS.contextStringChars);
  const note = r.note === undefined ? "" : text(r.note, "note", LIMITS.noteChars);

  if (!Array.isArray(r.log)) fail("log: must be an array (it may be empty)");
  const rawLog = r.log as unknown[];
  if (rawLog.length > LIMITS.logLines) fail(`log: at most ${LIMITS.logLines} lines`);
  const log: LogLine[] = rawLog.map((line, i) => {
    const f = `log[${i}]`;
    if (!isPlainObject(line)) fail(`${f}: must be an object`);
    const l = line as Record<string, unknown>;
    exactKeys(l, ["t", "lvl", "src", "msg", "data"], f);
    if (typeof l.t !== "number" || !Number.isFinite(l.t) || l.t < 0) fail(`${f}.t: must be a number of ms, 0 or more`);
    if (!LOG_LEVELS.includes(l.lvl as never)) fail(`${f}.lvl: must be one of ${LOG_LEVELS.join(", ")}`);
    const src = text(l.src, `${f}.src`, LIMITS.logSrcChars, { min: 1, noControl: true });
    if (!SRC_PATTERN.test(src)) fail(`${f}.src: lower case a-z 0-9 _ . - only`);
    const out: LogLine = {
      t: l.t as number,
      lvl: l.lvl as LogLine["lvl"],
      src,
      msg: text(l.msg, `${f}.msg`, LIMITS.logMsgChars),
    };
    if (l.data !== undefined) out.data = flat(l.data, `${f}.data`, LIMITS.contextKeys, LIMITS.contextStringChars);
    return out;
  });

  const limits = KIND_LIMITS[r.kind as Report["kind"]];
  const files: Report["files"] = [];
  if (r.files !== undefined) {
    if (!Array.isArray(r.files)) fail("files: must be an array");
    const rawFiles = r.files as unknown[];
    if (rawFiles.length > limits.files) fail(`files: at most ${limits.files} in a ${r.kind} report`);
    rawFiles.forEach((file, i) => {
      const f = `files[${i}]`;
      if (!isPlainObject(file)) fail(`${f}: must be an object`);
      const o = file as Record<string, unknown>;
      exactKeys(o, ["name", "b64"], f);
      const name = text(o.name, `${f}.name`, LIMITS.fileNameChars, { min: 1 });
      if (!FILE_NAME_PATTERN.test(name) || /^\.+$/.test(name)) fail(`${f}.name: A-Z a-z 0-9 . _ - only, and not just dots`);
      if (files.some((x) => x.name === name)) fail(`${f}.name: two files are called "${name}"`);
      if (typeof o.b64 !== "string") fail(`${f}.b64: must be a string`);
      if (base64Size(o.b64 as string, `${f}.b64`) > limits.fileBytes) {
        fail(`${f}: at most ${limits.fileBytes} bytes before base64 in a ${r.kind} report`);
      }
      const data = decodeBase64(o.b64 as string);
      const type = detectType(data);
      if (type === "bin" && !limits.unknownFiles) fail(`${f}: must be a PNG, JPEG, WebP or GIF image, a Surf World replay or UTF-8 text`);
      files.push({ name, type, data });
    });
  }

  return {
    v: 1,
    app,
    build,
    kind: r.kind as Report["kind"],
    signature,
    when,
    install,
    session,
    platform: { ...platform },
    context: { ...context },
    note,
    log,
    files,
  };
}

/** The build's number (the part between "<app>-" and "+"), for the indexed build_number column. */
export const buildNumber = (r: Report) => Number(r.build.slice(r.app.length + 1, r.build.indexOf("+")));
