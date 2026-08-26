import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  type PharmManagerialFilters,
  type PharmManagerialResponse,
} from './types'

const DEFAULT_REP_TYPES = [
  'REGIONS',
  'MAIN_DISTRICT',
  'CITY',
  'MED_REPS',
  'CHAINS',
  'ACTIVATION_DATE',
]

const REP_TYPE_LABELS: Record<string, string> = {
  REGIONS: 'Регионы',
  MAIN_DISTRICT: 'Федеральный округ',
  CITY: 'Город',
  MED_REPS: 'Мед. представители',
  CHAINS: 'Аптечные сети',
  ACTIVATION_DATE: 'Дата активации',
}

const DEFAULT_PARAMETERS = [
  'TOTAL_QUANTITY',
  'TOTAL_CATEGORY',
  'TOTAL_ACTIVENESS',
]

const PARAMETER_LABELS: Record<string, string> = {
  TOTAL_QUANTITY: 'Кол-во (всего)',
  TOTAL_CATEGORY: 'Категория (всего)',
  TOTAL_ACTIVENESS: 'Активность (всего)',
}

// Unlike doctor-managerial, this backend has no "all brands" mode — an empty
// brand param is coerced server-side to "SOLGAR" — so we default to it
// directly instead of offering a (non-functional) "all companies" option.
const DEFAULT_FILTERS: PharmManagerialFilters = {
  brand: 'SOLGAR',
  rep_type: 'REGIONS',
  parameter: 'TOTAL_QUANTITY',
  country: '',
  region: '',
  city: '',
  chain: '',
  medrep: '',
  activeness: '',
}

