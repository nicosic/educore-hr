/**
 * Parsiranje i validacija admin formi (događaj, karta, predavač).
 * Vraća ili gotove vrijednosti za bazu ili poruke grešaka po polju, na hrvatskom.
 */
import { z } from "zod";
import { ACADEMY_SLUGS, EVENT_FORMATS, TICKET_MODES, ZOOM_KINDS } from "@/lib/db/schema";
import { centsToInput, parseEur } from "@/lib/money";
import { isSlug, slugify } from "@/lib/slug";
import { DEFAULT_TZ, localInputToMs, msToLocalInput } from "@/lib/time";
import type { EventRow, TicketRow } from "./events";

export type FieldErrors = Record<string, string>;
export type ParseResult<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors; values: Record<string, string> };

function values(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") out[k] = v.trim();
  return out;
}

const optional = (max: number) =>
  z
    .string()
    .max(max, `Najviše ${max} znakova.`)
    .transform((s) => (s === "" ? null : s));

// ---------------------------------------------------------------------------
// Događaj
// ---------------------------------------------------------------------------

const EventSchema = z.object({
  title: z.string().min(3, "Upišite naslov.").max(160),
  slug: z.string().max(80),
  subtitle: optional(240),
  academy: z.enum(ACADEMY_SLUGS, { message: "Odaberite akademiju." }),
  format: z.enum(EVENT_FORMATS, { message: "Odaberite format." }),
  startsAt: z.string(),
  endsAt: z.string(),
  venueName: optional(160),
  venueAddress: optional(240),
  city: optional(80),
  summary: optional(400),
  description: optional(20_000),
  tags: optional(240),
  zoomKind: z.enum(["", ...ZOOM_KINDS]).transform((s) => (s === "" ? null : s)),
  registrationClosesAt: z.string(),
});

export type EventInput = {
  title: string;
  slug: string;
  subtitle: string | null;
  academy: (typeof ACADEMY_SLUGS)[number];
  format: (typeof EVENT_FORMATS)[number];
  startsAt: number;
  endsAt: number;
  timezone: string;
  venueName: string | null;
  venueAddress: string | null;
  city: string | null;
  summary: string | null;
  description: string | null;
  tags: string | null;
  zoomKind: (typeof ZOOM_KINDS)[number] | null;
  registrationClosesAt: number | null;
};

export function parseEventForm(form: FormData): ParseResult<EventInput> {
  const v = values(form);
  const r = EventSchema.safeParse({
    ...v,
    slug: v.slug ?? "",
    subtitle: v.subtitle ?? "",
    venueName: v.venueName ?? "",
    venueAddress: v.venueAddress ?? "",
    city: v.city ?? "",
    summary: v.summary ?? "",
    description: v.description ?? "",
    tags: v.tags ?? "",
    zoomKind: v.zoomKind ?? "",
    registrationClosesAt: v.registrationClosesAt ?? "",
    startsAt: v.startsAt ?? "",
    endsAt: v.endsAt ?? "",
  });
  const errors: FieldErrors = {};
  if (!r.success) {
    for (const i of r.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, errors, values: v };
  }
  const d = r.data;
  const slug = d.slug ? d.slug.toLowerCase() : slugify(d.title);
  if (!isSlug(slug)) errors.slug = "Samo mala slova, brojke i crtice.";
  const startsAt = localInputToMs(d.startsAt, DEFAULT_TZ);
  const endsAt = localInputToMs(d.endsAt, DEFAULT_TZ);
  if (startsAt == null) errors.startsAt = "Upišite početak.";
  if (endsAt == null) errors.endsAt = "Upišite završetak.";
  if (startsAt != null && endsAt != null && endsAt <= startsAt) errors.endsAt = "Završetak mora biti nakon početka.";
  const registrationClosesAt = d.registrationClosesAt ? localInputToMs(d.registrationClosesAt, DEFAULT_TZ) : null;
  if (d.registrationClosesAt && registrationClosesAt == null) errors.registrationClosesAt = "Neispravan datum.";
  if (d.format !== "online" && !d.venueName) errors.venueName = "Upišite mjesto održavanja.";
  if (d.format !== "offline" && !d.zoomKind) errors.zoomKind = "Odaberite vrstu Zoom sastanka.";
  if (Object.keys(errors).length) return { ok: false, errors, values: v };

  return {
    ok: true,
    data: {
      ...d,
      slug,
      startsAt: startsAt!,
      endsAt: endsAt!,
      timezone: DEFAULT_TZ,
      zoomKind: d.format === "offline" ? null : d.zoomKind,
      registrationClosesAt,
    },
  };
}

// ---------------------------------------------------------------------------
// Karta
// ---------------------------------------------------------------------------

export type TicketInput = {
  name: string;
  description: string | null;
  mode: (typeof TICKET_MODES)[number];
  priceCents: number;
  earlyBirdPriceCents: number | null;
  earlyBirdUntil: number | null;
  vatRateBp: number;
  kpdCode: string | null;
  capacity: number | null;
  isActive: boolean;
  sort: number;
};

