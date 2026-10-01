import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

// Olga's PowerBI report ("medrep_bounty") — embed URL from the report's own
// Share/Embed dialog, same convention as Аналитика 1C's PowerBI section.
const POWERBI_REPORT_URL =
  import.meta.env.VITE_POWERBI_MEDREP_BOUNTY_URL ||
  'https://app.powerbi.com/reportEmbed?reportId=fe5b2520-4a12-41d9-817b-c5286db79539&autoAuth=true&ctid=75e56b80-8b17-41bb-897a-82cf5d5e3b30'

export function PowerBi() {
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
          <h1 className='text-2xl font-bold tracking-tight'>Отчёт Power BI</h1>
          <p className='text-muted-foreground'>
            Дашборд Power BI по мед. представителям (Bounty)
          </p>
        </div>

        <iframe
          src={POWERBI_REPORT_URL}
          title='medrep_bounty'
          width='100%'
          height='700px'
          frameBorder='0'
          allowFullScreen
          className='rounded-md border'
        />
      </Main>
    </>
  )
}
