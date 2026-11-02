import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  authMeQueryOptions,
  type MeResponse,
  redirectToLogin,
} from '@/lib/auth'
import { canAccessScreen, screenForPath } from '@/lib/screens'
import { BrandSpinner } from '@/components/brand-spinner'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { sidebarData } from '@/components/layout/data/sidebar-data'
import { flattenNavItems } from '@/components/layout/nav-utils'

/** First (enabled) sidebar page this user may open, in menu order. */
function firstAccessibleUrl(me: MeResponse): string | undefined {
  for (const group of sidebarData.navGroups) {
    for (const { item } of flattenNavItems(group.items)) {
      if (
        !item.disabled &&
        item.url !== '/' &&
        canAccessScreen(me, item.screen)
      )
        return String(item.url)
    }
  }
  return undefined
}

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.ensureQueryData(authMeQueryOptions)
    if (!me.authenticated) {
      redirectToLogin(location.href)
      // The browser is about to navigate away to Django's login page —
      // hang here so this route never actually attempts to render.
      await new Promise<never>(() => {})
    }

    // Screen-level access — typing a URL the user has no screen for sends
    // them home. The me query above is already resolved here (this runs on
    // every navigation into an _authenticated page), so there's no loading
    // state to wait out. Home itself is guarded too (DASHBOARD) — a user
    // without it is sent to the first page they *can* open instead, which
    // also keeps the redirect from looping back to '/'.
    if (!canAccessScreen(me, screenForPath(location.pathname))) {
      if (location.pathname !== '/') throw redirect({ to: '/' })
      const fallback = firstAccessibleUrl(me)
      if (fallback) throw redirect({ to: fallback })
    }
  },
  pendingComponent: () => (
    <div className='flex h-svh items-center justify-center'>
      <BrandSpinner size={64} />
    </div>
  ),
  component: AuthenticatedLayout,
})
