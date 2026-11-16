/** Prijava na obavijesti o novim događanjima (Brevo lista, uz izričitu privolu). */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { subscribe, type MailEnv } from "@/lib/email";
import { backTo, isEmail, sameOrigin, str } from "@/lib/forms";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const form = await request.formData().catch(() => null);
  if (!form) return backTo(request, "/dogadanja", "greska");
  if (str(form, "web")) return backTo(request, "/dogadanja", "poslano");

  const email = str(form, "email", 254).toLowerCase();
  if (!isEmail(email) || form.get("privola") !== "da") return backTo(request, "/dogadanja", "greska");

  const ok = await subscribe(env as unknown as MailEnv, email);
  return backTo(request, "/dogadanja", ok ? "poslano" : "greska");
};
