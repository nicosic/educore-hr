/**
 * Vrijeme: u bazi su Unix ms; korisniku se prikazuje i unosi u zoni događaja (zadano Europe/Zagreb).
 * Bez vanjskih biblioteka: pomak zone računa se preko Intl.DateTimeFormat.
 */
export const DEFAULT_TZ = "Europe/Zagreb";

function partsInZone(ms: number, tz: string) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}

/** Pomak zone (ms) u danom trenutku. */
function offsetAt(ms: number, tz: string) {
  const p = partsInZone(ms, tz);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}

/** `YYYY-MM-DDTHH:mm` (lokalno vrijeme u zoni) → Unix ms. Vraća null za neispravan unos. */
export function localInputToMs(value: string, tz = DEFAULT_TZ): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Dva prolaza zbog prijelaza na ljetno/zimsko računanje vremena.
  let ms = asUtc - offsetAt(asUtc, tz);
  ms = asUtc - offsetAt(ms, tz);
  const back = partsInZone(ms, tz);
  if (back.y !== y || back.mo !== mo || back.d !== d) return null;
  return ms;
}

/** Unix ms → vrijednost za `<input type="datetime-local">` u zoni. */
export function msToLocalInput(ms: number | null | undefined, tz = DEFAULT_TZ): string {
  if (ms == null) return "";
  const p = partsInZone(ms, tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** „utorak, 23. veljače 2027.” */
export function formatDate(ms: number, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("hr-HR", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(ms);
}

/** „23. 2. 2027.” */
export function formatShortDate(ms: number, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("hr-HR", { timeZone: tz, day: "numeric", month: "numeric", year: "numeric" }).format(ms);
}

/** „18:00” */
export function formatTime(ms: number, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("hr-HR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(ms);
}

/** Datum i raspon vremena: „utorak, 23. veljače 2027. • 18:00 – 20:30” */
export function formatRange(startsAt: number, endsAt: number, tz = DEFAULT_TZ) {
  const sameDay = formatShortDate(startsAt, tz) === formatShortDate(endsAt, tz);
  if (sameDay) return `${formatDate(startsAt, tz)} • ${formatTime(startsAt, tz)} – ${formatTime(endsAt, tz)}`;
  return `${formatDate(startsAt, tz)} ${formatTime(startsAt, tz)} – ${formatDate(endsAt, tz)} ${formatTime(endsAt, tz)}`;
}
