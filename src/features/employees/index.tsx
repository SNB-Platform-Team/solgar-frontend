import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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
import { BrandSpinner } from '@/components/brand-spinner'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { type Employee, type EmployeesApiResponse } from './types'

// Same tinted-outline-badge convention as the template's own User List
// (features/users/data/data.ts callTypes) — active/azure/disabled are the
// three statuses the backend actually sends; anything else falls back to
// a neutral badge rather than breaking.
const STATUS_BADGE_CLASS: Record<string, string> = {
  active: 'bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200',
  azure: 'bg-sky-200/40 text-sky-900 dark:text-sky-100 border-sky-300',
  disabled:
    'bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20',
}
const DEFAULT_STATUS_CLASS = 'bg-neutral-300/40 border-neutral-300'

const route = getRouteApi('/_authenticated/employees/')

export function Employees() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const page = search.page ?? 1
  const query = search.search ?? ''

  // Local input state so typing doesn't trigger a fetch on every keystroke —
  // only submitting the form (or pressing Enter) commits `search` to the URL.
  const [searchInput, setSearchInput] = useState(query)

  const setSearch = (next: { page?: number; search?: string }) =>
    navigate({ search: (prev) => ({ ...prev, ...next }) })

  const { data, isLoading, isPlaceholderData, error } =
    useQuery<EmployeesApiResponse>({
      queryKey: ['employees', page, query],
      queryFn: async () => {
        const params = new URLSearchParams({ page: String(page) })
        if (query) params.set('search', query)
        const res = await api.get<EmployeesApiResponse>(
          `/sales/api/employees/?${params}`
        )
        return res.data
      },
      placeholderData: (previousData) => previousData,
    })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch({ page: 1, search: searchInput || undefined })
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
          <h1 className='text-2xl font-bold tracking-tight'>Сотрудники</h1>
          <p className='text-muted-foreground'>
            Реестр сотрудников организации
          </p>
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
            <form onSubmit={handleSearch} className='flex items-center gap-2'>
              <div className='relative'>
                <SearchIcon className='absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder='Поиск сотрудников...'
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
              <div className='flex items-center justify-center py-16'>
                <BrandSpinner size={48} label='Загрузка данных' />
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
                      <TableHead className='whitespace-nowrap'>
                        Имя пользователя
                      </TableHead>
                      <TableHead className='whitespace-nowrap'>ФИО</TableHead>
                      <TableHead className='whitespace-nowrap'>
                        Эл. почта
                      </TableHead>
                      <TableHead className='whitespace-nowrap'>
                        Телефон
                      </TableHead>
                      <TableHead className='whitespace-nowrap'>Отдел</TableHead>
                      <TableHead className='whitespace-nowrap'>
                        Статус
                      </TableHead>
                      <TableHead className='whitespace-nowrap'>Роль</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((employee: Employee, idx) => (
                      <TableRow key={employee.username || idx}>
                        <TableCell className='font-medium whitespace-nowrap'>
                          {employee.username || '—'}
                        </TableCell>
                        <TableCell className='whitespace-nowrap'>
                          {employee.name || '—'}
                        </TableCell>
                        <TableCell className='whitespace-nowrap'>
                          {employee.email || '—'}
                        </TableCell>
                        <TableCell className='whitespace-nowrap'>
                          {employee.phone || '—'}
                        </TableCell>
                        <TableCell className='whitespace-nowrap'>
                          {employee.department || '—'}
                        </TableCell>
                        <TableCell className='whitespace-nowrap'>
                          <Badge
                            variant='outline'
                            className={cn(
                              STATUS_BADGE_CLASS[employee.status] ??
                                DEFAULT_STATUS_CLASS
                            )}
                          >
                            {employee.status_label || employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell className='whitespace-nowrap'>
                          <Badge variant='outline'>{employee.role}</Badge>
                        </TableCell>
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
