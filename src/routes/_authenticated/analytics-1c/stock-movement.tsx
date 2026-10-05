import { createFileRoute } from '@tanstack/react-router'
import { StockMovement } from '@/features/analytics-1c'

export const Route = createFileRoute(
  '/_authenticated/analytics-1c/stock-movement'
)({
  component: StockMovement,
})
