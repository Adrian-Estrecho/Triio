import type { Offering } from "./types";
import { isImageSrc, isSafeHttpUrl } from "./utils";

/** Products and services on a business profile ("What we offer"). */
export const OFFERINGS_MAX = 24;
export const OFFERINGS_TITLE = "What we offer";

function text(v: unknown, max: number) {
  if (typeof v !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").trim();
  return s ? s.slice(0, max) : null;
}

/** Items that can be shown (a title is required; unsafe links and images are dropped). */
export function visibleOfferings(list: Offering[] | null | undefined): Offering[] {
  return (Array.isArray(list) ? list : [])
    .filter((o) => o && typeof o === "object" && typeof o.title === "string" && o.title.trim())
    .map((o) => ({ ...o, image: isImageSrc(o.image) ? o.image : null, url: isSafeHttpUrl(o.url) ? o.url : null }))
    .slice(0, OFFERINGS_MAX);
}

/**
 * Validate what the admin form sent. Images are never taken from the form as links:
 * only `uploaded[id]` (a new upload) or an image this profile already had.
 */
export function cleanOfferings(items: unknown, previous: Offering[], uploaded: Record<string, string>): Offering[] {
  if (!Array.isArray(items)) throw new Error("Products & services couldn't be read. Reload the page and try again.");
  if (items.length > OFFERINGS_MAX) throw new Error(`Keep it to ${OFFERINGS_MAX} products & services.`);
  const known = new Set(previous.map((o) => o.image).filter(Boolean));
  const ids = new Set<string>();
  const out: Offering[] = [];
  for (const raw of items as Record<string, unknown>[]) {
    const id = typeof raw?.id === "string" && /^[a-z0-9]{4,24}$/.test(raw.id) ? raw.id : null;
    if (!id || ids.has(id)) throw new Error("Products & services couldn't be read. Reload the page and try again.");
    ids.add(id);
    const title = text(raw.title, 60);
    if (!title) continue;
    const link = text(raw.url, 300);
    const url = link ? (/^https?:\/\//i.test(link) ? link : `https://${link}`) : null;
    if (url && !isSafeHttpUrl(url)) throw new Error(`“${title}”: the link must be a web address (https://…).`);
    const keep = typeof raw.image === "string" && known.has(raw.image) && raw.removeImage !== true ? raw.image : null;
    out.push({
      id,
      title,
      price: text(raw.price, 24),
      category: text(raw.category, 24),
      description: text(raw.description, 400),
      url,
      image: uploaded[id] ?? keep,
    });
  }
  return out;
}

export function newOfferingId() {
  const b = new Uint8Array(6);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => (x % 36).toString(36)).join("") + Date.now().toString(36).slice(-4);
}
