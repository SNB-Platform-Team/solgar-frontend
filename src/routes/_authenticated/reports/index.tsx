import { createFileRoute } from '@tanstack/react-router'
import { FileBarChart } from 'lucide-react'
import { PlaceholderPage } from '@/features/placeholder'

export const Route = createFileRoute('/_authenticated/reports/')({
  component: () => (
    <PlaceholderPage
      title='Отчёты'
      description='Раздел в разработке. Здесь появятся сводные отчёты по продажам, аптекам и врачам.'
      icon={FileBarChart}
    />
  ),
})
