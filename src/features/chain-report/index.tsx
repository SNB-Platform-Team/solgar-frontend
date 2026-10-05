import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCountryLock } from '@/hooks/use-country-lock'
import { usePharmacyChains } from '@/hooks/use-pharmacy-chains'
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
import { BrandSpinner } from '@/components/brand-spinner'
import { ChainCombobox } from '@/components/chain-combobox'
import { ConfigDrawer } from '@/components/config-drawer'
import { DataTableAuto } from '@/components/data-table/data-table-auto'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  type ChainSalesReportFilters,
  type ChainSalesReportOption,
  type ChainSalesReportResponse,
} from './types'

// Fallback shown before the first response arrives — the real dropdown
// options (value + label) come from the backend's own options.rep_types/
// options.brands, see `repTypes`/`brands` below.
const DEFAULT_REP_TYPES: ChainSalesReportOption[] = [
  { value: 'CHAIN_SALES', label: 'По сетям' },
  { value: 'CITY_SALES', label: 'По городам' },
  { value: 'PRODUCT_SALES', label: 'По товарам' },
  { value: 'MEDREP_SALES', label: 'По мед. представителям' },
  { value: 'BRAND_SALES', label: 'По брендам' },
  { value: 'SUBGROUP_SALES', label: 'По подгруппам' },
  { value: 'MAINGROUP_SALES', label: 'По основным группам' },
]

const DEFAULT_BRANDS: ChainSalesReportOption[] = [
  { value: 'SOLGAR', label: 'SOLGAR' },
  { value: 'BOUNTY', label: 'NATURES BOUNTY' },
  { value: 'OTHER', label: 'Другое' },
]

const DEFAULT_FILTERS: ChainSalesReportFilters = {
  rep_type: 'CHAIN_SALES',
  brand: '',
  country: '',
  chain: '',
  city: '',
  product: '',
  medrep: '',
  begin: '',
  end: '',
}

export function ChainReport() {
  // Draft filters — edited freely by the user, only sent to the backend
  // once "Сформировать отчёт" is pressed (see `committed` below).
  const [filters, setFilters] =
    useState<ChainSalesReportFilters>(DEFAULT_FILTERS)
  const [committed, setCommitted] = useState<{
    run: boolean
    filters: ChainSalesReportFilters
  }>({ run: false, filters: DEFAULT_FILTERS })
  const [periodMissing, setPeriodMissing] = useState(false)

  const setFilter = (key: keyof ChainSalesReportFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  // Country access is per-user — everyone but an admin is pinned to their
  // own country and can't change it (see useCountryLock).
  const countryLock = useCountryLock()
  const locked = countryLock.locked
  const effectiveCountry = locked ? countryLock.userCountry : filters.country

  // Страна drives Сеть — changing it invalidates whatever chain was picked,
  // same cascade as every other Страна→Сеть screen in this app.
  const setCountry = (value: string) =>
    setFilters((prev) => ({ ...prev, country: value, chain: '' }))

  // Сеть's chain list, narrowed to the draft Страна — same pharmacy-upload
  // chain list every other Сеть dropdown in the app uses.
  const { chains, isLoading: chainsLoading } =
    usePharmacyChains(effectiveCountry)

  const { data, isLoading, isFetching, error } =
    useQuery<ChainSalesReportResponse>({
      queryKey: ['chain-sales-report', committed.run, committed.filters],
      queryFn: async () => {
        const f = committed.filters
        const params = new URLSearchParams()
        if (committed.run) params.set('run', '1')
        params.set('rep_type', f.rep_type)
        params.set('brand', f.brand)
        params.set('country', f.country)
        params.set('chain', f.chain)
        params.set('city', f.city)
        params.set('product', f.product)
        params.set('medrep', f.medrep)
        params.set('begin', f.begin)
        params.set('end', f.end)
        const res = await api.get<ChainSalesReportResponse>(
          `/sales/api/chain-sales-report/?${params}`
        )
        return res.data
      },
      placeholderData: (previousData) => previousData,
    })

  const repTypes = data?.options.rep_types ?? DEFAULT_REP_TYPES
  const brands = data?.options.brands ?? DEFAULT_BRANDS

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

  // DataTableAuto wants plain objects, not the backend's parallel
  // columns/rows arrays — report.columns[i] names report.rows[*][i].
  const tableData = useMemo(() => {
    if (!report) return []
    return report.rows.map((row) =>
      Object.fromEntries(report.columns.map((col, i) => [col, row[i]]))
    )
  }, [report])

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
            Аптечная сеть продаж
          </h1>
          <p className='text-muted-foreground'>
            Отчёт по продажам через аптечные сети
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
                  <Label>Бренд</Label>
                  <FilterSelect
                    value={filters.brand}
                    options={brands}
                    onChange={(v) => setFilter('brand', v)}
                  />
                </div>

                {/* Страна always comes first — standard order across every
                    filter/upload screen in the app, Сеть cascades off it next. */}
                <div className='space-y-1.5'>
                  <Label>Страна</Label>
                  <FilterSelect
                    value={effectiveCountry}
                    options={
                      locked
                        ? [
                            {
                              value: countryLock.userCountry,
                              label: countryLock.userCountry,
                            },
                          ]
                        : countryLock.countries.map((c) => ({
                            value: c,
                            label: c,
                          }))
                    }
                    onChange={setCountry}
                    placeholder='Все страны'
                    disabled={locked}
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Аптечная сеть</Label>
                  <ChainCombobox
                    value={filters.chain}
                    onChange={(v) => setFilter('chain', v)}
                    chains={chains}
                    loading={chainsLoading}
                    allowAll
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

                <div className='space-y-1.5'>
                  <Label>Мед. представитель</Label>
                  <Input
                    value={filters.medrep}
                    onChange={(e) => setFilter('medrep', e.target.value)}
                    placeholder='Мед. представитель'
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
                  isFetching ? 'opacity-60 transition-opacity' : undefined
                }
              >
                <DataTableAuto
                  data={tableData}
                  columns={report.columns}
                  searchPlaceholder='Поиск по таблице...'
                />
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
  options: ChainSalesReportOption[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const ALL = '__ALL__'
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
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
