import type { PublicProfile } from "./types";

function esc(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** vCard 3.0 — the most widely supported version on iPhone and Android. */
export function buildVCard(p: PublicProfile, profileUrl: string) {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${esc(p.display_name)}`, `ORG:${esc(p.display_name)}`];
  if (p.phone) lines.push(`TEL;TYPE=WORK,VOICE:${esc(p.phone)}`);
  if (p.email) lines.push(`EMAIL;TYPE=WORK,INTERNET:${esc(p.email)}`);
  if (p.website) lines.push(`URL:${esc(p.website)}`);
  lines.push(`URL;TYPE=Profile:${esc(profileUrl)}`);
  if (p.address) lines.push(`ADR;TYPE=WORK:;;${esc(p.address)};;;;`);
  if (p.logo_url) lines.push(`PHOTO;VALUE=URI:${p.logo_url}`);
  const note = [p.tagline, p.facebook && `Facebook: ${p.facebook}`, p.instagram && `Instagram: ${p.instagram}`]
    .filter((v): v is string => Boolean(v))
    .map(esc)
    .join("\\n");
  if (note) lines.push(`NOTE:${note}`);
  lines.push("END:VCARD");
  return lines.join("\r\n") + "\r\n";
}
