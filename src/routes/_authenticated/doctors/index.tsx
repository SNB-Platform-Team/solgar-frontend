import { createFileRoute } from '@tanstack/react-router'
import { Stethoscope } from 'lucide-react'
import { PlaceholderPage } from '@/features/placeholder'

export const Route = createFileRoute('/_authenticated/doctors/')({
  component: () => (
    <PlaceholderPage
      title='Врачи'
      description='Раздел в разработке. Здесь появится реестр врачей.'
      icon={Stethoscope}
    />
  ),
})
