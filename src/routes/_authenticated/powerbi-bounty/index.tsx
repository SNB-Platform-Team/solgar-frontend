import { createFileRoute } from '@tanstack/react-router'
import { PowerBiBounty } from '@/features/powerbi-bounty'

export const Route = createFileRoute('/_authenticated/powerbi-bounty/')({
  component: PowerBiBounty,
})
