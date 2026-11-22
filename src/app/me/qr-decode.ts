/**
 * Reads the QR code in a photo or screenshot (e.g. a GCash "My QR" screenshot), in the browser.
 * Uses the phone's built-in barcode reader when there is one, otherwise jsQR (loaded on demand).
 * Returns null when no QR code is found; the image is then shown as-is instead.
 */

type Detector = { detect: (src: ImageBitmap) => Promise<{ rawValue?: string }[]> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

export async function decodeQrFile(file: File): Promise<string | null> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    return null;
  }

  const Native = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  if (Native) {
    try {
      const found = await new Native({ formats: ["qr_code"] }).detect(bmp);
      const value = found.find((r) => r.rawValue)?.rawValue;
      if (value) return value;
    } catch {
      /* fall through to jsQR */
    }
  }

  try {
    const { default: jsQR } = await import("jsqr");
    // Try the full image, then a sharper look at the middle (screenshots have lots of UI around the code).
    for (const crop of [1, 0.7]) {
      const sw = bmp.width * crop;
      const sh = bmp.height * crop;
      const scale = Math.min(1, 1400 / Math.max(sw, sh));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw * scale);
      canvas.height = Math.round(sh * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const res = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
      if (res?.data) return res.data;
    }
  } catch {
    /* unreadable */
  }
  return null;
}

/**
 * QR Ph / EMVCo payment codes carry the account name (tag 59). Used to fill in the
 * "Account name" field automatically. Returns null for anything else.
 */
export function qrPhName(payload: string): string | null {
  if (!/^000201/.test(payload)) return null;
  let i = 0;
  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    if (!Number.isFinite(len)) return null;
    const value = payload.slice(i + 4, i + 4 + len);
    if (tag === "59") return value.trim() || null;
    i += 4 + len;
  }
  return null;
}
