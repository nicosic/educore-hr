/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: import("@/server/auth").SessionUser | null;
    db: import("@/lib/db").Db;
  }
}

interface ImportMetaEnv {
  readonly PUBLIC_CF_WA_TOKEN?: string;
  /** "1" na preview okruženju: tražilice ne indeksiraju stranice. */
  readonly PUBLIC_NOINDEX?: string;
}
