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
import { usePharmacyChains } from '@/hooks/use-pharmacy-chains'
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
import { ChainCombobox } from '@/components/chain-combobox'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  type SalesUploadPageResponse,
  type SalesUploadPreviewResponse,
  type SalesUploadRow,
  type SalesUploadSaveResponse,
} from './types'

const formatNumber = (n: number) => n.toLocaleString('ru-RU')

const COLUMNS: { key: keyof SalesUploadRow; label: string }[] = [
  { key: 'index', label: '№' },
  { key: 'product', label: 'Продукт' },
  { key: 'brand', label: 'Бренд' },
  { key: 'pharmacy', label: 'Аптека' },
  { key: 'aptekno', label: 'Аптека №' },
  { key: 'city', label: 'Город' },
  { key: 'count', label: 'Кол-во' },
  { key: 'amount', label: 'Сумма' },
  { key: 'subgroup', label: 'Подгруппа' },
]

const NUMERIC_COLUMNS = new Set<keyof SalesUploadRow>(['index', 'count', 'amount'])

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

export function SalesUpload() {
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

  // Country access is per-user — shared across every Страна-locking screen
  // in the app, see useCountryLock.
  const countryLock = useCountryLock()
  const locked = countryLock.locked

  const [fileInputKey, setFileInputKey] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [reportDate, setReportDate] = useState('')
  const [chainName, setChainName] = useState('')
  const [country, setCountry] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState<number | null>(null)

  // Server-side pagination — the backend parses and holds the *entire*
  // batch (tens of thousands of rows possible), and only ever hands back
  // one page at a time. React only ever keeps this one page's rows in
  // state, no matter how large the batch is; paging fetches a fresh page
  // from the backend rather than slicing a client-held array.
  const [displayRows, setDisplayRows] = useState<SalesUploadRow[]>([])
  const [displayPage, setDisplayPage] = useState(1)

  const effectiveCountry = locked ? countryLock.userCountry : country

  // Страна drives Сеть — changing it (locked users never change country)
  // invalidates whatever chain was picked, same as Distributor Upload's
  // Страна→Дистрибьютор cascade.
  const setCountryField = (value: string) => {
    setCountry(value)
    setChainName('')
  }

  // Сеть's chain list, narrowed to the selected country — cascades exactly
  // like Distributor Upload's Страна→Дистрибьютор (no request at all until
  // a country is picked), rendered as a searchable combobox rather than a
  // free-text field.
  const { chains, isLoading: chainsLoading } = usePharmacyChains(
    effectiveCountry,
    { enabled: Boolean(effectiveCountry) }
  )

  // The backend stores the whole parsed file as a "batch" and only returns
  // page 1 (batch_id + num_pages/total_rows drive everything after this).
  // main_group isn't a user-facing filter on this screen — sent blank, the
  // backend infers/accepts it without narrowing.
  const previewMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData()
      formData.append('excel_file', file as File)
      formData.append('chain_name', chainName)
      formData.append('country', effectiveCountry)
      formData.append('report_date', reportDate)
      formData.append('main_group', '')
      const res = await api.post<SalesUploadPreviewResponse>(
        '/sales/api/pharmacy-upload/preview/',
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
      const res = await api.get<SalesUploadPageResponse>(
        `/sales/api/pharmacy-upload/page/?${params}`
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
      const res = await api.post<SalesUploadSaveResponse>(
        '/sales/api/pharmacy-upload/save/',
        { batch_id: preview.batch_id }
      )
      return res.data
    },
    onSuccess: (data) => {
      if (!data.error) {
        setSavedCount(data.created)
        // Reset the form for the next upload.
        setFile(null)
        setReportDate('')
        setChainName('')
        setCountry('')
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
    if (!file || !reportDate || !chainName || !effectiveCountry) {
      setValidationError(
        'Выберите файл и заполните все поля: страна, сеть, дата отчёта.'
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
          <h1 className='text-2xl font-bold tracking-tight'>Загрузка продаж</h1>
          <p className='text-muted-foreground'>
            Загрузите файл Excel с продажами аптечной сети
          </p>
        </div>

        <Card className='mb-4'>
          <CardHeader>
            <CardTitle className='text-base'>Файл и параметры</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePreview} className='space-y-4'>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                {/* Страна always comes first — standard order across every
                    filter/upload screen in the app, chain/geo params follow it. */}
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
                  <Label>Сеть</Label>
                  <ChainCombobox
                    value={chainName}
                    onChange={setChainName}
                    chains={chains}
                    loading={chainsLoading}
                    disabled={!effectiveCountry}
                    placeholder={
                      effectiveCountry
                        ? 'Выберите сеть'
                        : 'Сначала выберите страну'
                    }
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Дата отчёта</Label>
                  <Input
                    type='date'
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
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
                  disabled={previewMutation.isPending || chainsLoading}
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
                  label='Bounty кол-во'
                  value={formatNumber(preview.summary.bounty_count)}
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
                  Найдено строк:{' '}
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
                            const value = row[col.key]
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
