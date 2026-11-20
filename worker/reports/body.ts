// Reading a report body without ever holding more than the contract allows: the size as sent is enforced while the
// stream is read (before anything is parsed), and gzip is unpacked through a stream that is abandoned the moment its
// output passes the unpacked cap, so a small gzip that would unpack to gigabytes costs at most that cap.

export class TooLarge extends Error {}
export class BadBody extends Error {}

/** Reads at most `max` bytes from a stream; throws TooLarge (and cancels the stream) as soon as there are more. */
export async function readBounded(stream: ReadableStream<Uint8Array>, max: number): Promise<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await reader.cancel().catch(() => {});
        throw new TooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

const isGzip = (b: Uint8Array) => b.length >= 2 && b[0] === 0x1f && b[1] === 0x8b;

export async function gunzipBounded(bytes: Uint8Array<ArrayBuffer>, max: number): Promise<Uint8Array<ArrayBuffer>> {
  const unpacked = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  try {
    return await readBounded(unpacked, max);
  } catch (e) {
    if (e instanceof TooLarge) throw e;
    throw new BadBody("body is not valid gzip");
  }
}

export async function gzip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const packed = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(packed).arrayBuffer());
}

export interface ReadBody {
  /** The JSON value of the body. */
  value: unknown;
  /** Size as sent. */
  sentBytes: number;
}

/**
 * Reads, unpacks and parses a report request's body. Throws TooLarge (413) or BadBody (400).
 * `content-encoding: gzip` with a body that is not gzip is read as plain JSON: if anything between the app and the
 * Worker ever unpacks request bodies on the way, reports still arrive (they were already held to the sent cap).
 */
export async function readReportBody(request: Request, maxSent: number, maxUnpacked: number): Promise<ReadBody> {
  const declared = request.headers.get("content-length");
  if (declared !== null && Number(declared) > maxSent) throw new TooLarge();

  const encoding = (request.headers.get("content-encoding") ?? "identity").trim().toLowerCase();
  if (encoding !== "gzip" && encoding !== "identity") throw new BadBody("content-encoding must be gzip or absent");

  if (!request.body) throw new BadBody("empty body");
  const sent = await readBounded(request.body, maxSent);
  const raw = encoding === "gzip" && isGzip(sent) ? await gunzipBounded(sent, maxUnpacked) : sent;

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(raw);
  } catch {
    throw new BadBody("body is not UTF-8");
  }
  try {
    return { value: JSON.parse(text), sentBytes: sent.byteLength };
  } catch {
    throw new BadBody("body is not JSON");
  }
}
