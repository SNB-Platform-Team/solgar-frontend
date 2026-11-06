import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Doctors } from '@/features/doctors'

const doctorsSearchSchema = z.object({
  brand: z.string().optional().catch(undefined),
  page: z.number().optional().catch(1),
  search: z.string().optional().catch(undefined),
  // Фильтр panel — the backend's own query params, so a filtered list can be
  // shared or reloaded as is.
  country: z.string().optional().catch(undefined),
  area: z.string().optional().catch(undefined),
  region: z.string().optional().catch(undefined),
  city: z.string().optional().catch(undefined),
  medrep: z.string().optional().catch(undefined),
  specialty: z.string().optional().catch(undefined),
  unified_specialty: z.string().optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  activeness: z.string().optional().catch(undefined),
  clinic_status: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/doctors/')({
  validateSearch: doctorsSearchSchema,
  component: Doctors,
})
