import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { api, primeCsrf } from '@/lib/api'
import { useCountryLock } from '@/hooks/use-country-lock'
import { Alert, AlertTitle } from '@/components/ui/alert'
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
  type DistributorUploadMeta,
  type DistributorUploadPageResponse,
  type DistributorUploadPreviewResponse,
  type DistributorUploadRow,
  type DistributorUploadSaveResponse,
  type StorageOptionsResponse,
} from './types'

const formatNumber = (n: number) => n.toLocaleString('ru-RU')
const formatAmount = (n: number) => `${n.toLocaleString('ru-RU')} ₽`

// Two different codes ride along on each row — don't mix them up:
// product_type (SL/BN/OS) is the brand ("Тип продукта" below), type
// (SALES/STOCK) is the operation kind ("Тип операции").
const BRAND_LABELS: Record<string, string> = {
  SL: 'Solgar',
  BN: 'Bounty',
  OS: 'OSTEO',
}

const OPERATION_TYPE_LABELS: Record<string, string> = {
  SALES: 'Продажи',
  STOCK: 'Остатки',
}

// The same 15 columns, in the same order, as the original Java screen.
// Дистрибьютор/Дата с/Дата по aren't on the row itself — they're constant
// for the whole upload, so every column pulls from `meta` for those.
type ColumnKey =
  | 'row_num'
  | 'distributor'
  | 'operation_type'
  | 'city'
  | 'product'
  | 'product_type'
  | 'count'
  | 'amount'
  | 'begin_date'
  | 'end_date'
  | 'client'
  | 'legal_address'
  | 'actual_address'
  | 'inn'
  | 'segment'

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'row_num', label: '№' },
  { key: 'distributor', label: 'Дистрибьютор' },
  { key: 'operation_type', label: 'Тип операции' },
  { key: 'city', label: 'Город' },
  { key: 'product', label: 'Продукт' },
  { key: 'product_type', label: 'Тип продукта' },
  { key: 'count', label: 'Кол-во' },
  { key: 'amount', label: 'Сумма' },
  { key: 'begin_date', label: 'Дата с' },
  { key: 'end_date', label: 'Дата по' },
  { key: 'client', label: 'Клиент' },
  { key: 'legal_address', label: 'Юр. адрес' },
  { key: 'actual_address', label: 'Факт. адрес' },
  { key: 'inn', label: 'ИНН' },
  { key: 'segment', label: 'Сегмент' },
]

const NUMERIC_COLUMNS = new Set<ColumnKey>(['row_num', 'count', 'amount'])

function cellValue(
  key: ColumnKey,
  row: DistributorUploadRow,
  meta: DistributorUploadMeta
): string | number {
  switch (key) {
    case 'row_num':
      return row.index
    case 'distributor':
      return meta.distributor
    case 'operation_type':
      return OPERATION_TYPE_LABELS[row.type] ?? row.type
    case 'city':
      return row.city
    case 'product':
      return row.product
    case 'product_type':
      return BRAND_LABELS[row.product_type] ?? row.product_type
    case 'count':
      return row.count
    case 'amount':
      return row.amount
    case 'begin_date':
      return meta.begin_date
    case 'end_date':
      return meta.end_date
    case 'client':
      return row.client
    case 'legal_address':
      return row.legal_address
    case 'actual_address':
      return row.actual_address
    case 'inn':
      return row.inn
    case 'segment':
      return row.segment
  }
}

// Builds the "1 … 4 5 6 … 12" page-number window shown under the table:
// always the first and last page, plus one page on each side of the
// current one, with an 'ellipsis' marker filling any gap between them.
function buildPageWindow(
  current: number,
  total: number
): (number | 'ellipsis')[] {
  const keep = new Set<number>([1, total, current - 1, current, current + 1])
  const pages = Array.from(keep)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)

  const result: (number | 'ellipsis')[] = []
  let prev = 0
  for (const p of pages) {
    if (prev && p - prev > 1) result.push('ellipsis')
    result.push(p)
    prev = p
  }
  return result
}

