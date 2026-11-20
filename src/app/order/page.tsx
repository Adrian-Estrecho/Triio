import type { Metadata } from "next";
import { marketingFonts } from "../fonts";
import { shopProduct } from "@/lib/shop";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";
import { OrderForm } from "./form";

export const metadata: Metadata = {
  title: "Order a card",
  description: "Order a Triio NFC review or profile card. Nothing to pay until we confirm your order.",
};

type SP = Promise<{ product?: string }>;

export default async function OrderPage({ searchParams }: { searchParams: SP }) {
  const { product } = await searchParams;
  const initial = shopProduct(product)?.value ?? "review_card";

  return (
    <div className={`mk ${marketingFonts} min-h-dvh bg-paper text-navy`}>
      <SiteHeader minimal />
      <main className="mx-auto w-full max-w-6xl px-4 pt-10 pb-24 sm:px-6 md:pt-14">
        <p className="text-sm font-semibold text-sky-700">Order</p>
        <h1 className="display mt-3 text-[clamp(2.2rem,5vw,3.8rem)]">Get your cards made.</h1>
        <p className="mt-4 max-w-xl text-lg text-slate-ink">
          Tell us what you need. We&apos;ll message you within one business day to confirm the details and send a design proof. Nothing is charged
          until then.
        </p>
        <div className="mt-10">
          <OrderForm initialProduct={initial} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
