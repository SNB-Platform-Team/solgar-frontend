import { createFileRoute } from '@tanstack/react-router'
import { authMeQueryOptions, redirectToLogin } from '@/lib/auth'
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
  },
  pendingComponent: () => (
    <div className='flex h-svh items-center justify-center'>
      <BrandSpinner size={64} />
    </div>
  ),
  component: AuthenticatedLayout,
})
