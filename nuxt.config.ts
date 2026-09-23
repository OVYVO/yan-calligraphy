// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/scrollbar.css'],
  typescript: {
    strict: true,
  },
  nitro: {
    externals: {
      external: ['better-sqlite3'],
    },
    watchOptions: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/data/**',
        '**/uploads/**',
        '**/working-plan/**',
      ],
    },
  },
  vite: {
    optimizeDeps: {
      exclude: ['better-sqlite3'],
    },
    server: {
      watch: {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/data/**',
          '**/uploads/**',
          '**/working-plan/**',
        ],
      },
    },
  },
})
