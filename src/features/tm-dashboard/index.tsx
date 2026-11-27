import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
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
import { ConfigDrawer } from '@/components/config-drawer'
import { ListSearchInput } from '@/components/data-table'
import { ExportExcelButton } from '@/components/export-excel-button'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  type TmDashboardFilters,
  type TmDashboardResponse,
  type TmDashboardTable,
} from './types'

// Radix Select items can't have an empty-string value — "" (no filter) is
// represented by this sentinel in every dropdown below.
const ALL = '__ALL__'

// '' = both brands.
const BRAND_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'SOLGAR', label: 'SOLGAR' },
  { value: 'BOUNTY', label: "Nature's Bounty" },
]

const DEFAULT_FILTERS: TmDashboardFilters = {
  brand: '',
  region: '',
  medrep: '',
  activeness: '',
  category: '',
  search: '',
}

// The four tables, in display order — each with its own export endpoint.
const SECTIONS: {
  key: keyof TmDashboardResponse['tables']
  title: string
  exportPath: string
  fileName: string
}[] = [
  {
    key: 'by_region',
    title: 'По регионам',
    exportPath: 'region',
    fileName: 'tm_po_regionam.xlsx',
  },
  {
    key: 'by_medrep',
    title: 'По медпредставителям',
    exportPath: 'medrep',
    fileName: 'tm_po_medpredstavitelyam.xlsx',
  },
  {
    key: 'by_activeness',
    title: 'По активности',
    exportPath: 'activeness',
    fileName: 'tm_po_aktivnosti.xlsx',
  },
  {
    key: 'by_category',
    title: 'По категориям',
    exportPath: 'category',
    fileName: 'tm_po_kategoriyam.xlsx',
  },
]

export function TmDashboard() {
  // No apply step: every change re-runs the dashboard straight away.
  const [filters, setFilters] = useState<TmDashboardFilters>(DEFAULT_FILTERS)
  const setFilter = (key: keyof TmDashboardFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  // The dashboard's own query params — shared by the query and every
  // «Скачать в Excel», so each export is exactly what's on screen.
  const reportParams = (f: TmDashboardFilters) => {
    const params = new URLSearchParams()
    params.set('brand', f.brand)
    params.set('region', f.region)
    params.set('medrep', f.medrep)
    params.set('activeness', f.activeness)
    params.set('category', f.category)
    params.set('search', f.search)
    return params
  }

  const { data, isLoading, isFetching, error } = useQuery<TmDashboardResponse>({
    queryKey: ['tm-dashboard', filters],
    // `signal` aborts a superseded request when filters change quickly.
    queryFn: async ({ signal }) => {
      const res = await api.get<TmDashboardResponse>(
        `/sales/api/tm-dashboard/?${reportParams(filters)}`,
        { signal }
      )
      return res.data
    },
    placeholderData: (previousData) => previousData,
  })

  const options = data?.options
  const hasError = Boolean(error) || Boolean(data?.error)

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
            Дашборд территориального менеджера
          </h1>
          <p className='text-muted-foreground'>
            Количество аптек по территории
          </p>
        </div>

        <Card className='mb-4'>
          <CardHeader>
            <CardTitle className='text-base'>Фильтры</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              <PlainSelect
                label='Марка'
                value={filters.brand}
                options={BRAND_OPTIONS}
                onChange={(v) => setFilter('brand', v)}
              />
              <FilterSelect
                label='Регион'
                value={filters.region}
                options={options?.regions ?? []}
                onChange={(v) => setFilter('region', v)}
              />
              <FilterSelect
                label='Медреп'
                value={filters.medrep}
                options={options?.medreps ?? []}
                onChange={(v) => setFilter('medrep', v)}
              />
              <FilterSelect
                label='Активность'
                value={filters.activeness}
                options={options?.activenesses ?? []}
                onChange={(v) => setFilter('activeness', v)}
              />
              <FilterSelect
                label='Категория'
                value={filters.category}
                options={options?.categories ?? []}
                onChange={(v) => setFilter('category', v)}
              />
              <div className='space-y-1.5'>
                <Label>Поиск</Label>
                <ListSearchInput
                  value={filters.search}
                  onChange={(v) => setFilter('search', v)}
                  placeholder='Поиск...'
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {data?.warning && (
          <div className='mb-4 flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-800 dark:text-yellow-300'>
            <AlertTriangle className='mt-0.5 size-4 shrink-0' />
            <span>{data.warning}</span>
          </div>
        )}

        <div className='space-y-4'>
          {SECTIONS.map((section) => (
            <Card key={section.key}>
              <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-3 space-y-0'>
                <div className='flex items-center gap-3'>
                  <CardTitle className='text-base'>{section.title}</CardTitle>
                  {isLoading ? (
                    <Skeleton className='h-4 w-16' />
                  ) : (
                    data && (
                      <span className='text-sm text-muted-foreground'>
                        Строк:{' '}
                        <span className='font-medium text-foreground'>
                          {data.tables[section.key]?.rows.length ?? 0}
                        </span>
                      </span>
                    )
                  )}
                </div>
                <ExportExcelButton
                  getUrl={() =>
                    `/sales/api/tm-dashboard/export/${section.exportPath}/?${reportParams(filters)}`
                  }
                  fallbackName={section.fileName}
                  disabled={!data || hasError}
                />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className='flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground'>
                    <Loader2 className='size-8 animate-spin' />
                    <span className='text-sm'>Загрузка...</span>
                  </div>
                ) : hasError ? (
                  <div className='rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
                    {data?.error || 'Ошибка загрузки данных'}
                  </div>
                ) : (
                  <DashboardTable
                    table={data?.tables[section.key]}
                    dimmed={isFetching}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </Main>
    </>
  )
}

// One summary table: sticky header, last (count) column right-aligned.
function DashboardTable({
  table,
  dimmed,
}: {
  table: TmDashboardTable | undefined
  dimmed?: boolean
}) {
  if (!table || table.rows.length === 0)
    return (
      <div className='py-12 text-center text-muted-foreground italic'>
        Нет данных
      </div>
    )
  return (
    <div
      className={
        'max-h-[600px] overflow-auto rounded-md border transition-opacity' +
        (dimmed ? ' opacity-60' : '')
      }
    >
      <Table>
        <TableHeader className='sticky top-0 bg-card'>
          <TableRow>
            {table.columns.map((col, idx) => (
              <TableHead
                key={`${col}-${idx}`}
                className={
                  'whitespace-nowrap' +
                  (idx === table.columns.length - 1 ? ' text-right' : '')
                }
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row, rowIdx) => (
            <TableRow key={rowIdx}>
              {row.map((cell, cellIdx) => (
                <TableCell
                  key={cellIdx}
                  className={
                    'whitespace-nowrap' +
                    (cellIdx === row.length - 1
                      ? ' text-right tabular-nums'
                      : '')
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

// Same, but with a fixed option list (no automatic "Все"). An option whose
// value is '' goes through the ALL sentinel, since Radix can't hold ''.
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
      <Select
        value={value === '' ? ALL : value}
        onValueChange={(v) => onChange(v === ALL ? '' : v)}
      >
        <SelectTrigger className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value || ALL} value={o.value || ALL}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
