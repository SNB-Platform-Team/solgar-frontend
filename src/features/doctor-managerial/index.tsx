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
  type DoctorManagerialFilters,
  type DoctorManagerialResponse,
} from './types'

// Sentinel for the "all companies" option — Radix Select item values can't be an
// empty string, but the backend expects brand="" to mean "no filter".
const ALL_BRAND = '__ALL__'

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

const DEFAULT_PARAMETERS = ['TOTAL_QUANTITY', 'TOTAL_CATEGORY']

const PARAMETER_LABELS: Record<string, string> = {
  TOTAL_QUANTITY: 'Кол-во (всего)',
  TOTAL_CATEGORY: 'Категория (всего)',
}

const DEFAULT_FILTERS: DoctorManagerialFilters = {
  brand: '',
  rep_type: 'REGIONS',
  parameter: 'TOTAL_QUANTITY',
  country: '',
  region: '',
  city: '',
  speciality: '',
  sub_speciality: '',
  clinic: '',
  medrep: '',
  activeness: '',
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

  const { data, isLoading, isFetching, error } =
    useQuery<DoctorManagerialResponse>({
      queryKey: [
        'doctor-managerial',
        committed.run,
        committed.filters.rep_type,
        committed.filters.parameter,
        committed.filters.brand,
        committed.filters.country,
        committed.filters.region,
        committed.filters.city,
        committed.filters.speciality,
        committed.filters.sub_speciality,
        committed.filters.clinic,
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
        params.set('speciality', committed.filters.speciality)
        params.set('sub_speciality', committed.filters.sub_speciality)
        params.set('clinic', committed.filters.clinic)
        params.set('medrep', committed.filters.medrep)
        params.set('activeness', committed.filters.activeness)
        const res = await api.get<DoctorManagerialResponse>(
          `/sales/api/doctor-managerial/?${params}`
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
            Врачи — Управленческий отчёт
          </h1>
          <p className='text-muted-foreground'>
            Отчёт по врачам с группировкой и фильтрами
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
                    value={filters.brand === '' ? ALL_BRAND : filters.brand}
                    onValueChange={(v) =>
                      setFilter('brand', v === ALL_BRAND ? '' : v)
                    }
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Все компании' />
                    </SelectTrigger>
                    <SelectContent>
                      {compTypes.length > 0 ? (
                        compTypes.map((c) => (
                          <SelectItem
                            key={c.value || ALL_BRAND}
                            value={c.value === '' ? ALL_BRAND : c.value}
                          >
                            {c.label}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value={ALL_BRAND}>—</SelectItem>
                      )}
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
                  <Label>Осн. специальность</Label>
                  <Input
                    value={filters.speciality}
                    onChange={(e) => setFilter('speciality', e.target.value)}
                    placeholder='Осн. специальность'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Специальность</Label>
                  <Input
                    value={filters.sub_speciality}
                    onChange={(e) =>
                      setFilter('sub_speciality', e.target.value)
                    }
                    placeholder='Специальность'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Клиника</Label>
                  <Input
                    value={filters.clinic}
                    onChange={(e) => setFilter('clinic', e.target.value)}
                    placeholder='Клиника'
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
