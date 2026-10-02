import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

// Management's "Общий вид Solgar" PowerBI report — unlike the other PowerBI
// pages this is a "publish to web" link (app.powerbi.com/view?r=...), so it
// needs no PowerBI login/autoAuth to render.
const POWERBI_OBSHIY_URL =
  import.meta.env.VITE_POWERBI_OBSHIY_URL ||
  'https://app.powerbi.com/view?r=eyJrIjoiYTAyNDdiOWItOGYxNy00NzNlLThjYWItMGY1ZDIzZTk1NWNhIiwidCI6Ijc1ZTU2YjgwLThiMTctNDFiYi04OTdhLTgyY2Y1ZDVlM2IzMCIsImMiOjl9'

export function PowerBiObshiy() {
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
          <h1 className='text-2xl font-bold tracking-tight'>
            Общий вид Solgar
          </h1>
        </div>

        <iframe
          src={POWERBI_OBSHIY_URL}
          title='Общий вид Solgar'
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
