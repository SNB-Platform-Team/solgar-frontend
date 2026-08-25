import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { OneCStock } from '@/features/onec-stock'

const oneCStockSearchSchema = z.object({
  tab: z.string().optional().catch(undefined),
  page: z.number().optional().catch(1),
  search: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/onec-stock/')({
  validateSearch: oneCStockSearchSchema,
  component: OneCStock,
})
