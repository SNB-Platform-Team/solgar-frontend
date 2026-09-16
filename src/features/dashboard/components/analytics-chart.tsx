import { useQuery } from '@tanstack/react-query'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '@/lib/api'
import { type DashboardResponse } from '../types'

const formatCount = (n: number) => `${n.toLocaleString('ru-RU')} шт.`

export function AnalyticsChart() {
  // Same queryKey as the Обзор tab's dashboard query (see ../index.tsx) —
  // TanStack Query dedupes/shares the cache between the two, so mounting
  // this on the Аналитика tab doesn't trigger a second request.
  const { data, isLoading } = useQuery<DashboardResponse>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get<DashboardResponse>('/sales/api/dashboard/')
      return res.data
    },
  })

  const monthly = data?.monthly ?? []

  return (
    <ResponsiveContainer width='100%' height={300}>
      {isLoading ? (
        <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
          Загрузка данных…
        </div>
      ) : monthly.length === 0 ? (
        <div className='flex h-full items-center justify-center text-sm text-muted-foreground italic'>
          Нет данных
        </div>
      ) : (
        <LineChart data={monthly}>
          <XAxis
            dataKey='month'
            stroke='#888888'
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke='#888888'
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => value.toLocaleString('ru-RU')}
          />
          <Tooltip
            formatter={(value) => [formatCount(Number(value) || 0), 'Продажи']}
            contentStyle={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: 'var(--radius)',
              fontSize: 12,
            }}
          />
          <Line
            type='monotone'
            dataKey='total'
            name='Продажи (шт.)'
            stroke='currentColor'
            className='text-primary'
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  )
}
