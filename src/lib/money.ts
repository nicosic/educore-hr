/** Novac u centima (EUR), cijene su s PDV-om. */

export function formatEur(cents: number) {
  return new Intl.NumberFormat("hr-HR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/** „120,50”, „1.200,50”, „120.50” ili „120” → centi. Vraća null za neispravan unos. */
export function parseEur(input: string): number | null {
  let s = input.trim().replace(/\s|€/g, "");
  // Ako ima zarez, on je decimalni separator, a točke su tisućice; inače je točka decimalna.
  s = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

/** Za polje u formi: 12050 → „120,50”. */
export function centsToInput(cents: number | null | undefined) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",").replace(/,00$/, "");
}

export type PricedTicket = { priceCents: number; earlyBirdPriceCents: number | null; earlyBirdUntil: number | null };

/** Trenutna cijena karte (early bird ako je aktivan). */
export function currentPrice(t: PricedTicket, now: number): { cents: number; earlyBird: boolean } {
  if (t.earlyBirdPriceCents != null && t.earlyBirdUntil != null && now < t.earlyBirdUntil) {
    return { cents: t.earlyBirdPriceCents, earlyBird: true };
  }
  return { cents: t.priceCents, earlyBird: false };
}

/** Iznos PDV-a sadržan u bruto cijeni. */
export function vatFromGross(grossCents: number, vatRateBp: number) {
  if (vatRateBp <= 0) return 0;
  return Math.round((grossCents * vatRateBp) / (10_000 + vatRateBp));
}
