import QRCode from "qrcode";

/**
 * QR code as one SVG path (one 1×1 square per dark module). Synchronous and works on the
 * server and in the browser, so the Wallet can draw crisp codes at any size.
 */
export function qrPath(text: string): { size: number; d: string } | null {
  try {
    const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
    const { size, data } = modules;
    let d = "";
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (data[y * size + x]) d += `M${x} ${y}h1v1h-1z`;
      }
    }
    return { size, d };
  } catch {
    return null; // too long to fit in a QR code
  }
}
