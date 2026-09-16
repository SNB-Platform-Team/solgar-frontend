import { Lock } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

type ContentSectionProps = {
  title: string
  desc: string
  children: React.JSX.Element
}

export function ContentSection({ title, desc, children }: ContentSectionProps) {
  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex-none'>
        <h3 className='text-lg font-medium'>{title}</h3>
        <p className='text-sm text-muted-foreground'>{desc}</p>
      </div>
      <Separator className='my-4 flex-none' />
      <div className='faded-bottom h-full w-full overflow-y-auto scroll-smooth pe-4 pb-12'>
        <div className='-mx-1 space-y-4 px-1.5 lg:max-w-xl'>
          {/* Every settings tab is currently locked to view-only — shown
              once here rather than duplicated in each tab's form. */}
          <Alert>
            <Lock />
            <AlertTitle>Настройки управляются администратором</AlertTitle>
            <AlertDescription>
              Просмотр доступен всем, но изменение параметров этого раздела
              отключено.
            </AlertDescription>
          </Alert>
          {children}
        </div>
      </div>
    </div>
  )
}
