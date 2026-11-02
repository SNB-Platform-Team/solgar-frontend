import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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

// Profile panel's own status colors — active=green, azure=blue,
// disabled=grey.
const PROFILE_STATUS_CLASS: Record<string, string> = {
  active:
    'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30',
  azure: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  disabled: 'bg-muted text-muted-foreground border-border',
}

/** "Caner Çevik" → "CÇ"; one word → its first two letters; no name →
 * the username's first two letters. */
function initialsFor(employee: Employee): string {
  const words = employee.name.trim().split(/\s+/).filter(Boolean)
  const initials =
    words.length >= 2
      ? words[0][0] + words[1][0]
      : words.length === 1
        ? words[0].slice(0, 2)
        : employee.username.slice(0, 2)
  return initials.toUpperCase()
}

/** Deterministic background color — the same person always gets the
 * same hue. */
function colorFor(seed: string): string {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const hue = h % 360
  return `hsl(${hue} 55% 45%)`
}

function EmployeeAvatar({
  employee,
  className,
}: {
  employee: Employee
  className?: string
}) {
  return (
    <Avatar className={className}>
      <AvatarFallback
        style={{
          backgroundColor: colorFor(employee.name || employee.username),
          color: 'white',
        }}
      >
        {initialsFor(employee)}
      </AvatarFallback>
    </Avatar>
  )
}

const route = getRouteApi('/_authenticated/employees/')

export function Employees() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const page = search.page ?? 1
  const query = search.search ?? ''

  // Local input state so typing doesn't trigger a fetch on every keystroke —
  // only submitting the form (or pressing Enter) commits `search` to the URL.
  const [searchInput, setSearchInput] = useState(query)

  // Employee whose profile panel is open (row click).
  const [selected, setSelected] = useState<Employee | null>(null)

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
                      <TableHead className='w-12'>
                        <span className='sr-only'>Аватар</span>
                      </TableHead>
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
                      <TableRow
                        key={employee.username || idx}
                        onClick={() => setSelected(employee)}
                        className='cursor-pointer'
                      >
                        <TableCell className='py-2'>
                          <EmployeeAvatar
                            employee={employee}
                            className='h-8 w-8 text-xs'
                          />
                        </TableCell>
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

        <Sheet
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
        >
          <SheetContent side='right' className='sm:max-w-md'>
            {selected && <EmployeeProfile employee={selected} />}
          </SheetContent>
        </Sheet>
      </Main>
    </>
  )
}

// Read-only profile panel contents — big avatar, name + role, then every
// non-empty field.
function EmployeeProfile({ employee }: { employee: Employee }) {
  const rows: { label: string; value: React.ReactNode }[] = []
  if (employee.username) rows.push({ label: 'Логин', value: employee.username })
  if (employee.email)
    rows.push({
      label: 'Email',
      value: (
        <a
          href={`mailto:${employee.email}`}
          className='text-primary underline-offset-4 hover:underline'
        >
          {employee.email}
        </a>
      ),
    })
  if (employee.phone) rows.push({ label: 'Телефон', value: employee.phone })
  if (employee.department)
    rows.push({ label: 'Отдел', value: employee.department })
  if (employee.role) rows.push({ label: 'Роль', value: employee.role })
  if (employee.status_label || employee.status)
    rows.push({
      label: 'Статус',
      value: (
        <Badge
          variant='outline'
          className={cn(
            PROFILE_STATUS_CLASS[employee.status] ?? DEFAULT_STATUS_CLASS
          )}
        >
          {employee.status_label || employee.status}
        </Badge>
      ),
    })

  return (
    <>
      <SheetHeader className='items-center pt-8 text-center'>
        <EmployeeAvatar employee={employee} className='h-16 w-16 text-xl' />
        <SheetTitle className='text-lg'>
          {employee.name || employee.username}
        </SheetTitle>
        <SheetDescription asChild>
          <div>
            {employee.role && (
              <Badge variant='secondary'>{employee.role}</Badge>
            )}
          </div>
        </SheetDescription>
      </SheetHeader>
      <dl className='divide-y overflow-y-auto border-t px-4 pb-4'>
        {rows.map((row) => (
          <div
            key={row.label}
            className='grid grid-cols-[7rem_1fr] items-center gap-3 py-3'
          >
            <dt className='text-sm text-muted-foreground'>{row.label}</dt>
            <dd className='text-sm font-medium break-words'>{row.value}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}
