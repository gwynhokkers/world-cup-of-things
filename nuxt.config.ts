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

  image: {
    provider: 'none'
  },

  $production: {
    image: {
      provider: 'cloudflare'
    }
  },

  runtimeConfig: {
    sessionPassword: process.env.NUXT_SESSION_PASSWORD || '',
    session: {
      password: process.env.NUXT_SESSION_PASSWORD || ''
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
    adminGithubIds: process.env.ADMIN_GITHUB_IDS || '',
    adminGoogleIds: process.env.ADMIN_GOOGLE_IDS || ''
  }
})
