// go2rtc negotiates a comma-separated codec list, then returns an MP4 MIME type.
const CODECS = [
  "avc1.640029", "avc1.64002A", "avc1.640033", "hvc1.1.6.L153.B0",
  "mp4a.40.2", "mp4a.40.5", "flac", "opus",
];

export const MAX_PENDING_BYTES = 8 * 1024 * 1024;
export const MAX_PENDING_SEGMENTS = 256;
export const RETAIN_SECONDS = 15;
export const LIVE_DELAY_SECONDS = 1;
export const MAX_LAG_SECONDS = 5;

export function supportedCodecs(isSupported: (mime: string) => boolean): string {
  const codecs = CODECS.filter((codec) => isSupported(`video/mp4; codecs="${codec}"`));
  return codecs.some((codec) => /^(avc1|hvc1)\./.test(codec)) ? codecs.join(",") : "";
}

export function buildLiveSocketUrl(requestUrl: string, pageUrl: string, ticket: string): string {
  const page = new URL(pageUrl);
  const url = new URL(requestUrl, page);
  if (!ticket || !["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || (page.protocol === "https:" && url.protocol !== "https:")) {
    throw new Error("Live video requires a secure HTTP API URL without credentials or query parameters.");
  }
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("ticket", ticket);
  return url.toString();
}

export function parseMseDescription(text: string, isSupported: (mime: string) => boolean): string {
  const message: unknown = JSON.parse(text);
  if (!message || typeof message !== "object" || !("type" in message) ||
      !("value" in message) || message.type !== "mse" || typeof message.value !== "string") {
    // Never surface go2rtc error text: it may contain upstream connection details.
    throw new Error("The camera did not provide a playable MSE stream.");
  }
  if (!/^video\/mp4\s*;/i.test(message.value) || !isSupported(message.value)) {
    throw new Error("This browser cannot decode the camera's negotiated video codec.");
  }
  return message.value;
}

/** A bounded FIFO: fragmented MP4 cannot safely recover by dropping arbitrary messages. */
export class SegmentQueue {
  private segments: ArrayBuffer[] = [];
  private bytes = 0;

  push(segment: ArrayBuffer): boolean {
    if (!segment.byteLength) return true;
    if (this.bytes + segment.byteLength > MAX_PENDING_BYTES ||
        this.segments.length >= MAX_PENDING_SEGMENTS) return false;
    this.segments.push(segment);
    this.bytes += segment.byteLength;
    return true;
  }

  peek(): ArrayBuffer | undefined {
    return this.segments[0];
  }

  shift(): void {
    const segment = this.segments.shift();
    if (segment) this.bytes -= segment.byteLength;
  }

  clear(): void {
    this.segments = [];
    this.bytes = 0;
  }
}