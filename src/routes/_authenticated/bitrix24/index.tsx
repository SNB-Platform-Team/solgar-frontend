import { createFileRoute } from '@tanstack/react-router'
import { MessageCircle } from 'lucide-react'
import { PlaceholderPage } from '@/features/placeholder'

export const Route = createFileRoute('/_authenticated/bitrix24/')({
  component: () => (
    <PlaceholderPage
      title='Битрикс24'
      description='Интеграция с внешней системой Битрикс24 пока не подключена.'
      icon={MessageCircle}
    />
  ),
})
