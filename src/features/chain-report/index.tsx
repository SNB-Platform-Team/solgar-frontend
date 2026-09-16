import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Package, Wallet } from 'lucide-react'
import { api } from '@/lib/api'
import { useCountryLock } from '@/hooks/use-country-lock'
import { usePharmacyChains } from '@/hooks/use-pharmacy-chains'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { ChainCombobox } from '@/components/chain-combobox'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  type ChainReportFilterOptions,
  type ChainReportResponse,
} from './types'

// Radix Select item values can't be an empty string, but the backend expects
// brand="" to mean "all companies" (already offered as its own {"","Все"}
// option by the API).
const ALL_BRAND = '__ALL__'

// Same sentinel idea for every "Все" (no filter) dropdown added below —
// chains/regions/districts come back as plain string arrays, not their own
// {value,label} "Все" option like brands does.
const ALL = '__ALL__'

interface ChainReportSearch {
  brand?: string
  page?: number
  date_from?: string
  date_to?: string
  chain_name?: string
  country?: string
  region?: string
  district?: string
  q?: string
}

const route = getRouteApi('/_authenticated/chain-report/')

const formatNumber = (n: number) => n.toLocaleString('ru-RU')
const formatAmount = (n: number) => `${n.toLocaleString('ru-RU')} ₽`

