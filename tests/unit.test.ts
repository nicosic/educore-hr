import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown";
import { currentPrice, parseEur, vatFromGross } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { localInputToMs, msToLocalInput } from "@/lib/time";
import { parseAdminEmails, safeNextPath } from "@/server/auth";

describe("vrijeme (Europe/Zagreb)", () => {
  it("zimsko vrijeme je UTC+1", () => {
    expect(localInputToMs("2027-02-23T18:00")).toBe(Date.parse("2027-02-23T17:00:00Z"));
  });
  it("ljetno vrijeme je UTC+2", () => {
    expect(localInputToMs("2027-07-01T09:30")).toBe(Date.parse("2027-07-01T07:30:00Z"));
  });
  it("povratna pretvorba daje isti unos", () => {
    for (const v of ["2027-03-28T01:30", "2027-10-31T12:00", "2027-12-31T23:59"]) {
      expect(msToLocalInput(localInputToMs(v)!)).toBe(v);
    }
  });
  it("odbija neispravan unos", () => {
    expect(localInputToMs("2027-02-30T10:00")).toBeNull();
    expect(localInputToMs("sutra")).toBeNull();
  });
});

describe("novac", () => {
  it("parsira hrvatski i engleski zapis", () => {
    expect(parseEur("120")).toBe(12000);
    expect(parseEur("120,5")).toBe(12050);
    expect(parseEur("1.200,50")).toBe(120050);
    expect(parseEur("120.50")).toBe(12050);
    expect(parseEur("12 €")).toBe(1200);
    expect(parseEur("abc")).toBeNull();
    expect(parseEur("-5")).toBeNull();
  });
  it("early bird vrijedi samo do roka", () => {
    const t = { priceCents: 12000, earlyBirdPriceCents: 9900, earlyBirdUntil: 1000 };
    expect(currentPrice(t, 999)).toEqual({ cents: 9900, earlyBird: true });
    expect(currentPrice(t, 1000)).toEqual({ cents: 12000, earlyBird: false });
  });
  it("PDV iz bruto iznosa", () => {
    expect(vatFromGross(12500, 2500)).toBe(2500);
    expect(vatFromGross(10000, 0)).toBe(0);
  });
});

describe("ostalo", () => {
  it("slug bez dijakritika", () => {
    expect(slugify("Kako ostati stabilan? Čašća đžš")).toBe("kako-ostati-stabilan-casca-dzs");
    expect(slugify("Džep")).toBe("dzep");
  });
  it("markdown escapea HTML", () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n- **jedan**\n- dva');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<ul><li><strong>jedan</strong></li><li>dva</li></ul>");
  });
  it("preusmjeravanje samo na relativne putanje", () => {
    expect(safeNextPath("/admin")).toBe("/admin");
    expect(safeNextPath("//evil.example")).toBe("/moj-racun");
    expect(safeNextPath("https://evil.example")).toBe("/moj-racun");
    expect(safeNextPath("/\\evil.example")).toBe("/moj-racun");
  });
  it("popis admin adresa", () => {
    expect([...parseAdminEmails(" A@x.hr, b@y.hr ,")]).toEqual(["a@x.hr", "b@y.hr"]);
  });
});

import { plural } from "@/lib/format";
describe("množina", () => {
  it("karta/karte/karata", () => {
    expect([0, 1, 2, 5, 11, 21, 22, 25].map((n) => plural(n, "karta", "karte", "karata"))).toEqual([
      "karata", "karta", "karte", "karata", "karata", "karta", "karte", "karata",
    ]);
  });
});
