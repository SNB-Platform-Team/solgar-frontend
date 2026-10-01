import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

// Superset "1C — Склад" dashboard URL
const SUPERSET_DASHBOARD_URL =
  import.meta.env.VITE_SUPERSET_1C_DASHBOARD_URL ||
  'https://94.139.254.16.sslip.io/superset/dashboard/1/?standalone=true'

// Power BI dashboard URL
const POWERBI_DASHBOARD_URL =
  import.meta.env.VITE_POWERBI_DASHBOARD_URL ||
  'https://app.powerbi.com/reportEmbed?reportId=24eea854-fd6a-4fb8-b809-72590735760c&autoAuth=true&ctid=75e56b80-8b17-41bb-897a-82cf5d5e3b30'

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
        {/* Page title */}
        <div className='mb-6'>
          <h1 className='text-2xl font-bold tracking-tight'>Аналитика</h1>

          <p className='text-muted-foreground'>
            Аналитические панели Superset и Power BI
          </p>
        </div>

        {/* ==================== SUPERSET ==================== */}
        <div className='mb-8'>
          <div className='mb-4'>
            <h2 className='text-xl font-semibold'>1C — Склад</h2>

            <p className='text-sm text-muted-foreground'>
              Дашборд Superset по данным 1C — Склад
            </p>
          </div>

          <iframe
            src={SUPERSET_DASHBOARD_URL}
            title='1C Stock Dashboard'
            width='100%'
            height='800'
            frameBorder='0'
            className='w-full rounded-md border'
          />
        </div>

        {/* ==================== POWER BI ==================== */}
        <div className='mb-8'>
          <div className='mb-4'>
            <h2 className='text-xl font-semibold'>Power BI — Solgar</h2>

            <p className='text-sm text-muted-foreground'>
              Аналитический отчёт Power BI
            </p>
          </div>

          <iframe
            title='report_solgar'
            src={POWERBI_DASHBOARD_URL}
            width='100%'
            height='800'
            frameBorder='0'
            allowFullScreen
            className='w-full rounded-md border'
          />
        </div>
      </Main>
    </>
  )
}
