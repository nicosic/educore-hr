/**
 * Privremene fotografije za prijedlog dizajna (Unsplash licenca: besplatno i za komercijalnu upotrebu).
 * Prije produkcije zamijeniti vlastitim fotografijama s događaja ili ih preuzeti u projekt.
 */
const u = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=75`;

export const photos = {
  hero: {
    src: u("photo-1638957835514-224c57ffe617", 900, 1080),
    alt: "Polaznici sjede u dvorani i prate predavanje",
    credit: "Juli Kosolapova, Unsplash",
  },
  event: {
    src: u("photo-1540575467063-178a50c2df87", 1200, 820),
    alt: "Publika u dvorani tijekom stručnog predavanja",
    credit: "Headway, Unsplash",
  },
  cta: {
    src: u("photo-1587825140708-dfaf72ae4b04", 1600, 760),
    alt: "",
    credit: "Alexandre Pellaes, Unsplash",
  },
};
