import { createFileRoute } from '@tanstack/react-router'
import { Link2 } from 'lucide-react'
import { PlaceholderPage } from '@/features/placeholder'

export const Route = createFileRoute('/_authenticated/hrlink/')({
  component: () => (
    <PlaceholderPage
      title='HRlink'
      description='Интеграция с внешней системой HRlink пока не подключена.'
      icon={Link2}
    />
  ),
})
