import { useQuery } from '@tanstack/react-query'
import { Stethoscope, Store } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthUser } from '@/lib/auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

/** One region × category row of a medrep's breakdown. */
interface BreakdownRow {
  region: string
  category: string
  count: number
}

/** The signed-in medrep's own counts — null for admin/manager accounts. */
interface DashboardMyCards {
  medrep_name: string
  pharmacies: number
  doctors: number
  pharmacy_breakdown: BreakdownRow[]
  doctor_breakdown: BreakdownRow[]
}

/** The part of GET /sales/api/dashboard/ this page reads. */
interface DashboardApiResponse {
  my_cards: DashboardMyCards | null
}

const formatNumber = (n: number) => n.toLocaleString('ru-RU')

export function Dashboard() {
  // Cached by the _authenticated route guard already — reads back without
  // an extra request or loading flicker, see useAuthUser.
  const me = useAuthUser()
  const name = me?.display_name || me?.username || 'Пользователь'

  // Only medreps (non-staff) get my_cards back — staff always see null, so
  // they skip this request entirely and the page stays as it was.
  const isMedrep = me?.is_staff === false
  const { data, isLoading } = useQuery<DashboardApiResponse>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get<DashboardApiResponse>('/sales/api/dashboard/')
      return res.data
    },
    enabled: isMedrep,
  })
  const myCards = data?.my_cards ?? null

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <h1 className='mb-6 text-2xl font-bold tracking-tight'>
          Добро пожаловать, {name}!
        </h1>

        {isMedrep && (isLoading || myCards) && (
          <div className='grid gap-4 sm:grid-cols-2'>
            <MyCountCard
              title='Мои аптеки'
              icon={Store}
              value={myCards?.pharmacies}
              medrepName={myCards?.medrep_name}
              loading={isLoading}
            />
            <MyCountCard
              title='Мои врачи'
              icon={Stethoscope}
              value={myCards?.doctors}
              medrepName={myCards?.medrep_name}
              loading={isLoading}
            />
          </div>
        )}

        {isMedrep && myCards && (
          <div className='mt-4 grid gap-4 lg:grid-cols-2'>
            <BreakdownTable
              title='Мои аптеки по региону'
              rows={myCards.pharmacy_breakdown ?? []}
            />
            <BreakdownTable
              title='Мои врачи по региону'
              rows={myCards.doctor_breakdown ?? []}
            />
          </div>
        )}
      </Main>
    </>
  )
}

function MyCountCard({
  title,
  icon: Icon,
  value,
  medrepName,
  loading,
}: {
  title: string
  icon: React.ElementType
  value: number | undefined
  medrepName: string | undefined
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        <Icon className='size-4 text-muted-foreground' />
      </CardHeader>
      <CardContent className='space-y-1'>
        {loading ? (
          <Skeleton className='h-8 w-20' />
        ) : (
          <div className='text-2xl font-bold text-primary'>
            {formatNumber(value ?? 0)}
          </div>
        )}
        {!loading && (
          <CardDescription className='text-xs'>
            {medrepName || 'Нет привязки к сотруднику'}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  )
}

// Регион | Категория | Количество for one of the medrep's breakdowns —
// scrolls on its own past ~10 rows so a long region list doesn't stretch
// the dashboard.
function BreakdownTable({
  title,
  rows,
}: {
  title: string
  rows: BreakdownRow[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='max-h-[400px] overflow-y-auto rounded-md border'>
          <Table>
            <TableHeader className='sticky top-0 z-10 bg-muted/40 backdrop-blur'>
              <TableRow>
                <TableHead className='font-semibold'>Регион</TableHead>
                <TableHead className='font-semibold'>Категория</TableHead>
                <TableHead className='text-right font-semibold'>
                  Количество
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row, idx) => (
                  <TableRow key={`${row.region}-${row.category}-${idx}`}>
                    <TableCell className='py-2.5'>
                      {row.region || '—'}
                    </TableCell>
                    <TableCell className='py-2.5'>
                      {row.category || '—'}
                    </TableCell>
                    <TableCell className='py-2.5 text-right tabular-nums'>
                      {formatNumber(row.count)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className='h-16 text-center text-muted-foreground italic'
                  >
                    Нет данных
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
