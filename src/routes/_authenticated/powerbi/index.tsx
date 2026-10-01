import { createFileRoute } from '@tanstack/react-router'
import { PowerBi } from '@/features/powerbi'

export const Route = createFileRoute('/_authenticated/powerbi/')({
  component: PowerBi,
})
