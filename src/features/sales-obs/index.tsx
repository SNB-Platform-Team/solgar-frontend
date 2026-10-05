import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCountryLock } from '@/hooks/use-country-lock'
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
import { BrandSpinner } from '@/components/brand-spinner'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { type StorageOptionsResponse } from '@/features/distributor-upload/types'
import {
  type DistributorReportFilters,
  type DistributorReportOption,
  type DistributorReportResponse,
} from './types'

// Radix Select item values can't be an empty string, but "all X" is
// represented server-side by an empty query param.
const ALL = '__ALL__'

// Fallback shown before the first response arrives — the real dropdown
// options (value + label) come from the backend's own options.rep_types/
// options.operations, see `repTypes`/`operations` below.
const DEFAULT_REP_TYPES: DistributorReportOption[] = [
  { value: 'DISTRIBUTOR_REPORT', label: 'По дистрибьюторам' },
  { value: 'CITY_REPORT', label: 'По городам' },
  { value: 'ALL_PRODUCTS_REPORT', label: 'По всем товарам' },
  { value: 'BRAND_REPORT', label: 'По брендам' },
]

const DEFAULT_OPERATIONS: DistributorReportOption[] = [
  { value: 'STOCK', label: 'Остатки' },
  { value: 'SALE', label: 'Продажи' },
]

// Fixed per the backend's own enum — not echoed back under `options`.
const BRAND_OPTIONS = ['SOLGAR', 'BOUNTY', 'OTHER']

const DEFAULT_FILTERS: DistributorReportFilters = {
  rep_type: 'DISTRIBUTOR_REPORT',
  operation_type: 'STOCK',
  distributor: '',
  city: '',
  brand: '',
  country: '',
  product: '',
  begin: '',
  end: '',
}

