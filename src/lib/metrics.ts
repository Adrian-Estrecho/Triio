import { DIRECT_COST_CATEGORIES } from "./constants";
import type { Batch, Expense } from "./types";

export type CostSummary = {
  directSpend: number;
  operatingSpend: number;
  totalSpend: number;
  attempted: number;
  sellable: number;
  defectRate: number | null;
  costPerSellable: number | null;
  plannedMaterialCost: number | null;
  minutesPerCard: number | null;
  byCategory: Record<string, number>;
};

export function summarizeCosts(expenses: Expense[], batches: Batch[]): CostSummary {
  const byCategory: Record<string, number> = {};
  let directSpend = 0;
  let operatingSpend = 0;

  for (const e of expenses) {
    const amt = Number(e.amount);
    byCategory[e.category] = (byCategory[e.category] ?? 0) + amt;
    if (DIRECT_COST_CATEGORIES.includes(e.category)) directSpend += amt;
    else operatingSpend += amt;
  }

  const attempted = batches.reduce((s, b) => s + b.attempted, 0);
  const sellable = batches.reduce((s, b) => s + b.sellable, 0);
  const minutes = batches.reduce((s, b) => s + (b.minutes_spent ?? 0), 0);

  // "Planned" cost per card from purchase yields: Σ(amount ÷ yield) for the latest purchase of each direct category.
  const latest = new Map<string, Expense>();
  for (const e of [...expenses].sort((a, b) => a.spent_on.localeCompare(b.spent_on))) {
    if (DIRECT_COST_CATEGORIES.includes(e.category) && e.yield_cards && e.yield_cards > 0) latest.set(e.category, e);
  }
  const planned = latest.size ? [...latest.values()].reduce((s, e) => s + Number(e.amount) / Number(e.yield_cards), 0) : null;

  return {
    directSpend,
    operatingSpend,
    totalSpend: directSpend + operatingSpend,
    attempted,
    sellable,
    defectRate: attempted ? (attempted - sellable) / attempted : null,
    costPerSellable: sellable ? directSpend / sellable : null,
    plannedMaterialCost: planned,
    minutesPerCard: sellable && minutes ? minutes / sellable : null,
    byCategory,
  };
}

/** Cards that an order uses (barber pack = 3 cards). */
export function cardsInOrder(product: string, quantity: number) {
  return product === "barber_pack" ? quantity * 3 : quantity;
}
