/** Zajednička obrada jednostavnih javnih formi (bez JavaScripta na klijentu). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function str(form: FormData, key: string, max = 2000): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function isEmail(v: string) {
  return v.length <= 254 && EMAIL_RE.test(v);
}

/** Zahtjev mora doći s istog porijekla (zaštita od CSRF-a). */
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

/** Preusmjeravanje natrag na stranicu forme sa stanjem u upitu (303 nakon POST-a). */
export function backTo(request: Request, fallback: string, state: "poslano" | "greska") {
  const ref = request.headers.get("referer");
  let target = new URL(fallback, request.url);
  if (ref) {
    const r = new URL(ref);
    if (r.host === target.host) target = new URL(r.pathname, request.url);
  }
  target.searchParams.set("stanje", state);
  target.hash = "forma";
  // Ne Response.redirect(): njegova zaglavlja su nepromjenjiva, a middleware dodaje svoja.
  return new Response(null, { status: 303, headers: { location: target.toString() } });
}
