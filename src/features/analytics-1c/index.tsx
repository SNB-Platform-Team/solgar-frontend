import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

// Superset dashboards behind Аналитика 1C — HTTPS via sslip.io, and
// standalone=true hides Superset's own nav/header chrome inside the iframe.
const SUPERSET_BASE_URL = 'https://94.139.254.16.sslip.io/superset/dashboard'

const STOCK_MOVEMENT_URL = `${SUPERSET_BASE_URL}/3/?native_filters_key=nt2qgLlTpyE&standalone=true`
const DISTRIBUTOR_SALES_URL = `${SUPERSET_BASE_URL}/4/?native_filters_key=fnL1DdIy7jQ&standalone=true`
const PRODUCT_SALES_URL = `${SUPERSET_BASE_URL}/1/?native_filters_key=VEdKovzOu7M&standalone=true`

function SupersetDashboardPage({ title, src }: { title: string; src: string }) {
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
          <h1 className='text-2xl font-bold tracking-tight'>{title}</h1>
          <p className='text-muted-foreground'>Аналитика 1C · Superset</p>
        </div>

        <iframe
          src={src}
          title={title}
          width='100%'
          height='800px'
          frameBorder='0'
          allowFullScreen
          className='w-full rounded-md border'
        />
      </Main>
    </>
  )
}

export function StockMovement() {
  return (
    <SupersetDashboardPage title='Stock Movement' src={STOCK_MOVEMENT_URL} />
  )
}

export function DistributorSales() {
  return (
    <SupersetDashboardPage
      title='Distributor Sales'
      src={DISTRIBUTOR_SALES_URL}
    />
  )
}

export function ProductSales() {
  return <SupersetDashboardPage title='Product Sales' src={PRODUCT_SALES_URL} />
}
