/** Događaji, karte i predavači: upiti i izmjene (admin i javni dio). */
import { and, asc, count, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { ulid } from "ulid";
import { audit } from "@/lib/audit";
import type { Db } from "@/lib/db";
import {
  eventLecturers,
  events,
  lecturers,
  orders,
  registrations,
  ticketTypes,
  type EventStatus,
} from "@/lib/db/schema";
import type { EventInput, LecturerInput, TicketInput } from "./admin-forms";

export type EventRow = typeof events.$inferSelect;
export type TicketRow = typeof ticketTypes.$inferSelect;
export type LecturerRow = typeof lecturers.$inferSelect;

/** Drizzle omata D1 grešku, pa provjeravamo i uzrok (`cause`). */
function isUniqueViolation(e: unknown): boolean {
  for (let cur = e as { message?: string; cause?: unknown } | undefined, i = 0; cur && i < 5; cur = cur.cause as typeof cur, i++) {
    if (String(cur.message ?? cur).includes("UNIQUE constraint failed")) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Admin: događaji
// ---------------------------------------------------------------------------

export async function listEventsAdmin(db: Db) {
  const rows = await db
    .select({
      event: events,
      // Stupac se piše izravno: Drizzle u podupitu ne dodaje naziv tablice, pa bi `id` značio r.id.
      registered: sql<number>`(SELECT COUNT(*) FROM registrations r WHERE r.event_id = "events"."id" AND r.status = 'confirmed')`,
      tickets: sql<number>`(SELECT COUNT(*) FROM ticket_types t WHERE t.event_id = "events"."id")`,
    })
    .from(events)
    .orderBy(desc(events.startsAt));
  return rows;
}

export async function getEventAdmin(db: Db, id: string) {
  const event = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!event) return null;
  const [tickets, lecturerLinks, sold] = await Promise.all([
    db.query.ticketTypes.findMany({ where: eq(ticketTypes.eventId, id), orderBy: [asc(ticketTypes.sort), asc(ticketTypes.createdAt)] }),
    db.query.eventLecturers.findMany({ where: eq(eventLecturers.eventId, id), orderBy: asc(eventLecturers.sort) }),
    soldByTicket(db, id),
  ]);
  return { event, tickets, lecturerIds: lecturerLinks.map((l) => l.lecturerId), sold };
}

export async function createEvent(db: Db, input: EventInput, actorId: string) {
  const id = ulid();
  try {
    await db.insert(events).values({ id, ...input, status: "draft" });
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false as const, errors: { slug: "Ova adresa (slug) je već zauzeta." } };
    throw e;
  }
  await audit(db, { actorId, action: "event.create", entityType: "event", entityId: id });
  return { ok: true as const, id };
}

export async function updateEvent(db: Db, id: string, input: EventInput, actorId: string) {
  try {
    await db
      .update(events)
      .set({ ...input, updatedAt: Date.now() })
      .where(eq(events.id, id));
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false as const, errors: { slug: "Ova adresa (slug) je već zauzeta." } };
    throw e;
  }
  await audit(db, { actorId, action: "event.update", entityType: "event", entityId: id });
  return { ok: true as const };
}

/** Objava traži barem jednu aktivnu kartu. */
export async function setEventStatus(db: Db, id: string, status: EventStatus, actorId: string) {
  if (status === "published") {
    const [{ n }] = await db
      .select({ n: count() })
      .from(ticketTypes)
      .where(and(eq(ticketTypes.eventId, id), eq(ticketTypes.isActive, true)));
    if (n === 0) return { ok: false as const, error: "Za objavu dodajte barem jednu aktivnu kartu." };
  }
  await db.update(events).set({ status, updatedAt: Date.now() }).where(eq(events.id, id));
  await audit(db, { actorId, action: `event.status.${status}`, entityType: "event", entityId: id });
  return { ok: true as const };
}

/** Brisanje je dopušteno samo dok za događaj nema narudžbi. */
export async function deleteEvent(db: Db, id: string, actorId: string) {
  const [{ n }] = await db.select({ n: count() }).from(orders).where(eq(orders.eventId, id));
  if (n > 0) return { ok: false as const, error: "Događaj ima narudžbe i ne može se obrisati. Otkažite ga." };
  await db.delete(events).where(eq(events.id, id));
  await audit(db, { actorId, action: "event.delete", entityType: "event", entityId: id });
  return { ok: true as const };
}

export async function setEventLecturers(db: Db, eventId: string, lecturerIds: string[]) {
  const unique = [...new Set(lecturerIds)];
  await db.batch([
    db.delete(eventLecturers).where(eq(eventLecturers.eventId, eventId)),
    ...unique.map((lecturerId, sort) => db.insert(eventLecturers).values({ eventId, lecturerId, sort })),
  ]);
}

// ---------------------------------------------------------------------------
// Admin: karte
// ---------------------------------------------------------------------------

export async function addTicket(db: Db, eventId: string, input: TicketInput, actorId: string) {
  const id = ulid();
  await db.insert(ticketTypes).values({ id, eventId, ...input });
  await audit(db, { actorId, action: "ticket.create", entityType: "ticket_type", entityId: id });
  return id;
}

