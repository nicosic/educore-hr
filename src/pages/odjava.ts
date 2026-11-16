import type { APIRoute } from "astro";
import { destroySession, SESSION_COOKIE } from "@/server/auth";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, locals, redirect }) => {
  const sid = cookies.get(SESSION_COOKIE)?.value;
  if (sid) await destroySession(locals.db, sid);
  cookies.delete(SESSION_COOKIE, { path: "/", secure: true, httpOnly: true, sameSite: "lax" });
  return redirect("/", 303);
};
