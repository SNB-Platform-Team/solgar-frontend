import { createFileRoute } from '@tanstack/react-router'
import { DistributorSales } from '@/features/analytics-1c'

export const Route = createFileRoute(
  '/_authenticated/analytics-1c/distributor-sales'
)({
  component: DistributorSales,
})
