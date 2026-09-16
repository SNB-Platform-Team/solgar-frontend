import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { type FaqResponse } from './types'

// The "which screens am I allowed to see" answer gets the user's actual
// screen list appended as badges — matched loosely so minor wording changes
// on the backend don't silently stop working.
const isScreensQuestion = (q: string) =>
  q.toLowerCase().includes('раздел') && q.toLowerCase().includes('доступн')

export function Faq() {
  const { data, isLoading, error } = useQuery<FaqResponse>({
    queryKey: ['faq'],
    queryFn: async () => {
      const res = await api.get<FaqResponse>('/sales/api/faq/')
      return res.data
    },
  })

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-4'>
          <h1 className='text-2xl font-bold tracking-tight'>
            Часто задаваемые вопросы
          </h1>
          {data && (
            <p className='text-muted-foreground'>
              Вы вошли как: {data.user_display}
            </p>
          )}
        </div>

        <Card>
          <CardContent>
            {error ? (
              <div className='rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
                Ошибка загрузки данных
              </div>
            ) : isLoading ? (
              <div className='space-y-4'>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className='h-10 w-full' />
                ))}
              </div>
            ) : data && data.faq.length > 0 ? (
              <Accordion type='single' collapsible>
                {data.faq.map((entry, idx) => (
                  <AccordionItem key={idx} value={`item-${idx}`}>
                    <AccordionTrigger>{entry.q}</AccordionTrigger>
                    <AccordionContent>
                      <p className='whitespace-pre-line'>{entry.a}</p>
                      {isScreensQuestion(entry.q) &&
                        data.my_screens.length > 0 && (
                          <div className='mt-3 flex flex-wrap gap-2'>
                            {data.my_screens.map((screen) => (
                              <Badge key={screen} variant='secondary'>
                                {screen}
                              </Badge>
                            ))}
                          </div>
                        )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className='py-16 text-center text-muted-foreground italic'>
                Нет данных
              </div>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
