import "server-only";
import { DISCOVERY_AREAS, tierFromReviews } from "@/lib/constants";
import type { AutomationSettings } from "@/lib/types";
import type { Db } from "./db";

/**
 * Automatic lead finder.
 *  - With GOOGLE_PLACES_API_KEY: Google Places "Text Search", which includes the
 *    review count, so each lead gets a tier (few reviews → Tier A).
 *  - Without it: OpenStreetMap (free, no key). No review counts, so no tier.
 * Businesses already in Leads (same place id, or same name) are skipped.
 */

export type DiscoveryProvider = "google" | "osm";

export type FoundPlace = {
  place_id: string;
  business_name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  facebook: string | null;
  maps_url: string | null;
  rating: number | null;
  review_count: number | null;
};

export type DiscoveryResult = {
  provider: DiscoveryProvider;
  area: string;
  category: string;
  query: string;
  found: number;
  added: number;
  skipped: number;
  names: string[];
  error?: string;
};

export function discoveryProvider(): DiscoveryProvider {
  return process.env.GOOGLE_PLACES_API_KEY ? "google" : "osm";
}

export const SEARCHABLE_AREAS = Object.keys(DISCOVERY_AREAS);

/** OpenStreetMap tags for each lead category. Categories without tags can only be searched on Google (or by keyword). */
const OSM_TAGS: Record<string, string[]> = {
  Cafe: ['["amenity"="cafe"]'],
  Restaurant: ['["amenity"="restaurant"]', '["amenity"="fast_food"]'],
  Barbershop: ['["shop"="hairdresser"]["hairdresser"="barber"]', '["shop"="barber"]', '["shop"="hairdresser"]["name"~"barber",i]'],
  Salon: ['["shop"="hairdresser"]', '["shop"="beauty"]', '["shop"="massage"]'],
  Clinic: ['["amenity"="clinic"]', '["amenity"="dentist"]', '["amenity"="doctors"]', '["amenity"="veterinary"]'],
  Retail: ['["shop"~"^(clothes|shoes|gift|bakery|convenience|mobile_phone|cosmetics|florist|pet)$"]'],
  Hotel: ['["tourism"~"^(hotel|guest_house|motel|hostel)$"]'],
};

export function osmSupports(category: string) {
  return Boolean(OSM_TAGS[category]);
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");

function splitSocial(url: string | null) {
  if (!url) return { website: null, facebook: null };
  return /facebook\.com|fb\.com/i.test(url) ? { website: null, facebook: url } : { website: url, facebook: null };
}

type AreaCfg = (typeof DISCOVERY_AREAS)[string];

/* ------------------------------ Google ------------------------------ */

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
};

async function searchGoogle(query: string, area: AreaCfg, limit: number): Promise<FoundPlace[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.googleMapsUri",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.rating",
        "places.userRatingCount",
        "places.businessStatus",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: Math.min(Math.max(limit, 1), 20),
      regionCode: "PH",
      languageCode: "en",
      locationBias: { circle: { center: { latitude: area.lat, longitude: area.lng }, radius: area.radius } },
    }),
    signal: AbortSignal.timeout(20000),
  });
  const body = (await res.json().catch(() => ({}))) as { places?: GooglePlace[]; error?: { message?: string } };
  if (!res.ok) throw new Error(`Google Places: ${body.error?.message ?? res.statusText}`);

  return (body.places ?? [])
    .filter((p) => p.displayName?.text && !String(p.businessStatus ?? "").startsWith("CLOSED"))
    .map((p) => ({
      place_id: p.id,
      business_name: p.displayName!.text!.trim(),
      address: p.formattedAddress ?? null,
      phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
      ...splitSocial(p.websiteUri ?? null),
      maps_url: p.googleMapsUri ?? null,
      rating: typeof p.rating === "number" ? Math.round(p.rating * 10) / 10 : null,
      review_count: typeof p.userRatingCount === "number" ? p.userRatingCount : 0,
    }));
}

/* --------------------------- OpenStreetMap --------------------------- */

type OsmElement = { type: string; id: number; tags?: Record<string, string> };

/** The free public Overpass servers are often busy, so try a second one before giving up. */
const OVERPASS_SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

async function overpass(query: string): Promise<{ elements?: OsmElement[] }> {
  let last = "";
  for (const url of OVERPASS_SERVERS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "triio-lead-finder/1.0" },
        body: "data=" + encodeURIComponent(query),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        last = `status ${res.status}`;
        continue;
      }
      const body = (await res.json()) as { elements?: OsmElement[]; remark?: string };
      // A timed-out query still answers 200, with a "remark" and no results.
      if (!body.elements?.length && body.remark && /timed out|out of memory|error/i.test(body.remark)) {
        last = body.remark;
        continue;
      }
      return body;
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`OpenStreetMap is busy right now (${last}). Try again in a few minutes.`);
}

