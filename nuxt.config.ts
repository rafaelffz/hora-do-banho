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
    public: {
      tursoDatabaseUrl: process.env.TURSO_DATABASE_URL,
      googleClientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
