import { createFileRoute } from '@tanstack/react-router'
import { PharmManagerial } from '@/features/pharm-managerial'

export const Route = createFileRoute('/_authenticated/pharm-managerial/')({
  component: PharmManagerial,
})
