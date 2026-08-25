import { createFileRoute } from '@tanstack/react-router'
import { Store } from 'lucide-react'
import { PlaceholderPage } from '@/features/placeholder'

export const Route = createFileRoute('/_authenticated/pharmacies/')({
  component: () => (
    <PlaceholderPage
      title='Аптеки'
      description='Раздел в разработке. Здесь появится реестр аптек-партнёров.'
      icon={Store}
    />
  ),
})
