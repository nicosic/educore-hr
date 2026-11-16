import { env } from "cloudflare:workers";
import { createDb } from "@/lib/db";
import type { EventInput, TicketInput } from "@/server/admin-forms";

export const db = () => createDb(env.DB);

export async function resetDb() {
  const tables = [
    "audit_log", "sessions", "auth_tokens", "registrations", "orders", "waitlist", "materials",
    "event_lecturers", "ticket_types", "discount_codes", "group_discounts", "events", "lecturers", "users", "inquiries",
  ];
  await env.DB.batch(tables.map((t) => env.DB.prepare(`DELETE FROM ${t}`)));
}

export const eventInput = (over: Partial<EventInput> = {}): EventInput => ({
  title: "Masterclass",
  slug: "masterclass",
  subtitle: null,
  academy: "mind-leadership",
  format: "hybrid",
  startsAt: Date.parse("2027-02-23T17:00:00Z"),
  endsAt: Date.parse("2027-02-23T19:00:00Z"),
  timezone: "Europe/Zagreb",
  venueName: "Dvorana",
  venueAddress: null,
  city: "Zagreb",
  summary: null,
  description: null,
  tags: null,
  zoomKind: "meeting",
  registrationClosesAt: null,
  ...over,
});

export const ticketInput = (over: Partial<TicketInput> = {}): TicketInput => ({
  name: "Uživo",
  description: null,
  mode: "onsite",
  priceCents: 12000,
  earlyBirdPriceCents: null,
  earlyBirdUntil: null,
  vatRateBp: 2500,
  kpdCode: null,
  capacity: 10,
  isActive: true,
  sort: 0,
  ...over,
});
