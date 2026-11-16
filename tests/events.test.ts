import { beforeEach, describe, expect, it } from "vitest";
import { orders, registrations } from "@/lib/db/schema";
import { parseEventForm, parseTicketForm } from "@/server/admin-forms";
import {
  addTicket, createEvent, deleteEvent, deleteTicket, getPublicEvent, listPublicEvents, registrationOpen, setEventStatus,
} from "@/server/events";
import { db, eventInput, resetDb, ticketInput } from "./helpers";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("admin forme", () => {
  it("događaj: slug iz naslova, vrijeme po Zagrebu", () => {
    const r = parseEventForm(fd({ title: "Kako ostati stabilan?", academy: "mind-leadership", format: "online", zoomKind: "webinar", startsAt: "2027-02-23T18:00", endsAt: "2027-02-23T20:00" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.slug).toBe("kako-ostati-stabilan");
      expect(r.data.startsAt).toBe(Date.parse("2027-02-23T17:00:00Z"));
    }
  });
  it("događaj: greške na hrvatskom", () => {
    const r = parseEventForm(fd({ title: "Test", academy: "mind-leadership", format: "offline", startsAt: "2027-02-23T18:00", endsAt: "2027-02-23T17:00" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.endsAt).toMatch(/nakon početka/);
      expect(r.errors.venueName).toBeTruthy();
    }
  });
  it("karta: early bird mora biti niži i imati rok", () => {
    const r = parseTicketForm(fd({ name: "Uživo", mode: "onsite", price: "120", earlyBirdPrice: "130" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.earlyBirdPrice).toBeTruthy();
      expect(r.errors.earlyBirdUntil).toBeTruthy();
    }
    const ok = parseTicketForm(fd({ name: "Uživo", mode: "onsite", price: "120,50", vatRate: "25", isActive: "da", capacity: "50" }));
    expect(ok.ok && ok.data).toMatchObject({ priceCents: 12050, vatRateBp: 2500, capacity: 50, isActive: true });
  });
});

describe("događaji u bazi", () => {
  beforeEach(resetDb);

  it("slug mora biti jedinstven", async () => {
    expect((await createEvent(db(), eventInput(), "a")).ok).toBe(true);
    const dup = await createEvent(db(), eventInput(), "a");
    expect(dup.ok).toBe(false);
  });

  it("objava traži aktivnu kartu; javni popis vidi samo objavljene", async () => {
    const ev = await createEvent(db(), eventInput(), "a");
    if (!ev.ok) throw new Error();
    expect((await setEventStatus(db(), ev.id, "published", "a")).ok).toBe(false);
    await addTicket(db(), ev.id, ticketInput(), "a");
    const now = Date.parse("2027-01-01T00:00:00Z");
    expect(await listPublicEvents(db(), now)).toHaveLength(0);
    expect((await setEventStatus(db(), ev.id, "published", "a")).ok).toBe(true);
    expect(await listPublicEvents(db(), now)).toHaveLength(1);
    const pub = await getPublicEvent(db(), "masterclass");
    expect(pub?.tickets).toHaveLength(1);
    expect(registrationOpen(pub!.event, now)).toBe(true);
    expect(registrationOpen(pub!.event, pub!.event.startsAt)).toBe(false);
  });

  it("karta s prijavom i događaj s narudžbom se ne brišu", async () => {
    const ev = await createEvent(db(), eventInput(), "a");
    if (!ev.ok) throw new Error();
    const t = await addTicket(db(), ev.id, ticketInput(), "a");
    await db().insert(orders).values({ id: "o1", number: "N1", eventId: ev.id, buyerType: "person", buyerName: "A", buyerEmail: "a@x.hr", subtotalCents: 1, vatCents: 0, totalCents: 1 });
    await db().insert(registrations).values({ id: "r1", orderId: "o1", eventId: ev.id, ticketTypeId: t, attendeeName: "A", attendeeEmail: "a@x.hr", priceCents: 1 });
    expect((await deleteTicket(db(), ev.id, t, "a")).ok).toBe(false);
    expect((await deleteEvent(db(), ev.id, "a")).ok).toBe(false);
    const pub = await getPublicEvent(db(), "masterclass");
    expect(pub).toBeNull(); // nacrt nije javan
  });

  it("isti polaznik ne može imati dvije aktivne prijave na isti događaj", async () => {
    const ev = await createEvent(db(), eventInput(), "a");
    if (!ev.ok) throw new Error();
    const t = await addTicket(db(), ev.id, ticketInput(), "a");
    await db().insert(orders).values({ id: "o1", number: "N1", eventId: ev.id, buyerType: "person", buyerName: "A", buyerEmail: "a@x.hr", subtotalCents: 1, vatCents: 0, totalCents: 1 });
    const reg = { orderId: "o1", eventId: ev.id, ticketTypeId: t, attendeeName: "A", attendeeEmail: "a@x.hr", priceCents: 1 };
    await db().insert(registrations).values({ id: "r1", ...reg });
    await expect(db().insert(registrations).values({ id: "r2", ...reg })).rejects.toThrow();
    await db().insert(registrations).values({ id: "r3", ...reg, attendeeEmail: "b@x.hr", status: "cancelled" });
  });
});

describe("admin popis", () => {
  beforeEach(resetDb);
  it("broji karte po događaju", async () => {
    const { listEventsAdmin } = await import("@/server/events");
    const ev = await createEvent(db(), eventInput(), "a");
    if (!ev.ok) throw new Error();
    await addTicket(db(), ev.id, ticketInput(), "a");
    await addTicket(db(), ev.id, ticketInput({ name: "Online", mode: "online" }), "a");
    const rows = await listEventsAdmin(db());
    expect(rows[0].tickets).toBe(2);
    expect(rows[0].registered).toBe(0);
  });
});
