// Pure, framework-agnostic math shared by lib/db.ts (persisted totals),
// lib/pdf/QuoteDocument.tsx (PDF rendering), and the client-side editor
// (real-time totals) — all three must agree on the exact same numbers.

export type QuoteLineInput = {
  quantity: number;
  unit_price: number;
  vat_rate: number;
  discount_type?: "percent" | "amount" | null;
  discount_value?: number | null;
};

export type QuoteLineComputed = {
  gross_ht: number;
  discount_amount: number;
  net_ht: number;
  vat_amount: number;
  total_ttc: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeLineTotals(line: QuoteLineInput): QuoteLineComputed {
  const grossHt = line.quantity * line.unit_price;
  const discountValue = line.discount_value ?? 0;
  const discountAmount =
    line.discount_type === "percent"
      ? grossHt * (discountValue / 100)
      : line.discount_type === "amount"
      ? discountValue
      : 0;
  const netHt = grossHt - discountAmount;
  const vatAmount = netHt * (line.vat_rate / 100);

  return {
    gross_ht: round2(grossHt),
    discount_amount: round2(discountAmount),
    net_ht: round2(netHt),
    vat_amount: round2(vatAmount),
    total_ttc: round2(netHt + vatAmount),
  };
}

export type QuoteTotals = {
  subtotal_ht: number;
  total_discount: number;
  total_vat: number;
  total_ttc: number;
  vat_breakdown: Array<{ rate: number; amount: number }>;
};

export function computeQuoteTotals(lines: QuoteLineInput[]): QuoteTotals {
  let subtotalHt = 0;
  let totalDiscount = 0;
  let totalVat = 0;
  const vatByRate = new Map<number, number>();

  for (const line of lines) {
    const computed = computeLineTotals(line);
    subtotalHt += computed.gross_ht;
    totalDiscount += computed.discount_amount;
    totalVat += computed.vat_amount;
    vatByRate.set(line.vat_rate, (vatByRate.get(line.vat_rate) ?? 0) + computed.vat_amount);
  }

  const totalTtc = subtotalHt - totalDiscount + totalVat;

  return {
    subtotal_ht: round2(subtotalHt),
    total_discount: round2(totalDiscount),
    total_vat: round2(totalVat),
    total_ttc: round2(totalTtc),
    vat_breakdown: [...vatByRate.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([rate, amount]) => ({ rate, amount: round2(amount) })),
  };
}
