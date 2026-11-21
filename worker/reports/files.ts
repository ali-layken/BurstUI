// A report's files: decoded from base64 and typed by their bytes alone. Nothing here (or anywhere) renders, runs or
// interprets a file beyond these few magic bytes and a UTF-8 check; the bytes are stored as they came.
import type { FileType } from "./contract";

const startsWith = (b: Uint8Array, magic: number[], at = 0) => magic.every((m, i) => b[at + i] === m);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/** The type of a file from its bytes; null when it is none of the known ones (and so refused). */
export function detectType(b: Uint8Array): FileType | null {
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(b, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(b, ascii("RIFF")) && startsWith(b, ascii("WEBP"), 8)) return "webp";
  if (startsWith(b, ascii("GIF87a")) || startsWith(b, ascii("GIF89a"))) return "gif";
  if (startsWith(b, ascii("SWR1"))) return "swr";
  if (!b.includes(0)) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(b);
      return "text";
    } catch {
      // not UTF-8
    }
  }
  return null;
}

/** Standard base64 (already checked against /^[A-Za-z0-9+/]*={0,2}$/ and a length that is a multiple of 4). */
export function decodeBase64(b64: string): Uint8Array<ArrayBuffer> {
  const native = (Uint8Array as unknown as { fromBase64?: (s: string) => Uint8Array<ArrayBuffer> }).fromBase64;
  if (native) return native(b64);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
