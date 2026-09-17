import { useAuthUser } from '@/lib/auth'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

export function Dashboard() {
  // Cached by the _authenticated route guard already — reads back without
  // an extra request or loading flicker, see useAuthUser.
  const me = useAuthUser()
  const name = me?.display_name || me?.username || 'Пользователь'

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
      <Main fixed>
        <div className='flex flex-1 items-center justify-center'>
          <h1 className='text-4xl font-bold tracking-tight'>
            Добро пожаловать, {name}!
          </h1>
        </div>
      </Main>
    </>
  )
}