export function DistributorUpload() {
  // Country access is per-user — shared across every Страна-locking screen
  // in the app, see useCountryLock.
  const countryLock = useCountryLock()
  const locked = countryLock.locked

  // main.tsx already primes the csrftoken cookie once at app startup, but
  // this page does state-changing requests, so it defensively primes it
  // again — cheap, cached, and idempotent.
  useQuery({
    queryKey: ['csrf'],
    queryFn: async () => {
      await primeCsrf()
      return true
    },
    staleTime: Infinity,
  })

  const [fileInputKey, setFileInputKey] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [country, setCountry] = useState('')
  const [distributor, setDistributor] = useState('')
  const [beginDate, setBeginDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState<number | null>(null)

  // Server-side pagination — the backend parses and holds the *entire*
  // batch (tens of thousands of rows possible), and only ever hands back
  // one page at a time. React only ever keeps this one page's rows in
  // state, no matter how large the batch is; paging fetches a fresh page
  // from the backend rather than slicing a client-held array.
  const [displayRows, setDisplayRows] = useState<DistributorUploadRow[]>([])
  const [displayPage, setDisplayPage] = useState(1)

  // When the user is country-locked, the effective country is always their
  // own, regardless of local state — there's nothing to pick, so `country`
  // (only ever touched by an unlocked/admin user) simply doesn't apply.
  const effectiveCountry = locked ? countryLock.userCountry : country

  // Страна drives Дистрибьютор — changing it (admin only; locked users
  // never change country) invalidates whatever distributor was picked.
  const setCountryField = (value: string) => {
    setCountry(value)
    setDistributor('')
  }

  // Дистрибьютор now comes from the storage-options endpoint (prm_storages
  // for that country) — not the old distributor-upload/options endpoint's
  // ChainDefinition-backed list. Cascades off the effective country.
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

  // The parser is parametric — SALES vs STOCK is inferred server-side from
  // the uploaded file's name, so no operation_type is sent here. The
  // backend stores the whole parsed file as a "batch" and only returns
  // page 1 (batch_id + num_pages/total_rows drive everything after this).
  const previewMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData()
      formData.append('excel_file', file as File)
      formData.append('country', effectiveCountry)
      formData.append('distributor', distributor)
      formData.append('begin_date', beginDate)
      formData.append('end_date', endDate)
      const res = await api.post<DistributorUploadPreviewResponse>(
        '/sales/api/depo-upload/preview/',
        formData
      )
      return res.data
    },
    onSuccess: (data) => {
      if (!data.error) {
        setDisplayRows(data.rows)
        setDisplayPage(data.page)
      }
    },
  })

  // Fetches one page of the already-parsed batch — used whenever the user
  // clicks a page number / Назад / Вперёд, after a successful preview.
  // Nothing is re-uploaded or re-parsed; this just reads the next slice
  // back out of the batch the preview created.
  const pageMutation = useMutation({
    mutationFn: async (page: number) => {
      const params = new URLSearchParams({
        batch_id: String(previewMutation.data!.batch_id),
        page: String(page),
      })
      const res = await api.get<DistributorUploadPageResponse>(
        `/sales/api/depo-upload/page/?${params}`
      )
      return res.data
    },
    onSuccess: (data) => {
      if (!data.error) {
        setDisplayRows(data.rows)
        setDisplayPage(data.page)
      }
    },
  })

  const goToPage = (page: number) => {
    const numPages = previewMutation.data?.num_pages ?? 1
    if (page < 1 || page > numPages || page === displayPage) return
    pageMutation.mutate(page)
  }

  // Save takes only batch_id — every row already lives server-side from
  // the preview step, so there's nothing to send back up (not even the
  // current page's rows).
  const saveMutation = useMutation({
    mutationFn: async () => {
      const preview = previewMutation.data!
      const res = await api.post<DistributorUploadSaveResponse>(
        '/sales/api/depo-upload/save/',
        { batch_id: preview.batch_id }
      )
      return res.data
    },
    onSuccess: (data) => {
      if (!data.error) {
        setSavedCount(data.created)
        // Reset the form for the next upload.
        setFile(null)
        setCountry('')
        setDistributor('')
        setBeginDate('')
        setEndDate('')
        setFileInputKey((k) => k + 1)
        setDisplayRows([])
        setDisplayPage(1)
        pageMutation.reset()
        previewMutation.reset()
      }
    },
  })

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedCount(null)
    if (!file || !effectiveCountry || !distributor) {
      setValidationError(
        'Выберите файл и заполните обязательные поля: страна, дистрибьютор.'
      )
      return
    }
    setValidationError(null)
    setDisplayRows([])
    setDisplayPage(1)
    pageMutation.reset()
    previewMutation.mutate()
  }

  const handleSave = () => {
    saveMutation.mutate()
  }

  const preview = previewMutation.data
  const previewError = previewMutation.isError
    ? 'Ошибка загрузки файла'
    : preview?.error || null
  const showTable = Boolean(preview && !preview.error && preview.total_rows > 0)
  const saveError = saveMutation.isError
    ? 'Ошибка сохранения'
    : saveMutation.data?.error || null
  const pageError = pageMutation.isError
    ? 'Ошибка загрузки страницы'
    : pageMutation.data?.error || null

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
            Дистрибьюторская нагрузка
          </h1>
          <p className='text-muted-foreground'>
            Загрузите файл Excel с данными от дистрибьютора
          </p>
        </div>

        <Card className='mb-4'>
          <CardHeader>
            <CardTitle className='text-base'>Файл и параметры</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePreview} className='space-y-4'>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                <div className='space-y-1.5'>
                  <Label>Страна</Label>
                  <Select
                    value={effectiveCountry}
                    onValueChange={setCountryField}
                    disabled={locked}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Выберите страну' />
                    </SelectTrigger>
                    <SelectContent>
                      {countryLock.countries.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label>Дистрибьютор</Label>
                  <Select
                    value={distributor}
                    onValueChange={setDistributor}
                    disabled={!effectiveCountry}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue
                        placeholder={
                          effectiveCountry
                            ? 'Выберите дистрибьютора'
                            : 'Сначала выберите страну'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(distributorOptions?.storages ?? []).map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label>Дата с</Label>
                  <Input
                    type='date'
                    value={beginDate}
                    onChange={(e) => setBeginDate(e.target.value)}
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Дата по</Label>
                  <Input
                    type='date'
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Файл Excel</Label>
                  <Input
                    key={fileInputKey}
                    type='file'
                    accept='.xlsx,.xls'
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>

              {validationError && (
                <Alert variant='destructive'>
                  <AlertCircle />
                  <AlertTitle>{validationError}</AlertTitle>
                </Alert>
              )}

              {previewError && (
                <Alert variant='destructive'>
                  <AlertCircle />
                  <AlertTitle>{previewError}</AlertTitle>
                </Alert>
              )}

              {saveError && (
                <Alert variant='destructive'>
                  <AlertCircle />
                  <AlertTitle>{saveError}</AlertTitle>
                </Alert>
              )}

              {savedCount !== null && (
                <Alert className='border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'>
                  <CheckCircle2 />
                  <AlertTitle>Сохранено записей: {savedCount}</AlertTitle>
                </Alert>
              )}

              <div className='flex items-center justify-end gap-2'>
                <Button
                  type='submit'
                  variant='outline'
                  disabled={previewMutation.isPending}
                >
                  {previewMutation.isPending && <BrandSpinner size={16} />}
                  Предпросмотр
                </Button>
                {showTable && (
                  <Button
                    type='button'
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending && <BrandSpinner size={16} />}
                    Сохранить
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {preview && !preview.error && (
          <Card className='mb-4'>
            <CardHeader>
              <CardTitle className='text-base'>Сводка</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
                <SummaryMetric
                  label='Solgar кол-во'
                  value={formatNumber(preview.summary.solgar_count)}
                />
                <SummaryMetric
                  label='Solgar сумма'
                  value={formatAmount(preview.summary.solgar_amount)}
                />
                <SummaryMetric
                  label='Bounty кол-во'
                  value={formatNumber(preview.summary.bounty_count)}
                />
                <SummaryMetric
                  label='Bounty сумма'
                  value={formatAmount(preview.summary.bounty_amount)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {(previewMutation.isPending || showTable) && (
          <Card>
            <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-3 space-y-0'>
              <CardTitle className='text-base'>Предпросмотр</CardTitle>
              {preview && (
                <span className='text-sm text-muted-foreground'>
                  Тип:{' '}
                  <span className='font-medium text-foreground'>
                    {OPERATION_TYPE_LABELS[preview.type] ?? preview.type}
                  </span>{' '}
                  · Найдено строк:{' '}
                  <span className='font-medium text-foreground'>
                    {preview.total_rows}
                  </span>
                </span>
              )}
            </CardHeader>
            <CardContent>
              {previewMutation.isPending ? (
                <div className='space-y-2'>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className='h-8 w-full' />
                  ))}
                </div>
              ) : showTable && preview ? (
                <div
                  className={
                    'scroll-x-visible max-h-[600px] overflow-y-auto rounded-md border transition-opacity' +
                    (pageMutation.isPending ? ' opacity-60' : '')
                  }
                >
                  <Table className='min-w-max'>
                    <TableHeader className='sticky top-0 bg-card'>
                      <TableRow>
                        {COLUMNS.map((col) => (
                          <TableHead
                            key={col.key}
                            className={
                              'whitespace-nowrap' +
                              (NUMERIC_COLUMNS.has(col.key)
                                ? ' text-right'
                                : '')
                            }
                          >
                            {col.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayRows.map((row, idx) => (
                        <TableRow key={row.index ?? idx}>
                          {COLUMNS.map((col) => {
                            const value = cellValue(col.key, row, preview.meta)
                            return (
                              <TableCell
                                key={col.key}
                                className={
                                  'whitespace-nowrap' +
                                  (NUMERIC_COLUMNS.has(col.key)
                                    ? ' text-right'
                                    : '')
                                }
                              >
                                {typeof value === 'number'
                                  ? value.toLocaleString('ru-RU')
                                  : value}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

              {pageError && (
                <p className='mt-2 text-center text-sm text-destructive'>
                  {pageError}
                </p>
              )}

              {showTable && preview && preview.num_pages > 1 && (
                <div className='mt-4 flex flex-col items-center gap-2'>
                  <div className='flex flex-wrap items-center justify-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={displayPage === 1 || pageMutation.isPending}
                      onClick={() => goToPage(displayPage - 1)}
                    >
                      <ChevronLeft className='size-4' />
                      Назад
                    </Button>
                    {buildPageWindow(displayPage, preview.num_pages).map(
                      (p, idx) =>
                        p === 'ellipsis' ? (
                          <span
                            key={`ellipsis-${idx}`}
                            className='px-1 text-sm text-muted-foreground'
                          >
                            …
                          </span>
                        ) : (
                          <Button
                            key={p}
                            variant={p === displayPage ? 'default' : 'outline'}
                            size='sm'
                            className='w-9'
                            disabled={pageMutation.isPending}
                            onClick={() => goToPage(p)}
                          >
                            {p}
                          </Button>
                        )
                    )}
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={
                        displayPage === preview.num_pages ||
                        pageMutation.isPending
                      }
                      onClick={() => goToPage(displayPage + 1)}
                    >
                      Вперёд
                      <ChevronRight className='size-4' />
                    </Button>
                  </div>
                  <span className='text-sm text-muted-foreground'>
                    Страница {displayPage} из {preview.num_pages}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </Main>
    </>
  )
}

// A single "small label / big value" metric tile — used in the summary
// panel shown above the preview table once a file has been previewed.
function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-md border p-3'>
      <div className='text-xs text-muted-foreground'>{label}</div>
      <div className='text-lg font-bold text-primary'>{value}</div>
    </div>
  )
}
