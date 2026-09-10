// Server-only: builds the shareable score card PNG for /report/:id.
// Pure JS (no native deps): a 5x7 bitmap font rasterised into an RGB buffer,
// then encoded as PNG using the runtime's CompressionStream("deflate").

type RGB = [number, number, number];

const FONT: Record<string, number[]> = {
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "-": [0, 0, 0, 0x1f, 0, 0, 0],
  _: [0, 0, 0, 0, 0, 0, 0x1f],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  "·": [0, 0, 0, 0x0c, 0x0c, 0, 0],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "%": [0x11, 0x12, 0x02, 0x04, 0x08, 0x09, 0x11],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
};

class Bitmap {
  readonly px: Uint8Array;
  constructor(
    readonly w: number,
    readonly h: number,
    bg: RGB,
  ) {
    this.px = new Uint8Array(w * h * 3);
    this.rect(0, 0, w, h, bg);
  }

  rect(x: number, y: number, w: number, h: number, color: RGB) {
    const x0 = Math.max(0, x | 0);
    const y0 = Math.max(0, y | 0);
    const x1 = Math.min(this.w, (x + w) | 0);
    const y1 = Math.min(this.h, (y + h) | 0);
    for (let py = y0; py < y1; py++) {
      let i = (py * this.w + x0) * 3;
      for (let px = x0; px < x1; px++) {
        this.px[i] = color[0];
        this.px[i + 1] = color[1];
        this.px[i + 2] = color[2];
        i += 3;
      }
    }
  }

  text(x: number, y: number, str: string, scale: number, color: RGB) {
    let cx = x;
    for (const raw of str.toUpperCase()) {
      const glyph = FONT[raw] ?? FONT[" "]!;
      for (let row = 0; row < 7; row++) {
        const bits = glyph[row]!;
        for (let col = 0; col < 5; col++) {
          if (bits & (1 << (4 - col))) {
            this.rect(cx + col * scale, y + row * scale, scale, scale, color);
          }
        }
      }
      cx += 6 * scale;
    }
  }
}

const textWidth = (str: string, scale: number) => str.length * 6 * scale - scale;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function u32(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new Uint8Array([...type].map((c) => c.charCodeAt(0)));
  const body = concat([typeBytes, data]);
  return concat([u32(data.length), body, u32(crc32(body))]);
}

async function zlib(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as unknown as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function encodePng(bmp: Bitmap): Promise<Uint8Array> {
  const stride = bmp.w * 3;
  const raw = new Uint8Array((stride + 1) * bmp.h);
  for (let y = 0; y < bmp.h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    raw.set(bmp.px.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const ihdr = concat([
    u32(bmp.w),
    u32(bmp.h),
    new Uint8Array([8, 2, 0, 0, 0]), // 8-bit, truecolor RGB
  ]);
  return concat([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", await zlib(raw)),
    chunk("IEND", new Uint8Array()),
  ]);
}

const INK: RGB = [46, 42, 38];
const PAPER: RGB = [251, 248, 243];
const MUTED: RGB = [140, 130, 118];
const RULE: RGB = [228, 221, 210];
const BRAND: RGB = [226, 86, 43];
const PASS: RGB = [37, 133, 87];
const WARN: RGB = [196, 140, 40];
const FAIL: RGB = [198, 59, 34];

export type OgInput = {
  url: string;
  score: number;
  criticals: number;
  warnings: number;
  passes: number;
};

export async function renderScoreCard(input: OgInput): Promise<Uint8Array> {
  const accent = input.score >= 80 ? PASS : input.score >= 50 ? WARN : FAIL;
  const verdict =
    input.score >= 80 ? "ready to ship" : input.score >= 50 ? "needs work" : "not ready yet";

  let host = input.url;
  try {
    host = new URL(input.url).host.replace(/^www\./, "");
  } catch {
    /* keep raw */
  }
  if (host.length > 34) host = `${host.slice(0, 33)}.`;

  const bmp = new Bitmap(1200, 630, PAPER);

  // Frame + accent edge
  bmp.rect(0, 0, 1200, 12, accent);
  bmp.rect(48, 48, 1104, 1, RULE);
  bmp.rect(48, 581, 1104, 1, RULE);

  bmp.text(72, 88, "shipcheck", 6, BRAND);
  bmp.text(72, 140, "pre-launch report", 3, MUTED);

  const score = String(Math.max(0, Math.min(100, Math.round(input.score))));
  bmp.rect(72, 214, 10, 210, accent);
  bmp.text(112, 214, score, 30, accent);
  const scoreEnd = 112 + textWidth(score, 30);
  bmp.text(scoreEnd + 28, 368, "/100", 8, MUTED);
  bmp.text(scoreEnd + 28, 240, verdict, 7, INK);

  bmp.text(72, 470, host, 6, INK);

  const tally = `${input.criticals} critical  ·  ${input.warnings} warnings  ·  ${input.passes} passed`;
  bmp.text(72, 522, tally, 4, MUTED);

  const cta = "scan yours free";
  bmp.text(1128 - textWidth(cta, 4), 522, cta, 4, BRAND);

  return encodePng(bmp);
}