export function parseTicketForm(form: FormData): ParseResult<TicketInput> {
  const v = values(form);
  const errors: FieldErrors = {};
  const name = v.name ?? "";
  if (name.length < 2 || name.length > 120) errors.name = "Upišite naziv karte.";
  const mode = v.mode as TicketInput["mode"];
  if (!TICKET_MODES.includes(mode)) errors.mode = "Odaberite način sudjelovanja.";
  const priceCents = parseEur(v.price ?? "");
  if (priceCents == null) errors.price = "Upišite cijenu, npr. 120 ili 120,50.";
  const earlyBirdPriceCents = v.earlyBirdPrice ? parseEur(v.earlyBirdPrice) : null;
  if (v.earlyBirdPrice && earlyBirdPriceCents == null) errors.earlyBirdPrice = "Neispravna cijena.";
  const earlyBirdUntil = v.earlyBirdUntil ? localInputToMs(v.earlyBirdUntil) : null;
  if (v.earlyBirdUntil && earlyBirdUntil == null) errors.earlyBirdUntil = "Neispravan datum.";
  if ((earlyBirdPriceCents == null) !== (earlyBirdUntil == null)) {
    errors.earlyBirdUntil ??= "Za early bird upišite i cijenu i rok.";
  }
  if (earlyBirdPriceCents != null && priceCents != null && earlyBirdPriceCents >= priceCents) {
    errors.earlyBirdPrice = "Early bird cijena mora biti niža od redovne.";
  }
  const vat = Number(v.vatRate ?? "25");
  if (![0, 5, 13, 25].includes(vat)) errors.vatRate = "Stopa PDV-a mora biti 0, 5, 13 ili 25 %.";
  const capacity = v.capacity ? Number(v.capacity) : null;
  if (capacity != null && (!Number.isInteger(capacity) || capacity < 1)) errors.capacity = "Kapacitet mora biti cijeli broj veći od 0.";
  const kpdCode = v.kpdCode ? v.kpdCode : null;
  if (kpdCode && !/^\d{2}(\.\d{1,2}){0,3}$/.test(kpdCode)) errors.kpdCode = "KPD šifra, npr. 85.59.";
  if (Object.keys(errors).length) return { ok: false, errors, values: v };
  return {
    ok: true,
    data: {
      name,
      description: v.description ? v.description.slice(0, 400) : null,
      mode,
      priceCents: priceCents!,
      earlyBirdPriceCents,
      earlyBirdUntil,
      vatRateBp: vat * 100,
      kpdCode,
      capacity,
      isActive: v.isActive === "da",
      sort: Number(v.sort ?? 0) || 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Predavač
// ---------------------------------------------------------------------------

export type LecturerInput = { name: string; slug: string; title: string | null; bio: string | null };

export function parseLecturerForm(form: FormData): ParseResult<LecturerInput> {
  const v = values(form);
  const errors: FieldErrors = {};
  const name = v.name ?? "";
  if (name.length < 2 || name.length > 120) errors.name = "Upišite ime i prezime.";
  const slug = (v.slug || slugify(name)).toLowerCase();
  if (!isSlug(slug)) errors.slug = "Samo mala slova, brojke i crtice.";
  if ((v.title ?? "").length > 200) errors.title = "Najviše 200 znakova.";
  if ((v.bio ?? "").length > 5000) errors.bio = "Najviše 5000 znakova.";
  if (Object.keys(errors).length) return { ok: false, errors, values: v };
  return { ok: true, data: { name, slug, title: v.title || null, bio: v.bio || null } };
}

// ---------------------------------------------------------------------------
// Vrijednosti iz baze za prikaz u formi
// ---------------------------------------------------------------------------


export function eventToValues(e: EventRow): Record<string, string> {
  return {
    title: e.title,
    slug: e.slug,
    subtitle: e.subtitle ?? "",
    academy: e.academy,
    format: e.format,
    startsAt: msToLocalInput(e.startsAt, e.timezone),
    endsAt: msToLocalInput(e.endsAt, e.timezone),
    venueName: e.venueName ?? "",
    venueAddress: e.venueAddress ?? "",
    city: e.city ?? "",
    summary: e.summary ?? "",
    description: e.description ?? "",
    tags: e.tags ?? "",
    zoomKind: e.zoomKind ?? "",
    registrationClosesAt: msToLocalInput(e.registrationClosesAt, e.timezone),
  };
}

export function ticketToValues(t: TicketRow): Record<string, string> {
  return {
    name: t.name,
    description: t.description ?? "",
    mode: t.mode,
    price: centsToInput(t.priceCents),
    earlyBirdPrice: centsToInput(t.earlyBirdPriceCents),
    earlyBirdUntil: msToLocalInput(t.earlyBirdUntil),
    vatRate: String(t.vatRateBp / 100),
    kpdCode: t.kpdCode ?? "",
    capacity: t.capacity == null ? "" : String(t.capacity),
    isActive: t.isActive ? "da" : "",
    sort: String(t.sort),
  };
}