export function ChainReport() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  // Country access is per-user — everyone but an admin is pinned to their
  // own country and can't change it (see useCountryLock).
  const countryLock = useCountryLock()
  const locked = countryLock.locked

  // Values actually driving the request — live in the URL so the report is
  // shareable/bookmarkable, same as the other list screens.
  const brand = search.brand ?? ''
  const page = search.page ?? 1
  const dateFrom = search.date_from ?? ''
  const dateTo = search.date_to ?? ''
  const chainName = search.chain_name ?? ''
  const country = locked ? countryLock.userCountry : (search.country ?? '')
  const region = search.region ?? ''
  const district = search.district ?? ''
  const q = search.q ?? ''

  // Draft filters — edited freely, only applied to the URL (and thus the
  // request) once "Показать" is pressed. Pagination bypasses the draft and
  // updates the URL directly.
  const [draft, setDraft] = useState({
    brand,
    date_from: dateFrom,
    date_to: dateTo,
    chain_name: chainName,
    country,
    region,
    district,
    q,
  })

  const setDraftField = (key: keyof typeof draft, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  // Страна drives the other three dropdowns — changing it invalidates
  // whatever was picked for them, so they're reset in the same update.
  // Locked users never reach this (the dropdown is disabled), but guard it
  // anyway rather than relying solely on the UI.
  const setDraftCountry = (value: string) => {
    if (locked) return
    setDraft((prev) => ({
      ...prev,
      country: value,
      chain_name: '',
      region: '',
      district: '',
    }))
  }

  const setSearch = (next: ChainReportSearch) =>
    navigate({ search: (prev) => ({ ...prev, ...next }) })

  // Сеть's chain list, narrowed to the draft Страна — the pharmacy-upload
  // chain list (~180 entries), not the much smaller ChainDefinition-backed
  // `filterOptions.chains` this report's own filter-options endpoint still
  // returns (see usePharmacyChains). Re-fetched whenever the draft country
  // changes, same as filterOptions below; no country = every chain, which
  // is what an "all countries" report filter needs.
  const { chains: allChains, isLoading: chainsLoading } = usePharmacyChains(
    draft.country
  )

  const { data, isLoading, isPlaceholderData, error } =
    useQuery<ChainReportResponse>({
      queryKey: [
        'chain-report',
        brand,
        page,
        dateFrom,
        dateTo,
        chainName,
        country,
        region,
        district,
        q,
      ],
      queryFn: async () => {
        const params = new URLSearchParams({ page: String(page) })
        params.set('brand', brand)
        params.set('chain_name', chainName)
        params.set('country', country)
        params.set('region', region)
        params.set('district', district)
        params.set('date_from', dateFrom)
        params.set('date_to', dateTo)
        params.set('search', q)
        const res = await api.get<ChainReportResponse>(
          `/sales/api/chain-report/?${params}`
        )
        return res.data
      },
      placeholderData: (previousData) => previousData,
    })

  // Dropdown lists — re-fetched whenever the draft country changes (the
  // form itself, before "Показать" is pressed), narrowing chains/regions/
  // districts to that country. Country-less on first load = full lists.
  const { data: filterOptions } = useQuery<ChainReportFilterOptions>({
    queryKey: ['chain-report-filter-options', draft.country],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (draft.country) params.set('country', draft.country)
      const res = await api.get<ChainReportFilterOptions>(
        `/sales/api/chain-report/filter-options/?${params}`
      )
      return res.data
    },
  })

  const brands = data?.brands ?? [{ value: '', label: 'Все' }]
  const totals = data?.totals

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch({ ...draft, page: 1 })
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
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <div className='space-y-1.5'>
                  <Label>Компания</Label>
                  <Select
                    value={draft.brand === '' ? ALL_BRAND : draft.brand}
                    onValueChange={(v) =>
                      setDraftField('brand', v === ALL_BRAND ? '' : v)
                    }
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Все компании' />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((b) => (
                        <SelectItem
                          key={b.value || ALL_BRAND}
                          value={b.value === '' ? ALL_BRAND : b.value}
                        >
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label>Дата с</Label>
                  <Input
                    type='date'
                    value={draft.date_from}
                    onChange={(e) => setDraftField('date_from', e.target.value)}
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Дата по</Label>
                  <Input
                    type='date'
                    value={draft.date_to}
                    onChange={(e) => setDraftField('date_to', e.target.value)}
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Страна</Label>
                  <FilterSelect
                    value={draft.country}
                    options={
                      locked
                        ? [countryLock.userCountry]
                        : (filterOptions?.countries ?? [])
                    }
                    onChange={setDraftCountry}
                    disabled={locked}
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Сеть</Label>
                  <ChainCombobox
                    value={draft.chain_name}
                    onChange={(v) => setDraftField('chain_name', v)}
                    chains={allChains}
                    loading={chainsLoading}
                    allowAll
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Регион</Label>
                  <FilterSelect
                    value={draft.region}
                    options={filterOptions?.regions ?? []}
                    onChange={(v) => setDraftField('region', v)}
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Округ</Label>
                  <FilterSelect
                    value={draft.district}
                    options={filterOptions?.districts ?? []}
                    onChange={(v) => setDraftField('district', v)}
                  />
                </div>

                <div className='space-y-1.5 sm:col-span-2'>
                  <Label>Поиск</Label>
                  <Input
                    value={draft.q}
                    onChange={(e) => setDraftField('q', e.target.value)}
                    placeholder='Поиск: наименование'
                  />
                </div>
              </div>

              <div className='flex justify-end'>
                <Button type='submit'>Показать</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className='mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                SOLGAR — кол-во
              </CardTitle>
              <Package className='size-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              {totals ? (
                <div className='text-2xl font-bold'>
                  {formatNumber(totals.solgar_count)}
                </div>
              ) : (
                <Skeleton className='h-8 w-24' />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                SOLGAR — сумма
              </CardTitle>
              <Wallet className='size-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              {totals ? (
                <div className='text-2xl font-bold'>
                  {formatAmount(totals.solgar_amount)}
                </div>
              ) : (
                <Skeleton className='h-8 w-24' />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                NATURES BOUNTY — кол-во
              </CardTitle>
              <Package className='size-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              {totals ? (
                <div className='text-2xl font-bold'>
                  {formatNumber(totals.bounty_count)}
                </div>
              ) : (
                <Skeleton className='h-8 w-24' />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                NATURES BOUNTY — сумма
              </CardTitle>
              <Wallet className='size-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              {totals ? (
                <div className='text-2xl font-bold'>
                  {formatAmount(totals.bounty_amount)}
                </div>
              ) : (
                <Skeleton className='h-8 w-24' />
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-3 space-y-0'>
            <CardDescription>
              {data ? (
                <>
                  Всего:{' '}
                  <span className='font-medium text-foreground'>
                    {formatNumber(data.total_rows)}
                  </span>{' '}
                  · Страница {data.page} из {data.num_pages}
                </>
              ) : (
                <Skeleton className='h-4 w-40' />
              )}
            </CardDescription>
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
                      {data.columns.map((col, idx) => (
                        <TableHead
                          key={col}
                          className={
                            'whitespace-nowrap' +
                            (idx >= data.columns.length - 2
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
                    {data.rows.map((row, idx) => (
                      <TableRow key={idx}>
                        {row.map((cell, cellIdx) => (
                          <TableCell
                            key={cellIdx}
                            className={
                              'whitespace-nowrap' +
                              (cellIdx >= row.length - 2 ? ' text-right' : '')
                            }
                          >
                            {typeof cell === 'number'
                              ? formatNumber(cell)
                              : (cell ?? '')}
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

// A single "<Select/>" filter field with a built-in "Все" (no filter)
// option — shared by Страна/Сеть/Регион/Округ above. `value`/`onChange` use
// '' for "no filter" (matching the draft state's plain strings), mapped to
// and from the ALL sentinel Radix Select requires for its item values.
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
        <SelectItem value={ALL}>Все</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
