/**
 * Prijava magic linkom (po uzoru na akredo-hr):
 * - jednokratni token vrijedi 15 min, u bazi je samo njegov SHA-256 hash;
 * - sesija traje 30 dana, u kolačiću je nasumični ID, a u bazi njegov hash;
 * - odgovor je isti postoji li račun ili ne (ne otkrivamo tko je registriran).
 *
 * Tko se može prijaviti: postojeći korisnik, adresa iz ADMIN_EMAILS (račun se stvara i dobiva admin prava)
 * i polaznik koji ima prijavu na događaj (račun se stvara pri prvoj prijavi).
 */
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { ulid } from "ulid";
import { audit } from "@/lib/audit";
import { randomToken, sha256Hex } from "@/lib/crypto";
import type { Db } from "@/lib/db";
import { authTokens, registrations, sessions, users } from "@/lib/db/schema";

export const SESSION_COOKIE = "__Host-educore_session";
export const SESSION_DAYS = 30;
export const LOGIN_TOKEN_MS = 15 * 60 * 1000;

export type SessionUser = { id: string; email: string; name: string | null; isAdmin: boolean };

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function parseAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map(normalizeEmail)
      .filter(Boolean),
  );
}

/** Dopuštamo samo relativne putanje unutar stranice (bez otvorenog preusmjeravanja). */
export function safeNextPath(next: string | null | undefined, fallback = "/moj-racun"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** Pronalazi ili stvara korisnika koji se smije prijaviti; inače null. */
async function resolveLoginUser(db: Db, email: string, adminEmails: Set<string>, now: number) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  const shouldBeAdmin = adminEmails.has(email);
  if (existing) {
    if (shouldBeAdmin && !existing.isAdmin) {
      await db.update(users).set({ isAdmin: true }).where(eq(users.id, existing.id));
    }
    return existing;
  }
  if (!shouldBeAdmin) {
    const reg = await db.query.registrations.findFirst({
      columns: { id: true },
      where: eq(registrations.attendeeEmail, email),
    });
    if (!reg) return null;
  }
  const id = ulid(now);
  await db.insert(users).values({ id, email, isAdmin: shouldBeAdmin, createdAt: now });
  return { id };
}

/** Izdaje token za prijavu ili null ako se adresa ne smije prijaviti. */
export async function issueLoginToken(
  db: Db,
  rawEmail: string,
  opts: { adminEmails: Set<string>; nextPath?: string | null; now: number },
): Promise<string | null> {
  const email = normalizeEmail(rawEmail);
  const user = await resolveLoginUser(db, email, opts.adminEmails, opts.now);
  if (!user) return null;
  const token = randomToken(32);
  await db.insert(authTokens).values({
    id: ulid(opts.now),
    tokenHash: await sha256Hex(token),
    email,
    purpose: "login",
    nextPath: opts.nextPath ? safeNextPath(opts.nextPath) : null,
    expiresAt: opts.now + LOGIN_TOKEN_MS,
    createdAt: opts.now,
  });
  return token;
}

/** Provjerava je li token još valjan, bez trošenja (za stranicu potvrde). */
export async function peekLoginToken(db: Db, token: string, now: number) {
  const row = await db.query.authTokens.findFirst({
    columns: { email: true },
    where: and(eq(authTokens.tokenHash, await sha256Hex(token)), isNull(authTokens.usedAt), gt(authTokens.expiresAt, now)),
  });
  return row ?? null;
}

/** Troši token (jednokratno, atomski) i stvara sesiju. */
export async function consumeLoginToken(
  db: Db,
  token: string,
  now: number,
): Promise<{ sessionId: string; nextPath: string | null; isAdmin: boolean } | null> {
  const used = await db
    .update(authTokens)
    .set({ usedAt: now })
    .where(and(eq(authTokens.tokenHash, await sha256Hex(token)), isNull(authTokens.usedAt), gt(authTokens.expiresAt, now)))
    .returning({ email: authTokens.email, nextPath: authTokens.nextPath });
  if (used.length === 0) return null;
  const user = await db.query.users.findFirst({ where: eq(users.email, used[0].email) });
  if (!user) return null;

  const sessionId = randomToken(32);
  await db.batch([
    db.insert(sessions).values({
      idHash: await sha256Hex(sessionId),
      userId: user.id,
      expiresAt: now + SESSION_DAYS * 86_400_000,
      createdAt: now,
    }),
    db.update(users).set({ lastLoginAt: now }).where(eq(users.id, user.id)),
  ]);
  await audit(db, { actorId: user.id, action: "auth.login" });
  return { sessionId, nextPath: used[0].nextPath, isAdmin: user.isAdmin };
}

export async function loadSessionUser(db: Db, sessionId: string | undefined, now: number): Promise<SessionUser | null> {
  if (!sessionId) return null;
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, isAdmin: users.isAdmin })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.idHash, await sha256Hex(sessionId)), gt(sessions.expiresAt, now)))
    .limit(1);
  return rows[0] ?? null;
}

export async function destroySession(db: Db, sessionId: string) {
  await db.delete(sessions).where(eq(sessions.idHash, await sha256Hex(sessionId)));
}

/** Čišćenje isteklih tokena i sesija (cron). */
export async function purgeExpiredAuth(db: Db, now: number) {
  await db.batch([
    db.delete(authTokens).where(lt(authTokens.expiresAt, now - 86_400_000)),
    db.delete(sessions).where(lt(sessions.expiresAt, now)),
  ]);
}

/**
 * Pristupni kod za preview (dok nema e-pošte): uz ispravan kod admin dobiva poveznicu na ekranu.
 * Radi isključivo kad je APP_ENV "preview", kod je postavljen (najmanje 16 znakova) i adresa je u ADMIN_EMAILS.
 * Usporedba ide preko SHA-256 sažetaka, pa ne ovisi o tome koliko se znakova poklapa.
 */
export async function previewCodeAllows(
  opts: { appEnv: string; configuredCode: string | undefined; givenCode: string; email: string; adminEmails: Set<string> },
): Promise<boolean> {
  if (opts.appEnv !== "preview") return false;
  const configured = opts.configuredCode?.trim() ?? "";
  if (configured.length < 16 || !opts.givenCode) return false;
  if (!opts.adminEmails.has(normalizeEmail(opts.email))) return false;
  const [a, b] = await Promise.all([sha256Hex(configured), sha256Hex(opts.givenCode.trim())]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
