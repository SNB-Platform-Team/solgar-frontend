import { createFileRoute, redirect } from '@tanstack/react-router'
import { authMeQueryOptions, redirectToLogin } from '@/lib/auth'
import { canAccessScreen, screenForPath } from '@/lib/screens'
import { BrandSpinner } from '@/components/brand-spinner'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

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
    // state to wait out. Home ('/') itself needs no screen, so this can
    // never loop.
    if (!canAccessScreen(me, screenForPath(location.pathname))) {
      throw redirect({ to: '/' })
    }
  },
  pendingComponent: () => (
    <div className='flex h-svh items-center justify-center'>
      <BrandSpinner size={64} />
    </div>
  ),
  component: AuthenticatedLayout,
})
