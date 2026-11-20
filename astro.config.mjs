// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://meet.hr",
  // Stranice su statične (prerender) osim onih koje izričito postave `prerender = false`.
  output: "static",
  // Slike se optimiziraju pri buildu, pa nije potreban Cloudflare Images binding.
  adapter: cloudflare({ imageService: "compile" }),
  // U sitemapu su samo javne stranice (bez admina, prijave i korisničkog računa).
  integrations: [sitemap({ filter: (page) => !/\/(admin|prijava|moj-racun|odjava)(\/|$)/.test(new URL(page).pathname) })],
  trailingSlash: "never",
  build: { format: "file" },
  vite: { plugins: [tailwindcss()] },
});
