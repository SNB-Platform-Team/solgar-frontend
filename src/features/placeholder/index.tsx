import { type LucideIcon } from 'lucide-react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

type PlaceholderPageProps = {
  title: string
  description: string
  icon: LucideIcon
}

/** Generic "not built yet" page for sidebar sections planned for later. */
export function PlaceholderPage({
  title,
  description,
  icon: Icon,
}: PlaceholderPageProps) {
  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='flex h-[60vh] flex-col items-center justify-center gap-3 text-center'>
          <Icon className='size-14 text-muted-foreground' />
          <h1 className='text-2xl font-bold tracking-tight'>{title}</h1>
          <p className='max-w-sm text-muted-foreground'>{description}</p>
        </div>
      </Main>
    </>
  )
}
