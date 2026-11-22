import type { WalletKind, WalletPass } from "./types";
import { isImageSrc } from "./utils";

export const WALLET_MAX = 8;

export type WalletPreset = {
  kind: WalletKind;
  label: string;
  /** Default card title. */
  title: string;
  color: string;
  /** Small tag in the card's corner. */
  tag: string;
  /** Shown under the QR on the back of the card. */
  action: string;
  hint: string;
};

/** Brand-like colors only; no logos. */
export const WALLET_PRESETS: WalletPreset[] = [
  { kind: "gcash", label: "GCash", title: "GCash", color: "#0B5FFF", tag: "QR Ph", action: "Scan to pay", hint: "GCash → QR → My QR → save the image" },
  { kind: "maya", label: "Maya", title: "Maya", color: "#0E9F6E", tag: "QR Ph", action: "Scan to pay", hint: "Maya → Receive money → save your QR" },
  { kind: "bank", label: "Bank", title: "Bank transfer", color: "#1D3557", tag: "QR Ph", action: "Scan to pay", hint: "Your bank app → Receive → QR Ph code" },
  { kind: "profile", label: "My card", title: "My card", color: "#38BDF8", tag: "Triio", action: "Scan to open my card", hint: "A QR of your profile link, for people without NFC" },
  { kind: "link", label: "Link", title: "Link", color: "#5E5CE6", tag: "Link", action: "Scan to open", hint: "Portfolio, booking page, Wi-Fi, menu…" },
  { kind: "custom", label: "Other", title: "", color: "#636366", tag: "QR", action: "Scan me", hint: "Any QR code: event pass, ID, loyalty card…" },
];

/**
 * Banks and e-wallets in the Philippines, with colors close to their brand colors.
 * Logos aren't bundled (they're the banks' trademarks); owners can upload their own.
 */
export const BANKS: { id: string; name: string; color: string }[] = [
  { id: "bdo", name: "BDO", color: "#0033A0" },
  { id: "bpi", name: "BPI", color: "#B11116" },
  { id: "metrobank", name: "Metrobank", color: "#0047BB" },
  { id: "landbank", name: "LANDBANK", color: "#00843D" },
  { id: "pnb", name: "PNB", color: "#003B71" },
  { id: "securitybank", name: "Security Bank", color: "#0072BC" },
  { id: "unionbank", name: "UnionBank", color: "#F37021" },
  { id: "rcbc", name: "RCBC", color: "#00539F" },
  { id: "chinabank", name: "China Bank", color: "#C8102E" },
  { id: "eastwest", name: "EastWest", color: "#7B2482" },
  { id: "psbank", name: "PSBank", color: "#004B8D" },
  { id: "aub", name: "AUB", color: "#A6192E" },
  { id: "dbp", name: "DBP", color: "#003A70" },
  { id: "maybank", name: "Maybank", color: "#FFC72C" },
  { id: "cimb", name: "CIMB", color: "#EC1C24" },
  { id: "gotyme", name: "GoTyme Bank", color: "#00A6A6" },
  { id: "seabank", name: "SeaBank", color: "#EE4D2D" },
  { id: "tonik", name: "Tonik", color: "#5B2EDE" },
  { id: "maribank", name: "MariBank", color: "#FF5722" },
  { id: "ownbank", name: "OwnBank", color: "#1F3B73" },
  { id: "shopeepay", name: "ShopeePay", color: "#EE4D2D" },
  { id: "grabpay", name: "GrabPay", color: "#00B14F" },
  { id: "coinsph", name: "Coins.ph", color: "#2D6CDF" },
  { id: "other", name: "Other bank", color: "#1D3557" },
];

export const bankOf = (id: string | null | undefined) => BANKS.find((b) => b.id === id) ?? null;

export function presetOf(kind: WalletKind): WalletPreset {
  return WALLET_PRESETS.find((p) => p.kind === kind) ?? WALLET_PRESETS[WALLET_PRESETS.length - 1];
}

export const isPaymentKind = (k: WalletKind) => k === "gcash" || k === "maya" || k === "bank";

export function hasQr(p: Pick<WalletPass, "qr_text" | "qr_image">) {
  return Boolean(p.qr_text?.trim() || isImageSrc(p.qr_image));
}

/** Passes that can actually be shown (the Wallet tab only appears when there's at least one). */
export function visiblePasses(wallet: WalletPass[] | null | undefined): WalletPass[] {
  return (Array.isArray(wallet) ? wallet : []).filter((p) => p && typeof p === "object" && hasQr(p)).slice(0, WALLET_MAX);
}

export function newPassId() {
  const b = new Uint8Array(6);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => (x % 36).toString(36)).join("") + Date.now().toString(36).slice(-4);
}
