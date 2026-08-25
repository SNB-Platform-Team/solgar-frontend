import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

const data = [
  { name: 'Пн', orders: Math.floor(Math.random() * 900) + 100, pharmacies: Math.floor(Math.random() * 700) + 80 },
  { name: 'Вт', orders: Math.floor(Math.random() * 900) + 100, pharmacies: Math.floor(Math.random() * 700) + 80 },
  { name: 'Ср', orders: Math.floor(Math.random() * 900) + 100, pharmacies: Math.floor(Math.random() * 700) + 80 },
  { name: 'Чт', orders: Math.floor(Math.random() * 900) + 100, pharmacies: Math.floor(Math.random() * 700) + 80 },
  { name: 'Пт', orders: Math.floor(Math.random() * 900) + 100, pharmacies: Math.floor(Math.random() * 700) + 80 },
  { name: 'Сб', orders: Math.floor(Math.random() * 900) + 100, pharmacies: Math.floor(Math.random() * 700) + 80 },
  { name: 'Вс', orders: Math.floor(Math.random() * 900) + 100, pharmacies: Math.floor(Math.random() * 700) + 80 },
]

export function AnalyticsChart() {
  return (
    <ResponsiveContainer width='100%' height={300}>
      <AreaChart data={data}>
        <XAxis
          dataKey='name'
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
        />
        <Area
          type='monotone'
          dataKey='orders'
          stroke='currentColor'
          className='text-primary'
          fill='currentColor'
          fillOpacity={0.15}
        />
        <Area
          type='monotone'
          dataKey='pharmacies'
          stroke='currentColor'
          className='text-muted-foreground'
          fill='currentColor'
          fillOpacity={0.1}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
