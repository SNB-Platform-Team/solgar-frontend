import { useAuthUser } from '@/lib/auth'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Analytics } from './components/analytics'

export function Dashboard() {
  // Cached by the _authenticated route guard already — reads back without
  // an extra request or loading flicker, see useAuthUser.
  const me = useAuthUser()
  const name = me?.display_name ?? 'Пользователь'

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-4'>
          <h1 className='text-3xl font-bold tracking-tight'>
            Добро пожаловать, {name}!
          </h1>
        </div>
        <Tabs defaultValue='analytics' className='space-y-4'>
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='analytics'>Аналитика</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='analytics' className='space-y-4'>
            <Analytics />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
