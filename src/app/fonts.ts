import { Archivo, Inter, JetBrains_Mono } from "next/font/google";

/** Public profile font: close to SF Pro, so the card looks the same on iPhone, Android and desktop. */
export const profileFont = Inter({
  subsets: ["latin"],
  variable: "--font-profile",
  display: "swap",
});

/** Marketing-page fonts. Archivo's width axis gives the expanded, embossed-card headlines. */
export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const jbmono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-jbmono",
  display: "swap",
});

export const marketingFonts = `${archivo.variable} ${jbmono.variable}`;
