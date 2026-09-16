/// <reference types="vitest/config" />
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { playwright } from '@vitest/browser-playwright'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Only applied to the production build — Vite's `base` also changes what
  // path the dev server itself serves from, and we still want dev at plain
  // localhost:5173/ (matching the proxy setup below). In prod this makes
  // every built asset URL start with /static/react/..., matching Django's
  // STATIC_URL (/static/) once this app is collected as a Django static
  // app under the "react" namespace. This is unrelated to TanStack
  // Router's basepath (page routes like /pharmacies) — that stays at '/'.
  base: command === 'build' ? '/static/react/' : '/',
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Forwards API calls, Django's own login/logout pages, and their
      // static assets to Django, so the browser sees same-origin requests
      // (localhost:5173) throughout — the session cookie then travels with
      // each request instead of being blocked as cross-site, and
      // window.location redirects to /login/ or /logout/ (see lib/api.ts)
      // land on Django instead of 404ing inside the React app. Production
      // doesn't need this: React is served from Django's own origin there.
      '/sales': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/login': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/logout': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/accounts': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Django's login page pulls its own CSS/JS from here (e.g. the admin
      // theme) — without this it'd render unstyled during dev.
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    silent: 'passed-only',
    unstubEnvs: true,
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    coverage: {
      // include: ['src/**/*.{js,jsx,ts,tsx}'], // Uncomment to expand the report to all src/**/* so untested modules appear as 0% coverage.
      exclude: [
        'src/components/ui/**',
        'src/assets/**',
        'src/tanstack-table.d.ts',
        'src/routeTree.gen.ts',
        'src/test-utils/**',
        'src/routes/**',
      ],
    },
  },
}))
