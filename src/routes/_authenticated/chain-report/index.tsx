import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ChainReport } from '@/features/chain-report'

const chainReportSearchSchema = z.object({
  brand: z.string().optional().catch(undefined),
  page: z.number().optional().catch(1),
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
  chain_name: z.string().optional().catch(undefined),
  country: z.string().optional().catch(undefined),
  region: z.string().optional().catch(undefined),
  district: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/chain-report/')({
  validateSearch: chainReportSearchSchema,
  component: ChainReport,
})
