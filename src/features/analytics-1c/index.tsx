import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

// Superset "1C — Склад" dashboard URL, standalone-embedded via iframe below.
// Configured via .env (VITE_SUPERSET_1C_DASHBOARD_URL) — see .env.example.
// Falls back to the VM-hosted Superset when unset; change the env var (or
// this default) when Superset moves to Azure.
const SUPERSET_DASHBOARD_URL =
  import.meta.env.VITE_SUPERSET_1C_DASHBOARD_URL || 'https://sslip.io'

export function Analytics1C() {
  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-4'>
          <h1 className='text-2xl font-bold tracking-tight'>Аналитика 1C</h1>
          <p className='text-muted-foreground'>
            Дашборд Superset по данным 1C — Склад
          </p>
        </div>

        <iframe
          src={SUPERSET_DASHBOARD_URL}
          title='1C Stock Dashboard'
          width='100%'
          height='800px'
          frameBorder='0'
          className='rounded-md border'
        />
      </Main>
    </>
  )
}
