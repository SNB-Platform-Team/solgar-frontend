import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { type OneCApiResponse, type OneCTab } from './types'

const DEFAULT_TAB = 'orders'

const route = getRouteApi('/_authenticated/onec-stock/')

export function OneCStock() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const tab = search.tab ?? DEFAULT_TAB
  const page = search.page ?? 1
  const query = search.search ?? ''

  // Local input state so typing doesn't trigger a fetch on every keystroke —
  // only submitting the form (or pressing Enter) commits `search` to the URL.
  const [searchInput, setSearchInput] = useState(query)

  const setSearch = (next: {
    tab?: string
    page?: number
    search?: string
  }) => navigate({ search: (prev) => ({ ...prev, ...next }) })

  const { data, isLoading, isPlaceholderData, error } =
    useQuery<OneCApiResponse>({
      queryKey: ['onec-stock', tab, page, query],
      queryFn: async () => {
        const params = new URLSearchParams({ tab, page: String(page) })
        if (query) params.set('search', query)
        const res = await api.get<OneCApiResponse>(
          `/sales/api/onec/?${params}`
        )
        return res.data
      },
      placeholderData: (previousData) => previousData,
    })

  const tabs: OneCTab[] = data?.tabs ?? []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch({ page: 1, search: searchInput || undefined })
  }

  const changeTab = (newTab: string) => {
    setSearch({ tab: newTab, page: 1, search: undefined })
    setSearchInput('')
  }

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
          <h1 className='text-2xl font-bold tracking-tight'>1C — Склад</h1>
          <p className='text-muted-foreground'>
            Заказы, поставки, продажи и свободные остатки
          </p>
        </div>

        <Tabs value={tab} onValueChange={changeTab} className='space-y-4'>
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              {tabs.length > 0
                ? tabs.map((t) => (
                    <TabsTrigger key={t.key} value={t.key}>
                      {t.label}
                    </TabsTrigger>
                  ))
                : // Skeleton tabs while the first request is in flight
                  Array.from({ length: 4 }).map((_, i) => (
                    <TabsTrigger key={i} value={`__loading-${i}`} disabled>
                      <Skeleton className='h-4 w-16' />
                    </TabsTrigger>
                  ))}
            </TabsList>
          </div>

          <Card>
            <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-3 space-y-0'>
              <CardDescription>
                {data ? (
                  <>
                    Всего:{' '}
                    <span className='font-medium text-foreground'>
                      {data.total_rows}
                    </span>{' '}
                    · Страница {data.page} из {data.num_pages}
                  </>
                ) : (
                  <Skeleton className='h-4 w-40' />
                )}
              </CardDescription>
              <form
                onSubmit={handleSearch}
                className='flex items-center gap-2'
              >
                <div className='relative'>
                  <SearchIcon className='absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder='Поиск: наименование или SAP...'
                    className='w-64 ps-8'
                  />
                </div>
                <Button type='submit' variant='outline'>
                  Поиск
                </Button>
              </form>
            </CardHeader>

            <CardContent>
              {error ? (
                <div className='rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
                  Ошибка загрузки данных
                </div>
              ) : isLoading ? (
                <div className='space-y-2'>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className='h-8 w-full' />
                  ))}
                </div>
              ) : data && data.rows.length > 0 ? (
                <div
                  className={
                    'max-h-[600px] overflow-auto rounded-md border transition-opacity' +
                    (isPlaceholderData ? ' opacity-60' : '')
                  }
                >
                  <Table>
                    <TableHeader className='sticky top-0 bg-card'>
                      <TableRow>
                        {data.columns.map((col) => (
                          <TableHead key={col} className='whitespace-nowrap'>
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.rows.map((row, idx) => (
                        <TableRow key={idx}>
                          {row.map((cell, cellIdx) => (
                            <TableCell
                              key={cellIdx}
                              className='whitespace-nowrap'
                            >
                              {cell ?? '—'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className='py-16 text-center text-muted-foreground italic'>
                  Нет данных
                </div>
              )}

              {data && data.num_pages > 1 && (
                <div className='mt-4 flex items-center justify-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={!data.has_prev}
                    onClick={() => setSearch({ page: page - 1 })}
                  >
                    <ChevronLeft className='size-4' />
                    Назад
                  </Button>
                  <span className='px-4 text-sm text-muted-foreground'>
                    Страница {data.page} из {data.num_pages}
                  </span>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={!data.has_next}
                    onClick={() => setSearch({ page: page + 1 })}
                  >
                    Вперёд
                    <ChevronRight className='size-4' />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </Tabs>
      </Main>
    </>
  )
}
