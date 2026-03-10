// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxthub/core',
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxt/image',
    'nuxt-auth-utils',
    'nuxt-authorization'
  ],

  css: ['~/assets/css/main.css'],

  hub: {
    db: 'sqlite',
    blob: true
  },

  $production: {
    hub: {
      db: {
        dialect: 'sqlite' as const,
        driver: 'd1',
        connection: { databaseId: process.env.NUXT_HUB_CLOUDFLARE_DATABASE_ID! }
      },
      blob: {
        driver: 'cloudflare-r2',
        bucketName: process.env.NUXT_HUB_CLOUDFLARE_BUCKET_NAME!
      }
    }
  },

  image: {
    provider: 'none'
  },

  $production: {
    image: {
      provider: 'cloudflare'
    }
  },

  runtimeConfig: {
    sessionPassword: process.env.NUXT_SESSION_PASSWORD || ''
  }
})
