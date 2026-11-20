/**
 * Šest akademija meet.hr ekosustava (izvor: koncept platforme).
 * Tekstovi su prvi prijedlog i mogu se slobodno mijenjati.
 */
export type Tone = "pink" | "mint" | "butter" | "sky" | "lilac";

export type Academy = {
  slug: string;
  name: string;
  short: string;
  headline: string;
  intro: string;
  tone: Tone;
  audience: string[];
  topics: { title: string; text: string; tone: Tone }[];
};

export const academies: Academy[] = [
  {
    slug: "mind-leadership",
    name: "Mind & Leadership",
    short: "Mentalna otpornost, stres, komunikacija",
    headline: "Ljudi su u središtu poslovanja",
    intro:
      "Edukacije o mentalnoj otpornosti, kvalitetnim odnosima i odgovornom vodstvu. Za ljude koji vode druge i za sve koji rade pod pritiskom.",
    tone: "pink",
    audience: ["Voditelji timova i uprave", "HR stručnjaci", "Zaposlenici u zahtjevnim ulogama"],
    topics: [
      { title: "Mentalna otpornost", text: "Kako upravljati stresom i pritiskom u zahtjevnom poslovnom okruženju.", tone: "pink" },
      { title: "Teški razgovori", text: "Komunikacija, postavljanje granica i konstruktivna povratna informacija.", tone: "butter" },
      { title: "Leadership", text: "Vođenje timova, povjerenje i donošenje odluka.", tone: "lilac" },
    ],
  },
  {
    slug: "procurement-tech",
    name: "Procurement & Tech",
    short: "Javna nabava i tehnološka rješenja",
    headline: "Pametnija nabava tehnologije",
    intro:
      "Praktična znanja za nabavu, ugovaranje i uvođenje digitalnih rješenja, od prve poslovne potrebe do uspješne implementacije.",
    tone: "sky",
    audience: ["Službe nabave u javnom sektoru", "IT voditelji", "Ponuditelji i dobavljači"],
    topics: [
      { title: "Javna nabava IT rješenja", text: "Od poslovne potrebe do jasne dokumentacije o nabavi.", tone: "sky" },
      { title: "Tehničke specifikacije", text: "Kako opisati zahtjeve i izbjeći nejasnoće u ponudama.", tone: "mint" },
      { title: "Evaluacija i provedba", text: "Procjena ponuda, implementacija i suradnja s dobavljačima.", tone: "butter" },
    ],
  },
  {
    slug: "legal-contracts",
    name: "Legal & Contracts",
    short: "Ugovori, obveze i poslovni rizici",
    headline: "Ugovori koji rade za poslovanje",
    intro:
      "Od potpisivanja do praćenja obveza, promjena i rezultata. Kako ugovor pretvoriti u alat za upravljanje odnosom s partnerom.",
    tone: "butter",
    audience: ["Pravnici i pravne službe", "Voditelji projekata", "Upravljanje ugovorima i nabava"],
    topics: [
      { title: "Contract management", text: "Registar ugovora, rokovi, odgovornosti i praćenje izvršenja.", tone: "butter" },
      { title: "SLA u praksi", text: "Ugovaranje i mjerenje razine usluge.", tone: "pink" },
      { title: "Ugovorni rizici", text: "Promjene, eskalacije, pregovaranje i upravljanje odnosima.", tone: "sky" },
    ],
  },
  {
    slug: "cyber-digital",
    name: "Cyber & Digital",
    short: "Kibernetička sigurnost i digitalna otpornost",
    headline: "Sigurnost je odgovornost svih",
    intro:
      "Tehnologija, organizacijska kultura i regulatorna usklađenost na jednom mjestu, od svakodnevnog ponašanja zaposlenika do odgovornosti uprave.",
    tone: "mint",
    audience: ["Uprave i nadzorni odbori", "IT i sigurnosni timovi", "Svi zaposlenici"],
    topics: [
      { title: "Cybersecurity essentials", text: "Prijetnje, incidenti i sigurno ponašanje zaposlenika.", tone: "mint" },
      { title: "Cyber compliance", text: "NIS2, politike, kontrole i odgovornost uprave.", tone: "lilac" },
      { title: "ISO 27001", text: "Sustav upravljanja informacijskom sigurnošću u praksi.", tone: "sky" },
    ],
  },
  {
    slug: "governance-compliance",
    name: "Governance & Compliance",
    short: "Usklađenost, etika i upravljanje rizicima",
    headline: "Usklađenost koja ima smisla",
    intro:
      "Od pravila na papiru do kulture odgovornosti i dobrog upravljanja. Usklađenost koja štiti organizaciju, a ne usporava je.",
    tone: "lilac",
    audience: ["Compliance službenici", "Interna revizija i upravljanje rizicima", "Službenici za zaštitu podataka"],
    topics: [
      { title: "Compliance u praksi", text: "Etika, sukob interesa, antikorupcija i interne kontrole.", tone: "lilac" },
      { title: "Upravljanje rizicima", text: "Mapiranje rizika, kontrole i izvještavanje.", tone: "butter" },
      { title: "GDPR i privatnost", text: "Zaštita podataka i odgovorno postupanje u organizaciji.", tone: "pink" },
    ],
  },
  {
    slug: "people-performance",
    name: "People & Performance",
    short: "Ocjenjivanje i razvoj zaposlenika",
    headline: "Bolji razgovori. Bolji timovi.",
    intro:
      "Sustavno ocjenjivanje zaposlenika i razvoj potencijala. Jasna očekivanja, pošteni kriteriji i razgovori koji vode napretku.",
    tone: "pink",
    audience: ["HR i People timovi", "Voditelji timova", "Uprave koje uvode sustav ocjenjivanja"],
    topics: [
      { title: "Ocjenjivanje zaposlenika", text: "Objektivni kriteriji, smanjenje pristranosti i jasna očekivanja.", tone: "pink" },
      { title: "KPI i ciljevi", text: "Postavljanje mjerljivih ciljeva i praćenje učinka.", tone: "mint" },
      { title: "Razvojni razgovori", text: "Feedback, individualni razvoj i planovi napretka.", tone: "butter" },
    ],
  },
];

/** Boje kartica na pregledu akademija, redoslijedom iz koncepta. */
export const overviewTones: Tone[] = ["pink", "sky", "butter", "mint", "lilac", "pink"];

export const toneClass: Record<Tone, string> = {
  pink: "bg-pink",
  mint: "bg-mint",
  butter: "bg-butter",
  sky: "bg-sky",
  lilac: "bg-lilac",
};

export function academyBySlug(slug: string) {
  return academies.find((a) => a.slug === slug);
}
