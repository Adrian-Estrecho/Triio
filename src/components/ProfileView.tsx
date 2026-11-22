import type { PublicProfile } from "@/lib/types";
import { archivo, brandSerif, jbmono, profileFont } from "@/app/fonts";
import { NameIntro } from "./personal/NameIntro";
import { OwnerEditSheet } from "./personal/OwnerEditSheet";
import { introTimeline } from "./personal/introTimeline";
import { ProfileTabs, type ProfileTab } from "./wallet/ProfileTabs";
import { WalletStack, type ShownPass } from "./wallet/WalletStack";
import { qrPath } from "@/lib/qr";
import { visiblePasses } from "@/lib/wallet";
import { BusinessLayout } from "./profile/BusinessLayout";
import { GamesPanel } from "./profile/GamesPanel";
import { PersonalLayout, type Reveal } from "./profile/PersonalLayout";
import { Glyph, press, profileData } from "./profile/shared";

/** Who is looking at a personal profile (only used for personal cards). */
export type Viewer = { loggedIn: boolean; isOwner: boolean };

/**
 * A tapped card's page. The style follows the profile's kind, set when the card was made:
 * personal → photo-first personal brand; business → brand hero, then products & services.
 */
export function ProfileView({
  profile,
  vcardHref,
  viewer = { loggedIn: false, isOwner: false },
  intro = true,
  preview = false,
  initialTab,
}: {
  profile: PublicProfile;
  vcardHref: string;
  viewer?: Viewer;
  /** Set false to skip the name intro (e.g. right after the owner saves). */
  intro?: boolean;
  /** Live preview inside the owner settings: no edit sheet, no URL or scroll changes. */
  preview?: boolean;
  initialTab?: ProfileTab;
}) {
  const d = profileData(profile, vcardHref);
  const { personal, accent, dark, tint } = d;

  // Wallet tab: only when at least one pass has a QR code.
  const passes: ShownPass[] = visiblePasses(profile.wallet).map((p) => ({ ...p, qr: p.qr_text?.trim() ? qrPath(p.qr_text.trim()) : null }));
  const hasWallet = personal && passes.length > 0;
  // Games tab: only when at least one game ID is filled in.
  const hasGames = personal && d.games.length > 0;
  const hasTabs = hasWallet || hasGames;
  // A plain function (not a component) so the preview can re-render on every keystroke without remounting.
  const wrapTabs = (content: React.ReactNode) =>
    hasTabs ? (
      <ProfileTabs
        tint={tint}
        initialTab={initialTab}
        embedded={preview}
        wallet={hasWallet ? <WalletPanel name={profile.display_name} passes={passes} tint={tint} /> : undefined}
        games={hasGames ? <GamesPanel name={profile.display_name} games={d.games} /> : undefined}
      >
        {content}
      </ProfileTabs>
    ) : (
      content
    );

  const showIntro = personal && intro && profile.intro_enabled !== false;
  const { reveal } = introTimeline(profile.display_name);
  // Personal profiles rise in as the intro leaves (or straight away without an intro).
  const rv: Reveal = (r, className = "", style) =>
    personal ? { className: `${className} reveal`.trim(), style: { ...style, "--r": r } as React.CSSProperties } : { className, style };

  // The "•••" button on a personal card: settings for the owner, log in for anyone else.
  const edit =
    personal && !preview ? (
      <OwnerEditSheet isOwner={viewer.isOwner} loggedIn={viewer.loggedIn} name={profile.display_name} accent={tint} badge={false}>
        <span className={`pp-glass pp-round ${press}`}>
          <Glyph name="dots" className="h-5 w-5" />
        </span>
      </OwnerEditSheet>
    ) : null;

  // Personal pages sit on a deep (or pale) shade of the owner's color; business pages on neutral grey.
  const pageBg = personal ? `color-mix(in srgb, ${accent} ${dark ? "24%, #06070a" : "9%, #f3f3f6"})` : "var(--ios-bg)";

  return (
    <main
      className={`ios ${profileFont.variable} ${archivo.variable} ${jbmono.variable} ${brandSerif.variable} ${dark ? "ios-dark" : "ios-light"} min-h-dvh`}
      style={
        {
          "--pf-bg": pageBg,
          background: "var(--pf-bg)",
          color: "var(--ios-label)",
          "--accent": accent,
          "--on-accent": d.onAccent,
          "--tint": tint,
          ...(showIntro ? { "--reveal-delay": `${reveal}ms` } : {}),
        } as React.CSSProperties
      }
      data-reveal-root=""
    >
      {showIntro && (
        <NameIntro
          name={profile.display_name}
          greeting={profile.intro_greeting?.trim() || "Hi, I’m"}
          tagline={profile.tagline}
          photo={d.logo}
          accent={accent}
          onAccent={d.onAccent}
        />
      )}
      {personal ? (
        wrapTabs(
          <PersonalLayout
            d={d}
            rv={rv}
            edit={edit}
            intro={showIntro}
            bottomPad={hasTabs ? "calc(env(safe-area-inset-bottom) + 124px)" : "calc(env(safe-area-inset-bottom) + 40px)"}
          />
        )
      ) : (
        <BusinessLayout d={d} />
      )}
    </main>
  );
}

/** The Wallet tab: a large title over the stack of passes. */
function WalletPanel({ name, passes, tint }: { name: string; passes: ShownPass[]; tint: string }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-[calc(env(safe-area-inset-top)+28px)] pb-[calc(env(safe-area-inset-bottom)+128px)]">
      <header className="mb-6 flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold uppercase" style={{ color: "var(--ios-secondary)", letterSpacing: "0.08em" }}>
            {name}
          </p>
          <h1 className="font-display mt-1 text-[34px] leading-none font-bold" style={{ fontStretch: "112%", letterSpacing: "-0.035em" }}>
            Wallet
          </h1>
        </div>
        <span className="pb-1 text-[13px] font-medium" style={{ color: "var(--ios-secondary)" }}>
          {passes.length} {passes.length === 1 ? "card" : "cards"}
        </span>
      </header>
      <WalletStack passes={passes} ownerName={name} tint={tint} />
    </div>
  );
}
