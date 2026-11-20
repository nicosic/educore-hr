/**
 * meet.hr shema (D1 / SQLite, Drizzle).
 *
 * Konvencije (kao u akredo-hr):
 * - ID-jevi su ULID tekst.
 * - Trenuci su Unix milisekunde (`integer`, *_at).
 * - "Enumi" su `text` s CHECK ograničenjem.
 * - Novac je u centima (`*_cents`), s PDV-om (bruto). Stope su u baznim bodovima (2500 = 25 %).
 */
import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch('subsec') * 1000)`;
const createdAt = () => integer("created_at").notNull().default(now);
const updatedAt = () => integer("updated_at").notNull().default(now);

// ---------------------------------------------------------------------------
// Korisnici i prijava
// ---------------------------------------------------------------------------

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
  lastLoginAt: integer("last_login_at"),
});

/** Jednokratni tokeni (magic link). Sprema se samo SHA-256 hash tokena. */
export const authTokens = sqliteTable(
  "auth_tokens",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    email: text("email").notNull(),
    purpose: text("purpose", { enum: ["login"] }).notNull(),
    /** Relativna putanja na koju se vraća nakon prijave. */
    nextPath: text("next_path"),
    expiresAt: integer("expires_at").notNull(),
    usedAt: integer("used_at"),
    createdAt: createdAt(),
  },
  (t) => [index("auth_tokens_expires_idx").on(t.expiresAt)],
);

/** Sesije. ID u kolačiću je nasumičan; u bazi je njegov hash. */
export const sessions = sqliteTable(
  "sessions",
  {
    idHash: text("id_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    at: integer("at").notNull().default(now),
    actorType: text("actor_type", { enum: ["user", "system"] }).notNull(),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    /** Bez osobnih podataka. */
    metaJson: text("meta_json"),
  },
  (t) => [index("audit_log_at_idx").on(t.at), index("audit_log_entity_idx").on(t.entityType, t.entityId)],
);

// ---------------------------------------------------------------------------
// Predavači i događaji
// ---------------------------------------------------------------------------

export const lecturers = sqliteTable("lecturers", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** Npr. „prof. dr. sc., specijalist psihijatrije”. */
  title: text("title"),
  bio: text("bio"),
  photoKey: text("photo_key"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const ACADEMY_SLUGS = [
  "mind-leadership",
  "procurement-tech",
  "legal-contracts",
  "cyber-digital",
  "governance-compliance",
  "people-performance",
] as const;
export const EVENT_FORMATS = ["offline", "online", "hybrid"] as const;
export const EVENT_STATUSES = ["draft", "published", "cancelled", "finished"] as const;
export const ZOOM_KINDS = ["meeting", "webinar"] as const;

export type EventFormat = (typeof EVENT_FORMATS)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    /** Kratki podnaslov / ključno pitanje. */
    subtitle: text("subtitle"),
    academy: text("academy", { enum: ACADEMY_SLUGS }).notNull(),
    format: text("format", { enum: EVENT_FORMATS }).notNull(),
    status: text("status", { enum: EVENT_STATUSES }).notNull().default("draft"),
    startsAt: integer("starts_at").notNull(),
    endsAt: integer("ends_at").notNull(),
    timezone: text("timezone").notNull().default("Europe/Zagreb"),
    venueName: text("venue_name"),
    venueAddress: text("venue_address"),
    city: text("city"),
    summary: text("summary"),
    /** Opis u jednostavnom Markdownu (odlomci, liste, podebljano). */
    description: text("description"),
    /** Teme, odvojene zarezom. */
    tags: text("tags"),
    coverKey: text("cover_key"),
    zoomKind: text("zoom_kind", { enum: ZOOM_KINDS }),
    zoomId: text("zoom_id"),
    akredoEventId: text("akredo_event_id"),
    registrationOpensAt: integer("registration_opens_at"),
    registrationClosesAt: integer("registration_closes_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("events_status_starts_idx").on(t.status, t.startsAt),
    check("events_format_check", sql`${t.format} IN ('offline','online','hybrid')`),
    check("events_status_check", sql`${t.status} IN ('draft','published','cancelled','finished')`),
    check("events_time_check", sql`${t.endsAt} > ${t.startsAt}`),
  ],
);

export const eventLecturers = sqliteTable(
  "event_lecturers",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    lecturerId: text("lecturer_id")
      .notNull()
      .references(() => lecturers.id, { onDelete: "cascade" }),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.lecturerId] })],
);

export const TICKET_MODES = ["onsite", "online"] as const;
export type TicketMode = (typeof TICKET_MODES)[number];

export const ticketTypes = sqliteTable(
  "ticket_types",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    mode: text("mode", { enum: TICKET_MODES }).notNull(),
    priceCents: integer("price_cents").notNull(),
    earlyBirdPriceCents: integer("early_bird_price_cents"),
    earlyBirdUntil: integer("early_bird_until"),
    vatRateBp: integer("vat_rate_bp").notNull().default(2500),
    /** Klasifikacija proizvoda (KPD) za eRačun. */
    kpdCode: text("kpd_code"),
    /** null = bez ograničenja. */
    capacity: integer("capacity"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("ticket_types_event_idx").on(t.eventId),
    check("ticket_types_mode_check", sql`${t.mode} IN ('onsite','online')`),
    check("ticket_types_price_check", sql`${t.priceCents} >= 0`),
  ],
);

// ---------------------------------------------------------------------------
// Popusti
// ---------------------------------------------------------------------------

export const discountCodes = sqliteTable(
  "discount_codes",
  {
    id: text("id").primaryKey(),
    /** Velika slova, bez razmaka. */
    code: text("code").notNull().unique(),
    kind: text("kind", { enum: ["percent", "fixed"] }).notNull(),
    /** percent: bazni bodovi (1000 = 10 %); fixed: centi po polazniku. */
    value: integer("value").notNull(),
    /** null = vrijedi za sve događaje. */
    eventId: text("event_id").references(() => events.id, { onDelete: "cascade" }),
    validFrom: integer("valid_from"),
    validUntil: integer("valid_until"),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [check("discount_codes_kind_check", sql`${t.kind} IN ('percent','fixed')`)],
);

/** Grupni popust: od `min_qty` polaznika u jednoj narudžbi. */
export const groupDiscounts = sqliteTable("group_discounts", {
  id: text("id").primaryKey(),
  /** null = vrijedi za sve događaje. */
  eventId: text("event_id").references(() => events.id, { onDelete: "cascade" }),
  minQty: integer("min_qty").notNull(),
  percentBp: integer("percent_bp").notNull(),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Narudžbe i prijave polaznika
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = ["pending", "awaiting_transfer", "paid", "cancelled", "refunded"] as const;

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    /** Broj za ponudu i poziv na broj, npr. 2027-00042. */
    number: text("number").notNull().unique(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    userId: text("user_id").references(() => users.id),
    buyerType: text("buyer_type", { enum: ["person", "company"] }).notNull(),
    buyerName: text("buyer_name").notNull(),
    buyerEmail: text("buyer_email").notNull(),
    companyName: text("company_name"),
    companyOib: text("company_oib"),
    companyAddress: text("company_address"),
    status: text("status", { enum: ORDER_STATUSES }).notNull().default("pending"),
    paymentMethod: text("payment_method", { enum: ["card", "bank_transfer", "free"] }),
    stripeSessionId: text("stripe_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    discountCodeId: text("discount_code_id").references(() => discountCodes.id),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    vatCents: integer("vat_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    createdAt: createdAt(),
    expiresAt: integer("expires_at"),
    paidAt: integer("paid_at"),
    cancelledAt: integer("cancelled_at"),
  },
  (t) => [
    index("orders_event_idx").on(t.eventId),
    index("orders_status_idx").on(t.status, t.expiresAt),
    check(
      "orders_status_check",
      sql`${t.status} IN ('pending','awaiting_transfer','paid','cancelled','refunded')`,
    ),
  ],
);

export const REGISTRATION_STATUSES = ["pending", "confirmed", "cancelled"] as const;

/** Jedan red po polazniku. */
export const registrations = sqliteTable(
  "registrations",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    ticketTypeId: text("ticket_type_id")
      .notNull()
      .references(() => ticketTypes.id),
    userId: text("user_id").references(() => users.id),
    attendeeName: text("attendee_name").notNull(),
    attendeeEmail: text("attendee_email").notNull(),
    status: text("status", { enum: REGISTRATION_STATUSES }).notNull().default("pending"),
    priceCents: integer("price_cents").notNull(),
    zoomRegistrantId: text("zoom_registrant_id"),
    zoomJoinUrl: text("zoom_join_url"),
    akredoRegistrationId: text("akredo_registration_id"),
    attendedAt: integer("attended_at"),
    attendanceSource: text("attendance_source", { enum: ["zoom", "checkin", "manual"] }),
    certificateKey: text("certificate_key"),
    createdAt: createdAt(),
  },
  (t) => [
    index("registrations_event_idx").on(t.eventId, t.status),
    index("registrations_order_idx").on(t.orderId),
    index("registrations_email_idx").on(t.attendeeEmail),
    // Jedan polaznik (e-pošta) ima najviše jednu aktivnu prijavu po događaju.
    uniqueIndex("registrations_event_email_active_uq")
      .on(t.eventId, t.attendeeEmail)
      .where(sql`status <> 'cancelled'`),
  ],
);

export const waitlist = sqliteTable(
  "waitlist",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    ticketTypeId: text("ticket_type_id").references(() => ticketTypes.id, { onDelete: "set null" }),
    name: text("name"),
    email: text("email").notNull(),
    createdAt: createdAt(),
    notifiedAt: integer("notified_at"),
  },
  (t) => [uniqueIndex("waitlist_event_email_uq").on(t.eventId, t.email)],
);

export const materials = sqliteTable("materials", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  fileKey: text("file_key").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  /** Polaznici vide materijal od ovog trenutka (null = odmah). */
  visibleFrom: integer("visible_from"),
  createdAt: createdAt(),
});

export const inquiries = sqliteTable("inquiries", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["tvrtke", "kontakt"] }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  phone: text("phone"),
  size: text("size"),
  academy: text("academy"),
  message: text("message").notNull(),
  handledAt: integer("handled_at"),
  createdAt: createdAt(),
});
