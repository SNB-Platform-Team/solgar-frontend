import { createFileRoute } from '@tanstack/react-router'
import { TmDashboard } from '@/features/tm-dashboard'

export const Route = createFileRoute('/_authenticated/tm-dashboard/')({
  component: TmDashboard,
})
