import { createFileRoute, redirect } from '@tanstack/react-router'

// The old single Аналитика 1C page was split into three Superset
// dashboards — keep old links/bookmarks working by sending them to the
// first one.
export const Route = createFileRoute('/_authenticated/analytics-1c/')({
  beforeLoad: () => {
    throw redirect({ to: '/analytics-1c/stock-movement' })
  },
})
