/**
 * Upiti s forme „Za tvrtke” i „Kontakt”. Upit se najprije sprema u tablicu `inquiries` (da se ne izgubi ni kad
 * e-pošta zakaže), zatim ide mailom na INQUIRY_TO, a pošiljatelj dobiva potvrdu.
 */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { ulid } from "ulid";
import { academies } from "@/data/academies";
import { createDb } from "@/lib/db";
import { inquiries } from "@/lib/db/schema";
import { sendEmail, subscribe, type MailEnv } from "@/lib/email";
import { backTo, isEmail, sameOrigin, str } from "@/lib/forms";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const kind = new URL(request.url).searchParams.get("vrsta") === "kontakt" ? "kontakt" : "tvrtke";
  const fallback = kind === "kontakt" ? "/kontakt" : "/za-tvrtke";
  if (!sameOrigin(request)) return new Response(null, { status: 403 });

  const form = await request.formData().catch(() => null);
  if (!form) return backTo(request, fallback, "greska");

  // Honeypot: polje ljudi ne vide; ako je popunjeno, tiho „uspijevamo”.
  if (str(form, "web")) return backTo(request, fallback, "poslano");

  const name = str(form, "ime", 120);
  const email = str(form, "email", 254).toLowerCase();
  const company = str(form, "tvrtka", 160);
  const phone = str(form, "telefon", 40);
  const size = str(form, "velicina", 40);
  const academy = academies.find((a) => a.slug === str(form, "akademija", 60))?.name ?? "";
  const message = str(form, "poruka", 4000);
  const privacy = form.get("privatnost") === "da";
  const newsletter = form.get("obavijesti") === "da";

  if (!name || !isEmail(email) || !message || !privacy || (kind === "tvrtke" && !company)) {
    return backTo(request, fallback, "greska");
  }

  const now = Date.now();
  await createDb(env.DB)
    .insert(inquiries)
    .values({
      id: ulid(now),
      kind,
      name,
      email,
      company: company || null,
      phone: phone || null,
      size: size || null,
      academy: academy || null,
      message,
      createdAt: now,
    });

  const mailEnv = env as unknown as MailEnv & { INQUIRY_TO: string };
  const lines = [
    `Vrsta: ${kind === "tvrtke" ? "Upit za tvrtke" : "Kontakt"}`,
    `Ime i prezime: ${name}`,
    `E-pošta: ${email}`,
    company && `Tvrtka / organizacija: ${company}`,
    phone && `Telefon: ${phone}`,
    size && `Broj polaznika: ${size}`,
    academy && `Područje: ${academy}`,
    `Obavijesti: ${newsletter ? "da" : "ne"}`,
    "",
    message,
  ].filter((l) => l !== "");

  const ok = await sendEmail(mailEnv, {
    to: { email: mailEnv.INQUIRY_TO },
    replyTo: email,
    subject: kind === "tvrtke" ? `Upit za tvrtke: ${company}` : `Kontakt: ${name}`,
    text: lines.join("\n"),
    tag: `upit-${kind}`,
  });
  // Upit je spremljen; ako obavijest timu ne prođe, to ide u log, a pošiljatelj ipak dobiva potvrdu.
  if (!ok) console.error(JSON.stringify({ event: "inquiry.notify_failed", kind }));

  await sendEmail(mailEnv, {
    to: { email, name },
    subject: "Zaprimili smo vaš upit",
    text: `Poštovani/a ${name},\n\nhvala na upitu. Javit ćemo vam se u roku od dva radna dana.\n\nmeet.hr\nhttps://meet.hr`,
    tag: "upit-potvrda",
  });
  if (newsletter) await subscribe(mailEnv, email, { IME: name });

  return backTo(request, fallback, "poslano");
};
