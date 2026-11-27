import { createFileRoute, redirect } from '@tanstack/react-router'
import { authMeQueryOptions } from '@/lib/auth'
import { SCREENS } from '@/lib/screens'
import { Dashboard } from '@/features/dashboard'

export const Route = createFileRoute('/_authenticated/')({
  // A territory manager's home is their dashboard: anyone whose screens
  // include TM_DASHBOARD goes straight to /tm-dashboard. /sales/api/me/ is
  // already cached by the _authenticated guard, so this redirects before
  // Главная renders — no flash. A superuser gets every screen code, so they
  // are left on Главная.
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(authMeQueryOptions)
    if (!me.is_superuser && me.screens.includes(SCREENS.TM_DASHBOARD))
      throw redirect({ to: '/tm-dashboard', replace: true })
  },
  component: Dashboard,
})
