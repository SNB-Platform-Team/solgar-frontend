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
  type DoctorCascadeOptions,
  type DoctorFilterOptions,
} from '@/features/doctors/types'
import {
  type DoctorManagerialFilters,
  type DoctorManagerialResponse,
} from './types'

// Radix Select items can't have an empty-string value — "" (no filter, or
// "all companies" for Компания) is represented by this sentinel.
const ALL = '__ALL__'

const ACTIVENESS_OPTIONS = ['Актив', 'Не Актив', 'в процессе']
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
  'MAIN_SPECIALITY',
  'SUB_SPECIALITY',
  'MED_REPS',
  'CLINIC_NAME',
  'ACTIVATION_DATE',
]

const REP_TYPE_LABELS: Record<string, string> = {
  REGIONS: 'Регионы',
  MAIN_DISTRICT: 'Федеральный округ',
  CITY: 'Город',
  MAIN_SPECIALITY: 'Осн. специальность',
  SUB_SPECIALITY: 'Специальность',
  MED_REPS: 'Мед. представители',
  CLINIC_NAME: 'Клиника',
  ACTIVATION_DATE: 'Дата активации',
}

// Doctor-managerial has an "all companies" mode (brand="") — unlike
// pharm-managerial, which coerces an empty brand to SOLGAR server-side.
const DEFAULT_FILTERS: DoctorManagerialFilters = {
  brand: '',
  rep_type: 'REGIONS',
  parameter: 'TOTAL_QUANTITY',
  date_param: 'STANDART',
  country: '',
  district: '',
  region: '',
  city: '',
  speciality: '',
  sub_speciality: '',
  clinic: '',
  medrep: '',
  activeness: '',
  begin: addDays(-31),
  end: addDays(1),
}

export function DoctorManagerial() {
  // Draft filters — edited freely by the user, only sent to the backend once
  // "Сформировать отчёт" is pressed (see `committed` below).
  const [filters, setFilters] =
    useState<DoctorManagerialFilters>(DEFAULT_FILTERS)
  const [committed, setCommitted] = useState<{
    run: boolean
    filters: DoctorManagerialFilters
  }>({ run: false, filters: DEFAULT_FILTERS })

  const setFilter = (key: keyof DoctorManagerialFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  // Страна drives Округ → Регион → Город — changing it invalidates whatever
  // was picked for all three, same cascade as Pharm Managerial's Страна.
  const setCountry = (value: string) =>
    setFilters((prev) => ({
      ...prev,
      country: value,
      district: '',
      region: '',
      city: '',
    }))
  const setDistrict = (value: string) =>
    setFilters((prev) => ({ ...prev, district: value, region: '', city: '' }))
  const setRegion = (value: string) =>
    setFilters((prev) => ({ ...prev, region: value, city: '' }))

  // Country access is per-user — everyone but an admin is pinned to their
  // own country and can't change it (see useCountryLock).
  const countryLock = useCountryLock()
  const locked = countryLock.locked
  const effectiveCountry = locked ? countryLock.userCountry : filters.country

  // Independent dropdown lists — not brand-scoped (doctor filter-options
  // isn't split by company the way pharmacy's is), so this doesn't key off
  // filters.brand.
  const { data: filterOptions } = useQuery<DoctorFilterOptions>({
    queryKey: ['doctor-managerial-filter-options'],
    queryFn: async () => {
      const res = await api.get<DoctorFilterOptions>(
        '/sales/api/doctor/filter-options/'
      )
      return res.data
    },
  })

  const cascadeOptions = (
    level: DoctorCascadeOptions['level'],
    extra: Record<string, string>,
    enabled: boolean
  ) => ({
    queryKey: ['doctor-managerial-cascade', level, extra],
    queryFn: async () => {
      const params = new URLSearchParams({ level, ...extra })
      const res = await api.get<DoctorCascadeOptions>(
        `/sales/api/doctor/filter-options/?${params}`
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

  const { data, isLoading, isFetching, error } =
    useQuery<DoctorManagerialResponse>({
      queryKey: ['doctor-managerial', committed.run, committed.filters],
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
        params.set('speciality', f.speciality)
        params.set('sub_speciality', f.sub_speciality)
        params.set('clinic', f.clinic)
        params.set('medrep', f.medrep)
        params.set('activeness', f.activeness)
        params.set('begin', f.begin)
        params.set('end', f.end)
        const res = await api.get<DoctorManagerialResponse>(
          `/sales/api/doctor-managerial/?${params}`
        )
        return res.data
      },
      placeholderData: (previousData) => previousData,
    })

  const compTypes = data?.options.comp_types ?? []
  const repTypes = data?.options.rep_types ?? DEFAULT_REP_TYPES

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // `parameter` (the metric — TOTAL_QUANTITY/TOTAL_CATEGORY) has no
    // dropdown of its own on this screen; Регионы (rep_type) drives the
    // report's grouping, so the committed default is sent as-is.
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
            Экран администрирования врача
          </h1>
          <p className='text-muted-foreground'>Группировка и подсчёт врачей</p>
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
                  <div className='space-y-1.5'>
                    <Label>Компания</Label>
                    <Select
                      value={filters.brand === '' ? ALL : filters.brand}
                      onValueChange={(v) =>
                        setFilter('brand', v === ALL ? '' : v)
                      }
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Все компании' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>Все компании</SelectItem>
                        {compTypes.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FilterSelect
                    label='Осн. специальность'
                    value={filters.speciality}
                    options={filterOptions?.unified_specialties ?? []}
                    onChange={(v) => setFilter('speciality', v)}
                  />
                  <FilterSelect
                    label='Специальность'
                    value={filters.sub_speciality}
                    options={filterOptions?.specialties ?? []}
                    onChange={(v) => setFilter('sub_speciality', v)}
                  />
                  <FilterSelect
                    label='Клиника'
                    value={filters.clinic}
                    options={filterOptions?.clinics ?? []}
                    onChange={(v) => setFilter('clinic', v)}
                  />
                  <FilterSelect
                    label='Мед. представитель'
                    value={filters.medrep}
                    options={filterOptions?.medreps ?? []}
                    onChange={(v) => setFilter('medrep', v)}
                  />
                  <FilterSelect
                    label='Активность'
                    value={filters.activeness}
                    options={ACTIVENESS_OPTIONS}
                    onChange={(v) => setFilter('activeness', v)}
                  />
                </div>

                {/* Right column. */}
                <div className='flex flex-col gap-4'>
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
                    value={filters.rep_type}
                    options={repTypes.map((rt) => ({
                      value: rt,
                      label: REP_TYPE_LABELS[rt] ?? rt,
                    }))}
                    onChange={(v) => setFilter('rep_type', v)}
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
                  Сформировать отчёт
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
                Задайте фильтры и нажмите «Сформировать отчёт»
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
