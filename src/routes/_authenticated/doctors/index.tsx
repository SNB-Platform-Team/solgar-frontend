import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Doctors } from '@/features/doctors'

const doctorsSearchSchema = z.object({
  brand: z.string().optional().catch(undefined),
  page: z.number().optional().catch(1),
  search: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/doctors/')({
  validateSearch: doctorsSearchSchema,
  component: Doctors,
})
