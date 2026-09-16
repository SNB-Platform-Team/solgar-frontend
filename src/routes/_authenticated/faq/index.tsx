import { createFileRoute } from '@tanstack/react-router'
import { Faq } from '@/features/faq'

export const Route = createFileRoute('/_authenticated/faq/')({
  component: Faq,
})