async function searchOsm(category: string, keyword: string | null, areaName: string, area: AreaCfg, limit: number): Promise<FoundPlace[]> {
  const around = `(around:${area.radius},${area.lat},${area.lng})`;
  const safeKeyword = keyword?.replace(/["\\]/g, "").slice(0, 40);
  const selectors = safeKeyword ? [`["name"~"${safeKeyword}",i]`] : (OSM_TAGS[category] ?? []).map((t) => `${t}["name"]`);
  if (!selectors.length) throw new Error(`OpenStreetMap can't search "${category}". Add a Google Places key, or type a keyword.`);

  const q = `[out:json][timeout:25];(${selectors.map((s) => `nwr${s}${around};`).join("")});out center tags ${Math.max(limit * 3, 30)};`;
  const body = await overpass(q);

  return (body.elements ?? [])
    .filter((e) => e.tags?.name)
    .map((e) => {
      const t = e.tags!;
      const street = [t["addr:housenumber"], t["addr:street"], t["addr:suburb"] ?? t["addr:city"]].filter(Boolean).join(" ");
      const fb = t["contact:facebook"] ?? null;
      const web = splitSocial(t.website ?? t["contact:website"] ?? null);
      return {
        place_id: `osm:${e.type}/${e.id}`,
        business_name: t.name.trim(),
        address: street || null,
        phone: t.phone ?? t["contact:phone"] ?? null,
        website: web.website,
        facebook: fb ? (fb.startsWith("http") ? fb : `https://facebook.com/${fb}`) : web.facebook,
        // A Google Maps search link so you can check their reviews in one click.
        maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${t.name} ${areaName}`)}`,
        rating: null,
        review_count: null,
      };
    });
}

/* ------------------------------ Run ------------------------------ */

/** Search one area + category and add the new businesses to Leads. Never throws. */
export async function discoverLeads(
  db: Db,
  opts: { area: string; category: string; keyword?: string | null; limit?: number }
): Promise<DiscoveryResult> {
  const provider = discoveryProvider();
  const keyword = opts.keyword?.trim() || null;
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 20);
  const areaCfg = DISCOVERY_AREAS[opts.area];
  const query = `${keyword ?? opts.category} in ${areaCfg?.query ?? opts.area}`;
  const result: DiscoveryResult = { provider, area: opts.area, category: opts.category, query, found: 0, added: 0, skipped: 0, names: [] };

  if (!areaCfg) return { ...result, error: `"${opts.area}" isn't set up for searching. Add it to DISCOVERY_AREAS in src/lib/constants.ts.` };

  try {
    const places = provider === "google" ? await searchGoogle(query, areaCfg, limit) : await searchOsm(opts.category, keyword, opts.area, areaCfg, limit);
    result.found = places.length;

    const { data: existing, error } = await db.from("leads").select("business_name, place_id");
    if (error) throw new Error(`Leads: ${error.message}`);
    const knownIds = new Set((existing ?? []).map((l) => l.place_id).filter(Boolean));
    const knownNames = new Set((existing ?? []).map((l) => norm(l.business_name)));

    const seen = new Set<string>();
    const fresh = places
      .filter((p) => {
        const key = norm(p.business_name);
        if (!key || knownIds.has(p.place_id) || knownNames.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);
    result.skipped = places.length - fresh.length;

    if (fresh.length) {
      const rows = fresh.map((p) => ({
        business_name: p.business_name.slice(0, 150),
        category: opts.category,
        area: opts.area,
        tier: tierFromReviews(p.review_count),
        status: "new",
        phone: p.phone,
        facebook: p.facebook,
        maps_url: p.maps_url,
        address: p.address,
        website: p.website,
        rating: p.rating,
        review_count: p.review_count,
        place_id: p.place_id,
        source: provider,
        notes:
          provider === "google"
            ? `Found automatically (${query}). ${p.review_count ?? 0} Google reviews${p.rating ? `, ${p.rating}★` : ""}.`
            : `Found automatically on OpenStreetMap (${query}). Check their Google reviews to set a tier.`,
      }));
      const ins = await db.from("leads").upsert(rows, { onConflict: "place_id", ignoreDuplicates: true }).select("business_name");
      if (ins.error) throw new Error(`Saving leads: ${ins.error.message}`);
      result.added = ins.data?.length ?? 0;
      result.names = (ins.data ?? []).map((r) => r.business_name);
    }
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
  }
  return result;
}

/** The scheduled search: takes the next few area × category pairs in rotation, so every combination gets searched over time. */
export async function runScheduledDiscovery(db: Db, s: AutomationSettings) {
  const provider = discoveryProvider();
  const areas = s.discovery_areas.filter((a) => DISCOVERY_AREAS[a]);
  const cats = s.discovery_categories.filter((c) => provider === "google" || osmSupports(c));
  const combos = areas.flatMap((area) => cats.map((category) => ({ area, category })));
  if (!combos.length) return { results: [] as DiscoveryResult[], nextCursor: s.discovery_cursor };

  const n = Math.min(s.discovery_searches_per_run, combos.length);
  const results: DiscoveryResult[] = [];
  const started = Date.now();
  let i = 0;
  for (; i < n; i++) {
    // Vercel stops the job at 60 seconds, so leave the rest for tomorrow if searches are slow.
    if (Date.now() - started > 25000) break;
    const combo = combos[(s.discovery_cursor + i) % combos.length];
    results.push(await discoverLeads(db, combo));
    if (provider === "osm" && i < n - 1) await new Promise((r) => setTimeout(r, 1500)); // be polite to the free server
  }
  return { results, nextCursor: (s.discovery_cursor + i) % combos.length };
}
