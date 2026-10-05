import { createFileRoute } from '@tanstack/react-router'
import { ProductSales } from '@/features/analytics-1c'

export const Route = createFileRoute(
  '/_authenticated/analytics-1c/product-sales'
)({
  component: ProductSales,
})
