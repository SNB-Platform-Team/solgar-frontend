import { createFileRoute } from '@tanstack/react-router'
import { DoctorManagerial } from '@/features/doctor-managerial'

export const Route = createFileRoute('/_authenticated/doctor-managerial/')({
  component: DoctorManagerial,
})
