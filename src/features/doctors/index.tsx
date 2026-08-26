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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { type DoctorApiResponse } from './types'

// Unlike pharmacies, this backend defaults an empty brand to "all companies" —
// Radix Select item values can't be an empty string, so "" is mapped to this
// sentinel for the dropdown and back to "" when building the query.
const ALL_BRAND = '__ALL__'
const DEFAULT_BRAND = ''

const route = getRouteApi('/_authenticated/doctors/')

export function Doctors() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const brand = search.brand ?? DEFAULT_BRAND
  const page = search.page ?? 1
  const query = search.search ?? ''

  // Local input state so typing doesn't trigger a fetch on every keystroke —
  // only submitting the form (or pressing Enter) commits `search` to the URL.
  const [searchInput, setSearchInput] = useState(query)

  const setSearch = (next: {
    brand?: string
    page?: number
    search?: string
  }) => navigate({ search: (prev) => ({ ...prev, ...next }) })

  const { data, isLoading, isPlaceholderData, error } =
    useQuery<DoctorApiResponse>({
      queryKey: ['doctors', brand, page, query],
      queryFn: async () => {
        const params = new URLSearchParams({ brand, page: String(page) })
        if (query) params.set('search', query)
        const res = await api.get<DoctorApiResponse>(
          `/sales/api/doctor/?${params}`
        )
        return res.data
      },
      placeholderData: (previousData) => previousData,
    })

  const brands = data?.brands ?? [{ value: DEFAULT_BRAND, label: 'Все' }]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch({ page: 1, search: searchInput || undefined })
  }

  const changeBrand = (newBrand: string) => {
    setSearch({
      brand: newBrand === ALL_BRAND ? '' : newBrand,
      page: 1,
    })
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
          <h1 className='text-2xl font-bold tracking-tight'>Врачи</h1>
          <p className='text-muted-foreground'>Реестр врачей</p>
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
            <div className='flex flex-wrap items-center gap-2'>
              <Select
                value={brand === '' ? ALL_BRAND : brand}
                onValueChange={changeBrand}
              >
                <SelectTrigger className='w-44'>
                  <SelectValue placeholder='Компания' />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem
                      key={b.value || ALL_BRAND}
                      value={b.value === '' ? ALL_BRAND : b.value}
                    >
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <form onSubmit={handleSearch} className='flex items-center gap-2'>
                <div className='relative'>
                  <SearchIcon className='absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder='Поиск: ФИО, город или клиника'
                    className='w-64 ps-8'
                  />
                </div>
                <Button type='submit' variant='outline'>
                  Поиск
                </Button>
              </form>
            </div>
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
                            {cell ?? ''}
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
      </Main>
    </>
  )
}