export async function updateTicket(db: Db, eventId: string, ticketId: string, input: TicketInput, actorId: string) {
  await db
    .update(ticketTypes)
    .set(input)
    .where(and(eq(ticketTypes.id, ticketId), eq(ticketTypes.eventId, eventId)));
  await audit(db, { actorId, action: "ticket.update", entityType: "ticket_type", entityId: ticketId });
}

/** Karta s prijavama se ne briše (samo deaktivira). */
export async function deleteTicket(db: Db, eventId: string, ticketId: string, actorId: string) {
  const [{ n }] = await db.select({ n: count() }).from(registrations).where(eq(registrations.ticketTypeId, ticketId));
  if (n > 0) return { ok: false as const, error: "Karta ima prijave i ne može se obrisati. Isključite je." };
  await db.delete(ticketTypes).where(and(eq(ticketTypes.id, ticketId), eq(ticketTypes.eventId, eventId)));
  await audit(db, { actorId, action: "ticket.delete", entityType: "ticket_type", entityId: ticketId });
  return { ok: true as const };
}

/** Broj zauzetih mjesta po karti (prijave na čekanju i potvrđene). */
export async function soldByTicket(db: Db, eventId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({ ticketTypeId: registrations.ticketTypeId, n: count() })
    .from(registrations)
    .where(and(eq(registrations.eventId, eventId), ne(registrations.status, "cancelled")))
    .groupBy(registrations.ticketTypeId);
  return Object.fromEntries(rows.map((r) => [r.ticketTypeId, r.n]));
}

// ---------------------------------------------------------------------------
// Admin: predavači
// ---------------------------------------------------------------------------

export function listLecturers(db: Db) {
  return db.query.lecturers.findMany({ orderBy: asc(lecturers.name) });
}

export async function saveLecturer(db: Db, id: string | null, input: LecturerInput, actorId: string) {
  const lecturerId = id ?? ulid();
  try {
    if (id) await db.update(lecturers).set({ ...input, updatedAt: Date.now() }).where(eq(lecturers.id, id));
    else await db.insert(lecturers).values({ id: lecturerId, ...input });
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false as const, errors: { slug: "Ova adresa (slug) je već zauzeta." } };
    throw e;
  }
  await audit(db, { actorId, action: id ? "lecturer.update" : "lecturer.create", entityType: "lecturer", entityId: lecturerId });
  return { ok: true as const, id: lecturerId };
}

export async function deleteLecturer(db: Db, id: string, actorId: string) {
  await db.delete(lecturers).where(eq(lecturers.id, id));
  await audit(db, { actorId, action: "lecturer.delete", entityType: "lecturer", entityId: id });
}

// ---------------------------------------------------------------------------
// Javni dio
// ---------------------------------------------------------------------------

/** Objavljeni događaji koji još nisu završili, od najbližeg. */
export function listPublicEvents(db: Db, now: number) {
  return db.query.events.findMany({
    where: and(eq(events.status, "published"), gte(events.endsAt, now)),
    orderBy: asc(events.startsAt),
  });
}

export async function getPublicEvent(db: Db, slug: string) {
  const event = await db.query.events.findFirst({
    where: and(eq(events.slug, slug), inArray(events.status, ["published", "cancelled", "finished"])),
  });
  if (!event) return null;
  const [tickets, links, sold] = await Promise.all([
    db.query.ticketTypes.findMany({
      where: and(eq(ticketTypes.eventId, event.id), eq(ticketTypes.isActive, true)),
      orderBy: [asc(ticketTypes.sort), asc(ticketTypes.createdAt)],
    }),
    db
      .select({ lecturer: lecturers })
      .from(eventLecturers)
      .innerJoin(lecturers, eq(lecturers.id, eventLecturers.lecturerId))
      .where(eq(eventLecturers.eventId, event.id))
      .orderBy(asc(eventLecturers.sort)),
    soldByTicket(db, event.id),
  ]);
  return { event, tickets, lecturers: links.map((l) => l.lecturer), sold };
}

/** Može li se trenutno prijaviti na događaj (bez obzira na kapacitet karata). */
export function registrationOpen(e: Pick<EventRow, "status" | "startsAt" | "registrationOpensAt" | "registrationClosesAt">, now: number) {
  if (e.status !== "published") return false;
  if (e.registrationOpensAt != null && now < e.registrationOpensAt) return false;
  const closes = e.registrationClosesAt ?? e.startsAt;
  return now < closes;
}

/** Najniža trenutna cijena aktivnih karata po događaju (za popis). */
export async function fromPrices(db: Db, eventIds: string[], now: number): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {};
  const tickets = await db.query.ticketTypes.findMany({
    where: and(inArray(ticketTypes.eventId, eventIds), eq(ticketTypes.isActive, true)),
  });
  const out: Record<string, number> = {};
  for (const t of tickets) {
    const p = t.earlyBirdPriceCents != null && t.earlyBirdUntil != null && now < t.earlyBirdUntil ? t.earlyBirdPriceCents : t.priceCents;
    out[t.eventId] = Math.min(out[t.eventId] ?? Infinity, p);
  }
  return out;
}
