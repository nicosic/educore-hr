/**
 * Za stranice koje se renderiraju na serveru: učitava prijavljenog korisnika i štiti /admin i /moj-racun.
 * Statične (prerenderirane) stranice ne prolaze kroz ovo pri izvođenju.
 */
import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { createDb } from "@/lib/db";
import { loadSessionUser, SESSION_COOKIE } from "@/server/auth";

export const onRequest = defineMiddleware(async (ctx, next) => {
  ctx.locals.user = null;
  if (ctx.isPrerendered) return next();

  const db = createDb(env.DB);
  ctx.locals.db = db;
  ctx.locals.user = await loadSessionUser(db, ctx.cookies.get(SESSION_COOKIE)?.value, Date.now());

  const path = ctx.url.pathname;
  const isAdminArea = path === "/admin" || path.startsWith("/admin/");
  const isAccountArea = path === "/moj-racun" || path.startsWith("/moj-racun/");

  if ((isAdminArea || isAccountArea) && !ctx.locals.user) {
    return ctx.redirect(`/prijava?next=${encodeURIComponent(path + ctx.url.search)}`);
  }
  // Ne otkrivamo postojanje admina: obični korisnik dobiva 404.
  if (isAdminArea && !ctx.locals.user?.isAdmin) {
    return ctx.rewrite("/404");
  }

  // Kopija odgovora: neki odgovori (npr. Response.redirect) imaju nepromjenjiva zaglavlja.
  const original = await next();
  const res = new Response(original.body, original);
  if (isAdminArea || isAccountArea) res.headers.set("cache-control", "private, no-store");
  // Produkcijsko okruženje još ne postoji u wrangler.jsonc, pa ga tipovi ne poznaju.
  if ((env.APP_ENV as string) !== "production") res.headers.set("x-robots-tag", "noindex");
  return res;
});
