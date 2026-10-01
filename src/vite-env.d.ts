/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
  readonly VITE_API_URL: string
  readonly VITE_SUPERSET_1C_DASHBOARD_URL: string
  readonly VITE_POWERBI_DASHBOARD_URL: string
  readonly VITE_POWERBI_MEDREP_BOUNTY_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
