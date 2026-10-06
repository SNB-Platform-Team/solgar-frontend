import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCountryLock } from '@/hooks/use-country-lock'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { DateInput } from '@/components/date-input'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  type PharmacyCascadeOptions,
  type PharmacyFilterOptions,
} from '@/features/pharmacies/types'
import {
  type PharmManagerialFilters,
  type PharmManagerialResponse,
} from './types'

// Radix Select items can't have an empty-string value — "" (no filter) is
// represented by this sentinel in every dropdown below.
const ALL = '__ALL__'

const ASSORTIMENT_OPTIONS = ['под заказ', 'assortiment']
const ACTIVENESS_OPTIONS = ['Актив', 'Не Актив', 'Закрыта']
const DATE_PARAM_OPTIONS = ['STANDART']

// Local-time yyyy-MM-dd — toISOString() would shift the day in UTC+ zones.
const formatDate = (d: Date) => {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const addDays = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

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
  date_param: 'STANDART',
  country: '',
  district: '',
  region: '',
  city: '',
  chain: '',
  subchain: '',
  assortiment: '',
  pharmacy_type: '',
  promo: '',
  medrep: '',
  activeness: '',
  begin: addDays(-31),
  end: addDays(1),
}

export function PharmManagerial() {
  // Draft filters — edited freely by the user, only sent to the backend once
  // "Показать отчёт" is pressed (see `committed` below).
  const [filters, setFilters] =
    useState<PharmManagerialFilters>(DEFAULT_FILTERS)
  const [committed, setCommitted] = useState<{
    run: boolean
    filters: PharmManagerialFilters
  }>({ run: false, filters: DEFAULT_FILTERS })

  const setFilter = (key: keyof PharmManagerialFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  // Cascades — picking a parent invalidates everything below it.
  //   Компания → Страна/Сеть/… (different tables server-side, reset all)
  //   Страна → Округ → Регион → Город
  //   Страна → Сеть → Подсеть
  const setBrand = (value: string) =>
    setFilters((prev) => ({
      ...prev,
      brand: value,
      country: '',
      district: '',
      region: '',
      city: '',
      chain: '',
      subchain: '',
      pharmacy_type: '',
      promo: '',
      medrep: '',
    }))
  const setCountry = (value: string) =>
    setFilters((prev) => ({
      ...prev,
      country: value,
      district: '',
      region: '',
      city: '',
      chain: '',
      subchain: '',
    }))
  const setDistrict = (value: string) =>
    setFilters((prev) => ({ ...prev, district: value, region: '', city: '' }))
  const setRegion = (value: string) =>
    setFilters((prev) => ({ ...prev, region: value, city: '' }))
  const setChain = (value: string) =>
    setFilters((prev) => ({ ...prev, chain: value, subchain: '' }))

  // Country access is per-user — everyone but an admin is pinned to their
  // own country and can't change it (see useCountryLock).
  const countryLock = useCountryLock()
  const locked = countryLock.locked
  const effectiveCountry = locked ? countryLock.userCountry : filters.country

  // Independent dropdown lists (countries, chains, types, promos, medreps),
  // keyed off the draft Компания — same endpoint the Pharmacies screen uses.
  const { data: filterOptions } = useQuery<PharmacyFilterOptions>({
    queryKey: ['pharm-managerial-filter-options', filters.brand],
    queryFn: async () => {
      const params = new URLSearchParams({ brand: filters.brand })
      const res = await api.get<PharmacyFilterOptions>(
        `/sales/api/pharmacy/filter-options/?${params}`
      )
      return res.data
    },
  })

  // Сеть narrows to the picked country. Kept as its own request so the
  // country-narrowed response can't shrink the Страна list above.
  const { data: countryChainOptions } = useQuery<PharmacyFilterOptions>({
    queryKey: [
      'pharm-managerial-chain-options',
      filters.brand,
      effectiveCountry,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        brand: filters.brand,
        country: effectiveCountry,
      })
      const res = await api.get<PharmacyFilterOptions>(
        `/sales/api/pharmacy/filter-options/?${params}`
      )
      return res.data
    },
    enabled: Boolean(effectiveCountry),
  })

  const cascadeOptions = (
    level: PharmacyCascadeOptions['level'],
    extra: Record<string, string>,
    enabled: boolean
  ) => ({
    queryKey: ['pharm-managerial-cascade', level, filters.brand, extra],
    queryFn: async () => {
      const params = new URLSearchParams({
        brand: filters.brand,
        level,
        ...extra,
      })
      const res = await api.get<PharmacyCascadeOptions>(
        `/sales/api/pharmacy/filter-options/?${params}`
      )
      return res.data
    },
    enabled,
  })

  const { data: districtOptions } = useQuery(
    cascadeOptions(
      'area',
      { country: effectiveCountry },
      Boolean(effectiveCountry)
    )
  )
  const { data: regionOptions } = useQuery(
    cascadeOptions(
      'region',
      { country: effectiveCountry, area: filters.district },
      Boolean(effectiveCountry && filters.district)
    )
  )
  const { data: cityOptions } = useQuery(
    cascadeOptions(
      'city',
      {
        country: effectiveCountry,
        area: filters.district,
        region: filters.region,
      },
      Boolean(effectiveCountry && filters.district && filters.region)
    )
  )
  const { data: subchainOptions } = useQuery(
    cascadeOptions(
      'subchain',
      { country: effectiveCountry, group_company: filters.chain },
      Boolean(filters.chain)
    )
  )

  const chainOptions =
    (effectiveCountry ? countryChainOptions?.chains : filterOptions?.chains) ??
    []

  const { data, isLoading, isFetching, error } =
    useQuery<PharmManagerialResponse>({
      queryKey: ['pharm-managerial', committed.run, committed.filters],
      queryFn: async () => {
        const f = committed.filters
        const params = new URLSearchParams()
        if (committed.run) params.set('run', '1')
        params.set('brand', f.brand)
        params.set('rep_type', f.rep_type)
        params.set('parameter', f.parameter)
        params.set('country', f.country)
        params.set('district', f.district)
        params.set('region', f.region)
        params.set('city', f.city)
        params.set('chain', f.chain)
        params.set('subchain', f.subchain)
        params.set('assortiment', f.assortiment)
        params.set('pharmacy_type', f.pharmacy_type)
        params.set('promo', f.promo)
        params.set('medrep', f.medrep)
        params.set('activeness', f.activeness)
        params.set('begin', f.begin)
        params.set('end', f.end)
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
            Экран администрирования аптек
          </h1>
          <p className='text-muted-foreground'>Группировка и подсчёт аптек</p>
        </div>

        <form onSubmit={handleSubmit} className='mb-4 space-y-4'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label>Дата с</Label>
              <DateInput
                value={filters.begin}
                onChange={(v) => setFilter('begin', v)}
              />
            </div>
            <div className='space-y-1.5'>
              <Label>Дата по</Label>
              <DateInput
                value={filters.end}
                onChange={(v) => setFilter('end', v)}
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Фильтры</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2'>
                {/* Left column — same order as the Java screen. */}
                <div className='flex flex-col gap-4'>
                  <PlainSelect
                    label='Компания'
                    value={filters.brand}
                    options={
                      compTypes.length > 0
                        ? compTypes
                        : [{ value: 'SOLGAR', label: 'SOLGAR' }]
                    }
                    onChange={setBrand}
                  />
                  <FilterSelect
                    label='Сеть'
                    value={filters.chain}
                    options={chainOptions}
                    onChange={setChain}
                  />
                  <FilterSelect
                    label='Подсеть'
                    value={filters.subchain}
                    options={subchainOptions?.options ?? []}
                    disabled={!filters.chain}
                    placeholder={
                      filters.chain ? 'Все' : 'Сначала выберите сеть'
                    }
                    onChange={(v) => setFilter('subchain', v)}
                  />
                  <FilterSelect
                    label='Ассортимент'
                    value={filters.assortiment}
                    options={filterOptions?.assortiments ?? ASSORTIMENT_OPTIONS}
                    onChange={(v) => setFilter('assortiment', v)}
                  />
                  <FilterSelect
                    label='Тип аптеки'
                    value={filters.pharmacy_type}
                    options={filterOptions?.types ?? []}
                    onChange={(v) => setFilter('pharmacy_type', v)}
                  />
                  <FilterSelect
                    label='Мед. представитель'
                    value={filters.medrep}
                    options={filterOptions?.marketing_staff ?? []}
                    onChange={(v) => setFilter('medrep', v)}
                  />
                  <FilterSelect
                    label='Промо'
                    value={filters.promo}
                    options={filterOptions?.promos ?? []}
                    onChange={(v) => setFilter('promo', v)}
                  />
                  <FilterSelect
                    label='Активность'
                    value={filters.activeness}
                    options={ACTIVENESS_OPTIONS}
                    onChange={(v) => setFilter('activeness', v)}
                  />
                </div>

                {/* Right column. "Регионы" is rep_type (row grouping),
                    "Параметры" is parameter (metric) — not interchangeable. */}
                <div className='flex flex-col gap-4'>
                  <PlainSelect
                    label='Регионы'
                    value={filters.rep_type}
                    options={repTypes.map((rt) => ({
                      value: rt,
                      label: REP_TYPE_LABELS[rt] ?? rt,
                    }))}
                    onChange={(v) => setFilter('rep_type', v)}
                  />
                  <FilterSelect
                    label='Страна'
                    value={effectiveCountry}
                    options={
                      locked
                        ? [countryLock.userCountry]
                        : (filterOptions?.countries ?? [])
                    }
                    disabled={locked}
                    onChange={setCountry}
                  />
                  <FilterSelect
                    label='Округ'
                    value={filters.district}
                    options={districtOptions?.options ?? []}
                    disabled={!effectiveCountry}
                    placeholder={
                      effectiveCountry ? 'Все' : 'Сначала выберите страну'
                    }
                    onChange={setDistrict}
                  />
                  <FilterSelect
                    label='Регион'
                    value={filters.region}
                    options={regionOptions?.options ?? []}
                    disabled={!filters.district}
                    placeholder={
                      filters.district ? 'Все' : 'Сначала выберите округ'
                    }
                    onChange={setRegion}
                  />
                  <FilterSelect
                    label='Город'
                    value={filters.city}
                    options={cityOptions?.options ?? []}
                    disabled={!filters.region}
                    placeholder={
                      filters.region ? 'Все' : 'Сначала выберите регион'
                    }
                    onChange={(v) => setFilter('city', v)}
                  />
                  <PlainSelect
                    label='Параметры'
                    value={filters.parameter}
                    options={parameters.map((p) => ({
                      value: p,
                      label: PARAMETER_LABELS[p] ?? p,
                    }))}
                    onChange={(v) => setFilter('parameter', v)}
                  />
                  <PlainSelect
                    label='Параметры даты'
                    value={filters.date_param}
                    options={DATE_PARAM_OPTIONS.map((o) => ({
                      value: o,
                      label: o,
                    }))}
                    onChange={(v) => setFilter('date_param', v)}
                  />
                </div>
              </div>

              <div className='flex justify-end'>
                <Button type='submit' disabled={isFetching}>
                  Показать отчёт
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

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
                Задайте фильтры и нажмите «Показать отчёт»
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

// "<Label/><Select/>" filter field with a built-in "Все" (no filter) option
// — "" is the no-filter value, mapped to/from the ALL sentinel.
function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  placeholder = 'Все',
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <div className='space-y-1.5'>
      <Label>{label}</Label>
      <Select
        value={value === '' ? ALL : value}
        onValueChange={(v) => onChange(v === ALL ? '' : v)}
        disabled={disabled}
      >
        <SelectTrigger className='w-full'>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Все</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Same, but for fields that always carry a real value (no "Все").
function PlainSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className='space-y-1.5'>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
