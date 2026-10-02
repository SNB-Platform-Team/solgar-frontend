import { createFileRoute } from '@tanstack/react-router'
import { PowerBiObshiy } from '@/features/powerbi-obshiy'

export const Route = createFileRoute('/_authenticated/powerbi-obshiy/')({
  component: PowerBiObshiy,
})
