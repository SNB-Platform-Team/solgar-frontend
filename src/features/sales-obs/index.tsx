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
import {
  type SalesObsCascadeOptions,
  type SalesObsFilters,
  type SalesObsResponse,
} from './types'

// Radix Select item values can't be an empty string, but "all chains" /
// "all countries" are represented server-side by an empty query param.
const ALL = '__ALL__'

// Fallback shown before the first response arrives (values match the
// backend's own SL/OS/BN codes from the API example).
const DEFAULT_COMP_TYPES = [
  { value: 'SL', label: 'SOLGAR' },
  { value: 'OS', label: 'OBF' },
  { value: 'BN', label: 'NATURES BOUNTY' },
]

// Placeholder rows the backend includes for "no city on file" — filtered
// out of the Город dropdown rather than shown as a selectable option.
const JUNK_CITY_VALUES = new Set(['(пусто)', '(empty)', '-', ''])

const DEFAULT_FILTERS: SalesObsFilters = {
  comp_type: 'SL',
  begin: '',
  end: '',
  chain: '',
  country: '',
  area: '',
  region: '',
  city: '',
  main_group: '',
  sub_group: '',
  product_name: '',
}

export function SalesObs() {
  // Draft filters — edited freely by the user, only sent to the backend once
  // "Сформировать отчёт" is pressed (see `committed` below).
  const [filters, setFilters] = useState<SalesObsFilters>(DEFAULT_FILTERS)
  const [committed, setCommitted] = useState<{
    run: boolean
    filters: SalesObsFilters
  }>({ run: false, filters: DEFAULT_FILTERS })
  const [periodMissing, setPeriodMissing] = useState(false)

  // Country access is per-user — everyone but an admin is pinned to their
  // own country and can't change it (see useCountryLock).
  const countryLock = useCountryLock()
  const locked = countryLock.locked
  const effectiveCountry = locked ? countryLock.userCountry : filters.country

  const setFilter = (key: keyof SalesObsFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  // Компания drives which сети/страны/группы even exist (they all come from
  // the same comp_type-scoped `options`), so changing it (in the form,
  // before "Сформировать отчёт" is pressed) invalidates whatever was picked
  // for those — same cascading idea as Chain Report's Страна. Продукт in
  // turn depends on Основная группа/Подгруппа, so it's reset too. Область/
  // Регион/Город are NOT cascaded off Компания or Страна — see the flat
  // queries below, they're independent, always-populated dropdowns.
  const setCompType = (value: string) =>
    setFilters((prev) => ({
      ...prev,
      comp_type: value,
      chain: '',
      country: '',
      main_group: '',
      sub_group: '',
      product_name: '',
    }))

  // Основная группа/Подгруппа are flat siblings (not cascaded off each
  // other), but Продукт depends on both together, so picking either one
  // invalidates whatever Продукт was selected.
  const setMainGroup = (value: string) =>
    setFilters((prev) => ({ ...prev, main_group: value, product_name: '' }))

  const setSubGroup = (value: string) =>
    setFilters((prev) => ({ ...prev, sub_group: value, product_name: '' }))

  // Dropdown options for the *current draft* comp_type — kept separate from
  // the report query below (which only reflects the last *committed*
  // filters) so Сеть/Страна refresh the moment Компания changes, without
  // waiting for "Сформировать отчёт".
  const { data: optionsData } = useQuery<SalesObsResponse>({
    queryKey: ['sales-obs-options', filters.comp_type],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('comp_type', filters.comp_type)
      params.set('begin', '')
      params.set('end', '')
      params.set('chain', '')
      params.set('country', '')
      const res = await api.get<SalesObsResponse>(
        `/sales/api/sales-obs/?${params}`
      )
      return res.data
    },
  })

  // Область/Регион/Город — flat, independent dropdowns: each fetched once
  // on mount (no country/area/region params, so the backend returns its
  // full list) and never re-fetched or reset by any other filter.
  const { data: areaOptions } = useQuery<SalesObsCascadeOptions>({
    queryKey: ['sales-obs-filter-area'],
    queryFn: async () => {
      const res = await api.get<SalesObsCascadeOptions>(
        '/sales/api/sales-obs/filter-options/?level=area'
      )
      return res.data
    },
    staleTime: Infinity,
  })

  const { data: regionOptions } = useQuery<SalesObsCascadeOptions>({
    queryKey: ['sales-obs-filter-region'],
    queryFn: async () => {
      const res = await api.get<SalesObsCascadeOptions>(
        '/sales/api/sales-obs/filter-options/?level=region'
      )
      return res.data
    },
    staleTime: Infinity,
  })

  const { data: cityOptions } = useQuery<SalesObsCascadeOptions>({
    queryKey: ['sales-obs-filter-city'],
    queryFn: async () => {
      const res = await api.get<SalesObsCascadeOptions>(
        '/sales/api/sales-obs/filter-options/?level=city'
      )
      return res.data
    },
    staleTime: Infinity,
  })

  // The city list in particular carries a handful of placeholder rows for
  // "no city on file" — not real options, so they're dropped before display.
  const cityChoices = (cityOptions?.options ?? []).filter(
    (o) => !JUNK_CITY_VALUES.has(o.trim())
  )

  // Продукт — the one cascading dropdown here: refetches off the *draft*
  // Основная группа/Подгруппа (either or both may be empty, in which case
  // the backend just returns its full product list, same as on first load).
  const { data: productNameOptions } = useQuery<SalesObsCascadeOptions>({
    queryKey: [
      'sales-obs-filter-product-name',
      filters.main_group,
      filters.sub_group,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ level: 'product_name' })
      if (filters.main_group) params.set('main_group', filters.main_group)
      if (filters.sub_group) params.set('sub_group', filters.sub_group)
      const res = await api.get<SalesObsCascadeOptions>(
        `/sales/api/sales-obs/filter-options/?${params}`
      )
      return res.data
    },
  })

  const { data, isLoading, isFetching, error } = useQuery<SalesObsResponse>({
    queryKey: [
      'sales-obs',
      committed.run,
      committed.filters.comp_type,
      committed.filters.begin,
      committed.filters.end,
      committed.filters.chain,
      committed.filters.country,
      committed.filters.area,
      committed.filters.region,
      committed.filters.city,
      committed.filters.main_group,
      committed.filters.sub_group,
      committed.filters.product_name,
    ],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('comp_type', committed.filters.comp_type)
      params.set('begin', committed.filters.begin)
      params.set('end', committed.filters.end)
      params.set('chain', committed.filters.chain)
      params.set('country', committed.filters.country)
      params.set('area', committed.filters.area)
      params.set('region', committed.filters.region)
      params.set('city', committed.filters.city)
      params.set('main_group', committed.filters.main_group)
      params.set('sub_group', committed.filters.sub_group)
      params.set('product_name', committed.filters.product_name)
      const res = await api.get<SalesObsResponse>(
        `/sales/api/sales-obs/?${params}`
      )
      return res.data
    },
    placeholderData: (previousData) => previousData,
  })

  const compTypes = optionsData?.comp_types ?? DEFAULT_COMP_TYPES
  const chains = optionsData?.options.chains ?? []
  const countries = optionsData?.options.countries ?? []
  const mainGroups = optionsData?.options.main_groups ?? []
  const subGroups = optionsData?.options.sub_groups ?? []

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
            Помесячный сводный отчёт по продажам
          </p>
        </div>

        <Card className='mb-4'>
          <CardHeader>
            <CardTitle className='text-base'>Фильтры</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <div className='space-y-1.5'>
                  <Label>Тип компании</Label>
                  <Select value={filters.comp_type} onValueChange={setCompType}>
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {compTypes.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Страна always comes first — standard order across every
                    filter/upload screen in the app, chain/geo params follow it. */}
                <div className='space-y-1.5'>
                  <Label>Страна</Label>
                  <FilterSelect
                    value={effectiveCountry}
                    options={locked ? [countryLock.userCountry] : countries}
                    onChange={(v) => setFilter('country', v)}
                    placeholder='Все страны'
                    disabled={locked}
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Аптечная сеть</Label>
                  <FilterSelect
                    value={filters.chain}
                    options={chains}
                    onChange={(v) => setFilter('chain', v)}
                    placeholder='Все сети'
                  />
                </div>

                {/* Область/Регион/Город are flat and independent — each is
                    its own full list from the backend, not narrowed by
                    Страна or by one another. */}
                <div className='space-y-1.5'>
                  <Label>Область</Label>
                  <FilterSelect
                    value={filters.area}
                    options={areaOptions?.options ?? []}
                    onChange={(v) => setFilter('area', v)}
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Регион</Label>
                  <FilterSelect
                    value={filters.region}
                    options={regionOptions?.options ?? []}
                    onChange={(v) => setFilter('region', v)}
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Город</Label>
                  <FilterSelect
                    value={filters.city}
                    options={cityChoices}
                    onChange={(v) => setFilter('city', v)}
                  />
                </div>

                {/* Основная группа/Подгруппа are flat, comp_type-scoped
                    dropdowns; Продукт is the one cascading field here,
                    narrowed by whichever of the two above are set. */}
                <div className='space-y-1.5'>
                  <Label>Основная группа</Label>
                  <FilterSelect
                    value={filters.main_group}
                    options={mainGroups}
                    onChange={setMainGroup}
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Подгруппа</Label>
                  <FilterSelect
                    value={filters.sub_group}
                    options={subGroups}
                    onChange={setSubGroup}
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Продукт</Label>
                  <FilterSelect
                    value={filters.product_name}
                    options={productNameOptions?.options ?? []}
                    onChange={(v) => setFilter('product_name', v)}
                  />
                </div>

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
                  'max-h-[600px] overflow-auto rounded-md border transition-opacity' +
                  (isFetching ? ' opacity-60' : '')
                }
              >
                <Table>
                  <TableHeader className='sticky top-0 z-20 bg-card'>
                    <TableRow>
                      {report.columns.map((col, idx) => (
                        <TableHead
                          key={col}
                          className={pivotCellClass(
                            idx,
                            report.columns.length,
                            true
                          )}
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
                            title={
                              cellIdx < 2 && cell != null
                                ? String(cell)
                                : undefined
                            }
                            className={pivotCellClass(
                              cellIdx,
                              row.length,
                              false
                            )}
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

// First two columns (PRODUCT, chain) are pinned to the left so they stay
// visible while scrolling through the twelve month columns; numeric columns
// (everything from index 2 on) are right-aligned, and the last column
// (Total) is bolded to stand out.
function pivotCellClass(idx: number, length: number, isHeader: boolean) {
  const classes = ['whitespace-nowrap']
  if (idx === 0) {
    classes.push('sticky left-0 w-40 truncate bg-card')
    classes.push(isHeader ? 'z-30' : 'z-10')
  } else if (idx === 1) {
    classes.push('sticky left-40 w-40 truncate border-r bg-card')
    classes.push(isHeader ? 'z-30' : 'z-10')
  } else {
    classes.push('text-right')
  }
  if (idx === length - 1) classes.push('font-bold')
  return classes.join(' ')
}

// A single "<Select/>" filter field with a built-in "Все" (no filter)
// option — same pattern as Chain Report's FilterSelect. `value`/`onChange`
// use '' for "no filter" (matching the draft filters' plain strings),
// mapped to and from the ALL sentinel Radix Select requires for item values.
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
