import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// https://nuxt.com/docs/api/configuration/nuxt-config
const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  modules: [
    "@nuxthub/core",
    "@nuxt/ui",
    "@nuxt/scripts",
    "@pinia/nuxt",
    "@nuxt/image",
    "nuxt-auth-utils",
    "nuxt-authorization"
  ],

  css: ["~/assets/css/main.css"],

  hub: {
    db: "sqlite",
    blob: true
  },

  image: {
    provider: "none"
  },

  $production: {
    image: {
      provider: "cloudflare"
    }
  },

  runtimeConfig: {
    sessionPassword: process.env.NUXT_SESSION_PASSWORD || "",
    session: {
      password: process.env.NUXT_SESSION_PASSWORD || ""
    },
    oauth: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET
      }
    },
    adminGithubIds: process.env.ADMIN_GITHUB_IDS || "",
    adminGoogleIds: process.env.ADMIN_GOOGLE_IDS || "",
    resendApiKey: process.env.NUXT_RESEND_API_KEY || "",
    resendFrom: process.env.NUXT_RESEND_FROM || "",
    /** When true (with `nuxt dev`), log in as a local dev user without OAuth */
    devStubAuth:
      process.env.NUXT_DEV_STUB_AUTH === "1" ||
      process.env.NUXT_DEV_STUB_AUTH === "true",
    devStubUserEmail: process.env.NUXT_DEV_STUB_USER_EMAIL || "dev@local.test",
    devStubUserName: process.env.NUXT_DEV_STUB_USER_NAME || "Local Dev",
    devStubUserRole: process.env.NUXT_DEV_STUB_USER_ROLE || "admin",
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || ""
    }
  },

  nitro: {
    // Resend dynamically imports this optional peer; Nitro must resolve it for Cloudflare bundles.
    alias: {
      "@react-email/render": join(rootDir, "server/shims/react-email-render.ts")
    }
  }
});
