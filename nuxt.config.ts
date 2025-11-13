// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite"

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  app: {
    head: {
      title: "Hora do Banho",
      htmlAttrs: { lang: "pt-BR" },
      meta: [
        { name: "description", content: "Agende o banho do seu pet de forma fácil e rápida!" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "keywords",
          content: "banho, tosa, pet, agendamento, fácil, rápido, online, petshop",
        },
      ],
    },
  },
  modules: [
    "@nuxt/image",
    "@nuxt/ui",
    "@nuxt/fonts",
    "@pinia/nuxt",
    "nuxt-auth-utils",
    "@nuxt/eslint",
    "@vite-pwa/nuxt",
  ],
  colorMode: {
    preference: "system",
    fallback: "light",
  },
  eslint: {
    config: {
      stylistic: {
        semi: false,
        quotes: "double",
        indent: 2,
      },
    },
  },
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    oauth: {
      google: {
        clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET,
      },
    },
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN,
    googleClientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET,
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL,
    googleClientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID,
    public: {
      dogApiKey: process.env.DOG_API_KEY,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  pwa: {
    manifest: {
      name: "Hora do Banho",
      short_name: "Hora do Banho",
      description: "Agende o banho do seu pet de forma fácil e rápida!",
      theme_color: "#ffffff",
      icons: [
        {
          src: "web-app-manifest-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "web-app-manifest-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    },
    devOptions: {
      enabled: true,
      type: "module",
    },
  },
})
