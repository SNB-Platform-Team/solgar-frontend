import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Employees } from '@/features/employees'

const employeesSearchSchema = z.object({
  page: z.number().optional().catch(1),
  search: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/employees/')({
  validateSearch: employeesSearchSchema,
  component: Employees,
})
