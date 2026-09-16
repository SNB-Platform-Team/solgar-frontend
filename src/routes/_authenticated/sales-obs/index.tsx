import { createFileRoute } from '@tanstack/react-router'
import { SalesObs } from '@/features/sales-obs'

export const Route = createFileRoute('/_authenticated/sales-obs/')({
  component: SalesObs,
})