export function PharmManagerial() {
  // Draft filters — edited freely by the user, only sent to the backend once
  // "Сформировать отчёт" is pressed (see `committed` below).
  const [filters, setFilters] =
    useState<PharmManagerialFilters>(DEFAULT_FILTERS)
  const [committed, setCommitted] = useState<{
    run: boolean
    filters: PharmManagerialFilters
  }>({ run: false, filters: DEFAULT_FILTERS })

  const setFilter = (key: keyof PharmManagerialFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  const { data, isLoading, isFetching, error } =
    useQuery<PharmManagerialResponse>({
      queryKey: [
        'pharm-managerial',
        committed.run,
        committed.filters.rep_type,
        committed.filters.parameter,
        committed.filters.brand,
        committed.filters.country,
        committed.filters.region,
        committed.filters.city,
        committed.filters.chain,
        committed.filters.medrep,
        committed.filters.activeness,
      ],
      queryFn: async () => {
        const params = new URLSearchParams()
        if (committed.run) params.set('run', '1')
        params.set('rep_type', committed.filters.rep_type)
        params.set('parameter', committed.filters.parameter)
        params.set('brand', committed.filters.brand)
        params.set('country', committed.filters.country)
        params.set('region', committed.filters.region)
        params.set('city', committed.filters.city)
        params.set('chain', committed.filters.chain)
        params.set('medrep', committed.filters.medrep)
        params.set('activeness', committed.filters.activeness)
        const res = await api.get<PharmManagerialResponse>(
          `/sales/api/pharm-managerial/?${params}`
        )
        return res.data
      },
      placeholderData: (previousData) => previousData,
    })

  const compTypes = data?.options.comp_types ?? []
  const repTypes = data?.options.rep_types ?? DEFAULT_REP_TYPES
  const parameters = data?.options.parameters ?? DEFAULT_PARAMETERS

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCommitted({ run: true, filters })
  }

  const report = data?.report ?? null
  const hasError = Boolean(error) || Boolean(data?.error)
  const showSkeleton = isLoading && !data

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
            Экран администрирования аптек
          </h1>
          <p className='text-muted-foreground'>
            Группировка и подсчёт аптек
          </p>
        </div>

        <Card className='mb-4'>
          <CardHeader>
            <CardTitle className='text-base'>Фильтры</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                <div className='space-y-1.5'>
                  <Label>Компания</Label>
                  <Select
                    value={filters.brand}
                    onValueChange={(v) => setFilter('brand', v)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(compTypes.length > 0
                        ? compTypes
                        : [{ value: 'SOLGAR', label: 'SOLGAR' }]
                      ).map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label>Тип отчёта</Label>
                  <Select
                    value={filters.rep_type}
                    onValueChange={(v) => setFilter('rep_type', v)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {repTypes.map((rt) => (
                        <SelectItem key={rt} value={rt}>
                          {REP_TYPE_LABELS[rt] ?? rt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label>Параметр</Label>
                  <Select
                    value={filters.parameter}
                    onValueChange={(v) => setFilter('parameter', v)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {parameters.map((p) => (
                        <SelectItem key={p} value={p}>
                          {PARAMETER_LABELS[p] ?? p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label>Страна</Label>
                  <Input
                    value={filters.country}
                    onChange={(e) => setFilter('country', e.target.value)}
                    placeholder='Страна'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Регион</Label>
                  <Input
                    value={filters.region}
                    onChange={(e) => setFilter('region', e.target.value)}
                    placeholder='Регион'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Город</Label>
                  <Input
                    value={filters.city}
                    onChange={(e) => setFilter('city', e.target.value)}
                    placeholder='Город'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Аптечная сеть</Label>
                  <Input
                    value={filters.chain}
                    onChange={(e) => setFilter('chain', e.target.value)}
                    placeholder='Аптечная сеть'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Мед. представитель</Label>
                  <Input
                    value={filters.medrep}
                    onChange={(e) => setFilter('medrep', e.target.value)}
                    placeholder='Мед. представитель'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Активность</Label>
                  <Input
                    value={filters.activeness}
                    onChange={(e) => setFilter('activeness', e.target.value)}
                    placeholder='Активность'
                  />
                </div>
              </div>

              <div className='flex justify-end'>
                <Button type='submit' disabled={isFetching}>
                  Сформировать отчёт
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-3 space-y-0'>
            <CardTitle className='text-base'>Результат</CardTitle>
            {committed.run &&
              (report ? (
                <span className='text-sm text-muted-foreground'>
                  Строк:{' '}
                  <span className='font-medium text-foreground'>
                    {report.total_rows}
                  </span>
                </span>
              ) : !hasError && !showSkeleton ? (
                <Skeleton className='h-4 w-24' />
              ) : null)}
          </CardHeader>
          <CardContent>
            {!committed.run ? (
              <div className='py-16 text-center text-muted-foreground italic'>
                Задайте фильтры и нажмите «Сформировать отчёт»
              </div>
            ) : hasError ? (
              <div className='rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
                {data?.error || 'Ошибка загрузки данных'}
              </div>
            ) : showSkeleton ? (
              <div className='space-y-2'>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className='h-8 w-full' />
                ))}
              </div>
            ) : report && report.rows.length > 0 ? (
              <div
                className={
                  'max-h-[600px] overflow-auto rounded-md border transition-opacity' +
                  (isFetching ? ' opacity-60' : '')
                }
              >
                <Table>
                  <TableHeader className='sticky top-0 bg-card'>
                    <TableRow>
                      {report.columns.map((col, idx) => (
                        <TableHead
                          key={col}
                          className={
                            'whitespace-nowrap' +
                            (idx === report.columns.length - 1
                              ? ' text-right'
                              : '')
                          }
                        >
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rows.map((row, rowIdx) => (
                      <TableRow
                        key={rowIdx}
                        className={rowIdx === 0 ? 'font-bold' : undefined}
                      >
                        {row.map((cell, cellIdx) => (
                          <TableCell
                            key={cellIdx}
                            className={
                              'whitespace-nowrap' +
                              (cellIdx === row.length - 1 ? ' text-right' : '')
                            }
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
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
