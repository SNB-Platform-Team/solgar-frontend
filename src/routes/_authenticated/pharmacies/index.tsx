import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Pharmacies } from '@/features/pharmacies'

const pharmaciesSearchSchema = z.object({
  brand: z.string().optional().catch(undefined),
  page: z.number().optional().catch(1),
  search: z.string().optional().catch(undefined),
  // Cascading location filters — each level depends on the ones above it.
  country: z.string().optional().catch(undefined),
  area: z.string().optional().catch(undefined),
  region: z.string().optional().catch(undefined),
  city: z.string().optional().catch(undefined),
  // Independent filters.
  group_company: z.string().optional().catch(undefined),
  pharmacy_category: z.string().optional().catch(undefined),
  pharmacy_type: z.string().optional().catch(undefined),
  promo: z.string().optional().catch(undefined),
  marketing_staff: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/pharmacies/')({
  validateSearch: pharmaciesSearchSchema,
  component: Pharmacies,
})
