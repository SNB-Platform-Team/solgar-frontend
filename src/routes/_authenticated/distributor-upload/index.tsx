import { createFileRoute } from '@tanstack/react-router'
import { DistributorUpload } from '@/features/distributor-upload'

export const Route = createFileRoute('/_authenticated/distributor-upload/')({
  component: DistributorUpload,
})
