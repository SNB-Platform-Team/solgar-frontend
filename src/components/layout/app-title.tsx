import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '../ui/button'

/** Shape of GET /sales/api/version/ — AllowAny, no session required. */
interface VersionResponse {
  version: string
  commit: string
  date: string
}

export function AppTitle() {
  const { setOpenMobile } = useSidebar()

  // Best-effort: a missing/unreachable endpoint just means no version line
  // renders, never a broken title.
  const { data: version } = useQuery<VersionResponse>({
    queryKey: ['app-version'],
    queryFn: async () => {
      const res = await api.get<VersionResponse>('/sales/api/version/')
      return res.data
    },
    staleTime: Infinity,
    retry: false,
  })

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='gap-0 py-0 hover:bg-transparent active:bg-transparent'
          asChild
        >
          <div>
            <Link
              to='/'
              onClick={() => setOpenMobile(false)}
              className='grid flex-1 text-start text-sm leading-tight'
            >
              <span className='truncate font-bold'>ForteMira</span>
              <span className='truncate text-xs'>Внутренняя платформа</span>
              {version && (
                <span className='truncate text-xs text-muted-foreground'>
                  v{version.version}
                  {version.commit && (
                    <span className='opacity-60'> ({version.commit})</span>
                  )}
                </span>
              )}
            </Link>
            <ToggleSidebar />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function ToggleSidebar({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-sidebar='trigger'
      data-slot='sidebar-trigger'
      variant='ghost'
      size='icon'
      className={cn('aspect-square size-8 max-md:scale-125', className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <X className='md:hidden' />
      <Menu className='max-md:hidden' />
      <span className='sr-only'>Toggle Sidebar</span>
    </Button>
  )
}
