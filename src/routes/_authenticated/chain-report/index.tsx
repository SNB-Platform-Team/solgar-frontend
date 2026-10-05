import { createFileRoute } from '@tanstack/react-router'
import { ChainReport } from '@/features/chain-report'

export const Route = createFileRoute('/_authenticated/chain-report/')({
  component: ChainReport,
})
