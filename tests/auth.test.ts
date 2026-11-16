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

import { previewCodeAllows } from "@/server/auth";
describe("pristupni kod za preview", () => {
  const base = { appEnv: "preview", configuredCode: "tajni-kod-od-barem-16", givenCode: "tajni-kod-od-barem-16", email: "Admin@educore.test", adminEmails: admins };
  it("propušta samo ispravan kod za admina na previewu", async () => {
    expect(await previewCodeAllows(base)).toBe(true);
    expect(await previewCodeAllows({ ...base, givenCode: "krivi-kod-od-barem-16" })).toBe(false);
    expect(await previewCodeAllows({ ...base, email: "netko@example.com" })).toBe(false);
  });
  it("kratak kod je dopušten", async () => {
    expect(await previewCodeAllows({ ...base, configuredCode: "007", givenCode: " 007 " })).toBe(true);
    expect(await previewCodeAllows({ ...base, configuredCode: "007", givenCode: "008" })).toBe(false);
  });
  it("nikad u produkciji ni lokalno, ni bez koda", async () => {
    expect(await previewCodeAllows({ ...base, appEnv: "production" })).toBe(false);
    expect(await previewCodeAllows({ ...base, appEnv: "local" })).toBe(false);
    expect(await previewCodeAllows({ ...base, configuredCode: "007", givenCode: "" })).toBe(false);
    expect(await previewCodeAllows({ ...base, configuredCode: undefined })).toBe(false);
  });
});

import { PREVIEW_CODE_MAX_FAILURES, previewCodeLocked, recordPreviewCodeFailure } from "@/server/auth";
describe("zaključavanje pristupnog koda", () => {
  beforeEach(resetDb);
  it("nakon 10 krivih kodova u 24 h adresa je zaključana", async () => {
    for (let i = 0; i < PREVIEW_CODE_MAX_FAILURES - 1; i++) await recordPreviewCodeFailure(db(), "admin@educore.test", T0 + i);
    expect(await previewCodeLocked(db(), "Admin@educore.test", T0 + 100)).toBe(false);
    await recordPreviewCodeFailure(db(), "admin@educore.test", T0 + 50);
    expect(await previewCodeLocked(db(), "admin@educore.test", T0 + 100)).toBe(true);
    expect(await previewCodeLocked(db(), "druga@educore.test", T0 + 100)).toBe(false);
    expect(await previewCodeLocked(db(), "admin@educore.test", T0 + 25 * 3_600_000)).toBe(false);
  });
});
