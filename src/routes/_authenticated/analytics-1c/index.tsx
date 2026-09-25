import { createFileRoute } from '@tanstack/react-router'
import { Analytics1C } from '@/features/analytics-1c'

export const Route = createFileRoute('/_authenticated/analytics-1c/')({
  component: Analytics1C,
})
