import type { Tone } from "./academies";

export const site = {
  name: "meet.hr",
  url: "https://meet.hr",
  tagline: "Znanje koje pokreće ljude i poslovanje.",
  description:
    "Regionalna platforma za edukacije, radionice i profesionalni razvoj. Uživo, online i za tvrtke, s priznatim stručnjacima iz prakse.",
  email: "info@meet.hr",
  // Podaci o tvrtki: popuniti nakon osnivanja d.o.o.-a.
  company: {
    name: "[Naziv tvrtke] d.o.o.",
    address: "[Adresa sjedišta]",
    oib: "[OIB]",
  },
};

export const nav = [
  { href: "/akademije", label: "Akademije" },
  { href: "/dogadanja", label: "Događanja" },
  { href: "/za-tvrtke", label: "Za tvrtke" },
  { href: "/o-nama", label: "O nama" },
  { href: "/kontakt", label: "Kontakt" },
];

export const pillars: { title: string; text: string; tone: Tone }[] = [
  { title: "Uči od stručnjaka", text: "Iskusni predavači, prepoznatljiva imena i stvarni primjeri iz prakse.", tone: "pink" },
  { title: "Primijeni odmah", text: "Praktični alati, predlošci, vježbe i konkretne metode za sutrašnji radni dan.", tone: "mint" },
  { title: "Razvijaj se dalje", text: "Od prve radionice do naprednih programa i potvrda o stečenom znanju.", tone: "butter" },
];

export const formats: { title: string; text: string; tone: Tone }[] = [
  { title: "Uživo", text: "Radionice, umrežavanje i izravna interakcija s predavačima.", tone: "pink" },
  { title: "Online", text: "Pristup edukacijama iz cijele regije, s pitanjima uživo.", tone: "sky" },
  { title: "Na zahtjev", text: "Snimke, materijali i učenje vlastitim tempom.", tone: "butter" },
  { title: "Za tvrtke", text: "Zatvoreni programi prilagođeni vašim timovima.", tone: "mint" },
];

export const outcomes: { title: string; text: string; tone: Tone }[] = [
  { title: "meet.hr potvrde", text: "Potvrda o sudjelovanju za svaku edukaciju koju ste pohađali.", tone: "butter" },
  {
    title: "Međunarodni certifikati",
    text: "Pripreme za međunarodne certifikate u suradnji s ovlaštenim partnerima.",
    tone: "mint",
  },
  { title: "Alati za primjenu", text: "Checkliste, predlošci, matrice rizika i radne bilježnice.", tone: "lilac" },
];

export const community: { title: string; text: string; tone: Tone }[] = [
  { title: "Stručnjaci", text: "Predavači iz poslovne prakse, prava, tehnologije, medicine i HR-a.", tone: "lilac" },
  { title: "Organizacije", text: "Tvrtke, javni sektor, profesionalne udruge i timovi.", tone: "sky" },
  { title: "Polaznici", text: "Ljudi koji žele učiti, povezivati se i razvijati karijeru.", tone: "pink" },
];
