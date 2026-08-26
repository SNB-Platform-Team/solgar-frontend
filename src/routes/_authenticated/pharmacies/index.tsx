import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Pharmacies } from '@/features/pharmacies'

const pharmaciesSearchSchema = z.object({
  brand: z.string().optional().catch(undefined),
  page: z.number().optional().catch(1),
  search: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/pharmacies/')({
  validateSearch: pharmaciesSearchSchema,
  component: Pharmacies,
})
