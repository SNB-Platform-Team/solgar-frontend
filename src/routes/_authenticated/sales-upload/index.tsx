import { createFileRoute } from '@tanstack/react-router'
import { SalesUpload } from '@/features/sales-upload'

export const Route = createFileRoute('/_authenticated/sales-upload/')({
  component: SalesUpload,
})
