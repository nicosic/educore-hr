import { beforeEach, describe, expect, it } from "vitest";
import { orders, registrations, users } from "@/lib/db/schema";
import { consumeLoginToken, issueLoginToken, loadSessionUser, LOGIN_TOKEN_MS, peekLoginToken } from "@/server/auth";
import { createEvent, addTicket } from "@/server/events";
import { db, eventInput, resetDb, ticketInput } from "./helpers";

const admins = new Set(["admin@educore.test"]);
const T0 = Date.parse("2026-12-01T10:00:00Z");

describe("magic link", () => {
  beforeEach(resetDb);

  it("nepoznata adresa ne dobiva token", async () => {
    expect(await issueLoginToken(db(), "nitko@example.com", { adminEmails: admins, now: T0 })).toBeNull();
  });

  it("adresa iz ADMIN_EMAILS dobiva admin račun", async () => {
    const token = await issueLoginToken(db(), " Admin@EduCore.test ", { adminEmails: admins, now: T0 });
    expect(token).toBeTruthy();
    const u = await db().query.users.findFirst();
    expect(u).toMatchObject({ email: "admin@educore.test", isAdmin: true });
  });

  it("token se može iskoristiti samo jednom i stvara sesiju", async () => {
    const token = (await issueLoginToken(db(), "admin@educore.test", { adminEmails: admins, nextPath: "/admin/predavaci", now: T0 }))!;
    expect(await peekLoginToken(db(), token, T0 + 1000)).toEqual({ email: "admin@educore.test" });
    const first = await consumeLoginToken(db(), token, T0 + 1000);
    expect(first).toMatchObject({ nextPath: "/admin/predavaci", isAdmin: true });
    expect(await consumeLoginToken(db(), token, T0 + 2000)).toBeNull();
    const user = await loadSessionUser(db(), first!.sessionId, T0 + 3000);
    expect(user).toMatchObject({ email: "admin@educore.test", isAdmin: true });
    expect(await loadSessionUser(db(), "krivi-id", T0 + 3000)).toBeNull();
  });

  it("istekli token ne vrijedi", async () => {
    const token = (await issueLoginToken(db(), "admin@educore.test", { adminEmails: admins, now: T0 }))!;
    expect(await consumeLoginToken(db(), token, T0 + LOGIN_TOKEN_MS + 1)).toBeNull();
  });

  it("polaznik s prijavom dobiva obični račun", async () => {
    const ev = await createEvent(db(), eventInput(), "sys");
    if (!ev.ok) throw new Error("event");
    const ticketId = await addTicket(db(), ev.id, ticketInput(), "sys");
    await db().insert(orders).values({
      id: "o1", number: "2027-00001", eventId: ev.id, buyerType: "person", buyerName: "Ana", buyerEmail: "ana@example.com",
      subtotalCents: 12000, vatCents: 2400, totalCents: 12000,
    });
    await db().insert(registrations).values({
      id: "r1", orderId: "o1", eventId: ev.id, ticketTypeId: ticketId, attendeeName: "Ana", attendeeEmail: "ana@example.com", priceCents: 12000,
    });
    expect(await issueLoginToken(db(), "ana@example.com", { adminEmails: admins, now: T0 })).toBeTruthy();
    const u = await db().query.users.findFirst();
    expect(u?.isAdmin).toBe(false);
    void users;
  });
});
