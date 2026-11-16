// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://educore.hr",
  // Stranice su statične (prerender) osim onih koje izričito postave `prerender = false`.
  output: "static",
  // Slike se optimiziraju pri buildu, pa nije potreban Cloudflare Images binding.
  adapter: cloudflare({ imageService: "compile" }),
  integrations: [sitemap()],
  trailingSlash: "never",
  build: { format: "file" },
  vite: { plugins: [tailwindcss()] },
});
