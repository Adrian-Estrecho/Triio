/* Brand-color helpers shared by the public profile and the owner settings. */

export function safeColor(c: string | null | undefined) {
  return c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#38BDF8";
}

function rgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function luminance([r, g, b]: number[]) {
  const ch = [r, g, b].map((x) => {
    const v = x / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrast(a: number, b: number) {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Black or white — whichever reads better on the brand color. */
export function onColor(hex: string) {
  const L = luminance(rgb(hex));
  return contrast(L, 1) >= contrast(L, 0) ? "#FFFFFF" : "#000000";
}

/** The brand color, nudged darker (light theme) or lighter (dark theme) until it's readable as text. */
export function readableTint(hex: string, dark: boolean) {
  const bg = dark ? luminance([28, 28, 30]) : 1;
  let c = rgb(hex);
  for (let i = 0; i < 20 && contrast(luminance(c), bg) < 4.5; i++) {
    c = c.map((v) => Math.round(dark ? v + (255 - v) * 0.12 : v * 0.88));
  }
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}
