/**
 * Brevo: transakcijska e-pošta i lista za obavijesti (obrada u EU), po uzoru na akredo-hr.
 * Bez BREVO_API_KEY ili s EMAIL_TRANSPORT=log poruka se ne šalje, nego se u log zapiše samo maskirani primatelj.
 */
export type MailEnv = {
  BREVO_API_KEY?: string;
  BREVO_LIST_ID?: string;
  EMAIL_TRANSPORT?: string;
  EMAIL_FROM: string;
  EMAIL_FROM_NAME: string;
};

export type EmailMessage = {
  to: { email: string; name?: string };
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  tag: string;
};

export function maskEmail(email: string) {
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 1)}***@${domain}`;
}

function useLog(env: MailEnv) {
  return env.EMAIL_TRANSPORT === "log" || !env.BREVO_API_KEY;
}

export async function sendEmail(env: MailEnv, m: EmailMessage): Promise<boolean> {
  if (useLog(env)) {
    console.log(JSON.stringify({ msg: "email.log", tag: m.tag, to: maskEmail(m.to.email), subject: m.subject }));
    return true;
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: env.EMAIL_FROM, name: env.EMAIL_FROM_NAME },
      to: [m.to],
      ...(m.replyTo ? { replyTo: { email: m.replyTo } } : {}),
      subject: m.subject,
      textContent: m.text,
      ...(m.html ? { htmlContent: m.html } : {}),
      tags: [m.tag],
    }),
  });
  if (!res.ok) {
    console.log(JSON.stringify({ msg: "email.error", tag: m.tag, to: maskEmail(m.to.email), status: res.status }));
    return false;
  }
  return true;
}

/** Dodaje kontakt na Brevo listu obavijesti. Poziva se samo uz izričitu privolu. */
export async function subscribe(env: MailEnv, email: string, attributes: Record<string, string> = {}): Promise<boolean> {
  if (useLog(env) || !env.BREVO_LIST_ID) {
    console.log(JSON.stringify({ msg: "subscribe.log", to: maskEmail(email) }));
    return true;
  }
  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email, listIds: [Number(env.BREVO_LIST_ID)], updateEnabled: true, attributes }),
  });
  if (!res.ok) console.log(JSON.stringify({ msg: "subscribe.error", to: maskEmail(email), status: res.status }));
  return res.ok;
}