export function SalesObs() {
  // Draft filters — edited freely by the user, only sent to the backend once
  // "Сформировать отчёт" is pressed (see `committed` below).
  const [filters, setFilters] =
    useState<DistributorReportFilters>(DEFAULT_FILTERS)
  const [committed, setCommitted] = useState<{
    run: boolean
    filters: DistributorReportFilters
  }>({ run: false, filters: DEFAULT_FILTERS })
  const [periodMissing, setPeriodMissing] = useState(false)

  const setFilter = (key: keyof DistributorReportFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  // Country access is per-user — everyone but an admin is pinned to their
  // own country and can't change it (see useCountryLock).
  const countryLock = useCountryLock()
  const locked = countryLock.locked
  const effectiveCountry = locked ? countryLock.userCountry : filters.country

  // Страна drives Дистрибьютор (prm_storages for that country) — changing
  // it invalidates whatever distributor was picked, same cascade as
  // Distributor Upload's own Страна→Дистрибьютор.
  const setCountry = (value: string) =>
    setFilters((prev) => ({ ...prev, country: value, distributor: '' }))

  const { data: distributorOptions } = useQuery<StorageOptionsResponse>({
    queryKey: ['storage-options', effectiveCountry],
    queryFn: async () => {
      const params = new URLSearchParams({ country: effectiveCountry })
      const res = await api.get<StorageOptionsResponse>(
        `/sales/api/storage-options/?${params}`
      )
      return res.data
    },
    enabled: Boolean(effectiveCountry),
  })

  const { data, isLoading, isFetching, error } =
    useQuery<DistributorReportResponse>({
      queryKey: ['distributor-report', committed.run, committed.filters],
      queryFn: async () => {
        const f = committed.filters
        const params = new URLSearchParams()
        if (committed.run) params.set('run', '1')
        params.set('rep_type', f.rep_type)
        params.set('operation_type', f.operation_type)
        params.set('distributor', f.distributor)
        params.set('city', f.city)
        params.set('brand', f.brand)
        params.set('country', f.country)
        params.set('product', f.product)
        params.set('begin', f.begin)
        params.set('end', f.end)
        const res = await api.get<DistributorReportResponse>(
          `/sales/api/distributor-report/?${params}`
        )
        return res.data
      },
      placeholderData: (previousData) => previousData,
    })

  const repTypes = data?.options.rep_types ?? DEFAULT_REP_TYPES
  const operations = data?.options.operations ?? DEFAULT_OPERATIONS

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!filters.begin || !filters.end) {
      setPeriodMissing(true)
      return
    }
    setPeriodMissing(false)
    setCommitted({
      run: true,
      filters: { ...filters, country: effectiveCountry },
    })
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
            Просмотр Сток и Продажа
          </h1>
          <p className='text-muted-foreground'>
            Отчёт по дистрибьюторам — сток и продажи за период
          </p>
        </div>

        <Card className='mb-4'>
          <CardHeader>
            <CardTitle className='text-base'>Фильтры</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <Label>Дата с</Label>
                  <Input
                    type='date'
                    value={filters.begin}
                    onChange={(e) => setFilter('begin', e.target.value)}
                    required
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label>Дата по</Label>
                  <Input
                    type='date'
                    value={filters.end}
                    onChange={(e) => setFilter('end', e.target.value)}
                    required
                  />
                </div>
              </div>

              {periodMissing && (
                <p className='text-sm text-destructive'>
                  Укажите обе даты периода — «Дата с» и «Дата по».
                </p>
              )}

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
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
                        <SelectItem key={rt.value} value={rt.value}>
                          {rt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label>Тип операции</Label>
                  <Select
                    value={filters.operation_type}
                    onValueChange={(v) => setFilter('operation_type', v)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operations.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Страна always comes first — standard order across every
                    filter/upload screen in the app, Дистрибьютор cascades
                    off it next. */}
                <div className='space-y-1.5'>
                  <Label>Страна</Label>
                  <FilterSelect
                    value={effectiveCountry}
                    options={
                      locked ? [countryLock.userCountry] : countryLock.countries
                    }
                    onChange={setCountry}
                    placeholder='Все страны'
                    disabled={locked}
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Дистрибьютор</Label>
                  <FilterSelect
                    value={filters.distributor}
                    options={distributorOptions?.storages ?? []}
                    onChange={(v) => setFilter('distributor', v)}
                    placeholder={
                      effectiveCountry
                        ? 'Все дистрибьюторы'
                        : 'Сначала выберите страну'
                    }
                    disabled={!effectiveCountry}
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Компания</Label>
                  <FilterSelect
                    value={filters.brand}
                    options={BRAND_OPTIONS}
                    onChange={(v) => setFilter('brand', v)}
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
                  <Label>Товар</Label>
                  <Input
                    value={filters.product}
                    onChange={(e) => setFilter('product', e.target.value)}
                    placeholder='Товар'
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
                Выберите период и нажмите «Сформировать отчёт»
              </div>
            ) : hasError ? (
              <div className='rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
                {data?.error || 'Ошибка загрузки данных'}
              </div>
            ) : showSkeleton ? (
              <div className='flex items-center justify-center py-16'>
                <BrandSpinner size={48} label='Загрузка данных' />
              </div>
            ) : report && report.rows.length > 0 ? (
              <div
                className={
                  'scroll-x-visible max-h-[600px] overflow-y-auto rounded-md border transition-opacity' +
                  (isFetching ? ' opacity-60' : '')
                }
              >
                <Table className='min-w-max'>
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
                      <TableRow key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <TableCell
                            key={cellIdx}
                            className={
                              'whitespace-nowrap' +
                              (cellIdx === row.length - 1 ? ' text-right' : '')
                            }
                          >
                            {typeof cell === 'number'
                              ? cell.toLocaleString('ru-RU')
                              : (cell ?? '—')}
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

// A single "<Select/>" filter field with a built-in "Все" (no filter)
// option — same pattern used across every report screen in this app.
// `value`/`onChange` use '' for "no filter", mapped to/from the ALL
// sentinel Radix Select requires for item values.
function FilterSelect({
  value,
  options,
  onChange,
  disabled,
  placeholder = 'Все',
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <Select
      value={value === '' ? ALL : value}
      onValueChange={(v) => onChange(v === ALL ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger className='w-full'>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
